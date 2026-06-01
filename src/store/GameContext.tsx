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
  /** Serialized form of the last state we either wrote or received. Local
   *  changes differ from this → we write; remote echoes match → we skip. */
  const lastSyncRef = useRef('')

  // ── Persist any LOCAL change to Firestore (live multiplayer) ───────────────
  // Whoever performed the action (UI-gated to the right player) is the writer.
  useEffect(() => {
    if (DEV_PREVIEW) return
    if (!gameId || !leagueId) return
    if (state.phase === 'landing' || state.phase === 'setup' || state.phase === 'rules') return

    const serialized = JSON.stringify(state)
    if (serialized === lastSyncRef.current) return // unchanged or applied-from-remote
    lastSyncRef.current = serialized

    const t = setTimeout(() => {
      updateDoc(doc(db, 'leagues', leagueId, 'games', gameId), {
        gameState: state as unknown as Record<string, unknown>,
        status: state.phase === 'complete' ? 'complete' : 'playing',
        ...(state.phase === 'complete' ? { completedAt: new Date().toISOString() } : {}),
      }).catch(console.error)
    }, 150)

    return () => clearTimeout(t)
  }, [state, gameId, leagueId])

  // ── Subscribe to remote updates (all clients) ──────────────────────────────
  useEffect(() => {
    if (DEV_PREVIEW) return
    if (!gameId || !leagueId) return
    if (unsubRef.current) unsubRef.current()

    // Initial load
    getDoc(doc(db, 'leagues', leagueId, 'games', gameId)).then(snap => {
      const gs = snap.data()?.gameState as GameState | undefined
      if (gs) {
        lastSyncRef.current = JSON.stringify(gs) // mark as known so we don't re-write
        dispatch({ type: 'REPLACE_STATE', state: gs })
      }
    })

    unsubRef.current = onSnapshot(doc(db, 'leagues', leagueId, 'games', gameId), (snap) => {
      const gs = snap.data()?.gameState as GameState | undefined
      if (!gs) return
      const serialized = JSON.stringify(gs)
      if (serialized === lastSyncRef.current) return // our own echo or no change
      lastSyncRef.current = serialized
      dispatch({ type: 'REPLACE_STATE', state: gs })
    })

    return () => { if (unsubRef.current) unsubRef.current() }
  }, [gameId, leagueId])

  const syncGame = useCallback((lId: string, gId: string, isCom: boolean) => {
    setLeagueId(lId); setGameId(gId); setIsCommissioner(isCom)
  }, [])

  const detachGame = useCallback(() => {
    if (unsubRef.current) unsubRef.current()
    lastSyncRef.current = ''
    setGameId(null); setLeagueId(null); setIsCommissioner(false)
    dispatch({ type: 'NEW_GAME' })
  }, [])

  return (
    <GameContext.Provider value={{ state, dispatch, gameId, leagueId, isCommissioner, syncGame, detachGame }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
