import {
  GameState,
  GameAction,
  Player,
  PickSlot,
  Challenge,
  ChallengeGame,
} from '../types/game';
import { buildBallPool, getNextOpenSlot, getSlotByPosition, getSlotForPlayer } from '../utils/gameLogic';

// ─── Initial state ────────────────────────────────────────────────────────────
export const initialState: GameState = {
  phase: 'landing',
  players: [],
  pickSlots: [],
  ballPool: [],
  drawnCount: 0,
  totalBalls: 0,
  activeChallenge: null,
  modal: null,
  lastDraw: null,
};

let _challengeCounter = 0;
const cuid = () => `challenge-${++_challengeCounter}`;
let _playerCounter = 0;
const puid = () => `player-${++_playerCounter}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function updatePlayer(players: Player[], id: string, patch: Partial<Player>): Player[] {
  return players.map(p => p.id === id ? { ...p, ...patch } : p);
}

function updateSlot(slots: PickSlot[], position: number, patch: Partial<PickSlot>): PickSlot[] {
  return slots.map(s => s.position === position ? { ...s, ...patch } : s);
}

function getPlayer(players: Player[], id: string): Player {
  const p = players.find(p => p.id === id);
  if (!p) throw new Error(`Player ${id} not found`);
  return p;
}

function getSlot(slots: PickSlot[], position: number): PickSlot {
  const s = slots.find(s => s.position === position);
  if (!s) throw new Error(`Slot ${position} not found`);
  return s;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    // ── Navigation ─────────────────────────────────────────────────────────
    case 'NAVIGATE':
      return { ...state, phase: action.phase };

    case 'NEW_GAME':
      return { ...initialState };

    // ── Game start ─────────────────────────────────────────────────────────
    case 'START_GAME': {
      const players: Player[] = action.playerNames.map(name => ({
        id: puid(),
        name,
        shotgunCount: 0,
        pendingChallengePickPosition: null,
      }));

      const pickSlots: PickSlot[] = players.map((_, i) => ({
        position: i + 1,
        playerId: null,
        defenseCount: 0,
        locked: false,
      }));

      const ballPool = buildBallPool(players);

      return {
        ...state,
        phase: 'playing',
        players,
        pickSlots,
        ballPool,
        drawnCount: 0,
        totalBalls: ballPool.length,
        activeChallenge: null,
        modal: null,
        lastDraw: null,
      };
    }

    // ── Draw a ball ─────────────────────────────────────────────────────────
    case 'DRAW_BALL': {
      if (state.ballPool.length === 0) return state;
      if (state.modal !== null) return state; // modal must be dismissed first

      const [drawn, ...remaining] = state.ballPool;
      const drawnCount = state.drawnCount + 1;

      if (drawn.type === 'pick') {
        // Assign the player to the next open slot
        const slot = getNextOpenSlot(state.pickSlots);
        if (!slot) {
          // All slots full — shouldn't happen if ball pool is consistent
          return { ...state, ballPool: remaining, drawnCount };
        }

        const player = state.players.find(p => p.id === drawn.playerId)!;
        let newSlots = updateSlot(state.pickSlots, slot.position, { playerId: player.id });

        // Check if any player had a PENDING challenge for this pick position (Rule 2)
        // If the pending challenger's own name ball just filled the slot → swap lost
        // Otherwise → trigger the challenge
        const pendingChallenger = state.players.find(
          p => p.pendingChallengePickPosition === slot.position
        );

        let newPlayers = state.players;
        let newActiveChallenge = state.activeChallenge;
        let modal: GameState['modal'] = {
          kind: 'draw-result',
          ballType: 'pick',
          pickedPlayerId: player.id,
          pickedPosition: slot.position,
        };

        if (pendingChallenger) {
          if (pendingChallenger.id === player.id) {
            // Own name drawn for challenged position → swap lost, no defense (Rule 2)
            newPlayers = updatePlayer(newPlayers, pendingChallenger.id, {
              pendingChallengePickPosition: null,
            });
            // modal stays as draw-result but we can note the swap was lost
          } else {
            // Trigger the pending challenge
            const challenge: Challenge = {
              id: cuid(),
              challengerId: pendingChallenger.id,
              targetPickPosition: slot.position,
              defenderId: player.id,
              challengerPreviousPickPosition:
                getSlotForPlayer(state.pickSlots, pendingChallenger.id)?.position ?? null,
              gameType: null,
              status: 'choosing-game',
            };
            newActiveChallenge = challenge;
            newPlayers = updatePlayer(newPlayers, pendingChallenger.id, {
              pendingChallengePickPosition: null,
            });
            // Show draw result first, noting the challenge will follow
            modal = {
              kind: 'draw-result',
              ballType: 'pick',
              pickedPlayerId: player.id,
              pickedPosition: slot.position,
              pendingChallengeName: state.players.find(p => p.id === pendingChallenger.id)?.name,
            };
          }
        }

        return {
          ...state,
          ballPool: remaining,
          drawnCount,
          pickSlots: newSlots,
          players: newPlayers,
          activeChallenge: newActiveChallenge,
          modal,
          lastDraw: { ballType: 'pick', playerName: player.name, position: slot.position },
        };
      }

      if (drawn.type === 'pick-swap') {
        return {
          ...state,
          ballPool: remaining,
          drawnCount,
          modal: { kind: 'assign-swap' },
          lastDraw: { ballType: 'pick-swap' },
        };
      }

      // shotgun
      return {
        ...state,
        ballPool: remaining,
        drawnCount,
        modal: { kind: 'assign-shotgun' },
        lastDraw: { ballType: 'shotgun' },
      };
    }

    // ── Assign pick-swap to a player ────────────────────────────────────────
    case 'ASSIGN_PICK_SWAP': {
      const { playerId } = action;
      const player = getPlayer(state.players, playerId);

      // Rule 3: if player already has a pending challenge, they must put it back and draw again
      if (player.pendingChallengePickPosition !== null) {
        const swapBall = { id: `b-reinserted-${Date.now()}`, type: 'pick-swap' as const };
        const newPool = [...state.ballPool];
        const insertAt = Math.floor(Math.random() * (newPool.length + 1));
        newPool.splice(insertAt, 0, swapBall);
        return {
          ...state,
          ballPool: newPool,
          drawnCount: state.drawnCount - 1,
          // Show rule-3 toast: reuse draw-result modal with special marker
          modal: { kind: 'draw-result', ballType: 'pick-swap', rule3Redraw: true } as GameState['modal'],
          lastDraw: { ballType: 'pick-swap' },
        };
      }

      // Open the challenge setup modal
      return {
        ...state,
        modal: { kind: 'pending-pick-swap', challengerId: playerId },
      };
    }

    // ── Assign shotgun to a player ──────────────────────────────────────────
    case 'ASSIGN_SHOTGUN': {
      const { playerId } = action;
      const player = getPlayer(state.players, playerId);
      const newCount = player.shotgunCount + 1;

      if (newCount > 3) {
        // Overflow: player must give it away
        return {
          ...state,
          modal: { kind: 'shotgun-overflow', playerId },
        };
      }

      const newPlayers = updatePlayer(state.players, playerId, { shotgunCount: newCount });
      return { ...state, players: newPlayers, modal: null };
    }

    // ── Give overflow shotgun to another player ─────────────────────────────
    case 'GIVE_SHOTGUN': {
      const { toPlayerId } = action;
      const recipient = getPlayer(state.players, toPlayerId);
      if (recipient.shotgunCount >= 3) return state; // can't give if they're also maxed

      const newPlayers = updatePlayer(state.players, toPlayerId, {
        shotgunCount: recipient.shotgunCount + 1,
      });
      return { ...state, players: newPlayers, modal: null };
    }

    // ── Set a pending challenge (waiting for future pick position) ──────────
    case 'SET_PENDING_CHALLENGE': {
      const { challengerId, targetPosition } = action;
      const newPlayers = updatePlayer(state.players, challengerId, {
        pendingChallengePickPosition: targetPosition,
      });
      // Bug fix: if ballPool is empty and no pick balls remain, pending challenge
      // can never trigger — forfeit it silently and check for game completion
      const remainingPickBalls = state.ballPool.filter(b => b.type === 'pick').length;
      if (state.ballPool.length === 0 || remainingPickBalls === 0) {
        const clearedPlayers = updatePlayer(newPlayers, challengerId, {
          pendingChallengePickPosition: null,
        });
        return {
          ...state,
          players: clearedPlayers,
          modal: null,
          phase: state.activeChallenge === null ? 'complete' : state.phase,
        };
      }
      return { ...state, players: newPlayers, modal: null };
    }

    // ── Initiate an immediate challenge ─────────────────────────────────────
    case 'INITIATE_CHALLENGE': {
      const { challengerId, targetPickPosition } = action;
      const targetSlot = getSlot(state.pickSlots, targetPickPosition);
      if (!targetSlot.playerId || targetSlot.locked) return state;

      const challenge: Challenge = {
        id: cuid(),
        challengerId,
        targetPickPosition,
        defenderId: targetSlot.playerId,
        challengerPreviousPickPosition:
          getSlotForPlayer(state.pickSlots, challengerId)?.position ?? null,
        gameType: null,
        status: 'choosing-game',
      };

      return {
        ...state,
        activeChallenge: challenge,
        modal: { kind: 'challenge', challenge },
      };
    }

    // ── Select challenge game ───────────────────────────────────────────────
    case 'SELECT_CHALLENGE_GAME': {
      if (!state.activeChallenge) return state;
      const updated: Challenge = {
        ...state.activeChallenge,
        gameType: action.game as ChallengeGame,
        status: 'in-progress',
      };
      return {
        ...state,
        activeChallenge: updated,
        modal: { kind: 'challenge', challenge: updated },
      };
    }

    // ── Resolve challenge ───────────────────────────────────────────────────
    case 'RESOLVE_CHALLENGE': {
      if (!state.activeChallenge) return state;
      const { challengerWon } = action;
      const ch = state.activeChallenge;

      let newSlots = [...state.pickSlots];

      if (challengerWon) {
        // Challenger takes targetPickPosition
        // Defender gets challenger's old position (or loses pick if challenger had none)
        const defenderNewPosition = ch.challengerPreviousPickPosition;

        // Clear target slot first
        newSlots = updateSlot(newSlots, ch.targetPickPosition, {
          playerId: ch.challengerId,
          defenseCount: 0, // fresh pick for challenger
          locked: false,
        });

        // Move defender to challenger's old position (or unassign if challenger had none)
        if (defenderNewPosition !== null) {
          newSlots = updateSlot(newSlots, defenderNewPosition, {
            playerId: ch.defenderId,
            defenseCount: 0, // fresh pick for the displaced defender
            locked: false,
          });
        } else {
          // Defender lost their pick and challenger had none — defender becomes unassigned
          // The target slot was cleared above; defender has no slot now.
          // Re-open the target slot for defender? No, challenger took it.
          // We need to find a slot that WAS the challenger's — but they had none.
          // Simply leave defender without a slot (rare edge case).
          // Find any slot assigned to challenger (there shouldn't be one) and reassign to defender.
          // Since challenger had no pick, defender just loses their pick.
          // Mark defender as needing a pick by not assigning them to any slot.
          // Remove them from any slot they currently hold.
          newSlots = newSlots.map(s =>
            s.playerId === ch.defenderId && s.position !== ch.targetPickPosition
              ? { ...s, playerId: null, defenseCount: 0, locked: false }
              : s
          );
        }
      } else {
        // Defender wins — increment their defense count
        const targetSlot = getSlot(newSlots, ch.targetPickPosition);
        const newDefenseCount = targetSlot.defenseCount + 1;
        const locked = newDefenseCount >= 2;
        newSlots = updateSlot(newSlots, ch.targetPickPosition, {
          defenseCount: newDefenseCount,
          locked,
        });
      }

      return {
        ...state,
        pickSlots: newSlots,
        activeChallenge: null,
        modal: null,
        // Check if game is now over (no balls left and no active challenge)
        phase: state.ballPool.length === 0 ? 'complete' : state.phase,
      };
    }

    // ── Close modal ─────────────────────────────────────────────────────────
    case 'CLOSE_MODAL': {
      // If there's an active challenge waiting behind a draw-result modal, show it now
      if (state.activeChallenge && state.modal?.kind === 'draw-result') {
        return {
          ...state,
          modal: { kind: 'challenge', challenge: state.activeChallenge },
        };
      }
      const isComplete = state.ballPool.length === 0 && state.activeChallenge === null;
      return {
        ...state,
        modal: null,
        phase: isComplete ? 'complete' : state.phase,
      };
    }

    case 'REPLACE_STATE':
      return action.state;

    default:
      return state;
  }
}
