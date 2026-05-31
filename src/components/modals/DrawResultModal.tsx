import { useGame } from '../../store/GameContext';
import { BALL_DISPLAY } from '../../utils/gameLogic';

export default function DrawResultModal() {
  const { state, dispatch } = useGame();
  const draw = state.lastDraw;
  if (!draw) return null;

  const info = BALL_DISPLAY[draw.ballType];
  const playerName = draw.playerName;
  const position = draw.position;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-8 text-center">
          <p className="text-7xl mb-4 animate-bounce-in">{info.emoji}</p>

          <h2 className={`text-3xl font-bold mb-2 ${info.color}`}>
            {info.label}
          </h2>

          {draw.ballType === 'pick' && playerName && position && (
            <div className="mt-4">
              <p className="text-5xl font-bold text-white mb-1">{playerName}</p>
              <p className="text-gray-400">
                gets{' '}
                <span className="text-cyan-400 font-bold text-xl">Pick #{position}</span>
              </p>
              {position === 1 && (
                <p className="text-yellow-400 mt-2 text-sm font-medium">👑 First overall pick!</p>
              )}
            </div>
          )}

          {draw.ballType === 'pick-swap' && (
            <p className="text-gray-300 mt-3 text-sm leading-relaxed">
              The drawer can challenge any pick position!<br />
              (Select the player who drew this ball)
            </p>
          )}

          {draw.ballType === 'shotgun' && (
            <p className="text-gray-300 mt-3 text-sm">
              Time to shotgun a beer! 🍻
            </p>
          )}

          <button
            className="btn-primary mt-6 w-full"
            onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
