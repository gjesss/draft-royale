import { useGame } from '../store/GameContext';

export default function Landing() {
  const { dispatch } = useGame();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Logo / Brand */}
      <div className="mb-8 animate-bounce-in">
        <div className="relative inline-block mb-4">
          {/* Shield */}
          <svg width="140" height="160" viewBox="0 0 140 160" fill="none" className="drop-shadow-[0_0_20px_#00d4ff]">
            <path
              d="M70 4L8 28V80C8 116 36 148 70 156C104 148 132 116 132 80V28L70 4Z"
              fill="#111827"
              stroke="#00d4ff"
              strokeWidth="3"
            />
            {/* Inner accent */}
            <path
              d="M70 16L20 36V80C20 110 42 136 70 144C98 136 120 110 120 80V36L70 16Z"
              fill="none"
              stroke="#00d4ff"
              strokeWidth="1"
              opacity="0.4"
            />
          </svg>
          {/* Crown */}
          <div className="absolute inset-0 flex items-center justify-center -mt-4">
            <span className="text-5xl drop-shadow-[0_0_10px_#00d4ff]">👑</span>
          </div>
        </div>

        <h1 className="text-5xl font-bold tracking-widest uppercase mb-1"
          style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.15em' }}>
          <span className="text-white">DRAFT</span>
        </h1>
        <h1 className="text-5xl font-bold tracking-widest uppercase mb-4"
          style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.15em' }}>
          <span className="neon-text">ROYALE</span>
        </h1>

        <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
          Fantasy sports draft order — <em>defend your pick.</em><br />
          The game ends when the last ball is gone.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          className="btn-primary text-lg py-4 animate-pulse-cyan"
          onClick={() => dispatch({ type: 'NAVIGATE', phase: 'setup' })}
        >
          ⚡ New Game
        </button>
        <button
          className="btn-ghost"
          onClick={() => dispatch({ type: 'NAVIGATE', phase: 'rules' })}
        >
          📋 Rules
        </button>
      </div>

      <p className="mt-10 text-gray-600 text-xs">
        Works offline · Install on your home screen
      </p>
    </div>
  );
}
