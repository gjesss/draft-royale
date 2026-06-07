import { PlayerStat } from '../../utils/standings'
import Avatar from '../ui/Avatar'

export default function Standings({ stats, onSelect }: {
  stats: PlayerStat[]
  onSelect?: (name: string) => void
}) {
  if (stats.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-500 text-sm">No standings yet — play a draft to start tracking.</p>
      </div>
    )
  }
  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)
  return (
    <div className="space-y-2">
      {stats.map((s, i) => (
        <button key={s.name} onClick={() => onSelect?.(s.name)}
          className="card-interactive w-full flex items-center gap-3 text-left">
          <span className="w-7 text-center font-bold text-gray-300">{medal(i)}</span>
          <Avatar name={s.name} seed={s.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white truncate">{s.name}</p>
            <p className="text-gray-500 text-xs">
              {s.drafts} draft{s.drafts !== 1 ? 's' : ''} · avg #{s.avgPick.toFixed(1)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {s.firstPicks > 0 && <span className="chip-gold">🥇 {s.firstPicks}</span>}
            {s.locks > 0 && <span className="chip">🔒 {s.locks}</span>}
          </div>
        </button>
      ))}
    </div>
  )
}
