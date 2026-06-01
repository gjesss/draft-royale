import { useGame } from '../../store/GameContext';
import { Challenge, ChallengeGame } from '../../types/game';
import { CHALLENGE_GAME_DISPLAY } from '../../utils/gameLogic';

interface Props {
  challenge: Challenge;
}

const GAMES: ChallengeGame[] = ['beer-pong', 'quarters', 'flip-cup', 'holdem', 'high-card'];

export default function ChallengeModal({ challenge }: Props) {
  const { state, dispatch } = useGame();

  const challenger = state.players.find(p => p.id === challenge.challengerId);
  const defender = state.players.find(p => p.id === challenge.defenderId);
  const challengerSlot = state.pickSlots.find(s => s.playerId === challenge.challengerId);
  const defenderSlot = state.pickSlots.find(s => s.position === challenge.targetPickPosition);

  const selectGame = (game: ChallengeGame) => {
    dispatch({ type: 'SELECT_CHALLENGE_GAME', game });
  };

  const resolve = (challengerWon: boolean) => {
    dispatch({ type: 'RESOLVE_CHALLENGE', challengerWon });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-6">

          {/* Header */}
          <div className="text-center mb-5">
            <p className="text-5xl mb-2">⚔️</p>
            <h2 className="text-2xl font-bold text-purple-400">CHALLENGE!</h2>
          </div>

          {/* Matchup */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex-1 text-center">
              <p className="text-xs text-purple-400 uppercase tracking-wide mb-1">Challenger</p>
              <p className="text-white font-bold text-lg leading-tight">{challenger?.name}</p>
              <p className="text-gray-500 text-sm">
                {challengerSlot ? `Pick #${challengerSlot.position}` : 'No pick yet'}
              </p>
            </div>

            <div className="text-3xl text-gray-600">VS</div>

            <div className="flex-1 text-center">
              <p className="text-xs text-cyan-400 uppercase tracking-wide mb-1">Defender</p>
              <p className="text-white font-bold text-lg leading-tight">{defender?.name}</p>
              <p className="text-cyan-400 text-sm font-medium">
                Pick #{challenge.targetPickPosition}
                {defenderSlot && defenderSlot.defenseCount > 0 && (
                  <span className="text-gray-400 ml-1">🛡×{defenderSlot.defenseCount}</span>
                )}
              </p>
            </div>
          </div>

          {/* Step 1: Choose game */}
          {challenge.status === 'choosing-game' && (
            <div>
              <p className="text-gray-400 text-sm text-center mb-3">
                Both players agree on a challenge game:
              </p>
              <div className="space-y-2">
                {GAMES.map(game => {
                  const g = CHALLENGE_GAME_DISPLAY[game];
                  return (
                    <button
                      key={game}
                      onClick={() => selectGame(game)}
                      className="w-full px-4 py-3 rounded-xl border border-royal-border bg-black/40
                        hover:border-purple-500 hover:bg-purple-500/10 text-white
                        transition-all active:scale-95 text-left"
                    >
                      <p className="font-semibold">{g.emoji} {g.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{g.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Game in progress → record winner */}
          {(challenge.status === 'in-progress' || challenge.status === 'resolving') && challenge.gameType && (
            <div>
              <div className="bg-black/50 border border-royal-border rounded-xl p-4 mb-5 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Game</p>
                <p className="text-white font-bold text-lg">
                  {CHALLENGE_GAME_DISPLAY[challenge.gameType].emoji}{' '}
                  {CHALLENGE_GAME_DISPLAY[challenge.gameType].label}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {CHALLENGE_GAME_DISPLAY[challenge.gameType].description}
                </p>
              </div>

              <p className="text-center text-gray-400 text-sm mb-4">Who won the challenge?</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => resolve(true)}
                  className="flex flex-col items-center py-4 px-3 rounded-xl border-2
                    border-purple-600 bg-purple-900/20 hover:bg-purple-800/40
                    text-white transition-all active:scale-95"
                >
                  <p className="text-2xl mb-1">🏆</p>
                  <p className="font-bold text-sm text-center leading-tight">{challenger?.name}</p>
                  <p className="text-purple-400 text-xs mt-1">wins Pick #{challenge.targetPickPosition}</p>
                </button>

                <button
                  onClick={() => resolve(false)}
                  className="flex flex-col items-center py-4 px-3 rounded-xl border-2
                    border-cyan-600 bg-cyan-900/20 hover:bg-cyan-800/40
                    text-white transition-all active:scale-95"
                >
                  <p className="text-2xl mb-1">🛡</p>
                  <p className="font-bold text-sm text-center leading-tight">{defender?.name}</p>
                  <p className="text-cyan-400 text-xs mt-1">
                    defends Pick #{challenge.targetPickPosition}
                    {defenderSlot && (
                      <span> ({defenderSlot.defenseCount + 1 >= 2 ? '🔒 LOCKED!' : `${defenderSlot.defenseCount + 1}/2`})</span>
                    )}
                  </p>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
