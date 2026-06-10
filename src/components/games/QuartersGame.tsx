import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/GameContext';
import { useTurnControl } from '../../hooks/useTurnControl';
import { Challenge } from '../../types/game';

// Timing bar: a marker sweeps left↔right; tap inside the green zone to sink the bounce.
const ZONE_MIN = 0.42;
const ZONE_MAX = 0.58;

export default function QuartersGame({ challenge }: { challenge: Challenge }) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();

  const challenger = state.players.find(p => p.id === challenge.challengerId);
  const defender = state.players.find(p => p.id === challenge.defenderId);
  const mini = challenge.mini?.kind === 'quarters' ? challenge.mini : null;
  const canAct = canActAs(challenge.challengerId) || canActAs(challenge.defenderId);

  const [marker, setMarker] = useState(0);
  const [bounced, setBounced] = useState(false);
  const rafRef = useRef<number | null>(null);
  const t0 = useRef<number>(0);

  const shooterId = mini && (mini.turn === 'c' ? challenge.challengerId : challenge.defenderId);
  const shooterName = mini && (mini.turn === 'c' ? challenger?.name : defender?.name);
  const myTurn = !!mini && canActAs(shooterId) && mini.phase === 'playing' && !bounced;

  // Animate the sweeping marker on the active shooter's device
  useEffect(() => {
    if (!myTurn) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const loop = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const t = (ts - t0.current) / 900; // ~0.9s per sweep
      setMarker((Math.sin(t * Math.PI * 2) + 1) / 2); // 0..1 oscillation
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [myTurn, mini?.turn]);

  // 5-minute timer
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!mini || !mini.startedAt || mini.phase !== 'playing') { setRemaining(null); return; }
    const tick = () => {
      const left = Math.max(0, 300 - Math.floor((Date.now() - mini.startedAt!) / 1000));
      setRemaining(left);
      if (left <= 0 && canActAs(shooterId)) dispatch({ type: 'QUARTERS_TIMEUP' });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mini?.startedAt, mini?.phase, shooterId]);

  if (!mini) {
    return (
      <div className="text-center">
        <div className="bg-black/50 border border-royal-border rounded-xl p-3 mb-4">
          <p className="text-white font-bold">Quarters</p>
          <p className="text-gray-500 text-xs">Tap when the marker hits the green zone to sink it · first to 3 · 5-min cap</p>
        </div>
        {canAct
          ? <button className="btn-primary w-full" onClick={() => dispatch({ type: 'START_QUARTERS', startedAt: Date.now() })}>Start</button>
          : <p className="text-gray-500 text-sm py-3">Getting ready…</p>}
      </div>
    );
  }

  const done = mini.phase === 'done';

  const bounce = () => {
    if (!myTurn) return;
    const success = marker >= ZONE_MIN && marker <= ZONE_MAX;
    setBounced(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimeout(() => {
      setBounced(false); t0.current = 0;
      dispatch({ type: 'QUARTERS_ATTEMPT', success });
    }, 550);
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-purple-400">{challenger?.name}: {mini.makes.c}/3</span>
        {remaining != null && <span className="text-yellow-400 font-mono">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}
        <span className="text-cyan-400">{defender?.name}: {mini.makes.d}/3</span>
      </div>

      {!done && (
        <p className="text-center text-xs mb-2">
          {myTurn
            ? <span className="text-cyan-400 font-medium">Your bounce — tap in the green</span>
            : <span className="text-gray-400">Waiting on <span className="text-white">{shooterName}</span>…</span>}
        </p>
      )}

      {/* Timing bar */}
      <div className="relative w-full h-12 rounded-xl border border-royal-border bg-black/50 overflow-hidden mb-2">
        <div className="absolute top-0 bottom-0 bg-green-600/40 border-x-2 border-green-400"
          style={{ left: `${ZONE_MIN * 100}%`, width: `${(ZONE_MAX - ZONE_MIN) * 100}%` }} />
        {(myTurn || bounced) && (
          <div className="absolute top-0 bottom-0 w-1 bg-white" style={{ left: `${marker * 100}%` }} />
        )}
      </div>

      {!done && mini.lastAttempt && !myTurn && !bounced && (
        <p className={`text-sm font-bold mb-2 ${mini.lastAttempt.success ? 'text-green-400' : 'text-gray-500'}`}>
          {mini.lastAttempt.success ? 'SANK IT' : 'MISSED'}
        </p>
      )}

      {done ? (
        <div className="mt-2">
          <p className="text-xl font-bold text-white mb-2">{(mini.winner === 'c' ? challenger : defender)?.name} wins</p>
          {canAct
            ? <button className="btn-primary w-full" onClick={() => dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon: mini.winner === 'c' })}>Apply Result</button>
            : <p className="text-gray-500 text-sm">Waiting for the result…</p>}
        </div>
      ) : myTurn ? (
        <button className="btn-primary w-full" onClick={bounce}>Bounce</button>
      ) : null}
    </div>
  );
}
