import { useGame } from '../store/GameContext'
import { useAuth } from '../store/AuthContext'

/**
 * Resolves which player THIS device controls and whether it may act on a given
 * player's behalf. Unifies mock (human controls the one human seat; bots are
 * driven separately) and live play (you control the seat matching your UID;
 * the commissioner may act for anyone as a stall-breaker).
 */
export function useTurnControl() {
  const { state, isCommissioner } = useGame()
  const { user } = useAuth()

  const myPlayerId = state.isMock
    ? state.humanPlayerId
    : (state.players.find(p => p.uid && p.uid === user?.uid)?.id ?? null)

  const drawerId = state.turnOrder[state.currentTurnIndex] ?? null
  const isMyTurn = drawerId != null && drawerId === myPlayerId

  /** Can this device take the action that belongs to `playerId`? */
  const canActAs = (playerId: string | null | undefined): boolean => {
    if (!playerId) return false
    if (state.isMock) return playerId === state.humanPlayerId  // bots handled by driver
    if (playerId === myPlayerId) return true
    return isCommissioner // commissioner override (covers absent players)
  }

  return { myPlayerId, drawerId, isMyTurn, isCommissioner, canActAs }
}
