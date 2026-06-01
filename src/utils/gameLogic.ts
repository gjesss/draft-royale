import { Ball, BallType, GameState, PickSlot, Player, Card, Suit } from '../types/game';

// ─── Cards (High Card, Hold'em) ─────────────────────────────────────────────
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
export const SUIT_SYMBOL: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

export function randomCard(): Card {
  const rank = 2 + Math.floor(Math.random() * 13); // 2..14
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { rank, suit };
}

export function rankLabel(rank: number): string {
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank] ?? String(rank);
}

// ─── Ball pool builder ────────────────────────────────────────────────────────
let _ballCounter = 0;
const uid = () => `b${++_ballCounter}`;

/** Build the can: one pick (name) ball per player, plus the configured number
 *  of pick-swap and shotgun balls. */
export function buildBallPool(
  players: Player[],
  counts: { pickSwaps: number; shotguns: number } = { pickSwaps: 30, shotguns: 24 },
): Ball[] {
  const balls: Ball[] = [];

  // One pick ball per player (labelled with their id)
  for (const p of players) {
    balls.push({ id: uid(), type: 'pick', playerId: p.id });
  }

  for (let i = 0; i < Math.max(0, counts.pickSwaps); i++) {
    balls.push({ id: uid(), type: 'pick-swap' });
  }

  for (let i = 0; i < Math.max(0, counts.shotguns); i++) {
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
  'high-card': {
    label: 'High Card',
    emoji: '🂠',
    description: 'Each player draws one card · highest card wins · re-draw on a tie',
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
