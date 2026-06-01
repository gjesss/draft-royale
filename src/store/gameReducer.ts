import {
  GameState,
  GameAction,
  Player,
  PickSlot,
  Challenge,
  ChallengeGame,
  GameSettings,
  DEFAULT_SETTINGS,
} from '../types/game';
import { buildBallPool, getNextOpenSlot, getSlotForPlayer, shuffle } from '../utils/gameLogic';

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
  settings: DEFAULT_SETTINGS,
  turnOrder: [],
  currentTurnIndex: 0,
  isMock: false,
  humanPlayerId: null,
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
function getSlot(slots: PickSlot[], position: number): PickSlot {
  const s = slots.find(s => s.position === position);
  if (!s) throw new Error(`Slot ${position} not found`);
  return s;
}
function currentDrawerId(state: GameState): string {
  return state.turnOrder[state.currentTurnIndex];
}

/** Advance to the next eligible player's turn. With 'skip', away (present:false,
 *  non-bot) players are passed over. Other modes land on the player (UI handles it). */
function advanceTurn(state: GameState): number {
  const n = state.turnOrder.length;
  if (n === 0) return 0;
  let idx = state.currentTurnIndex;
  for (let step = 0; step < n; step++) {
    idx = (idx + 1) % n;
    if (state.settings.absentBehavior !== 'skip') return idx;
    const p = state.players.find(pl => pl.id === state.turnOrder[idx]);
    if (!p) return idx;
    if (p.isBot || p.present !== false) return idx; // present (default) or bot → eligible
  }
  return idx; // everyone away — land somewhere to avoid infinite loop
}

function isComplete(state: GameState): boolean {
  return state.ballPool.length === 0 && state.activeChallenge === null;
}

/** End-of-draw-cycle: rotate turn and flip to 'complete' if the pool is dry. */
function completeCycle(state: GameState): GameState {
  const next = { ...state, modal: null, currentTurnIndex: advanceTurn(state) };
  return { ...next, phase: isComplete(next) ? 'complete' : next.phase };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    case 'NAVIGATE':
      return { ...state, phase: action.phase };

    case 'NEW_GAME':
      return { ...initialState };

    case 'SET_PRESENCE':
      return { ...state, players: updatePlayer(state.players, action.playerId, { present: action.present }) };

    case 'SKIP_TURN':
      return { ...state, currentTurnIndex: advanceTurn(state) };

    // ── Game start ───────────────────────────────────────────────────────────
    case 'START_GAME': {
      const settings: GameSettings = action.settings ?? DEFAULT_SETTINGS;

      const players: Player[] = action.players.map(p => ({
        id: puid(),
        name: p.name,
        shotgunCount: 0,
        pendingChallengePickPosition: null,
        isBot: !!p.isBot,
        present: true,
      }));

      const pickSlots: PickSlot[] = players.map((_, i) => ({
        position: i + 1, playerId: null, defenseCount: 0, locked: false,
      }));

      const ballPool = buildBallPool(players);

      // Establish the draw rotation
      let turnOrder = players.map(p => p.id);
      if (settings.turnOrderMode === 'random') turnOrder = shuffle(turnOrder);

      const humanPlayerId = players.find(p => !p.isBot)?.id ?? null;

      return {
        ...state,
        phase: 'playing',
        players, pickSlots, ballPool,
        drawnCount: 0,
        totalBalls: ballPool.length,
        activeChallenge: null,
        modal: null,
        lastDraw: null,
        settings,
        turnOrder,
        currentTurnIndex: 0,
        isMock: !!action.isMock,
        humanPlayerId,
      };
    }

    // ── Draw a ball (drawer = current turn player) ─────────────────────────────
    case 'DRAW_BALL': {
      if (state.ballPool.length === 0 || state.modal !== null || state.activeChallenge) return state;

      const drawerId = currentDrawerId(state);
      const [drawn, ...remaining] = state.ballPool;
      const drawnCount = state.drawnCount + 1;

      // ── PICK BALL → fills the next open draft slot with the named player ──
      if (drawn.type === 'pick') {
        const slot = getNextOpenSlot(state.pickSlots);
        if (!slot) return { ...state, ballPool: remaining, drawnCount };

        const named = state.players.find(p => p.id === drawn.playerId)!;
        const newSlots = updateSlot(state.pickSlots, slot.position, { playerId: named.id });

        // Did someone declare a pending challenge on this exact pick position? (Rule 2)
        const pendingChallenger = state.players.find(p => p.pendingChallengePickPosition === slot.position);

        let newPlayers = state.players;
        let newActiveChallenge: Challenge | null = state.activeChallenge;
        let modal: GameState['modal'] = {
          kind: 'draw-result', ballType: 'pick',
          pickedPlayerId: named.id, pickedPosition: slot.position,
        };

        if (pendingChallenger) {
          if (pendingChallenger.id === named.id) {
            // Their own name filled the challenged pick → swap lost, no defense (Rule 2)
            newPlayers = updatePlayer(newPlayers, pendingChallenger.id, { pendingChallengePickPosition: null });
          } else {
            const challenge: Challenge = {
              id: cuid(),
              challengerId: pendingChallenger.id,
              targetPickPosition: slot.position,
              defenderId: named.id,
              challengerPreviousPickPosition: getSlotForPlayer(state.pickSlots, pendingChallenger.id)?.position ?? null,
              gameType: null,
              status: 'choosing-game',
            };
            newActiveChallenge = challenge;
            newPlayers = updatePlayer(newPlayers, pendingChallenger.id, { pendingChallengePickPosition: null });
            modal = {
              kind: 'draw-result', ballType: 'pick',
              pickedPlayerId: named.id, pickedPosition: slot.position,
              pendingChallengeName: state.players.find(p => p.id === pendingChallenger.id)?.name,
            };
          }
        }

        return {
          ...state,
          ballPool: remaining, drawnCount,
          pickSlots: newSlots, players: newPlayers,
          activeChallenge: newActiveChallenge,
          modal,
          lastDraw: { ballType: 'pick', playerName: named.name, position: slot.position },
        };
      }

      // ── PICK-SWAP BALL → the drawer holds the swap ──
      if (drawn.type === 'pick-swap') {
        const drawer = state.players.find(p => p.id === drawerId)!;

        // Rule 3: holding a pending challenge → must put it back and draw again (same turn)
        if (drawer.pendingChallengePickPosition !== null) {
          const swapBall = { id: `b-reinserted-${Date.now()}`, type: 'pick-swap' as const };
          const pool = [...remaining];
          pool.splice(Math.floor(Math.random() * (pool.length + 1)), 0, swapBall);
          return {
            ...state,
            ballPool: pool, // drawnCount unchanged net (drew one, returned one)
            modal: { kind: 'draw-result', ballType: 'pick-swap', rule3Redraw: true },
            lastDraw: { ballType: 'pick-swap' },
          };
        }

        return {
          ...state,
          ballPool: remaining, drawnCount,
          modal: { kind: 'pending-pick-swap', challengerId: drawerId },
          lastDraw: { ballType: 'pick-swap' },
        };
      }

      // ── SHOTGUN BALL → the drawer drinks ──
      const drawer = state.players.find(p => p.id === drawerId)!;
      const newCount = drawer.shotgunCount + 1;
      if (newCount > 3) {
        return {
          ...state,
          ballPool: remaining, drawnCount,
          modal: { kind: 'shotgun-overflow', playerId: drawerId },
          lastDraw: { ballType: 'shotgun' },
        };
      }
      return {
        ...state,
        ballPool: remaining, drawnCount,
        players: updatePlayer(state.players, drawerId, { shotgunCount: newCount }),
        modal: { kind: 'draw-result', ballType: 'shotgun', pickedPlayerId: drawerId },
        lastDraw: { ballType: 'shotgun', playerName: drawer.name },
      };
    }

    // ── Overflow shotgun gifted to another player → ends the draw cycle ─────────
    case 'GIVE_SHOTGUN': {
      const recipient = state.players.find(p => p.id === action.toPlayerId);
      if (!recipient || recipient.shotgunCount >= 3) return state;
      const players = updatePlayer(state.players, action.toPlayerId, { shotgunCount: recipient.shotgunCount + 1 });
      return completeCycle({ ...state, players });
    }

    // ── Declare a pending challenge on a not-yet-drawn pick → ends draw cycle ───
    case 'SET_PENDING_CHALLENGE': {
      const { challengerId, targetPosition } = action;
      let players = updatePlayer(state.players, challengerId, { pendingChallengePickPosition: targetPosition });

      // If no pick balls remain to ever fill that slot, the pending swap can't trigger — forfeit.
      const remainingPickBalls = state.ballPool.filter(b => b.type === 'pick').length;
      if (remainingPickBalls === 0) {
        players = updatePlayer(players, challengerId, { pendingChallengePickPosition: null });
      }
      return completeCycle({ ...state, players });
    }

    // ── Initiate an immediate challenge on a filled pick ────────────────────────
    case 'INITIATE_CHALLENGE': {
      const { challengerId, targetPickPosition } = action;
      const targetSlot = getSlot(state.pickSlots, targetPickPosition);
      if (!targetSlot.playerId || targetSlot.locked) return state;

      const challenge: Challenge = {
        id: cuid(),
        challengerId,
        targetPickPosition,
        defenderId: targetSlot.playerId,
        challengerPreviousPickPosition: getSlotForPlayer(state.pickSlots, challengerId)?.position ?? null,
        gameType: null,
        status: 'choosing-game',
      };
      return { ...state, activeChallenge: challenge, modal: { kind: 'challenge', challenge } };
    }

    case 'SELECT_CHALLENGE_GAME': {
      if (!state.activeChallenge) return state;
      const updated: Challenge = { ...state.activeChallenge, gameType: action.game as ChallengeGame, status: 'in-progress' };
      return { ...state, activeChallenge: updated, modal: { kind: 'challenge', challenge: updated } };
    }

    // ── Resolve challenge → applies swap / defense, ends the draw cycle ─────────
    case 'RESOLVE_CHALLENGE': {
      if (!state.activeChallenge) return state;
      const ch = state.activeChallenge;
      let newSlots = [...state.pickSlots];

      if (action.challengerWon) {
        const defenderNewPosition = ch.challengerPreviousPickPosition;
        newSlots = updateSlot(newSlots, ch.targetPickPosition, { playerId: ch.challengerId, defenseCount: 0, locked: false });
        if (defenderNewPosition !== null) {
          newSlots = updateSlot(newSlots, defenderNewPosition, { playerId: ch.defenderId, defenseCount: 0, locked: false });
        } else {
          newSlots = newSlots.map(s =>
            s.playerId === ch.defenderId && s.position !== ch.targetPickPosition
              ? { ...s, playerId: null, defenseCount: 0, locked: false } : s);
        }
      } else {
        const targetSlot = getSlot(newSlots, ch.targetPickPosition);
        const newDefenseCount = targetSlot.defenseCount + 1;
        newSlots = updateSlot(newSlots, ch.targetPickPosition, { defenseCount: newDefenseCount, locked: newDefenseCount >= 2 });
      }

      return completeCycle({ ...state, pickSlots: newSlots, activeChallenge: null });
    }

    // ── Close modal ─────────────────────────────────────────────────────────────
    case 'CLOSE_MODAL': {
      // A pick draw that triggered a pending challenge: show the challenge next.
      if (state.activeChallenge && state.modal?.kind === 'draw-result') {
        return { ...state, modal: { kind: 'challenge', challenge: state.activeChallenge } };
      }
      // Rule-3 redraw acknowledgement: same player draws again, no turn change.
      if (state.modal?.kind === 'draw-result' && state.modal.rule3Redraw) {
        return { ...state, modal: null };
      }
      // A completed pick or shotgun draw, or a held pick-swap → end the cycle.
      if (state.modal?.kind === 'draw-result' || state.modal?.kind === 'pending-pick-swap') {
        return completeCycle(state);
      }
      return { ...state, modal: null };
    }

    case 'REPLACE_STATE':
      return action.state;

    default:
      return state;
  }
}
