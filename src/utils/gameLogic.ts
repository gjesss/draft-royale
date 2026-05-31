import { Ball, BallType, GameState, PickSlot, Player } from '../types/game';

// ─── Ball pool builder ────────────────────────────────────────────────────────
const PICK_SWAP_COUNT = 30;
const SHOTGUN_COUNT = 24;

let _ballCounter = 0;
const uid = () => `b${++_ballCounter}`;

export function buildBallPool(players: Player[]): Ball[] {
  const balls: Ball[] = [];

  // One pick ball per player (labelled with their id)
  for (const p of players) {
    balls.push({ id: uid(), type: 'pick', playerId: p.id });
  }

  for (let i = 0; i < PICK_SWAP_COUNT; i++) {
    balls.push({ id: uid(), type: 'pick-swap' });
  }

  for (let i = 0; i < SHOTGUN_COUNT; i++) {
    balls.push({ id: uid(), type: 'shotgun' });
  }

  return shuffle(balls);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Pick slot helpers ────────────────────────────────────────────────────────
export function getNextOpenSlot(slots: PickSlot[]): PickSlot | undefined {
  return slots.find(s => s.playerId === null);
}

export function getSlotForPlayer(slots: PickSlot[], playerId: string): PickSlot | undefined {
  return slots.find(s => s.playerId === playerId);
}

export function getSlotByPosition(slots: PickSlot[], position: number): PickSlot | undefined {
  return slots.find(s => s.position === position);
}

// ─── Player helpers ───────────────────────────────────────────────────────────
export function getPlayer(players: Player[], id: string): Player | undefined {
  return players.find(p => p.id === id);
}

// ─── Ball type display ────────────────────────────────────────────────────────
export const BALL_DISPLAY: Record<BallType, { label: string; color: string; emoji: string; description: string }> = {
  'pick': {
    label: 'PICK BALL',
    color: 'text-cyan-400',
    emoji: '🎯',
    description: 'A player name has been drawn!',
  },
  'pick-swap': {
    label: 'PICK SWAP',
    color: 'text-purple-400',
    emoji: '🔄',
    description: 'Challenge any draft pick position!',
  },
  'shotgun': {
    label: 'SHOTGUN',
    color: 'text-orange-400',
    emoji: '🍺',
    description: 'Shotgun a beer! (Max 3 per player)',
  },
};

export const CHALLENGE_GAME_DISPLAY: Record<string, { label: string; emoji: string; description: string }> = {
  'beer-pong': {
    label: 'Beer Pong',
    emoji: '🏓',
    description: '6 cups · 5 min max · most cups after time wins · tie → first to gain lead wins',
  },
  'quarters': {
    label: 'Quarters',
    emoji: '🪙',
    description: 'First to 3 · 5 min max · most wins after time · tie → first to gain lead wins',
  },
  'flip-cup': {
    label: 'Flip Cup 1v1',
    emoji: '🥤',
    description: '3 cups · chug & first to flip all 3 cups wins',
  },
  'holdem': {
    label: "Hold'em",
    emoji: '🃏',
    description: 'Deal one hand · best hand wins · tie → high card playoff',
  },
};

// ─── Derived state helpers ────────────────────────────────────────────────────
export function isGameOver(state: GameState): boolean {
  return state.ballPool.length === 0 && state.activeChallenge === null;
}

export function allPicksFilled(state: GameState): boolean {
  return state.pickSlots.every(s => s.playerId !== null);
}

export function getLockedPlayerIds(slots: PickSlot[]): Set<string> {
  return new Set(slots.filter(s => s.locked && s.playerId).map(s => s.playerId!));
}
