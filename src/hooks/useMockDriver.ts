import { useEffect } from 'react'
import { GameState, GameAction, ChallengeGame } from '../types/game'

const GAMES: ChallengeGame[] = ['beer-pong', 'quarters', 'flip-cup', 'holdem', 'high-card']
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

/**
 * Drives bot players in a local mock draft. Watches game state and, after a
 * short delay, dispatches the single next action a bot should take. Human-owned
 * decisions are left alone so the player acts via the UI. No-op when !isMock.
 */
export function useMockDriver(state: GameState, dispatch: React.Dispatch<GameAction>) {
  useEffect(() => {
    if (!state.isMock || state.phase !== 'playing') return

    const isHuman = (id?: string | null) => id != null && id === state.humanPlayerId
    const drawerId = state.turnOrder[state.currentTurnIndex]
    const delay = 850

    const t = setTimeout(() => {
      const m = state.modal

      // ── Modal-driven decisions ──
      if (m) {
        if (m.kind === 'draw-result') {
          // Acknowledge when the acting player is a bot (rule-3 redraw or normal result)
          if (!isHuman(drawerId)) dispatch({ type: 'CLOSE_MODAL' })
          return
        }
        if (m.kind === 'pending-pick-swap') {
          if (isHuman(m.challengerId)) return
          // Bot: challenge a random filled, unlocked pick it doesn't own — else hold
          const targets = state.pickSlots.filter(s => s.playerId && !s.locked && s.playerId !== m.challengerId)
          if (targets.length && Math.random() < 0.65) {
            dispatch({ type: 'INITIATE_CHALLENGE', challengerId: m.challengerId, targetPickPosition: pick(targets).position })
          } else {
            dispatch({ type: 'CLOSE_MODAL' })
          }
          return
        }
        if (m.kind === 'shotgun-overflow') {
          if (isHuman(m.playerId)) return
          const eligible = state.players.filter(p => p.id !== m.playerId && p.shotgunCount < 3)
          if (eligible.length) dispatch({ type: 'GIVE_SHOTGUN', toPlayerId: pick(eligible).id })
          else dispatch({ type: 'CLOSE_MODAL' })
          return
        }
        return // challenge modal handled via activeChallenge below
      }

      // ── Active challenge ──
      if (state.activeChallenge) {
        const ch = state.activeChallenge
        const humanInvolved = isHuman(ch.challengerId) || isHuman(ch.defenderId)
        if (humanInvolved) return // let the human pick the game / report the result
        if (ch.status === 'choosing-game') {
          dispatch({ type: 'SELECT_CHALLENGE_GAME', game: pick(GAMES) })
        } else if (ch.status === 'in-progress' || ch.status === 'resolving') {
          // Digital High Card: deal, re-deal on tie, resolve by rank.
          if (ch.gameType === 'high-card') {
            const m = ch.mini?.kind === 'high-card' ? ch.mini : null
            if (!m || m.challenger.rank === m.defender.rank) {
              dispatch({ type: 'DEAL_HIGH_CARD' })
            } else {
              dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon: m.challenger.rank > m.defender.rank })
            }
          } else {
            dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon: Math.random() < 0.5 })
          }
        }
        return
      }

      // ── No modal, no challenge: it's someone's turn to draw ──
      if (state.ballPool.length > 0 && !isHuman(drawerId)) {
        dispatch({ type: 'DRAW_BALL' })
      }
    }, delay)

    return () => clearTimeout(t)
  }, [state, dispatch])
}
