import { useState } from 'react';
import { useGame } from '../store/GameContext';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 12;

export default function Setup() {
  const { dispatch } = useGame();
  const [count, setCount] = useState(8);
  const [names, setNames] = useState<string[]>(Array(8).fill(''));
  const [errors, setErrors] = useState<string[]>([]);

  const handleCountChange = (n: number) => {
    const clamped = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n));
    setCount(clamped);
    setNames(prev => {
      const next = [...prev];
      while (next.length < clamped) next.push('');
      return next.slice(0, clamped);
    });
    setErrors([]);
  };

  const handleNameChange = (i: number, val: string) => {
    setNames(prev => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const handleStart = () => {
    const errs: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < count; i++) {
      const n = names[i].trim();
      if (!n) {
        errs.push(`Player ${i + 1} needs a name`);
      } else if (seen.has(n.toLowerCase())) {
        errs.push(`"${n}" is a duplicate`);
      } else {
        seen.add(n.toLowerCase());
      }
    }

    if (errs.length) {
      setErrors(errs);
      return;
    }

    dispatch({
      type: 'START_GAME',
      playerNames: names.slice(0, count).map(n => n.trim()),
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-royal-border">
        <button
          className="text-gray-400 hover:text-white p-2 -ml-2"
          onClick={() => dispatch({ type: 'NAVIGATE', phase: 'landing' })}
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold neon-text">Game Setup</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">

        {/* Player count */}
        <div className="card">
          <p className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wide">
            Number of Players
          </p>
          <div className="flex items-center gap-4">
            <button
              className="w-12 h-12 rounded-xl bg-royal-muted hover:bg-gray-600 text-xl font-bold transition-colors active:scale-95"
              onClick={() => handleCountChange(count - 1)}
              disabled={count <= MIN_PLAYERS}
            >
              −
            </button>
            <span className="text-4xl font-bold neon-text w-12 text-center">{count}</span>
            <button
              className="w-12 h-12 rounded-xl bg-royal-muted hover:bg-gray-600 text-xl font-bold transition-colors active:scale-95"
              onClick={() => handleCountChange(count + 1)}
              disabled={count >= MAX_PLAYERS}
            >
              +
            </button>
          </div>

          {/* Quick-select */}
          <div className="flex flex-wrap gap-2 mt-4">
            {[4, 6, 8, 10, 12].map(n => (
              <button
                key={n}
                onClick={() => handleCountChange(n)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  count === n
                    ? 'bg-cyan-500 text-black'
                    : 'bg-royal-muted text-gray-300 hover:bg-gray-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Ball pool info */}
        <div className="card bg-black/40">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Ball Pool</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-cyan-400">🎯 {count} pick balls</span>
            <span className="text-purple-400">🔄 30 pick swaps</span>
            <span className="text-orange-400">🍺 24 shotguns</span>
          </div>
          <p className="text-gray-500 text-xs mt-2">Total: {count + 30 + 24} balls</p>
        </div>

        {/* Player names */}
        <div className="card">
          <p className="text-sm text-gray-400 mb-3 font-medium uppercase tracking-wide">
            Player Names
          </p>
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-6 text-right">{i + 1}.</span>
                <input
                  type="text"
                  placeholder={`Player ${i + 1}`}
                  value={names[i] || ''}
                  onChange={e => handleNameChange(i, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStart()}
                  maxLength={20}
                  className="flex-1 bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                             text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500
                             transition-colors text-sm"
                  autoComplete="off"
                  autoCapitalize="words"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3">
            {errors.map((e, i) => (
              <p key={i} className="text-red-400 text-sm">⚠ {e}</p>
            ))}
          </div>
        )}
      </div>

      {/* Start button */}
      <div className="px-4 pb-8 pt-4 border-t border-royal-border">
        <button className="btn-primary w-full text-lg py-4" onClick={handleStart}>
          👑 Start Draft Royale
        </button>
      </div>
    </div>
  );
}
