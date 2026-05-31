import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { DraftResult } from '../../types/database'

interface Props {
  leagueId: string
  seasonId?: string
}

interface GameGroup {
  gameId: string
  date: string
  results: DraftResult[]
}

export default function GameHistory({ leagueId, seasonId }: Props) {
  const [groups, setGroups] = useState<GameGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let q = supabase
      .from('draft_results')
      .select('*')
      .eq('league_id', leagueId)
      .order('game_id')
      .order('pick_position')

    if (seasonId) q = q.eq('season_id', seasonId)

    q.then(({ data }) => {
      if (!data) { setLoading(false); return }

      // Group by game
      const map = new Map<string, DraftResult[]>()
      for (const r of data) {
        const arr = map.get(r.game_id) ?? []
        arr.push(r)
        map.set(r.game_id, arr)
      }

      // Get game dates
      supabase
        .from('games')
        .select('id, created_at')
        .in('id', [...map.keys()])
        .then(({ data: games }) => {
          const dateMap = new Map(games?.map(g => [g.id, g.created_at]) ?? [])
          const gs: GameGroup[] = [...map.entries()].map(([gameId, results]) => ({
            gameId,
            date: dateMap.get(gameId) ?? '',
            results,
          }))
          gs.sort((a, b) => b.date.localeCompare(a.date))
          setGroups(gs)
          setLoading(false)
        })
    })
  }, [leagueId, seasonId])

  if (loading) return <div className="text-center py-10 text-gray-600">Loading...</div>

  if (groups.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-gray-500 text-sm">No completed games yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <div key={g.gameId} className="card">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpanded(expanded === g.gameId ? null : g.gameId)}
          >
            <div className="text-left">
              <p className="font-semibold text-white text-sm">
                Draft #{groups.length - i} — {new Date(g.date).toLocaleDateString()}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                👑 {g.results[0]?.player_name ?? '—'} got Pick #1
              </p>
            </div>
            <span className="text-gray-500">{expanded === g.gameId ? '▲' : '▼'}</span>
          </button>

          {expanded === g.gameId && (
            <div className="mt-3 space-y-1.5 border-t border-royal-border pt-3">
              {g.results.map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                    ${r.pick_position === 1 ? 'bg-yellow-500 text-black' : 'bg-royal-muted text-gray-400'}`}>
                    {r.pick_position === 1 ? '👑' : r.pick_position}
                  </span>
                  <span className={`text-sm ${r.pick_position === 1 ? 'text-yellow-400 font-semibold' : 'text-white'}`}>
                    {r.player_name}
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
