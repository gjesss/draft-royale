import { PlayerStat, fmtDate } from '../../utils/standings'
import Avatar from '../ui/Avatar'

/** Bottom-sheet profile for one player: aggregate stats + every draft pick. */
export default function MemberSheet({ stat, onClose }: { stat: PlayerStat; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="p-5 pb-safe">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={stat.name} seed={stat.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold text-white truncate">{stat.name}</p>
              <p className="text-gray-500 text-sm">{stat.drafts} draft{stat.drafts !== 1 ? 's' : ''} played</p>
            </div>
            <button onClick={onClose} className="text-gray-500 text-sm px-2">Close</button>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <Stat label="Avg pick" value={`#${stat.avgPick.toFixed(1)}`} />
            <Stat label="Best" value={`#${stat.bestPick}`} />
            <Stat label="#1s" value={String(stat.firstPicks)} accent />
            <Stat label="Locks" value={String(stat.locks)} />
          </div>

          {/* Per-draft history */}
          <p className="section-label mb-2">Pick History</p>
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {stat.picks.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/30 border border-royal-border/60">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                  ${p.position === 1 ? 'bg-yellow-500 text-black' : 'bg-royal-muted text-gray-300'}`}>
                  {p.position}
                </span>
                <span className="text-sm text-white flex-1">Pick #{p.position}</span>
                {p.locked && <span className="chip-gold">Locked</span>}
                <span className="text-gray-600 text-xs">{fmtDate(p.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-black/40 border border-royal-border rounded-xl py-2.5 text-center">
      <p className={`text-lg font-bold ${accent ? 'text-yellow-400' : 'text-white'}`}>{value}</p>
      <p className="text-gray-500 text-[10px] uppercase tracking-wide">{label}</p>
    </div>
  )
}
