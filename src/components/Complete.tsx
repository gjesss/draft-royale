import { useEffect, useRef } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useGame } from '../store/GameContext'
import { getLockedPlayerIds } from '../utils/gameLogic'

export default function Complete() {
  const { state, gameId, leagueId, isCommissioner, detachGame } = useGame()
  const { pickSlots, players } = state
  const lockedIds = getLockedPlayerIds(pickSlots)
  const savedRef = useRef(false)

  const filledSlots = pickSlots
    .filter(s => s.playerId !== null)
    .sort((a, b) => a.position - b.position)

  useEffect(() => {
    if (!isCommissioner || !gameId || !leagueId || savedRef.current) return
    if (filledSlots.length === 0) return
    savedRef.current = true

    const now = new Date().toISOString()
    Promise.all(
      filledSlots.map(slot => {
        const player = players.find(p => p.id === slot.playerId)
        return addDoc(collection(db, 'leagues', leagueId, 'draftResults'), {
          gameId,
          seasonId: null,
          playerName: player?.name ?? '',
          pickPosition: slot.position,
          locked: slot.locked,
          createdAt: now,
        })
      })
    ).catch(console.error)
  }, [isCommissioner, gameId, leagueId, filledSlots, players])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <p className="text-6xl mb-3">🎉</p>
        <h1 className="text-3xl font-bold text-white mb-1">Draft Order Set!</h1>
        <p className="text-cyan-400">The last ball is gone. Good luck!</p>
      </div>

      <div className="w-full space-y-2 mb-8">
        {filledSlots.map((slot, i) => {
          const player = players.find(p => p.id === slot.playerId)
          return (
            <div
              key={slot.position}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border animate-slide-up
                ${i === 0 ? 'border-yellow-500 bg-yellow-900/20' : 'border-royal-border bg-royal-card'}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={`text-xl font-black w-8 text-center shrink-0
                ${i === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {i === 0 ? '👑' : slot.position}
              </span>
              <span className={`font-bold text-base ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>
                {player?.name}
              </span>
              {lockedIds.has(slot.playerId!) && (
                <span className="ml-auto text-yellow-500 text-xs">🔒 Locked</span>
              )}
            </div>
          )
        })}

        {players.filter(p => !filledSlots.some(s => s.playerId === p.id)).map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-800 opacity-50">
            <span className="text-gray-600 font-bold w-8 text-center">–</span>
            <span className="text-gray-500">{p.name}</span>
          </div>
        ))}
      </div>

      {isCommissioner && (
        <p className="text-green-400 text-xs mb-4 text-center">✅ Results saved to league history</p>
      )}

      <button className="btn-primary w-full max-w-sm py-4 text-lg" onClick={detachGame}>
        ⚡ Back to League
      </button>
    </div>
  )
}
