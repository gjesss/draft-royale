export type GamePhase = 'landing' | 'rules' | 'setup' | 'playing' | 'complete';
export type BallType = 'pick' | 'pick-swap' | 'shotgun';
export type ChallengeGame = 'beer-pong' | 'quarters' | 'flip-cup' | 'holdem';

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
  | { kind: 'draw-result'; ballType: BallType; pickedPlayerId?: string; pickedPosition?: number }
  | { kind: 'assign-swap'; }        // who drew the pick-swap ball?
  | { kind: 'assign-shotgun'; }     // who drew the shotgun ball?
  | { kind: 'shotgun-overflow'; playerId: string }
  | { kind: 'challenge'; challenge: Challenge }
  | { kind: 'pending-pick-swap'; challengerId: string }  // challenger choosing future target
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
}

// ─── Reducer actions ──────────────────────────────────────────────────────────
export type GameAction =
  | { type: 'NAVIGATE'; phase: GamePhase }
  | { type: 'START_GAME'; playerNames: string[] }
  | { type: 'DRAW_BALL' }
  | { type: 'ASSIGN_PICK_SWAP'; playerId: string }
  | { type: 'ASSIGN_SHOTGUN'; playerId: string }
  | { type: 'GIVE_SHOTGUN'; toPlayerId: string }
  | { type: 'SET_PENDING_CHALLENGE'; challengerId: string; targetPosition: number }
  | { type: 'INITIATE_CHALLENGE'; challengerId: string; targetPickPosition: number }
  | { type: 'SELECT_CHALLENGE_GAME'; game: ChallengeGame }
  | { type: 'RESOLVE_CHALLENGE'; challengerWon: boolean }
  | { type: 'CLOSE_MODAL' }
  | { type: 'NEW_GAME' }
  /** Replace entire state from Supabase real-time update (non-commissioner clients) */
  | { type: 'REPLACE_STATE'; state: GameState };
