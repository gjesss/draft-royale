import { useGame } from '../../store/GameContext';

interface Props {
  playerId: string;
}

export default function ShotgunOverflowModal({ playerId }: Props) {
  const { state, dispatch } = useGame();
  const giver = state.players.find(p => p.id === playerId);
  const eligible = state.players.filter(p => p.id !== playerId && p.shotgunCount < 3);

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-5xl mb-3">🍺🍺🍺</p>
            <h2 className="text-2xl font-bold text-orange-400">SHOTGUN OVERFLOW!</h2>
            <p className="text-white mt-1 font-medium">{giver?.name}</p>
            <p className="text-gray-400 text-sm mt-1">
              already has 3 shotguns. Give this one to another player.
            </p>
          </div>

          {eligible.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <p>Everyone is maxed out! Ball is lost.</p>
              <button
                className="btn-ghost mt-4 w-full"
                onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
              >
                OK
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {eligible.map(p => (
                <button
                  key={p.id}
                  onClick={() => dispatch({ type: 'GIVE_SHOTGUN', toPlayerId: p.id })}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border
                    border-royal-border bg-black/40 hover:border-orange-500 hover:bg-orange-500/10
                    text-white transition-all active:scale-95"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-orange-400 text-sm">🍺×{p.shotgunCount} → 🍺×{p.shotgunCount + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
