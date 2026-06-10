import { useGame } from '../../store/GameContext';
import { useTurnControl } from '../../hooks/useTurnControl';
import { Challenge, Card } from '../../types/game';
import { SUIT_SYMBOL, rankLabel, holdemWinner } from '../../utils/gameLogic';

function MiniCard({ card, hidden }: { card?: Card; hidden?: boolean }) {
  if (!card || hidden) {
    return <div className="w-9 h-12 rounded-md bg-gradient-to-br from-cyan-700 to-cyan-900 border border-cyan-600" />;
  }
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div className="w-9 h-12 rounded-md bg-white border border-gray-300 flex flex-col items-center justify-center leading-none">
      <span className={`text-sm font-bold ${red ? 'text-red-600' : 'text-black'}`}>{rankLabel(card.rank)}</span>
      <span className={`text-sm ${red ? 'text-red-600' : 'text-black'}`}>{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}

export default function HoldemGame({ challenge }: { challenge: Challenge }) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();
  const canAct = canActAs(challenge.challengerId) || canActAs(challenge.defenderId);

  const challenger = state.players.find(p => p.id === challenge.challengerId);
  const defender = state.players.find(p => p.id === challenge.defenderId);
  const mini = challenge.mini?.kind === 'holdem' ? challenge.mini : null;

  const done = mini?.revealed === 5;
  const result = done ? holdemWinner(mini!.cHole, mini!.dHole, mini!.community) : null;
  const tie = result?.winner === 'tie';

  return (
    <div className="text-center">
      <div className="bg-black/50 border border-royal-border rounded-xl p-3 mb-4">
        <p className="text-white font-bold">Texas Hold'em</p>
        <p className="text-gray-500 text-xs">No betting · best 5-card hand wins · tie re-deals</p>
      </div>

      {!mini ? (
        canAct
          ? <button className="btn-primary w-full" onClick={() => dispatch({ type: 'DEAL_HOLDEM' })}>Deal Hand</button>
          : <p className="text-gray-500 text-sm py-2">{challenger?.name} is dealing…</p>
      ) : (
        <>
          {/* Community cards */}
          <div className="mb-4">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Community</p>
            <div className="flex justify-center gap-1.5">
              {mini.community.map((c, i) => (
                <MiniCard key={i} card={c} hidden={i >= mini.revealed} />
              ))}
            </div>
          </div>

          {/* Hole cards */}
          <div className="flex justify-around mb-4">
            <div>
              <p className="text-purple-400 text-xs font-medium mb-1 truncate max-w-[110px]">{challenger?.name}</p>
              <div className="flex gap-1.5 justify-center">{mini.cHole.map((c, i) => <MiniCard key={i} card={c} />)}</div>
              {done && <p className={`text-xs mt-1 ${result!.winner === 'c' ? 'text-green-400 font-bold' : 'text-gray-500'}`}>{result!.cName}</p>}
            </div>
            <div>
              <p className="text-cyan-400 text-xs font-medium mb-1 truncate max-w-[110px]">{defender?.name}</p>
              <div className="flex gap-1.5 justify-center">{mini.dHole.map((c, i) => <MiniCard key={i} card={c} />)}</div>
              {done && <p className={`text-xs mt-1 ${result!.winner === 'd' ? 'text-green-400 font-bold' : 'text-gray-500'}`}>{result!.dName}</p>}
            </div>
          </div>

          {tie && <p className="text-yellow-400 text-sm font-medium mb-3">Split pot — deal again!</p>}

          {/* Controls */}
          {!canAct ? (
            <p className="text-gray-500 text-sm py-2">Waiting for {challenger?.name}…</p>
          ) : !done ? (
            <button className="btn-primary w-full" onClick={() => dispatch({ type: 'ADVANCE_HOLDEM' })}>
              {mini.revealed === 0 ? 'Reveal Flop' : mini.revealed === 3 ? 'Reveal Turn' : 'Reveal River'}
            </button>
          ) : tie ? (
            <button className="btn-primary w-full" onClick={() => dispatch({ type: 'DEAL_HOLDEM' })}>Deal Again</button>
          ) : (
            <button className="btn-primary w-full"
              onClick={() => dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon: result!.winner === 'c' })}>
              Apply Result — {(result!.winner === 'c' ? challenger : defender)?.name} wins
            </button>
          )}
        </>
      )}
    </div>
  );
}
