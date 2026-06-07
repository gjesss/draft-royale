import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './store/AuthContext'
import { GameProvider, useGame } from './store/GameContext'
import { useLeague, useMyLeagues } from './hooks/useLeague'

import AuthScreen from './components/auth/AuthScreen'
import ProfileSetup from './components/auth/ProfileSetup'
import Dashboard from './components/dashboard/Dashboard'
import LeagueShell from './components/league/LeagueShell'
import LeagueSwitcher from './components/league/LeagueSwitcher'
import JoinLeague from './components/league/JoinLeague'
import JoinScreen from './components/league/JoinScreen'
import GameLobby from './components/game/GameLobby'
import MockSetup from './components/game/MockSetup'
import GameBoard from './components/GameBoard'
import Complete from './components/Complete'
import Rules from './components/Rules'
import { TrophyIcon } from './components/Logo'

const LAST_LEAGUE_KEY = 'dr.lastLeagueId'

type FullScreen =
  | null
  | { kind: 'lobby'; gameId: string; leagueId: string; isCommissioner: boolean }
  | { kind: 'mock' }
  | { kind: 'join'; token?: string }

function AppRouter() {
  const { user, profile, loading } = useAuth()
  const { state: gameState } = useGame()
  const { leagues } = useMyLeagues(user?.uid ?? null)

  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(
    () => localStorage.getItem(LAST_LEAGUE_KEY)
  )
  const [fullScreen, setFullScreen] = useState<FullScreen>(null)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [showRules, setShowRules] = useState(false)

  // Persist the active league
  useEffect(() => {
    if (currentLeagueId) localStorage.setItem(LAST_LEAGUE_KEY, currentLeagueId)
  }, [currentLeagueId])

  // Default into the most-recent league once they load (if none chosen yet)
  useEffect(() => {
    if (!currentLeagueId && leagues.length > 0) {
      const recent = [...leagues].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0]
      setCurrentLeagueId(recent.id)
    }
  }, [leagues, currentLeagueId])

  // Deep link: /join/CODE
  useEffect(() => {
    const m = window.location.pathname.match(/^\/join\/([a-zA-Z0-9]+)$/)
    if (m) {
      window.history.replaceState(null, '', '/')
      setFullScreen({ kind: 'join', token: m[1].toUpperCase() })
    }
  }, [])

  const selectLeague = (id: string) => { setCurrentLeagueId(id); setFullScreen(null); setSwitcherOpen(false) }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><TrophyIcon size={56} className="animate-pulse" /></div>
  }
  if (!user) {
    return <AuthScreen redirectNote={fullScreen?.kind === 'join' ? '🏆 Sign in to accept your league invite' : undefined} />
  }
  if (!profile) return <ProfileSetup />

  // Rules overlay (from profile tab)
  if (showRules) return <Rules onBack={() => setShowRules(false)} />

  // Active game overlays everything
  if (gameState.phase === 'rules') return <Rules />
  if (gameState.phase === 'playing') return <GameBoard />
  if (gameState.phase === 'complete') return <Complete />

  // Full-screen flows
  if (fullScreen?.kind === 'join') {
    return fullScreen.token
      ? <JoinLeague token={fullScreen.token} onJoined={selectLeague} onError={() => setFullScreen(null)} />
      : <JoinScreen onJoinCode={token => setFullScreen({ kind: 'join', token })} />
  }
  if (fullScreen?.kind === 'mock') {
    return <MockSetup onBack={() => setFullScreen(null)} />
  }
  if (fullScreen?.kind === 'lobby') {
    return (
      <GameLobbyWrapper
        gameId={fullScreen.gameId} leagueId={fullScreen.leagueId} isCommissioner={fullScreen.isCommissioner}
        onBack={() => setFullScreen(null)}
      />
    )
  }

  // Main: a league hub (persistent context) or the home/onboarding screen
  return (
    <>
      {currentLeagueId ? (
        <LeagueShell
          leagueId={currentLeagueId}
          onStartGame={(gameId, isCom) => setFullScreen({ kind: 'lobby', gameId, leagueId: currentLeagueId, isCommissioner: isCom })}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onOpenRules={() => setShowRules(true)}
          onExit={() => { setCurrentLeagueId(null); localStorage.removeItem(LAST_LEAGUE_KEY) }}
        />
      ) : (
        <Dashboard
          onSelectLeague={selectLeague}
          onJoinViaToken={() => setFullScreen({ kind: 'join' })}
          onMockDraft={() => setFullScreen({ kind: 'mock' })}
        />
      )}

      {switcherOpen && (
        <LeagueSwitcher
          currentLeagueId={currentLeagueId}
          onSelect={selectLeague}
          onCreate={() => { setSwitcherOpen(false); setCurrentLeagueId(null); localStorage.removeItem(LAST_LEAGUE_KEY) }}
          onJoin={() => { setSwitcherOpen(false); setFullScreen({ kind: 'join' }) }}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
    </>
  )
}

function GameLobbyWrapper({ gameId, leagueId, isCommissioner, onBack }: {
  gameId: string; leagueId: string; isCommissioner: boolean; onBack: () => void
}) {
  const { league } = useLeague(leagueId)
  const { syncGame } = useGame()
  useEffect(() => { if (!isCommissioner) syncGame(leagueId, gameId, false) }, [gameId, leagueId, isCommissioner, syncGame])

  if (!league) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading lobby…</div>
  return (
    <GameLobby gameId={gameId} leagueId={leagueId}
      members={league.members} isCommissioner={isCommissioner}
      settings={league.settings} onBack={onBack} />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="min-h-screen bg-royal-dark text-white">
          <AppRouter />
        </div>
      </GameProvider>
    </AuthProvider>
  )
}
