import { PlayerStat } from '../../utils/standings'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'

export default function Standings({ stats, onSelect }: {
  stats: PlayerStat[]
  onSelect?: (name: string) => void
}) {
  if (stats.length === 0) {
    return (
      <div className="card text-center py-7">
        <Icon name="trophy" size={28} className="mx-auto text-gray-600 mb-2" />
        <p className="text-gray-500 text-sm">No standings yet — run a draft to start tracking.</p>
      </div>
    )
  }
  const rankColor = (i: number) =>
    i === 0 ? 'text-gold-400' : i === 1 ? 'text-gray-200' : i === 2 ? 'text-amber-600' : 'text-gray-500'

  return (
    <div className="space-y-1.5">
      {stats.map((s, i) => (
        <button key={s.name} onClick={() => onSelect?.(s.name)}
          className="card-interactive w-full flex items-center gap-3 text-left py-2.5">
          <span className={`w-6 text-center font-display font-bold text-lg tnum ${rankColor(i)}`}>{i + 1}</span>
          <Avatar name={s.name} seed={s.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white truncate">{s.name}</p>
            <p className="text-gray-500 text-xs tnum">
              {s.drafts} draft{s.drafts !== 1 ? 's' : ''} · avg #{s.avgPick.toFixed(1)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {s.firstPicks > 0 && (
              <span className="chip-gold"><Icon name="trophy" size={11} strokeWidth={2.5} /> {s.firstPicks}</span>
            )}
            {s.locks > 0 && (
              <span className="chip"><Icon name="lock" size={11} strokeWidth={2.5} /> {s.locks}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
