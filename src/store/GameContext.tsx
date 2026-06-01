import {
  createContext, useContext, useReducer, useState,
  ReactNode, useEffect, useRef, useCallback,
} from 'react'
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { GameState, GameAction } from '../types/game'
import { gameReducer, initialState } from './gameReducer'
import { DEV_PREVIEW } from '../devMock'

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  gameId: string | null
  leagueId: string | null
  isCommissioner: boolean
  syncGame: (leagueId: string, gameId: string, isCommissioner: boolean) => void
  detachGame: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [gameId, setGameId] = useState<string | null>(null)
  const [leagueId, setLeagueId] = useState<string | null>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)
  const lastSyncRef = useRef('')

  // ── Commissioner: persist state to Firestore on every change ──────────────
  useEffect(() => {
    if (DEV_PREVIEW) return
    if (!gameId || !leagueId || !isCommissioner) return
    if (state.phase === 'landing' || state.phase === 'setup' || state.phase === 'rules') return

    const serialized = JSON.stringify(state)
    if (serialized === lastSyncRef.current) return
    lastSyncRef.current = serialized

    const t = setTimeout(() => {
      const gameRef = doc(db, 'leagues', leagueId, 'games', gameId)
      updateDoc(gameRef, {
        gameState: state as unknown as Record<string, unknown>,
        status: state.phase === 'complete' ? 'complete' : 'playing',
        ...(state.phase === 'complete' ? { completedAt: new Date().toISOString() } : {}),
      }).catch(console.error)
    }, 250)

    return () => clearTimeout(t)
  }, [state, gameId, leagueId, isCommissioner])

  // ── Non-commissioner: subscribe to Firestore real-time updates ─────────────
  useEffect(() => {
    if (DEV_PREVIEW) return
    if (!gameId || !leagueId || isCommissioner) return
    if (unsubRef.current) unsubRef.current()

    // Load initial state
    getDoc(doc(db, 'leagues', leagueId, 'games', gameId)).then(snap => {
      const gs = snap.data()?.gameState as GameState | undefined
      if (gs) dispatch({ type: 'REPLACE_STATE', state: gs })
    })

    // Subscribe to changes
    unsubRef.current = onSnapshot(
      doc(db, 'leagues', leagueId, 'games', gameId),
      (snap) => {
        const gs = snap.data()?.gameState as GameState | undefined
        if (gs) dispatch({ type: 'REPLACE_STATE', state: gs })
      }
    )

    return () => { if (unsubRef.current) unsubRef.current() }
  }, [gameId, leagueId, isCommissioner])

  const syncGame = useCallback((lId: string, gId: string, isCom: boolean) => {
    setLeagueId(lId)
    setGameId(gId)
    setIsCommissioner(isCom)
  }, [])

  const detachGame = useCallback(() => {
    if (unsubRef.current) unsubRef.current()
    setGameId(null)
    setLeagueId(null)
    setIsCommissioner(false)
    dispatch({ type: 'NEW_GAME' })
  }, [])

  return (
    <GameContext.Provider value={{
      state, dispatch, gameId, leagueId, isCommissioner, syncGame, detachGame,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
