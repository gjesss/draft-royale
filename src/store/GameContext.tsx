import {
  createContext, useContext, useReducer, useState, ReactNode,
  useEffect, useRef, useCallback,
} from 'react'
import { GameState, GameAction } from '../types/game'
import { gameReducer, initialState } from './gameReducer'
import { supabase } from '../lib/supabase'

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  gameId: string | null
  isCommissioner: boolean
  syncGame: (gameId: string, isCommissioner: boolean) => void
  detachGame: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const [gameId, setGameId] = useState<string | null>(null)
  const [isCommissioner, setIsCommissioner] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastSyncRef = useRef('')

  // ── Commissioner: save state to DB on every meaningful change ──
  useEffect(() => {
    if (!gameId || !isCommissioner) return
    if (state.phase === 'landing' || state.phase === 'setup' || state.phase === 'rules') return

    const serialized = JSON.stringify(state)
    if (serialized === lastSyncRef.current) return
    lastSyncRef.current = serialized

    const t = setTimeout(() => {
      supabase
        .from('games')
        .update({
          game_state: state as unknown as Record<string, unknown>,
          status: state.phase === 'complete' ? 'complete' : 'playing',
          ...(state.phase === 'complete' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', gameId)
    }, 250)

    return () => clearTimeout(t)
  }, [state, gameId, isCommissioner])

  // ── Other players: subscribe to real-time game state updates ──
  useEffect(() => {
    if (!gameId || isCommissioner) return

    if (channelRef.current) supabase.removeChannel(channelRef.current)

    // Load current state first
    supabase
      .from('games')
      .select('game_state')
      .eq('id', gameId)
      .single()
      .then(({ data }) => {
        if (data?.game_state) {
          dispatch({ type: 'REPLACE_STATE', state: data.game_state as GameState })
        }
      })

    // Then subscribe to changes
    channelRef.current = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const remote = (payload.new as { game_state: GameState }).game_state
          if (remote) dispatch({ type: 'REPLACE_STATE', state: remote })
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [gameId, isCommissioner])

  const syncGame = useCallback((gId: string, isCom: boolean) => {
    setGameId(gId)
    setIsCommissioner(isCom)
  }, [])

  const detachGame = useCallback(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    setGameId(null)
    setIsCommissioner(false)
    dispatch({ type: 'NEW_GAME' })
  }, [])

  return (
    <GameContext.Provider value={{ state, dispatch, gameId, isCommissioner, syncGame, detachGame }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
