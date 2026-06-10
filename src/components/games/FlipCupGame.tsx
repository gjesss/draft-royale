import { useRef, useState } from 'react';
import { useGame } from '../../store/GameContext';
import { useTurnControl } from '../../hooks/useTurnControl';
import { Challenge } from '../../types/game';

// Flick the cup up to flip it ~180°. Power maps to rotation; land rim-down to win.
const SUCCESS_MIN = 150;
const SUCCESS_MAX = 215;
const POWER_TO_DEG = 520; // drag fraction → degrees

export default function FlipCupGame({ challenge }: { challenge: Challenge }) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();

  const challenger = state.players.find(p => p.id === challenge.challengerId);
  const defender = state.players.find(p => p.id === challenge.defenderId);
  const mini = challenge.mini?.kind === 'flip-cup' ? challenge.mini : null;
  const canAct = canActAs(challenge.challengerId) || canActAs(challenge.defenderId);

  const areaRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const [rot, setRot] = useState(0);
  const [flipping, setFlipping] = useState(false);

  if (!mini) {
    return (
      <div className="text-center">
        <div className="bg-black/50 border border-royal-border rounded-xl p-3 mb-4">
          <p className="text-white font-bold">Flip Cup</p>
          <p className="text-gray-500 text-xs">Chug, then flick the cup to flip it rim-down · first to 3 wins · take turns</p>
        </div>
        {canAct
          ? <button className="btn-primary w-full" onClick={() => dispatch({ type: 'START_FLIPCUP' })}>Chug & Start</button>
          : <p className="text-gray-500 text-sm py-3">Getting ready…</p>}
      </div>
    );
  }

  const shooterId = mini.turn === 'c' ? challenge.challengerId : challenge.defenderId;
  const shooterName = mini.turn === 'c' ? challenger?.name : defender?.name;
  const myTurn = canActAs(shooterId) && mini.phase === 'playing' && !flipping;
  const done = mini.phase === 'done';

  const endDrag = (clientY: number) => {
    if (dragStart.current == null || !myTurn) { dragStart.current = null; return; }
    const r = areaRef.current!.getBoundingClientRect();
    const dragFrac = Math.max(0, (dragStart.current - clientY) / r.height); // upward drag
    dragStart.current = null;
    const deg = dragFrac * POWER_TO_DEG + (Math.random() - 0.5) * 20;
    setFlipping(true);
    setRot(deg);
    setTimeout(() => {
      const success = deg >= SUCCESS_MIN && deg <= SUCCESS_MAX;
      setTimeout(() => {
        setFlipping(false); setRot(0);
        dispatch({ type: 'FLIPCUP_ATTEMPT', success });
      }, 500);
    }, 550);
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-purple-400">{challenger?.name}: {mini.flips.c}/3</span>
        <span className="text-cyan-400">{defender?.name}: {mini.flips.d}/3</span>
      </div>

      {!done && (
        <p className="text-center text-xs mb-1">
          {myTurn
            ? <span className="text-cyan-400 font-medium">Your flip — flick up to flip</span>
            : <span className="text-gray-400">Waiting on <span className="text-white">{shooterName}</span>…</span>}
        </p>
      )}

      {/* Flip area */}
      <div
        ref={areaRef}
        onPointerDown={e => { if (myTurn) { dragStart.current = e.clientY; (e.target as Element).setPointerCapture?.(e.pointerId); } }}
        onPointerUp={e => endDrag(e.clientY)}
        onPointerCancel={e => endDrag(e.clientY)}
        className="relative w-full rounded-2xl border border-royal-border bg-gradient-to-b from-amber-950/40 to-black overflow-hidden touch-none select-none flex items-end justify-center"
        style={{ height: 260 }}
      >
        {/* Table edge */}
        <div className="absolute bottom-10 left-0 right-0 h-1 bg-amber-800/60" />
        {/* Cup */}
        <div className="mb-8 transition-transform" style={{
          transition: flipping ? 'transform 0.55s cubic-bezier(.4,1.4,.6,1)' : 'none',
          transform: `rotate(${rot}deg)`,
        }}>
          <div className="w-12 h-16 rounded-b-md bg-red-600/70 border-2 border-red-400"
            style={{ borderTopWidth: 4 }} />
        </div>
        {!done && mini.lastAttempt && !flipping && (
          <p className={`absolute top-2 left-0 right-0 text-sm font-bold ${mini.lastAttempt.success ? 'text-green-400' : 'text-gray-500'}`}>
            {mini.lastAttempt.success ? 'FLIPPED' : 'MISSED'}
          </p>
        )}
      </div>

      {done ? (
        <div className="mt-4">
          <p className="text-xl font-bold text-white mb-2">{(mini.winner === 'c' ? challenger : defender)?.name} wins</p>
          {canAct
            ? <button className="btn-primary w-full" onClick={() => dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon: mini.winner === 'c' })}>Apply Result</button>
            : <p className="text-gray-500 text-sm">Waiting for the result…</p>}
        </div>
      ) : (
        myTurn && <p className="text-gray-500 text-xs mt-2">Drag up from the cup and release — find the right power to land it rim-down</p>
      )}
    </div>
  );
}
