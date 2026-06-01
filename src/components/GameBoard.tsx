import { useState } from 'react';
import { useGame } from '../store/GameContext';
import { getLockedPlayerIds } from '../utils/gameLogic';
import { useMockDriver } from '../hooks/useMockDriver';
import ShotgunOverflowModal from './modals/ShotgunOverflowModal';
import DrawResultModal from './modals/DrawResultModal';
import ChallengeModal from './modals/ChallengeModal';
import PendingPickSwapModal from './modals/PendingPickSwapModal';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<'picks' | 'players'>('picks');

  // Drive bot opponents in local mock drafts.
  useMockDriver(state, dispatch);

  const { ballPool, totalBalls, drawnCount, pickSlots, players, modal, activeChallenge } = state;
  const ballsLeft = ballPool.length;
  const pct = totalBalls > 0 ? ((drawnCount / totalBalls) * 100) : 0;
  const lockedIds = getLockedPlayerIds(pickSlots);

  // Whose turn is it to draw?
  const drawerId = state.turnOrder[state.currentTurnIndex];
  const drawer = players.find(p => p.id === drawerId);
  // In mock, only the human may press Draw on their turn. (Live gating added later.)
  const myTurn = !state.isMock || drawerId === state.humanPlayerId;
  const canDraw = modal === null && !activeChallenge && ballsLeft > 0 && myTurn;

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
            className="text-gray-400 hover:text-white p-3 text-lg touch-manipulation"
            onClick={() => dispatch({ type: 'NAVIGATE', phase: 'rules' })}
          >📋</button>
          <button
            className="text-gray-400 hover:text-red-400 p-3 text-lg touch-manipulation"
            onClick={() => { if (confirm('End this game?')) dispatch({ type: 'NEW_GAME' }); }}
          >✕</button>
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
                cx="40" cy="40" r="34" fill="none" stroke="#00d4ff" strokeWidth="6"
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
            className={`flex-1 py-5 rounded-2xl font-bold text-xl transition-all duration-200 touch-manipulation
              ${canDraw
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-neon active:scale-95 animate-pulse-cyan'
                : 'bg-royal-card border border-royal-border text-gray-600 cursor-not-allowed'
              }`}
            onClick={() => canDraw && dispatch({ type: 'DRAW_BALL' })}
            disabled={!canDraw}
          >
            {ballsLeft === 0
              ? '🎉 Done!'
              : myTurn ? '🎱 Draw Ball' : `⏳ ${drawer?.name ?? 'Player'}'s turn`}
          </button>
        </div>

        {/* Turn indicator */}
        {ballsLeft > 0 && !activeChallenge && (
          <div className="mt-3 text-center">
            {myTurn
              ? <p className="text-cyan-400 text-sm font-medium">
                  {state.isMock ? 'Your turn to draw' : `Draw, ${drawer?.name ?? ''}`}
                </p>
              : <p className="text-gray-500 text-sm">Waiting on <span className="text-white font-medium">{drawer?.name}</span>…</p>}
          </div>
        )}

        {activeChallenge && (
          <div className="mt-3 bg-purple-900/30 border border-purple-600 rounded-xl px-4 py-2.5 text-center">
            <p className="text-purple-300 text-sm font-medium">⚔️ Challenge in progress</p>
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
            {t === 'picks' ? '📋 Draft Order' : '👤 Players'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-safe">

        {tab === 'picks' && (
          <div className="space-y-2">
            {pickSlots.map(slot => {
              const holder = players.find(p => p.id === slot.playerId);
              const hasPending = players.some(p => p.pendingChallengePickPosition === slot.position);
              return (
                <div
                  key={slot.position}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all
                    ${slot.locked
                      ? 'border-yellow-600/50 bg-yellow-900/10'
                      : slot.playerId
                      ? 'border-royal-border bg-royal-card'
                      : 'border-royal-border/40 bg-black/20 opacity-50'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                    ${slot.locked ? 'bg-yellow-500 text-black' : 'bg-royal-muted text-gray-300'}`}>
                    {slot.locked ? '👑' : slot.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    {holder
                      ? <p className={`font-semibold truncate text-base ${slot.locked ? 'text-yellow-400' : 'text-white'}`}>{holder.name}</p>
                      : <p className="text-gray-600 text-sm italic">Not yet drawn</p>
                    }
                    {hasPending && <p className="text-yellow-500 text-xs mt-0.5">⏳ Challenge incoming...</p>}
                  </div>
                  {slot.playerId && (
                    slot.locked
                      ? <span className="text-yellow-400 text-xs font-bold px-2 py-1 bg-yellow-900/30 rounded-lg shrink-0">🔒 LOCKED</span>
                      : <div className="flex gap-1 shrink-0">
                          {[1, 2].map(n => (
                            <div key={n} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                              ${slot.defenseCount >= n ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'}`}>
                              {slot.defenseCount >= n && <span className="text-black text-xs">✓</span>}
                            </div>
                          ))}
                        </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'players' && (
          <div className="space-y-2">
            {players.map(p => {
              const slot = pickSlots.find(s => s.playerId === p.id);
              const isLocked = lockedIds.has(p.id);
              return (
                <div key={p.id} className={`card flex items-center gap-3 ${isLocked ? 'border-yellow-600/50' : ''}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                    ${isLocked ? 'bg-yellow-500 text-black' : slot ? 'bg-cyan-500/20 text-cyan-400' : 'bg-royal-muted text-gray-500'}`}>
                    {isLocked ? '👑' : slot ? `#${slot.position}` : '–'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isLocked ? 'text-yellow-400' : 'text-white'}`}>{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {isLocked && <span className="text-xs text-yellow-500">🔒 Pick locked</span>}
                      {!isLocked && slot && <span className="text-xs text-gray-500">🛡 {slot.defenseCount}/2</span>}
                      {p.pendingChallengePickPosition !== null && (
                        <span className="text-xs text-yellow-400">⏳ Pick #{p.pendingChallengePickPosition}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3].map(n => (
                      <span key={n} className={`text-base ${n <= p.shotgunCount ? 'text-orange-400' : 'text-gray-700'}`}>🍺</span>
                    ))}
                  </div>
                </div>
              );
            })}
            <p className="text-gray-600 text-xs text-center pt-1">🍺 = shotgun count (max 3)</p>
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
