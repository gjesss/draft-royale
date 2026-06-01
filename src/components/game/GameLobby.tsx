import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useGame } from '../../store/GameContext'
import { LeagueMember } from '../../types/db'
import { GameSettings, DEFAULT_SETTINGS, resolveBallCounts } from '../../types/game'

interface Props {
  gameId: string
  leagueId: string
  members: LeagueMember[]
  isCommissioner: boolean
  settings?: GameSettings
  onBack: () => void
}

export default function GameLobby({ gameId, leagueId, members, isCommissioner, settings, onBack }: Props) {
  const { dispatch, syncGame } = useGame()
  const [selected, setSelected] = useState<Set<string>>(new Set(members.map(m => m.userId)))
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.userId, m.displayName || m.username]))
  )
  const [starting, setStarting] = useState(false)

  const toggle = (uid: string) => setSelected(prev => {
    const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n
  })

  const handleStart = async () => {
    if (selected.size < 2) return
    setStarting(true)
    const gamePlayers = members
      .filter(m => selected.has(m.userId))
      .map(m => ({ name: names[m.userId]?.trim() || m.username, uid: m.userId }))

    await updateDoc(doc(db, 'leagues', leagueId, 'games', gameId), { status: 'playing' })
    syncGame(leagueId, gameId, isCommissioner)
    dispatch({ type: 'START_GAME', players: gamePlayers, settings: settings ?? DEFAULT_SETTINGS })
  }

  if (!isCommissioner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-4">⏳</p>
        <h2 className="text-xl font-bold text-white mb-2">Waiting for commissioner...</h2>
        <p className="text-gray-400 text-sm">The game will start shortly.</p>
        <button className="btn-ghost mt-6" onClick={onBack}>← Leave</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-royal-border">
        <button className="text-gray-400 hover:text-white p-2 -ml-2" onClick={onBack}>← Back</button>
        <h2 className="text-xl font-bold neon-text">Game Lobby</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <p className="text-gray-400 text-sm">Select players and optionally edit their display name for this game.</p>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.userId}
              className={`card flex items-center gap-3 cursor-pointer transition-all ${selected.has(m.userId) ? 'border-cyan-500/50' : 'opacity-50'}`}
              onClick={() => toggle(m.userId)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                ${selected.has(m.userId) ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'}`}>
                {selected.has(m.userId) && <span className="text-black text-xs font-bold">✓</span>}
              </div>
              <p className="text-white font-medium text-sm flex-1">@{m.username}</p>
              {selected.has(m.userId) && (
                <input type="text" value={names[m.userId] ?? ''} maxLength={20}
                  onChange={e => setNames(p => ({ ...p, [m.userId]: e.target.value }))}
                  onClick={e => e.stopPropagation()} placeholder="Display name"
                  className="w-28 bg-black/50 border border-royal-border rounded-lg px-2 py-1.5
                             text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs text-center">{selected.size} player{selected.size !== 1 ? 's' : ''} selected</p>

        {/* Ball pool preview */}
        {selected.size >= 1 && (() => {
          const c = resolveBallCounts(settings ?? DEFAULT_SETTINGS, selected.size)
          const total = selected.size + c.pickSwaps + c.shotguns
          return (
            <div className="card bg-black/40 text-center text-sm">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">The Can — {total} balls</p>
              <div className="flex justify-center gap-4">
                <span className="text-cyan-400">🎯 {selected.size}</span>
                <span className="text-purple-400">🔄 {c.pickSwaps}</span>
                <span className="text-orange-400">🍺 {c.shotguns}</span>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="px-4 pb-8 pt-4 border-t border-royal-border">
        <button className="btn-primary w-full py-4 text-lg" onClick={handleStart}
          disabled={selected.size < 2 || starting}>
          {starting ? 'Starting...' : `🎱 Start Draft Royale (${selected.size} players)`}
        </button>
      </div>
    </div>
  )
}
