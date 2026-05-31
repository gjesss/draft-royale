import { useState } from 'react'
import { useGame } from '../../store/GameContext'
import { MemberWithProfile } from '../../hooks/useLeague'
import { supabase } from '../../lib/supabase'

interface Props {
  gameId: string
  leagueId: string
  members: MemberWithProfile[]
  isCommissioner: boolean
  onBack: () => void
}

export default function GameLobby({ gameId, leagueId, members, isCommissioner, onBack }: Props) {
  const { dispatch, syncGame } = useGame()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(members.map(m => m.user_id)))
  const [customNames, setCustomNames] = useState<Record<string, string>>(
    Object.fromEntries(members.map(m => [m.user_id, (m as any).profiles?.display_name ?? (m as any).profiles?.username ?? '']))
  )
  const [starting, setStarting] = useState(false)

  const toggle = (uid: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(uid) ? next.delete(uid) : next.add(uid)
      return next
    })
  }

  const handleStart = async () => {
    if (selectedIds.size < 2) return
    setStarting(true)

    const playerNames = members
      .filter(m => selectedIds.has(m.user_id))
      .map(m => customNames[m.user_id]?.trim() || (m as any).profiles?.username || 'Player')

    // Update game status to playing
    await supabase.from('games').update({ status: 'playing' }).eq('id', gameId)

    // Sync game context
    syncGame(gameId, isCommissioner)

    // Dispatch start
    dispatch({ type: 'START_GAME', playerNames })
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
        <p className="text-gray-400 text-sm">
          Select which league members are playing. You can also edit their display name for this game.
        </p>

        <div className="space-y-2">
          {members.map(m => {
            const profile = (m as any).profiles
            const selected = selectedIds.has(m.user_id)

            return (
              <div
                key={m.user_id}
                className={`card flex items-center gap-3 transition-all cursor-pointer
                  ${selected ? 'border-cyan-500/50' : 'opacity-50'}`}
                onClick={() => toggle(m.user_id)}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                  ${selected ? 'border-cyan-400 bg-cyan-400' : 'border-gray-600'}`}>
                  {selected && <span className="text-black text-xs font-bold">✓</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">@{profile?.username}</p>
                </div>

                {/* Editable display name */}
                {selected && (
                  <input
                    type="text"
                    value={customNames[m.user_id] ?? ''}
                    onChange={e => setCustomNames(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                    placeholder="Display name"
                    maxLength={20}
                    className="w-28 bg-black/50 border border-royal-border rounded-lg px-2 py-1.5
                               text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>
            )
          })}
        </div>

        <p className="text-gray-600 text-xs text-center">
          {selectedIds.size} player{selectedIds.size !== 1 ? 's' : ''} selected
        </p>
      </div>

      <div className="px-4 pb-8 pt-4 border-t border-royal-border">
        <button
          className="btn-primary w-full py-4 text-lg"
          onClick={handleStart}
          disabled={selectedIds.size < 2 || starting}
        >
          {starting ? 'Starting...' : `🎱 Start Draft Royale (${selectedIds.size} players)`}
        </button>
      </div>
    </div>
  )
}
