import { useEffect, useRef } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useGame } from '../store/GameContext'
import DraftBoard, { BoardCell } from './league/DraftBoard'

export default function Complete() {
  const { state, gameId, leagueId, isCommissioner, detachGame } = useGame()
  const { pickSlots, players } = state
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

      <div className="w-full mb-8">
        <DraftBoard cells={filledSlots.map(slot => {
          const player = players.find(p => p.id === slot.playerId)
          return {
            position: slot.position,
            name: player?.name ?? null,
            seed: player?.uid ?? player?.id ?? player?.name,
            locked: slot.locked,
          } as BoardCell
        })} />
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
