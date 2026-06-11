import { useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useGame } from '../store/GameContext'
import DraftBoard, { BoardCell } from './league/DraftBoard'
import Icon from './ui/Icon'

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

    const save = async () => {
      // Pull the game's season so history attaches to the right season.
      const gameSnap = await getDoc(doc(db, 'leagues', leagueId, 'games', gameId))
      const seasonId: string | null = gameSnap.data()?.seasonId ?? null

      const now = new Date().toISOString()
      await Promise.all(
        filledSlots.map(slot => {
          const player = players.find(p => p.id === slot.playerId)
          // Deterministic doc id => re-saves are creates-turned-updates, which
          // the rules reject (allow update: if false). History can't duplicate.
          return setDoc(doc(db, 'leagues', leagueId, 'draftResults', `${gameId}_${slot.position}`), {
            gameId,
            seasonId,
            userId: player?.uid ?? null,
            playerName: player?.name ?? '',
            pickPosition: slot.position,
            locked: slot.locked,
            createdAt: now,
          })
        })
      )
    }
    save().catch(console.error)
  }, [isCommissioner, gameId, leagueId, filledSlots, players])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <span className="inline-flex w-16 h-16 rounded-2xl bg-gold-900/50 border border-gold-700/50 items-center justify-center text-gold-400 mb-4">
          <Icon name="trophy" size={34} />
        </span>
        <h1 className="text-3xl font-display font-bold uppercase tracking-jersey text-white mb-1">Draft Order Set</h1>
        <p className="text-cyan-400">The last ball is gone. Good luck.</p>
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

      {isCommissioner && gameId && (
        <p className="text-cyan-400 text-xs mb-4 text-center flex items-center gap-1.5">
          <Icon name="check" size={13} /> Results saved to league history
        </p>
      )}

      <button className="btn-primary w-full max-w-sm py-4 text-lg" onClick={detachGame}>
        Back to League
      </button>
    </div>
  )
}
