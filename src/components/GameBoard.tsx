import { useState } from 'react';
import { useGame } from '../store/GameContext';
import { getLockedPlayerIds } from '../utils/gameLogic';
import AssignModal from './modals/AssignModal';
import ShotgunOverflowModal from './modals/ShotgunOverflowModal';
import DrawResultModal from './modals/DrawResultModal';
import ChallengeModal from './modals/ChallengeModal';
import PendingPickSwapModal from './modals/PendingPickSwapModal';

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<'picks' | 'players'>('picks');

  const { ballPool, totalBalls, drawnCount, pickSlots, players, modal, activeChallenge } = state;
  const ballsLeft = ballPool.length;
  const pct = totalBalls > 0 ? ((drawnCount / totalBalls) * 100) : 0;
  const lockedIds = getLockedPlayerIds(pickSlots);

  const canDraw = modal === null && ballPool.length > 0;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3 border-b border-royal-border">
        <div>
          <h1 className="text-lg font-bold neon-text tracking-wide">DRAFT ROYAL</h1>
          <p className="text-gray-500 text-xs">{ballsLeft} balls remaining</p>
        </div>
        <div className="flex gap-2">
          <button
            className="text-gray-400 hover:text-white p-2 text-sm"
            onClick={() => dispatch({ type: 'NAVIGATE', phase: 'rules' })}
          >
            📋
          </button>
          <button
            className="text-gray-400 hover:text-red-400 p-2 text-sm"
            onClick={() => { if (confirm('End this game?')) dispatch({ type: 'NEW_GAME' }); }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-royal-border">
        <div
          className="h-full bg-cyan-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Draw Ball section */}
      <div className="px-4 pt-5 pb-4">
        <div className="relative flex flex-col items-center">
          {/* Ball count ring */}
          <div className="relative mb-4">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke="#00d4ff"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{ballsLeft}</span>
              <span className="text-gray-500 text-xs">balls</span>
            </div>
          </div>

          <button
            className={`w-full max-w-xs py-4 rounded-2xl font-bold text-xl transition-all duration-200
              ${canDraw
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-neon active:scale-95 animate-pulse-cyan'
                : 'bg-royal-card border border-royal-border text-gray-600 cursor-not-allowed'
              }`}
            onClick={() => canDraw && dispatch({ type: 'DRAW_BALL' })}
            disabled={!canDraw}
          >
            {ballsLeft === 0 ? '🎉 All balls drawn!' : '🎱 Draw Ball'}
          </button>

          {activeChallenge && (
            <div className="mt-3 w-full max-w-xs bg-purple-900/30 border border-purple-600 rounded-xl px-4 py-2 text-center">
              <p className="text-purple-300 text-sm font-medium">⚔️ Challenge in progress</p>
              <button
                className="text-purple-400 text-xs underline mt-0.5"
                onClick={() => dispatch({
                  type: 'SELECT_CHALLENGE_GAME',
                  game: activeChallenge.gameType ?? 'beer-pong'
                })}
              >
                View challenge →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-royal-border mx-4">
        {(['picks', 'players'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors
              ${tab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t === 'picks' ? `📋 Draft Order` : `👤 Players`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {tab === 'picks' && (
          <div className="space-y-2">
            {pickSlots.map(slot => {
              const holder = players.find(p => p.id === slot.playerId);
              const hasPending = players.some(p => p.pendingChallengePickPosition === slot.position);

              return (
                <div
                  key={slot.position}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                    ${slot.locked
                      ? 'border-yellow-600/50 bg-yellow-900/10'
                      : slot.playerId
                      ? 'border-royal-border bg-royal-card'
                      : 'border-royal-border/50 bg-black/20 opacity-60'
                    }`}
                >
                  {/* Position number */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                    ${slot.locked ? 'bg-yellow-500 text-black' : 'bg-royal-muted text-gray-300'}`}>
                    {slot.locked ? '👑' : slot.position}
                  </div>

                  {/* Player name */}
                  <div className="flex-1 min-w-0">
                    {holder ? (
                      <p className={`font-semibold truncate ${slot.locked ? 'text-yellow-400' : 'text-white'}`}>
                        {holder.name}
                      </p>
                    ) : (
                      <p className="text-gray-600 text-sm italic">Not yet drawn</p>
                    )}
                    {hasPending && (
                      <p className="text-yellow-500 text-xs">⏳ Challenge incoming...</p>
                    )}
                  </div>

                  {/* Defense indicator */}
                  {slot.playerId && (
                    <div className="flex items-center gap-1 shrink-0">
                      {slot.locked ? (
                        <span className="text-yellow-400 text-xs font-bold px-2 py-1 bg-yellow-900/30 rounded-lg">
                          🔒 LOCKED
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          {[1, 2].map(n => (
                            <div
                              key={n}
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                                ${slot.defenseCount >= n ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'}`}
                            >
                              {slot.defenseCount >= n && <span className="text-black text-xs">✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
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
              const hasPendingChallenge = p.pendingChallengePickPosition !== null;

              return (
                <div
                  key={p.id}
                  className={`card flex items-center gap-3
                    ${isLocked ? 'border-yellow-600/50' : ''}`}
                >
                  {/* Pick badge */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                    ${isLocked ? 'bg-yellow-500 text-black' : slot ? 'bg-cyan-500/20 text-cyan-400' : 'bg-royal-muted text-gray-500'}`}>
                    {isLocked ? '👑' : slot ? `#${slot.position}` : '–'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isLocked ? 'text-yellow-400' : 'text-white'}`}>
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isLocked && (
                        <span className="text-xs text-yellow-500">🔒 Pick locked</span>
                      )}
                      {!isLocked && slot && (
                        <span className="text-xs text-gray-500">
                          🛡 {slot.defenseCount}/2 defenses
                        </span>
                      )}
                      {hasPendingChallenge && (
                        <span className="text-xs text-yellow-400">
                          ⏳ Waiting on pick #{p.pendingChallengePickPosition}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shotguns */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3].map(n => (
                      <span key={n} className={n <= p.shotgunCount ? 'text-orange-400' : 'text-gray-700'}>
                        🍺
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="mt-4 p-3 bg-black/30 border border-royal-border/50 rounded-xl">
              <p className="text-gray-600 text-xs text-center">🍺 = shotgun count (max 3)</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {modal?.kind === 'draw-result' && <DrawResultModal />}
      {modal?.kind === 'assign-swap' && <AssignModal type="pick-swap" />}
      {modal?.kind === 'assign-shotgun' && <AssignModal type="shotgun" />}
      {modal?.kind === 'shotgun-overflow' && <ShotgunOverflowModal playerId={modal.playerId} />}
      {modal?.kind === 'pending-pick-swap' && <PendingPickSwapModal challengerId={modal.challengerId} />}
      {modal?.kind === 'challenge' && <ChallengeModal challenge={modal.challenge} />}
    </div>
  );
}
