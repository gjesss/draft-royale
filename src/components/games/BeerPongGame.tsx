import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/GameContext';
import { useTurnControl } from '../../hooks/useTurnControl';
import { Challenge } from '../../types/game';

// ── Physics / layout constants (normalized 0..1 within the play area) ──
const LAUNCH = { x: 0.5, y: 0.9 };
const PULL_SCALE = 1.85;     // how far a drag throws the ball
const CUP_R = 0.055;         // cup radius
const HIT_FACTOR = 1.15;     // aim-assist on the hit test
const JITTER = 0.018;        // small randomness so perfect aim isn't guaranteed
const ROWS: Record<number, number[]> = { 1: [1], 3: [2, 1], 6: [3, 2, 1], 10: [4, 3, 2, 1] };
const CUP_OPTIONS = [1, 3, 6, 10];

interface Pt { x: number; y: number }

function cupPositions(cups: number): Pt[] {
  const rows = ROWS[cups] ?? ROWS[6];
  const yTop = 0.10, yBot = 0.40;
  const pts: Pt[] = [];
  rows.forEach((n, ri) => {
    const y = rows.length === 1 ? 0.20 : yTop + (ri * (yBot - yTop)) / (rows.length - 1);
    for (let j = 0; j < n; j++) {
      const x = 0.5 + (j - (n - 1) / 2) * 0.16;
      pts.push({ x, y });
    }
  });
  return pts;
}

export default function BeerPongGame({ challenge }: { challenge: Challenge }) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();

  const challenger = state.players.find(p => p.id === challenge.challengerId);
  const defender = state.players.find(p => p.id === challenge.defenderId);
  const mini = challenge.mini?.kind === 'beer-pong' ? challenge.mini : null;

  // Config phase (no mini yet)
  const canConfigure = canActAs(challenge.challengerId) || canActAs(challenge.defenderId);
  const [cups, setCups] = useState(6);
  const [timeLimit, setTimeLimit] = useState(false);

  if (!mini) {
    return (
      <div className="text-center">
        <div className="bg-black/50 border border-royal-border rounded-xl p-3 mb-4">
          <p className="text-white font-bold">Beer Pong</p>
          <p className="text-gray-500 text-xs">Drag to aim · 2 shots per turn · sink both = balls back · clear the rack to win</p>
        </div>
        {!canConfigure ? (
          <p className="text-gray-500 text-sm py-3">Setting up the table…</p>
        ) : (
          <>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Cups per side</p>
            <div className="flex justify-center gap-2 mb-4">
              {CUP_OPTIONS.map(n => (
                <button key={n} onClick={() => setCups(n)}
                  className={`w-12 h-12 rounded-xl font-bold ${cups === n ? 'bg-cyan-500 text-black' : 'bg-royal-muted text-gray-300'}`}>
                  {n}
                </button>
              ))}
            </div>
            <label className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-300">
              <input type="checkbox" checked={timeLimit} onChange={e => setTimeLimit(e.target.checked)} className="w-4 h-4" />
              5-minute time limit (most cups wins at time)
            </label>
            <button className="btn-primary w-full"
              onClick={() => dispatch({ type: 'START_BEERPONG', cups, timeLimit, startedAt: Date.now() })}>
              Rack 'em — Start
            </button>
          </>
        )}
      </div>
    );
  }

  return <BeerPongTable challenge={challenge} mini={mini} dispatch={dispatch}
    canActAs={canActAs} challengerName={challenger?.name ?? 'Challenger'} defenderName={defender?.name ?? 'Defender'} />;
}

function BeerPongTable({ challenge, mini, dispatch, canActAs, challengerName, defenderName }: {
  challenge: Challenge;
  mini: Extract<NonNullable<Challenge['mini']>, { kind: 'beer-pong' }>;
  dispatch: ReturnType<typeof useGame>['dispatch'];
  canActAs: (id: string | null | undefined) => boolean;
  challengerName: string; defenderName: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Pt | null>(null);
  const [ball, setBall] = useState<Pt>(LAUNCH);
  const [scale, setScale] = useState(1);
  const [throwing, setThrowing] = useState(false);
  const rafRef = useRef<number | null>(null);

  const shooterIsC = mini.turn === 'c';
  const shooterId = shooterIsC ? challenge.challengerId : challenge.defenderId;
  const shooterName = shooterIsC ? challengerName : defenderName;
  const targetRack = shooterIsC ? mini.racks.d : mini.racks.c;
  const targetName = shooterIsC ? defenderName : challengerName;
  const myShot = canActAs(shooterId) && mini.phase === 'playing' && !throwing;
  const positions = cupPositions(mini.config.cups);

  // Optional countdown timer
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!mini.config.timeLimit || !mini.startedAt || mini.phase !== 'playing') { setRemaining(null); return; }
    const tick = () => {
      const left = Math.max(0, 300 - Math.floor((Date.now() - mini.startedAt!) / 1000));
      setRemaining(left);
      if (left <= 0 && canActAs(shooterId)) dispatch({ type: 'BEERPONG_TIMEUP' });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mini.config.timeLimit, mini.startedAt, mini.phase, shooterId]);

  const norm = (e: React.PointerEvent): Pt => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => { if (myShot) { setDrag(norm(e)); (e.target as Element).setPointerCapture?.(e.pointerId); } };
  const onMove = (e: React.PointerEvent) => { if (drag) setDrag(norm(e)); };
  const onUp = () => {
    if (!drag || !myShot) { setDrag(null); return; }
    const pull = { x: LAUNCH.x - drag.x, y: LAUNCH.y - drag.y };
    let land = {
      x: LAUNCH.x + pull.x * PULL_SCALE + (Math.random() - 0.5) * JITTER * 2,
      y: LAUNCH.y + pull.y * PULL_SCALE + (Math.random() - 0.5) * JITTER * 2,
    };
    land = { x: Math.max(0, Math.min(1, land.x)), y: Math.max(0, Math.min(1, land.y)) };
    setDrag(null);
    animateThrow(land);
  };

  const animateThrow = (land: Pt) => {
    setThrowing(true);
    const start = LAUNCH;
    const dur = 650;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const t = Math.min(1, (ts - t0) / dur);
      setBall({ x: start.x + (land.x - start.x) * t, y: start.y + (land.y - start.y) * t });
      setScale(1 + Math.sin(t * Math.PI) * 0.9); // fake 3D hop
      if (t < 1) { rafRef.current = requestAnimationFrame(step); }
      else { resolveShot(land); }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const resolveShot = (land: Pt) => {
    // nearest present cup within hit radius
    let made = false, cup = -1, bestD = Infinity;
    positions.forEach((p, i) => {
      if (!targetRack[i]) return;
      const d = Math.hypot(p.x - land.x, p.y - land.y);
      if (d < bestD) { bestD = d; cup = i; }
    });
    if (cup >= 0 && bestD < CUP_R * HIT_FACTOR) made = true;
    setTimeout(() => {
      setThrowing(false);
      setBall(LAUNCH); setScale(1);
      dispatch({ type: 'BEERPONG_SHOT', made, cup: made ? cup : 0 });
    }, 450);
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const cRemain = mini.racks.c.filter(Boolean).length;
  const dRemain = mini.racks.d.filter(Boolean).length;
  const done = mini.phase === 'done';
  const winnerName = mini.winner === 'c' ? challengerName : defenderName;

  // Aim guide endpoint (where it'll land) while dragging
  const guide = drag ? {
    x: Math.max(0, Math.min(1, LAUNCH.x + (LAUNCH.x - drag.x) * PULL_SCALE)),
    y: Math.max(0, Math.min(1, LAUNCH.y + (LAUNCH.y - drag.y) * PULL_SCALE)),
  } : null;

  return (
    <div>
      {/* Scoreboard */}
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-purple-400">{challengerName}: {dRemain} left</span>
        {remaining != null && <span className="text-yellow-400 font-mono">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>}
        <span className="text-cyan-400">{defenderName}: {cRemain} left</span>
      </div>

      {!done && (
        <p className="text-center text-xs text-gray-400 mb-1">
          {myShot
            ? <span className="text-cyan-400 font-medium">Your throw — {mini.shotsLeft} shot{mini.shotsLeft !== 1 ? 's' : ''} left</span>
            : <span>Waiting on <span className="text-white">{shooterName}</span> ({mini.shotsLeft} left)</span>}
        </p>
      )}

      {/* Play area */}
      <div
        ref={areaRef}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        className="relative w-full rounded-2xl border border-royal-border bg-gradient-to-b from-amber-950/40 to-black overflow-hidden select-none touch-none"
        style={{ height: 360 }}
      >
        {/* Target rack label */}
        <p className="absolute top-1 left-0 right-0 text-center text-[10px] text-gray-500 uppercase tracking-wide">
          {targetName}'s cups
        </p>

        {/* Cups */}
        {positions.map((p, i) => targetRack[i] && (
          <div key={i} className="absolute rounded-full border-2 border-red-400/80 bg-red-600/40"
            style={{
              left: `${p.x * 100}%`, top: `${p.y * 100}%`,
              width: `${CUP_R * 2 * 100}%`, aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
            }} />
        ))}

        {/* Aim guide */}
        {guide && (
          <div className="absolute w-4 h-4 rounded-full border-2 border-cyan-300"
            style={{ left: `${guide.x * 100}%`, top: `${guide.y * 100}%`, transform: 'translate(-50%,-50%)' }} />
        )}

        {/* Ball */}
        {mini.phase === 'playing' && (
          <div className="absolute w-5 h-5 rounded-full bg-white shadow-lg"
            style={{
              left: `${ball.x * 100}%`, top: `${ball.y * 100}%`,
              transform: `translate(-50%,-50%) scale(${scale})`,
            }} />
        )}

        {/* Last shot flash */}
        {mini.lastShot && !throwing && mini.phase === 'playing' && (
          <p className={`absolute bottom-1 left-0 right-0 text-center text-sm font-bold ${mini.lastShot.made ? 'text-green-400' : 'text-gray-500'}`}>
            {mini.lastShot.made ? 'CUP' : 'MISS'}
          </p>
        )}
      </div>

      {/* Controls / result */}
      {done ? (
        <div className="text-center mt-4">
          <p className="text-xl font-bold text-white mb-2">{winnerName} wins</p>
          {(canActAs(challenge.challengerId) || canActAs(challenge.defenderId))
            ? <button className="btn-primary w-full"
                onClick={() => dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon: mini.winner === 'c' })}>
                Apply Result
              </button>
            : <p className="text-gray-500 text-sm">Waiting for the result…</p>}
        </div>
      ) : (
        myShot && <p className="text-center text-gray-500 text-xs mt-2">Drag the ball back and release to throw</p>
      )}
    </div>
  );
}
