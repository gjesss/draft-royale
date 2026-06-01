import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './store/AuthContext'
import { GameProvider, useGame } from './store/GameContext'
import { useLeague } from './hooks/useLeague'

import AuthScreen from './components/auth/AuthScreen'
import ProfileSetup from './components/auth/ProfileSetup'
import Dashboard from './components/dashboard/Dashboard'
import LeagueHome from './components/league/LeagueHome'
import JoinLeague from './components/league/JoinLeague'
import JoinScreen from './components/league/JoinScreen'
import GameLobby from './components/game/GameLobby'
import MockSetup from './components/game/MockSetup'
import ProfileScreen from './components/ProfileScreen'
import BottomNav, { NavTab } from './components/layout/BottomNav'
import GameBoard from './components/GameBoard'
import Complete from './components/Complete'
import Rules from './components/Rules'
import { TrophyIcon } from './components/Logo'

type View =
  | { screen: 'dashboard' }
  | { screen: 'league'; leagueId: string }
  | { screen: 'lobby'; gameId: string; leagueId: string; isCommissioner: boolean }
  | { screen: 'join'; token?: string }
  | { screen: 'profile' }
  | { screen: 'mock' }

function AppRouter() {
  const { user, profile, loading } = useAuth()
  const { state: gameState } = useGame()
  const [view, setView] = useState<View>({ screen: 'dashboard' })
  const [showRules, setShowRules] = useState(false)

  // Deep link: /join/CODE
  useEffect(() => {
    const m = window.location.pathname.match(/^\/join\/([a-zA-Z0-9]+)$/)
    if (m) {
      window.history.replaceState(null, '', '/')
      setView({ screen: 'join', token: m[1].toUpperCase() })
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TrophyIcon size={56} className="animate-pulse" />
      </div>
    )
  }

  if (!user) {
    return <AuthScreen redirectNote={view.screen === 'join' ? '🏆 Sign in to accept your league invite' : undefined} />
  }
  if (!profile) return <ProfileSetup />

  // Rules opened from the profile/settings tab
  if (showRules) return <Rules onBack={() => setShowRules(false)} />

  // ── Active game overlays the whole screen (no nav) ──
  if (gameState.phase === 'rules') return <Rules />
  if (gameState.phase === 'playing') return <GameBoard />
  if (gameState.phase === 'complete') return <Complete />

  // ── Full-screen sub-views (no bottom nav) ──
  if (view.screen === 'league') {
    return (
      <LeagueHome
        leagueId={view.leagueId}
        onBack={() => setView({ screen: 'dashboard' })}
        onStartGame={(gameId, isCom) =>
          setView({ screen: 'lobby', gameId, leagueId: view.leagueId, isCommissioner: isCom })}
      />
    )
  }
  if (view.screen === 'lobby') {
    return (
      <GameLobbyWrapper
        gameId={view.gameId} leagueId={view.leagueId} isCommissioner={view.isCommissioner}
        onBack={() => setView({ screen: 'league', leagueId: view.leagueId })}
      />
    )
  }

  if (view.screen === 'mock') {
    return <MockSetup onBack={() => setView({ screen: 'dashboard' })} />
  }

  // ── Tabbed shell with bottom nav ──
  const activeTab: NavTab = view.screen === 'profile' ? 'profile' : view.screen === 'join' ? 'join' : 'leagues'

  return (
    <div className="min-h-screen pb-20">
      {view.screen === 'dashboard' && (
        <Dashboard
          onSelectLeague={id => setView({ screen: 'league', leagueId: id })}
          onJoinViaToken={() => setView({ screen: 'join' })}
          onMockDraft={() => setView({ screen: 'mock' })}
        />
      )}

      {view.screen === 'join' && (
        view.token
          ? <JoinLeague
              token={view.token}
              onJoined={id => setView({ screen: 'league', leagueId: id })}
              onError={() => setView({ screen: 'join' })}
            />
          : <JoinScreen onJoinCode={token => setView({ screen: 'join', token })} />
      )}

      {view.screen === 'profile' && (
        <ProfileScreen onOpenRules={() => setShowRules(true)} />
      )}

      <BottomNav
        active={activeTab}
        onChange={tab => {
          if (tab === 'leagues') setView({ screen: 'dashboard' })
          else if (tab === 'join') setView({ screen: 'join' })
          else setView({ screen: 'profile' })
        }}
      />
    </div>
  )
}

function GameLobbyWrapper({ gameId, leagueId, isCommissioner, onBack }: {
  gameId: string; leagueId: string; isCommissioner: boolean; onBack: () => void
}) {
  const { league } = useLeague(leagueId)
  const { syncGame } = useGame()
  useEffect(() => {
    if (!isCommissioner) syncGame(leagueId, gameId, false)
  }, [gameId, leagueId, isCommissioner, syncGame])

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
