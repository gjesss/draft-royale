import { useState } from 'react';
import { useGame } from '../../store/GameContext';
import { CHALLENGE_GAME_DISPLAY } from '../../utils/gameLogic';
import { ChallengeGame } from '../../types/game';
import { useTurnControl } from '../../hooks/useTurnControl';
import Icon from '../ui/Icon';

interface Props {
  challengerId: string;
}

export default function PendingPickSwapModal({ challengerId }: Props) {
  const { state, dispatch } = useGame();
  const { canActAs } = useTurnControl();
  const [mode, setMode] = useState<'choose' | 'immediate' | 'future'>('choose');
  const [futurePosition, setFuturePosition] = useState('');
  const challenger = state.players.find(p => p.id === challengerId);

  // Only the player who drew the swap (or commissioner) decides; others watch.
  if (!canActAs(challengerId)) {
    return (
      <div className="modal-backdrop">
        <div className="modal-panel">
          <div className="p-8 text-center">
            <Icon name="refresh" size={36} className="mx-auto text-violet-400 mb-2" />
            <h2 className="text-2xl font-bold text-purple-400 mb-2">Pick Swap</h2>
            <p className="text-white font-medium">{challenger?.name}</p>
            <p className="text-gray-400 text-sm mt-1">is deciding what to do with their pick swap…</p>
          </div>
        </div>
      </div>
    );
  }

  // Filled, unlocked slots that aren't held by the challenger
  const challengeableSlots = state.pickSlots.filter(
    s => s.playerId !== null && !s.locked && s.playerId !== challengerId
  );

  // Unfilled positions the challenger could call in advance
  const unfilledPositions = state.pickSlots.filter(s => s.playerId === null);

  const handleImmediateChallenge = (targetPickPosition: number) => {
    dispatch({ type: 'INITIATE_CHALLENGE', challengerId, targetPickPosition });
  };

  const handleFuturePending = () => {
    const pos = parseInt(futurePosition);
    if (isNaN(pos) || pos < 1 || pos > state.pickSlots.length) return;
    const slot = state.pickSlots.find(s => s.position === pos);
    if (slot?.playerId !== null) return; // already filled — must challenge immediately
    dispatch({ type: 'SET_PENDING_CHALLENGE', challengerId, targetPosition: pos });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="p-6">
          <div className="text-center mb-6">
            <Icon name="refresh" size={36} className="mx-auto text-violet-400 mb-2" />
            <h2 className="text-2xl font-bold text-purple-400">Pick Swap</h2>
            <p className="text-white font-medium">{challenger?.name}</p>
            <p className="text-gray-400 text-sm mt-1">Choose what to do with your pick swap</p>
          </div>

          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                className="w-full px-4 py-4 rounded-xl border border-purple-600 bg-purple-900/20
                  hover:bg-purple-800/30 text-white transition-all active:scale-95 text-left"
                onClick={() => setMode('immediate')}
                disabled={challengeableSlots.length === 0}
              >
                <p className="font-bold text-purple-300">Challenge a pick now</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  {challengeableSlots.length === 0
                    ? 'No challengeable picks yet'
                    : `${challengeableSlots.length} pick${challengeableSlots.length > 1 ? 's' : ''} available`}
                </p>
              </button>

              <button
                className="w-full px-4 py-4 rounded-xl border border-yellow-600 bg-yellow-900/20
                  hover:bg-yellow-800/30 text-white transition-all active:scale-95 text-left"
                onClick={() => setMode('future')}
                disabled={unfilledPositions.length === 0}
              >
                <p className="font-bold text-yellow-300">Wait for a future pick</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  {unfilledPositions.length === 0
                    ? 'All picks are filled'
                    : `Declare intent on pick #${unfilledPositions.map(s => s.position).join(', #')}`}
                </p>
              </button>

              <button
                className="btn-ghost w-full"
                onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
              >
                Cancel (hold for later)
              </button>
            </div>
          )}

          {mode === 'immediate' && (
            <div>
              <p className="text-gray-400 text-sm mb-3">Select which pick to challenge:</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {challengeableSlots.map(slot => {
                  const holder = state.players.find(p => p.id === slot.playerId);
                  return (
                    <button
                      key={slot.position}
                      onClick={() => handleImmediateChallenge(slot.position)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border
                        border-royal-border bg-black/40 hover:border-purple-500 hover:bg-purple-500/10
                        text-white transition-all active:scale-95"
                    >
                      <span>
                        <span className="text-purple-400 font-bold">Pick #{slot.position}</span>
                        <span className="text-gray-400 ml-2">– {holder?.name}</span>
                      </span>
                      <span className="text-gray-500 text-xs">
                        {slot.defenseCount === 1 ? '1 defense' : 'No defenses'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button className="btn-ghost w-full mt-3" onClick={() => setMode('choose')}>← Back</button>
            </div>
          )}

          {mode === 'future' && (
            <div>
              <p className="text-gray-400 text-sm mb-3">
                Declare which pick position you want to challenge when it's filled:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {unfilledPositions.map(slot => (
                  <button
                    key={slot.position}
                    onClick={() => {
                      setFuturePosition(String(slot.position));
                      dispatch({ type: 'SET_PENDING_CHALLENGE', challengerId, targetPosition: slot.position });
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-royal-border bg-black/40
                      hover:border-yellow-500 hover:bg-yellow-500/10 text-white transition-all active:scale-95
                      flex items-center justify-between"
                  >
                    <span className="text-yellow-400 font-bold">Pick #{slot.position}</span>
                    <span className="text-gray-500 text-xs">Not yet drawn</span>
                  </button>
                ))}
              </div>
              <button className="btn-ghost w-full" onClick={() => setMode('choose')}>← Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
