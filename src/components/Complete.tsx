import { useEffect, useRef } from 'react'
import { useGame } from '../store/GameContext'
import { getLockedPlayerIds } from '../utils/gameLogic'
import { supabase } from '../lib/supabase'

interface Props {
  leagueId?: string
  seasonId?: string
}

export default function Complete({ leagueId, seasonId }: Props) {
  const { state, dispatch, gameId, isCommissioner, detachGame } = useGame()
  const { pickSlots, players } = state
  const lockedIds = getLockedPlayerIds(pickSlots)
  const savedRef = useRef(false)

  const filledSlots = pickSlots
    .filter(s => s.playerId !== null)
    .sort((a, b) => a.position - b.position)

  // Commissioner saves final results to DB
  useEffect(() => {
    if (!isCommissioner || !gameId || savedRef.current) return
    if (filledSlots.length === 0) return

    savedRef.current = true

    const records = filledSlots.map(slot => ({
      game_id: gameId,
      league_id: leagueId ?? '',
      season_id: seasonId ?? null,
      player_name: players.find(p => p.id === slot.playerId)?.name ?? '',
      pick_position: slot.position,
      locked: slot.locked,
    }))

    supabase.from('draft_results').insert(records).then(({ error }) => {
      if (error) console.error('Failed to save draft results:', error)
    })
  }, [isCommissioner, gameId, leagueId, seasonId, filledSlots, players])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <p className="text-6xl mb-3">🎉</p>
        <h1 className="text-3xl font-bold text-white mb-1">Draft Order Set!</h1>
        <p className="text-cyan-400">The last ball is gone. Good luck!</p>
      </div>

      {/* Final draft order */}
      <div className="w-full space-y-2 mb-8">
        {filledSlots.map((slot, i) => {
          const player = players.find(p => p.id === slot.playerId)
          const isFirst = i === 0

          return (
            <div
              key={slot.position}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border animate-slide-up
                ${isFirst ? 'border-yellow-500 bg-yellow-900/20' : 'border-royal-border bg-royal-card'}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={`text-xl font-black w-8 text-center shrink-0
                ${isFirst ? 'text-yellow-400' : 'text-gray-500'}`}>
                {isFirst ? '👑' : slot.position}
              </span>
              <span className={`font-bold text-base ${isFirst ? 'text-yellow-400' : 'text-white'}`}>
                {player?.name}
              </span>
              {lockedIds.has(slot.playerId!) && (
                <span className="ml-auto text-yellow-500 text-xs font-bold">🔒 Locked</span>
              )}
            </div>
          )
        })}

        {/* Players without a pick */}
        {players.filter(p => !filledSlots.some(s => s.playerId === p.id)).map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-800 opacity-50">
            <span className="text-gray-600 font-bold w-8 text-center">–</span>
            <span className="text-gray-500">{p.name}</span>
            <span className="ml-auto text-gray-600 text-xs">no pick</span>
          </div>
        ))}
      </div>

      {isCommissioner && (
        <p className="text-green-400 text-xs mb-4 text-center">✅ Results saved to league history</p>
      )}

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          className="btn-primary py-4 text-lg"
          onClick={detachGame}
        >
          ⚡ Back to League
        </button>
      </div>
    </div>
  )
}
