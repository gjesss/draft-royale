import { useState } from 'react'
import { useDraftHistory } from '../../hooks/useLeague'
import { DraftResult } from '../../types/db'

interface Props { leagueId: string }

export default function GameHistory({ leagueId }: Props) {
  const { history, loading } = useDraftHistory(leagueId)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) return <div className="text-center py-10 text-gray-600">Loading...</div>

  if (history.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500 text-sm">No completed games yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((g, i) => (
        <div key={g.gameId} className="card">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpanded(expanded === g.gameId ? null : g.gameId)}
          >
            <div className="text-left">
              <p className="font-semibold text-white text-sm">
                Draft #{history.length - i} — {new Date(g.date).toLocaleDateString()}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                👑 {g.results[0]?.playerName ?? '—'} got Pick #1
              </p>
            </div>
            <span className="text-gray-500">{expanded === g.gameId ? '▲' : '▼'}</span>
          </button>

          {expanded === g.gameId && (
            <div className="mt-3 space-y-1.5 border-t border-royal-border pt-3">
              {g.results.map((r: DraftResult) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                    ${r.pickPosition === 1 ? 'bg-yellow-500 text-black' : 'bg-royal-muted text-gray-400'}`}>
                    {r.pickPosition === 1 ? '👑' : r.pickPosition}
                  </span>
                  <span className={`text-sm ${r.pickPosition === 1 ? 'text-yellow-400 font-semibold' : 'text-white'}`}>
                    {r.playerName}
                  </span>
                  {r.locked && <span className="text-yellow-500 text-xs ml-auto">🔒</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
