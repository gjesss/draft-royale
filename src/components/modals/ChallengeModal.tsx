import { useGame } from '../../store/GameContext';
import { Challenge, ChallengeGame, DIGITAL_GAMES } from '../../types/game';
import { CHALLENGE_GAME_DISPLAY } from '../../utils/gameLogic';
import { useTurnControl } from '../../hooks/useTurnControl';
import Icon from '../ui/Icon';
import HighCardGame from '../games/HighCardGame';
import HoldemGame from '../games/HoldemGame';
import BeerPongGame from '../games/BeerPongGame';
import FlipCupGame from '../games/FlipCupGame';
import QuartersGame from '../games/QuartersGame';

interface Props {
  challenge: Challenge;
}

const GAMES: ChallengeGame[] = ['beer-pong', 'quarters', 'flip-cup', 'holdem', 'high-card'];

export default function ChallengeModal({ challenge }: Props) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();
  // Either participant (or commissioner) can pick the game / report the result.
  const canAct = canActAs(challenge.challengerId) || canActAs(challenge.defenderId);

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
            <Icon name="swords" size={36} className="mx-auto text-violet-400 mb-2" />
            <h2 className="text-2xl font-display font-bold uppercase tracking-jersey text-violet-400">Challenge</h2>
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
                  <span className="text-gray-400 ml-1">DEF ×{defenderSlot.defenseCount}</span>
                )}
              </p>
            </div>
          </div>

          {/* Step 1: Choose game */}
          {challenge.status === 'choosing-game' && !canAct && (
            <p className="text-center text-gray-400 text-sm py-4">
              {challenger?.name} &amp; {defender?.name} are choosing a game…
            </p>
          )}
          {challenge.status === 'choosing-game' && canAct && (
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
                      <p className="font-semibold">{g.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{g.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2a: Digital game played in-app (auto-resolves) */}
          {(challenge.status === 'in-progress' || challenge.status === 'resolving')
            && challenge.gameType && DIGITAL_GAMES.includes(challenge.gameType) && (
            <>
              {challenge.gameType === 'high-card' && <HighCardGame challenge={challenge} />}
              {challenge.gameType === 'holdem' && <HoldemGame challenge={challenge} />}
              {challenge.gameType === 'beer-pong' && <BeerPongGame challenge={challenge} />}
              {challenge.gameType === 'flip-cup' && <FlipCupGame challenge={challenge} />}
              {challenge.gameType === 'quarters' && <QuartersGame challenge={challenge} />}
            </>
          )}

          {/* Step 2b: Physical game → manually record winner */}
          {(challenge.status === 'in-progress' || challenge.status === 'resolving')
            && challenge.gameType && !DIGITAL_GAMES.includes(challenge.gameType) && (
            <div>
              <div className="bg-black/50 border border-royal-border rounded-xl p-4 mb-5 text-center">
                <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Game</p>
                <p className="text-white font-bold text-lg">
                  {CHALLENGE_GAME_DISPLAY[challenge.gameType].label}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {CHALLENGE_GAME_DISPLAY[challenge.gameType].description}
                </p>
              </div>

              {!canAct && (
                <p className="text-center text-gray-400 text-sm py-2">
                  Waiting for the result to be recorded…
                </p>
              )}
              {canAct && (<>
              <p className="text-center text-gray-400 text-sm mb-4">Who won the challenge?</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => resolve(true)}
                  className="flex flex-col items-center py-4 px-3 rounded-xl border-2
                    border-purple-600 bg-purple-900/20 hover:bg-purple-800/40
                    text-white transition-all active:scale-95"
                >
                  <Icon name="trophy" size={22} className="text-violet-300 mb-1" />
                  <p className="font-bold text-sm text-center leading-tight">{challenger?.name}</p>
                  <p className="text-purple-400 text-xs mt-1">wins Pick #{challenge.targetPickPosition}</p>
                </button>

                <button
                  onClick={() => resolve(false)}
                  className="flex flex-col items-center py-4 px-3 rounded-xl border-2
                    border-cyan-600 bg-cyan-900/20 hover:bg-cyan-800/40
                    text-white transition-all active:scale-95"
                >
                  <Icon name="shield" size={22} className="text-cyan-300 mb-1" />
                  <p className="font-bold text-sm text-center leading-tight">{defender?.name}</p>
                  <p className="text-cyan-400 text-xs mt-1">
                    defends Pick #{challenge.targetPickPosition}
                    {defenderSlot && (
                      <span> ({defenderSlot.defenseCount + 1 >= 2 ? 'LOCKED' : `${defenderSlot.defenseCount + 1}/2`})</span>
                    )}
                  </p>
                </button>
              </div>
              </>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
