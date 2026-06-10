import { useGame } from '../../store/GameContext';
import { useTurnControl } from '../../hooks/useTurnControl';
import { Challenge, Card } from '../../types/game';
import { SUIT_SYMBOL, rankLabel } from '../../utils/gameLogic';

function PlayingCard({ card, faceUp }: { card?: Card; faceUp: boolean }) {
  if (!card || !faceUp) {
    return (
      <div className="w-20 h-28 rounded-xl bg-gradient-to-br from-cyan-700 to-cyan-900 border-2 border-cyan-600 flex items-center justify-center">
        
      </div>
    );
  }
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div className="w-20 h-28 rounded-xl bg-white border-2 border-gray-300 flex flex-col items-center justify-center animate-bounce-in">
      <span className={`text-3xl font-bold ${red ? 'text-red-600' : 'text-black'}`}>{rankLabel(card.rank)}</span>
      <span className={`text-3xl ${red ? 'text-red-600' : 'text-black'}`}>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export default function HighCardGame({ challenge }: { challenge: Challenge }) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();
  const canAct = canActAs(challenge.challengerId) || canActAs(challenge.defenderId);

  const challenger = state.players.find(p => p.id === challenge.challengerId);
  const defender = state.players.find(p => p.id === challenge.defenderId);
  const mini = challenge.mini?.kind === 'high-card' ? challenge.mini : null;

  const cRank = mini?.challenger.rank ?? 0;
  const dRank = mini?.defender.rank ?? 0;
  const tie = mini != null && cRank === dRank;
  const challengerWon = cRank > dRank;

  return (
    <div className="text-center">
      <div className="bg-black/50 border border-royal-border rounded-xl p-4 mb-4">
        <p className="text-white font-bold text-lg">High Card</p>
        <p className="text-gray-500 text-xs">Highest card wins the pick swap — re-draw on a tie</p>
      </div>

      {/* Cards */}
      <div className="flex items-end justify-center gap-6 mb-4">
        <div>
          <p className="text-purple-400 text-xs font-medium mb-1 truncate max-w-[90px]">{challenger?.name}</p>
          <PlayingCard card={mini?.challenger} faceUp={!!mini} />
          {mini && !tie && (
            <p className={`text-xs mt-1 font-bold ${challengerWon ? 'text-green-400' : 'text-gray-600'}`}>
              {challengerWon ? 'Wins' : '—'}
            </p>
          )}
        </div>
        <span className="text-gray-600 text-xl pb-10">vs</span>
        <div>
          <p className="text-cyan-400 text-xs font-medium mb-1 truncate max-w-[90px]">{defender?.name}</p>
          <PlayingCard card={mini?.defender} faceUp={!!mini} />
          {mini && !tie && (
            <p className={`text-xs mt-1 font-bold ${!challengerWon ? 'text-green-400' : 'text-gray-600'}`}>
              {!challengerWon ? 'Wins' : '—'}
            </p>
          )}
        </div>
      </div>

      {tie && <p className="text-yellow-400 text-sm font-medium mb-3">Push — same rank! Deal again.</p>}

      {/* Controls */}
      {!canAct ? (
        <p className="text-gray-500 text-sm py-2">
          {mini ? 'Waiting for the result…' : `${challenger?.name} is dealing…`}
        </p>
      ) : !mini ? (
        <button className="btn-primary w-full" onClick={() => dispatch({ type: 'DEAL_HIGH_CARD' })}>
          Deal Cards
        </button>
      ) : tie ? (
        <button className="btn-primary w-full" onClick={() => dispatch({ type: 'DEAL_HIGH_CARD' })}>
          Deal Again
        </button>
      ) : (
        <button
          className="btn-primary w-full"
          onClick={() => dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon })}
        >
          Apply Result — {(challengerWon ? challenger : defender)?.name} wins
        </button>
      )}
    </div>
  );
}
