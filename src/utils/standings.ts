import { DraftResult } from '../types/db'

export type DraftGroup = { gameId: string; date: string; results: DraftResult[] }

export interface PlayerPick {
  gameId: string
  date: string
  position: number
  locked: boolean
}

export interface PlayerStat {
  name: string
  drafts: number
  avgPick: number
  bestPick: number     // lowest position achieved
  firstPicks: number   // number of #1 overall picks
  locks: number        // picks successfully locked (defended twice)
  picks: PlayerPick[]   // per-draft detail, most recent first
}

/** All-time standings, aggregated by player name across every completed draft.
 *  Ranked by average draft slot (lower is better), then by #1 picks. */
export function computeStandings(history: DraftGroup[]): PlayerStat[] {
  const map = new Map<string, PlayerStat>()
  for (const g of history) {
    for (const r of g.results) {
      const s = map.get(r.playerName) ?? {
        name: r.playerName, drafts: 0, avgPick: 0, bestPick: Infinity,
        firstPicks: 0, locks: 0, picks: [],
      }
      s.drafts += 1
      s.bestPick = Math.min(s.bestPick, r.pickPosition)
      if (r.pickPosition === 1) s.firstPicks += 1
      if (r.locked) s.locks += 1
      s.picks.push({ gameId: g.gameId, date: g.date, position: r.pickPosition, locked: r.locked })
      map.set(r.playerName, s)
    }
  }
  const stats = [...map.values()].map(s => ({
    ...s,
    avgPick: s.picks.reduce((a, p) => a + p.position, 0) / Math.max(1, s.picks.length),
    bestPick: s.bestPick === Infinity ? 0 : s.bestPick,
  }))
  stats.sort((a, b) => a.avgPick - b.avgPick || b.firstPicks - a.firstPicks)
  return stats
}

export interface ActivityEvent {
  id: string
  icon: string
  title: string
  subtitle: string
  date: string
}

/** A lightweight feed derived from completed drafts (no separate event store). */
export function computeActivity(history: DraftGroup[]): ActivityEvent[] {
  const events: ActivityEvent[] = []
  history.forEach((g, i) => {
    const sorted = [...g.results].sort((a, b) => a.pickPosition - b.pickPosition)
    const first = sorted[0]
    const lockCount = g.results.filter(r => r.locked).length
    if (first) {
      events.push({
        id: `${g.gameId}-draft`,
        icon: '🏆',
        title: `Draft #${history.length - i} complete`,
        subtitle: `👑 ${first.playerName} earned the #1 pick${lockCount ? ` · 🔒 ${lockCount} locked` : ''}`,
        date: g.date,
      })
    }
  })
  return events
}

export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
