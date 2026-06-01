export type GamePhase = 'landing' | 'rules' | 'setup' | 'playing' | 'complete';
export type BallType = 'pick' | 'pick-swap' | 'shotgun';
export type ChallengeGame = 'beer-pong' | 'quarters' | 'flip-cup' | 'holdem' | 'high-card';

// ─── Commissioner-configured settings ──────────────────────────────────────────
export type TurnOrderMode = 'manual' | 'random';
export type AbsentBehavior = 'skip' | 'commissioner' | 'wait' | 'auto';
export type BallMode = 'scaled' | 'custom';

export interface GameSettings {
  turnOrderMode: TurnOrderMode;   // how the draw rotation is established
  absentBehavior: AbsentBehavior; // what happens on an away player's turn
  // ── Ball pool configuration (pick balls are always 1 per player) ──
  ballMode: BallMode;             // 'scaled' grows with player count, 'custom' = fixed totals
  swapsPerPlayer: number;         // scaled: pick-swap balls per player
  shotgunsPerPlayer: number;      // scaled: shotgun balls per player
  customSwaps: number;            // custom: total pick-swap balls
  customShotguns: number;         // custom: total shotgun balls
}

export const DEFAULT_SETTINGS: GameSettings = {
  turnOrderMode: 'random',
  absentBehavior: 'skip',
  ballMode: 'scaled',
  swapsPerPlayer: 3,
  shotgunsPerPlayer: 2,
  customSwaps: 30,
  customShotguns: 24,
};

/** Resolve the actual pick-swap / shotgun counts for a given player count. */
export function resolveBallCounts(settings: GameSettings, playerCount: number) {
  if (settings.ballMode === 'custom') {
    return { pickSwaps: settings.customSwaps, shotguns: settings.customShotguns };
  }
  return {
    pickSwaps: Math.round((settings.swapsPerPlayer ?? 0) * playerCount),
    shotguns: Math.round((settings.shotgunsPerPlayer ?? 0) * playerCount),
  };
}

// ─── Ball pool ───────────────────────────────────────────────────────────────
export interface Ball {
  id: string;
  type: BallType;
  playerId?: string; // pick balls are labelled with a player
}

// ─── Player ───────────────────────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  shotgunCount: number;
  /** Non-null when this player holds a pick-swap but is waiting for a future
   *  pick position to be filled before they can challenge it. */
  pendingChallengePickPosition: number | null;
  /** Mock-draft / simulated opponent — auto-plays its turns. */
  isBot?: boolean;
  /** Whether the player is currently active in the app (live play). Default true. */
  present?: boolean;
  /** Auth UID of the league member this player represents (live play). */
  uid?: string;
}

// ─── Pick slots ───────────────────────────────────────────────────────────────
export interface PickSlot {
  position: number;    // 1-indexed draft pick number
  playerId: string | null;
  defenseCount: number; // 0 | 1 | 2  (2 = locked)
  locked: boolean;
}

// ─── Challenges ───────────────────────────────────────────────────────────────
export type ChallengeStatus =
  | 'choosing-target'    // challenger picks which position to attack
  | 'choosing-game'      // both sides pick the mini-game
  | 'in-progress'        // real-life game being played
  | 'resolving';         // recording winner

export interface Challenge {
  id: string;
  challengerId: string;
  /** The pick position being contested */
  targetPickPosition: number;
  defenderId: string;     // player currently holding targetPickPosition
  /** Pick position challenger held BEFORE the swap (null = they had no pick) */
  challengerPreviousPickPosition: number | null;
  gameType: ChallengeGame | null;
  status: ChallengeStatus;
}

// ─── Modal types ──────────────────────────────────────────────────────────────
export type ModalType =
  | { kind: 'draw-result'; ballType: BallType; pickedPlayerId?: string; pickedPosition?: number; rule3Redraw?: boolean; pendingChallengeName?: string }
  | { kind: 'shotgun-overflow'; playerId: string }
  | { kind: 'challenge'; challenge: Challenge }
  | { kind: 'pending-pick-swap'; challengerId: string }  // drawer choosing target / hold
  | null;

// ─── Full game state ──────────────────────────────────────────────────────────
export interface GameState {
  phase: GamePhase;
  players: Player[];
  pickSlots: PickSlot[];
  ballPool: Ball[];
  drawnCount: number;
  totalBalls: number;
  /** The one challenge being actively displayed / played */
  activeChallenge: Challenge | null;
  /** The current modal to show */
  modal: ModalType;
  /** Last-drawn ball info (for display) */
  lastDraw: { ballType: BallType; playerName?: string; position?: number } | null;
  // ── Turn-based play ──
  settings: GameSettings;
  /** Player ids in draw-rotation order. */
  turnOrder: string[];
  /** Index into turnOrder of whose turn it is to draw. */
  currentTurnIndex: number;
  /** True for a local solo mock draft (bots auto-play). */
  isMock: boolean;
  /** In a mock draft, which player is the human. */
  humanPlayerId: string | null;
}

// ─── Reducer actions ──────────────────────────────────────────────────────────
export type GameAction =
  | { type: 'NAVIGATE'; phase: GamePhase }
  | { type: 'START_GAME'; players: { name: string; isBot?: boolean; uid?: string }[]; settings: GameSettings; isMock?: boolean }
  | { type: 'DRAW_BALL' }
  | { type: 'GIVE_SHOTGUN'; toPlayerId: string }
  | { type: 'SET_PENDING_CHALLENGE'; challengerId: string; targetPosition: number }
  | { type: 'INITIATE_CHALLENGE'; challengerId: string; targetPickPosition: number }
  | { type: 'SELECT_CHALLENGE_GAME'; game: ChallengeGame }
  | { type: 'RESOLVE_CHALLENGE'; challengerWon: boolean }
  | { type: 'SKIP_TURN' }
  | { type: 'SET_PRESENCE'; playerId: string; present: boolean }
  | { type: 'CLOSE_MODAL' }
  | { type: 'NEW_GAME' }
  /** Replace entire state from real-time update (non-acting clients) */
  | { type: 'REPLACE_STATE'; state: GameState };
