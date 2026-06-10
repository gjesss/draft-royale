import { useState } from 'react';
import { useGame } from '../store/GameContext';
import { getLockedPlayerIds } from '../utils/gameLogic';
import { useMockDriver } from '../hooks/useMockDriver';
import { useTurnControl } from '../hooks/useTurnControl';
import DraftBoard, { BoardCell } from './league/DraftBoard';
import Avatar from './ui/Avatar';
import Icon from './ui/Icon';
import ShotgunOverflowModal from './modals/ShotgunOverflowModal';
import DrawResultModal from './modals/DrawResultModal';
import ChallengeModal from './modals/ChallengeModal';
import PendingPickSwapModal from './modals/PendingPickSwapModal';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<'picks' | 'players'>('picks');

  // Drive bot opponents in local mock drafts.
  useMockDriver(state, dispatch);

  const { drawerId, isMyTurn, isCommissioner } = useTurnControl();

  const { ballPool, totalBalls, drawnCount, pickSlots, players, modal, activeChallenge } = state;
  const ballsLeft = ballPool.length;
  const pct = totalBalls > 0 ? ((drawnCount / totalBalls) * 100) : 0;
  const lockedIds = getLockedPlayerIds(pickSlots);

  const drawer = players.find(p => p.id === drawerId);
  const idle = modal === null && !activeChallenge && ballsLeft > 0;
  const canDraw = idle && isMyTurn;
  // Commissioner override: act for whoever's turn it is (away players / stalls)
  const showCommishOverride = idle && !isMyTurn && isCommissioner && !state.isMock;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-royal-border">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" width={32} height={32} className="object-contain" />
          <div>
            <h1 className="text-base font-bold neon-text tracking-wide leading-none">DRAFT ROYALE</h1>
            <p className="text-gray-500 text-xs mt-0.5">{ballsLeft} balls remaining</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="text-gray-400 hover:text-white p-2.5 touch-manipulation"
            onClick={() => dispatch({ type: 'NAVIGATE', phase: 'rules' })}
            aria-label="Rules"
          ><Icon name="book" size={20} /></button>
          <button
            className="text-gray-400 hover:text-red-400 p-2.5 touch-manipulation"
            onClick={() => { if (confirm('End this game?')) dispatch({ type: 'NEW_GAME' }); }}
            aria-label="End game"
          ><Icon name="x" size={20} /></button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-royal-border">
        <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Draw Ball section */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-4">
          {/* Ring counter */}
          <div className="relative shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#1f2937" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none" stroke="#2BE36B" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white leading-none">{ballsLeft}</span>
              <span className="text-gray-500 text-[10px]">left</span>
            </div>
          </div>

          {/* Draw button — fills remaining space */}
          <button
            className={`flex-1 py-5 rounded-xl font-display font-bold uppercase tracking-jersey text-xl transition-all duration-150 touch-manipulation flex items-center justify-center gap-2
              ${canDraw
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-neon active:scale-[0.98] animate-pulse-cyan'
                : 'bg-royal-card border border-royal-border text-gray-600 cursor-not-allowed'
              }`}
            onClick={() => canDraw && dispatch({ type: 'DRAW_BALL' })}
            disabled={!canDraw}
          >
            {ballsLeft === 0
              ? 'Done'
              : isMyTurn ? <><Icon name="target" size={22} /> Draw Ball</> : `${drawer?.name ?? 'Player'}'s turn`}
          </button>
        </div>

        {/* Turn indicator */}
        {ballsLeft > 0 && !activeChallenge && (
          <div className="mt-3 text-center">
            {isMyTurn
              ? <p className="text-cyan-400 text-sm font-medium">
                  {state.isMock ? 'Your turn to draw' : "You're up — draw a ball"}
                </p>
              : <p className="text-gray-500 text-sm">Waiting on <span className="text-white font-medium">{drawer?.name}</span>…</p>}
          </div>
        )}

        {/* Commissioner override for an away / stalled player */}
        {showCommishOverride && (
          <div className="mt-3 flex gap-2 justify-center">
            <button
              className="text-sm px-4 py-2 rounded-lg bg-cyan-900/30 text-cyan-300 border border-cyan-800 active:scale-95"
              onClick={() => dispatch({ type: 'DRAW_BALL' })}
            >
              Draw for {drawer?.name}
            </button>
            <button
              className="text-sm px-4 py-2 rounded-lg bg-royal-muted text-gray-300 active:scale-95"
              onClick={() => dispatch({ type: 'SKIP_TURN' })}
            >
              Skip turn
            </button>
          </div>
        )}

        {activeChallenge && (
          <div className="mt-3 bg-violet-900/30 border border-violet-600/60 rounded-xl px-4 py-2.5 text-center">
            <p className="text-violet-300 text-sm font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5"><Icon name="swords" size={15} /> Challenge in progress</p>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-royal-border mx-4">
        {(['picks', 'players'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition-colors touch-manipulation
              ${tab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500'}`}
          >
            {t === 'picks' ? 'Draft Order' : 'Players'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-safe">

        {tab === 'picks' && (() => {
          const firstOpen = pickSlots.find(s => s.playerId === null)?.position;
          const cells: BoardCell[] = pickSlots.map(s => {
            const holder = players.find(p => p.id === s.playerId);
            return {
              position: s.position,
              name: holder?.name ?? null,
              seed: holder?.uid ?? holder?.id ?? holder?.name,
              locked: s.locked,
              defenseCount: s.defenseCount,
              onClock: s.position === firstOpen,
            };
          });
          return <DraftBoard cells={cells} />;
        })()}

        {tab === 'players' && (
          <div className="space-y-2">
            {players.map(p => {
              const slot = pickSlots.find(s => s.playerId === p.id);
              const isLocked = lockedIds.has(p.id);
              return (
                <div key={p.id} className={`card flex items-center gap-3 ${isLocked ? '!border-gold-700/50' : ''}`}>
                  <div className="relative shrink-0">
                    <Avatar name={p.name} seed={p.uid ?? p.id} size="md" ring={isLocked} />
                    <span className={`absolute -bottom-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold tnum border border-royal-dark
                      ${isLocked ? 'bg-gold-400 text-black' : slot ? 'bg-cyan-500 text-black' : 'bg-royal-muted text-gray-400'}`}>
                      {isLocked ? <Icon name="lock" size={10} strokeWidth={3} /> : slot ? slot.position : '–'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isLocked ? 'text-gold-400' : 'text-white'}`}>{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {isLocked && <span className="flex items-center gap-1 text-xs text-gold-500"><Icon name="lock" size={11} /> Locked</span>}
                      {!isLocked && slot && <span className="flex items-center gap-1 text-xs text-gray-500"><Icon name="shield" size={11} /> {slot.defenseCount}/2</span>}
                      {p.pendingChallengePickPosition !== null && (
                        <span className="flex items-center gap-1 text-xs text-gold-400"><Icon name="clock" size={11} /> Pick #{p.pendingChallengePickPosition}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" title="Shotgun count">
                    {[1, 2, 3].map(n => (
                      <Icon key={n} name="cup" size={16} className={n <= p.shotgunCount ? 'text-orange-400' : 'text-royal-muted'} />
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-gray-600 text-[11px] text-center pt-1 uppercase tracking-wide">Cups = shotguns drawn (max 3)</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.kind === 'draw-result'    && <DrawResultModal />}
      {modal?.kind === 'shotgun-overflow' && <ShotgunOverflowModal playerId={modal.playerId} />}
      {modal?.kind === 'pending-pick-swap' && <PendingPickSwapModal challengerId={modal.challengerId} />}
      {modal?.kind === 'challenge'      && <ChallengeModal challenge={modal.challenge} />}
    </div>
  );
}
