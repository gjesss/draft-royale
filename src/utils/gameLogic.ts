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

// ─── Texas Hold'em ──────────────────────────────────────────────────────────
function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  return shuffle(deck);
}

/** Deal a no-betting Hold'em board: 2 hole cards each + 5 community. */
export function dealHoldem(): { cHole: [Card, Card]; dHole: [Card, Card]; community: Card[] } {
  const d = freshDeck();
  return {
    cHole: [d[0], d[1]],
    dHole: [d[2], d[3]],
    community: [d[4], d[5], d[6], d[7], d[8]],
  };
}

const HAND_NAMES = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

/** Score a 5-card hand → [category, ...tiebreakers], higher is better. */
function score5(cards: Card[]): number[] {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let isStraight = false, straightHigh = 0;
  if (uniq.length === 5 && ranks[0] - ranks[4] === 4) { isStraight = true; straightHigh = ranks[0]; }
  if ([14, 5, 4, 3, 2].every(r => ranks.includes(r))) { isStraight = true; straightHigh = 5; } // wheel

  const counts: Record<number, number> = {};
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1; });
  const groups = Object.entries(counts)
    .map(([r, c]) => [Number(r), c] as [number, number])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const sizes = groups.map(g => g[1]);
  const byGroup = groups.map(g => g[0]);

  let cat: number;
  if (isStraight && isFlush) cat = 8;
  else if (sizes[0] === 4) cat = 7;
  else if (sizes[0] === 3 && sizes[1] === 2) cat = 6;
  else if (isFlush) cat = 5;
  else if (isStraight) cat = 4;
  else if (sizes[0] === 3) cat = 3;
  else if (sizes[0] === 2 && sizes[1] === 2) cat = 2;
  else if (sizes[0] === 2) cat = 1;
  else cat = 0;

  const tb = (cat === 8 || cat === 4) ? [straightHigh] : byGroup;
  return [cat, ...tb];
}

function compareScore(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Best 5-of-7 score + its hand name. */
export function bestHand(seven: Card[]): { score: number[]; name: string } {
  let best: number[] | null = null;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const five = seven.filter((_, i) => i !== a && i !== b);
    const s = score5(five);
    if (!best || compareScore(s, best) > 0) best = s;
  }
  return { score: best!, name: HAND_NAMES[best![0]] };
}

/** Winner of a Hold'em hand: 'c' | 'd' | 'tie'. */
export function holdemWinner(cHole: Card[], dHole: Card[], community: Card[]): {
  winner: 'c' | 'd' | 'tie'; cName: string; dName: string;
} {
  const c = bestHand([...cHole, ...community]);
  const d = bestHand([...dHole, ...community]);
  const cmp = compareScore(c.score, d.score);
  return { winner: cmp > 0 ? 'c' : cmp < 0 ? 'd' : 'tie', cName: c.name, dName: d.name };
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
export const BALL_DISPLAY: Record<BallType, { label: string; color: string; description: string }> = {
  'pick': {
    label: 'PICK BALL',
    color: 'text-cyan-400',
    description: 'A player name has been drawn!',
  },
  'pick-swap': {
    label: 'PICK SWAP',
    color: 'text-violet-400',
    description: 'Challenge any draft pick position!',
  },
  'shotgun': {
    label: 'SHOTGUN',
    color: 'text-orange-400',
    description: 'Shotgun a beer! (Max 3 per player)',
  },
};

export const CHALLENGE_GAME_DISPLAY: Record<string, { label: string; description: string }> = {
  'beer-pong': {
    label: 'Beer Pong',
    description: '6 cups · 5 min max · most cups after time wins · tie → first to gain lead wins',
  },
  'quarters': {
    label: 'Quarters',
    description: 'First to 3 · 5 min max · most wins after time · tie → first to gain lead wins',
  },
  'flip-cup': {
    label: 'Flip Cup 1v1',
    description: '3 cups · chug & first to flip all 3 cups wins',
  },
  'holdem': {
    label: "Hold'em",
    description: 'Deal one hand · best hand wins · tie → high card playoff',
  },
  'high-card': {
    label: 'High Card',
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
