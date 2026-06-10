import { useGame } from '../store/GameContext';
import Icon from './ui/Icon';

interface RulesProps {
  /** When provided, the back button calls this instead of dispatching a game navigation. */
  onBack?: () => void;
}

export default function Rules({ onBack }: RulesProps) {
  const { state, dispatch } = useGame();

  const handleBack = () => {
    if (onBack) onBack();
    else dispatch({ type: 'NAVIGATE', phase: state.phase === 'rules' ? 'landing' : state.phase });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-royal-border sticky top-0 bg-royal-dark z-10">
        <button
          className="text-gray-400 hover:text-white p-2 -ml-2"
          onClick={handleBack}
        >
          ← Back
        </button>
        <h2 className="text-xl font-bold neon-text">How to Play</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-lg mx-auto w-full">

        {/* Mission */}
        <div className="card border-cyan-500/30">
          <h3 className="neon-text font-bold text-lg mb-2">Mission</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Draft Royale determines the draft order for fantasy sports.{' '}
            <strong className="text-white">The whole point is to defend your pick.</strong>{' '}
            Until then, the pick is not yours. The game is not over when the last name is drawn.{' '}
            <strong className="text-white">The game is over when the last ball is gone.</strong>
          </p>
        </div>

        {/* Ball Options */}
        <div className="card">
          <h3 className="text-white font-bold text-base mb-3">Ball Options</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Icon name="target" size={22} className="text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-cyan-400 font-semibold">Pick Ball <span className="text-gray-500 font-normal text-xs">– 1 per player</span></p>
                <p className="text-gray-400 text-sm">When drawn, that player is assigned the next open draft pick position.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="refresh" size={22} className="text-violet-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-violet-400 font-semibold">Pick Swap <span className="text-gray-500 font-normal text-xs">– set by commissioner</span></p>
                <p className="text-gray-400 text-sm">Challenge any pick position to a mini-game. Winner takes that pick.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="cup" size={22} className="text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-orange-400 font-semibold">Shotgun <span className="text-gray-500 font-normal text-xs">– set by commissioner</span></p>
                <p className="text-gray-400 text-sm">Shotgun a beer! Max 3 per player. Extras must be gifted to another player.</p>
              </div>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-3">
            The commissioner sets how many pick-swap and shotgun balls are in the can — either scaled to the
            number of players, or as custom totals. Pick balls are always one per player.
          </p>
        </div>

        {/* Core Rules */}
        <div className="card">
          <h3 className="text-white font-bold text-base mb-3">Core Rules</h3>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">1.</span>
              Draft order is determined by the order names are drawn from the can.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">2.</span>
              If you draw a pick swap you can challenge any pick. If the target hasn't been drawn yet, you may wait — but you must declare which pick position. If your own name fills that position, the swap is lost (no defense counted).
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">3.</span>
              If you're waiting on a pending challenge and draw another pick swap, you must put it back and draw again until a non-swap ball comes out.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">4.</span>
              <span>
                <strong className="text-yellow-400">Defend your pick twice</strong> and it's yours — locked, cannot be challenged, and you may exit the game. Defenses reset per pick position (e.g., defend pick 2 once, lose it, move to pick 5 → must defend 5 twice from scratch).
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">5.</span>
              Multiple challenges can be in play simultaneously. If a challenger wants a pick already being contested, they must wait for that challenge to resolve.
            </li>
            <li className="flex gap-2">
              <span className="text-cyan-400 font-bold shrink-0">6.</span>
              Max 3 shotguns per player. Any drawn after the 3rd may be given to any player of your choice (as long as it won't exceed their max).
            </li>
          </ol>
        </div>

        {/* Challenge Games */}
        <div className="card">
          <h3 className="text-white font-bold text-base mb-3">Challenge Games</h3>
          <div className="space-y-3 text-sm">
            <div className="border-b border-royal-border pb-3">
              <p className="text-white font-semibold">Beer Pong <span className="text-gray-500 font-normal">(6 cups)</span></p>
              <p className="text-gray-400">5 min max. Most cups wins. If tied after time, first team to gain the lead after a full round of shots wins.</p>
            </div>
            <div className="border-b border-royal-border pb-3">
              <p className="text-white font-semibold">Quarters <span className="text-gray-500 font-normal">(first to 3)</span></p>
              <p className="text-gray-400">5 min max. Most made wins. If tied, first to gain the lead after a full round wins.</p>
            </div>
            <div className="border-b border-royal-border pb-3">
              <p className="text-white font-semibold">Flip Cup 1v1 <span className="text-gray-500 font-normal">(3 cups)</span></p>
              <p className="text-gray-400">Chug your beer, then first to successfully flip all 3 cups wins.</p>
            </div>
            <div className="border-b border-royal-border pb-3">
              <p className="text-white font-semibold">Hold'em</p>
              <p className="text-gray-400">Deal one hand (no betting). Flop → Turn → River (burn a card each). Best hand wins. Ties broken by high card playoff.</p>
            </div>
            <div>
              <p className="text-white font-semibold">High Card</p>
              <p className="text-gray-400">Each player draws a single card. Highest card wins the pick swap. Re-draw if it's a tie.</p>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
