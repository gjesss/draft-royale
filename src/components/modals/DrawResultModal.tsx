import { useGame } from '../../store/GameContext';
import { BALL_DISPLAY } from '../../utils/gameLogic';
import { useTurnControl } from '../../hooks/useTurnControl';
import Icon, { IconName } from '../ui/Icon';

const BALL_ICON: Record<string, IconName> = { 'pick': 'target', 'pick-swap': 'refresh', 'shotgun': 'cup' };

export default function DrawResultModal() {
  const { state, dispatch } = useGame();
  const { drawerId, canActAs } = useTurnControl();
  const modal = state.modal;
  if (modal?.kind !== 'draw-result') return null;

  const { ballType, pickedPlayerId, pickedPosition, rule3Redraw, pendingChallengeName } = modal;
  const info = BALL_DISPLAY[ballType];
  const playerName = state.players.find(p => p.id === pickedPlayerId)?.name;
  const drawerName = state.players.find(p => p.id === drawerId)?.name ?? 'Player';
  const canAct = canActAs(drawerId);

  // Rule 3: pick-swap was put back
  if (rule3Redraw) {
    return (
      <div className="modal-backdrop">
        <div className="modal-panel">
          <div className="p-8 text-center">
            <Icon name="refresh" size={44} className="mx-auto text-gold-400 mb-3" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-jersey text-gold-400 mb-3">Pick Swap Returned</h2>
            <p className="text-gray-300 leading-relaxed mb-2">
              <strong className="text-white">Rule 3:</strong> This player already has a pending challenge waiting.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              The pick swap ball was put back into the pool. They must draw again until they get a non-swap ball.
            </p>
            {canAct
              ? <button className="btn-primary w-full" onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Draw Again</button>
              : <p className="text-gray-500 text-sm">Waiting for {drawerName}…</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-8 text-center">
          <div className="flex justify-center mb-3 animate-bounce-in">
            <span className={`w-16 h-16 rounded-2xl bg-royal-steel border border-royal-border flex items-center justify-center ${info.color}`}>
              <Icon name={BALL_ICON[ballType]} size={34} />
            </span>
          </div>
          <h2 className={`text-3xl font-display font-bold uppercase tracking-jersey mb-2 ${info.color}`}>{info.label}</h2>

          {ballType === 'pick' && playerName && pickedPosition && (
            <div className="mt-4">
              <p className="text-5xl font-bold text-white mb-1">{playerName}</p>
              <p className="text-gray-400">
                gets <span className="text-cyan-400 font-bold text-xl">Pick #{pickedPosition}</span>
              </p>
              {pickedPosition === 1 && (
                <p className="text-yellow-400 mt-2 text-sm font-medium">First overall pick</p>
              )}

              {/* Pending challenge notification */}
              {pendingChallengeName && (
                <div className="mt-4 bg-purple-900/30 border border-purple-600 rounded-xl px-4 py-3">
                  <p className="text-purple-300 font-semibold text-sm">Challenge incoming</p>
                  <p className="text-gray-400 text-xs mt-1">
                    <strong className="text-white">{pendingChallengeName}</strong> had declared a pending challenge on this pick. A challenge will begin next.
                  </p>
                </div>
              )}
            </div>
          )}

          {ballType === 'pick-swap' && (
            <p className="text-gray-300 mt-3 text-sm">
              The drawer can challenge any pick position!
            </p>
          )}

          {ballType === 'shotgun' && (
            <p className="text-gray-300 mt-3 text-sm">Shotgun a beer.</p>
          )}

          {canAct
            ? <button className="btn-primary mt-6 w-full" onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>
                {pendingChallengeName ? 'Start Challenge' : 'Got it!'}
              </button>
            : <p className="text-gray-500 text-sm mt-6">Waiting for {drawerName}…</p>}
        </div>
      </div>
    </div>
  );
}
