import { useGame } from '../../store/GameContext';
import { Player } from '../../types/game';

interface Props {
  type: 'pick-swap' | 'shotgun';
}

export default function AssignModal({ type }: Props) {
  const { state, dispatch } = useGame();

  const isPendingWaiter = (p: Player) =>
    type === 'pick-swap' && p.pendingChallengePickPosition !== null;

  const isMaxShotgun = (p: Player) =>
    type === 'shotgun' && p.shotgunCount >= 3;

  const handleSelect = (playerId: string) => {
    if (type === 'pick-swap') {
      dispatch({ type: 'ASSIGN_PICK_SWAP', playerId });
    } else {
      dispatch({ type: 'ASSIGN_SHOTGUN', playerId });
    }
  };

  const isSwap = type === 'pick-swap';

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-5xl mb-3">{isSwap ? '🔄' : '🍺'}</p>
            <h2 className={`text-2xl font-bold ${isSwap ? 'text-purple-400' : 'text-orange-400'}`}>
              {isSwap ? 'PICK SWAP DRAWN!' : 'SHOTGUN DRAWN!'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isSwap
                ? 'Who drew this ball?'
                : 'Who drew this ball?'}
            </p>
          </div>

          <div className="space-y-2">
            {state.players.map(p => {
              const isPendingWarning = isPendingWaiter(p);
              const isMaxed = isMaxShotgun(p);
              const disabled = false; // allow any selection; edge cases handled in reducer

              return (
                <button
                  key={p.id}
                  onClick={() => !disabled && handleSelect(p.id)}
                  disabled={disabled}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border
                    transition-all duration-150 active:scale-95
                    ${isPendingWarning
                      ? 'border-yellow-600 bg-yellow-900/20 text-yellow-300'
                      : 'border-royal-border bg-black/40 hover:border-cyan-500 hover:bg-cyan-500/10 text-white'
                    }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-2">
                    {isPendingWarning && (
                      <span className="text-yellow-400">⚠ Has pending challenge — must redraw</span>
                    )}
                    {isMaxed && (
                      <span className="text-orange-400">🍺×3 (maxed)</span>
                    )}
                    {!isPendingWarning && !isMaxed && isSwap && (
                      <span className="text-purple-400 text-lg">→</span>
                    )}
                    {!isMaxed && !isSwap && (
                      <span className="text-orange-400">🍺×{p.shotgunCount}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            className="btn-ghost w-full mt-4"
            onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
          >
            Cancel (put ball back)
          </button>
        </div>
      </div>
    </div>
  );
}
