import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useGame, GameProvider } from './store/GameContext'
import { useLeague } from './hooks/useLeague'

// Auth
import AuthScreen from './components/auth/AuthScreen'
import ProfileSetup from './components/auth/ProfileSetup'

// App screens
import Dashboard from './components/dashboard/Dashboard'
import LeagueHome from './components/league/LeagueHome'
import JoinLeague from './components/league/JoinLeague'
import GameLobby from './components/game/GameLobby'

// Game screens
import GameBoard from './components/GameBoard'
import Complete from './components/Complete'
import Rules from './components/Rules'

// ── App view state ────────────────────────────────────────────────────────────
type AppView =
  | { screen: 'dashboard' }
  | { screen: 'league'; leagueId: string }
  | { screen: 'join'; token: string }
  | { screen: 'game-lobby'; gameId: string; leagueId: string; isCommissioner: boolean }

function AppRouter() {
  const { user, profile, loading } = useAuth()
  const { state: gameState, detachGame, syncGame } = useGame()
  const [view, setView] = useState<AppView>({ screen: 'dashboard' })
  const [currentLeagueId, setCurrentLeagueId] = useState<string | undefined>()

  // Check URL for invite token on first load
  useEffect(() => {
    const path = window.location.pathname
    const m = path.match(/^\/join\/([a-zA-Z0-9]+)$/)
    if (m) {
      window.history.replaceState(null, '', '/')
      setView({ screen: 'join', token: m[1] })
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-cyan-400 text-3xl animate-pulse">👑</span>
      </div>
    )
  }

  if (!user) {
    const inviteToken = view.screen === 'join' ? view.token : undefined
    return (
      <AuthScreen
        redirectNote={inviteToken ? '🔗 Sign in to accept your league invite' : undefined}
      />
    )
  }

  if (!profile) return <ProfileSetup />

  // ── Active game overlays everything ──────────────────────────────────────
  if (gameState.phase === 'rules') return <Rules />

  if (gameState.phase === 'playing') return <GameBoard />

  if (gameState.phase === 'complete') {
    return (
      <Complete
        leagueId={currentLeagueId}
      />
    )
  }

  // ── Normal navigation ─────────────────────────────────────────────────────
  if (view.screen === 'join') {
    return (
      <JoinLeague
        token={view.token}
        onJoined={(leagueId) => setView({ screen: 'league', leagueId })}
        onError={() => setView({ screen: 'dashboard' })}
      />
    )
  }

  if (view.screen === 'league') {
    return (
      <LeagueHome
        leagueId={view.leagueId}
        onBack={() => setView({ screen: 'dashboard' })}
        onStartGame={(gameId, isCom) => {
          setCurrentLeagueId(view.leagueId)
          setView({ screen: 'game-lobby', gameId, leagueId: view.leagueId, isCommissioner: isCom })
        }}
      />
    )
  }

  if (view.screen === 'game-lobby') {
    return (
      <GameLobbyWrapper
        gameId={view.gameId}
        leagueId={view.leagueId}
        isCommissioner={view.isCommissioner}
        onBack={() => setView({ screen: 'league', leagueId: view.leagueId })}
      />
    )
  }

  return (
    <Dashboard
      onSelectLeague={(leagueId) => setView({ screen: 'league', leagueId })}
      onJoinViaToken={() => {
        const input = prompt('Paste your invite link or token:')
        if (!input) return
        const m = input.match(/([a-zA-Z0-9]{20,})/)
        if (m) setView({ screen: 'join', token: m[1] })
      }}
    />
  )
}

// Loads league members for the lobby
function GameLobbyWrapper({
  gameId, leagueId, isCommissioner, onBack,
}: {
  gameId: string
  leagueId: string
  isCommissioner: boolean
  onBack: () => void
}) {
  const { league } = useLeague(leagueId)
  const { syncGame } = useGame()

  // Non-commissioner: subscribe to real-time immediately
  useEffect(() => {
    if (!isCommissioner) syncGame(gameId, false)
  }, [gameId, isCommissioner, syncGame])

  if (!league) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading lobby...</div>
  }

  return (
    <GameLobby
      gameId={gameId}
      leagueId={leagueId}
      members={league.league_members}
      isCommissioner={isCommissioner}
      onBack={onBack}
    />
  )
}

export default function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-royal-dark text-white">
        <AppRouter />
      </div>
    </GameProvider>
  )
}
