import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'

export interface BoardCell {
  position: number
  name: string | null
  seed?: string
  locked?: boolean
  defenseCount?: number
  onClock?: boolean
}

/** Spatial draft board — the centerpiece. 1 col on phones, 2 cols when large. */
export default function DraftBoard({ cells, dense }: { cells: BoardCell[]; dense?: boolean }) {
  const twoCol = cells.length > 8
  return (
    <div className={`grid gap-1.5 ${twoCol ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {cells.map(c => {
        const filled = !!c.name
        return (
          <div
            key={c.position}
            className={`flex items-center gap-2.5 rounded-lg border px-2 ${dense ? 'py-1.5' : 'py-2'} transition-all
              ${c.locked
                ? 'border-gold-700/60 bg-gold-900/30'
                : c.onClock
                ? 'border-cyan-500 bg-cyan-900/20 animate-pulse-cyan'
                : filled
                ? 'border-royal-border bg-royal-card'
                : 'border-dashed border-royal-border/60 bg-black/20'}`}
          >
            {/* Pick number — scoreboard numerals */}
            <div className={`w-7 text-center font-display font-bold text-base tnum leading-none shrink-0
              ${c.locked ? 'text-gold-400' : c.onClock ? 'text-cyan-400' : filled ? 'text-gray-400' : 'text-gray-700'}`}>
              {c.position}
            </div>

            {filled ? (
              <>
                <Avatar name={c.name!} seed={c.seed} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold leading-tight ${c.locked ? 'text-gold-400' : 'text-white'}`}>
                    {c.name}
                  </p>
                  {c.locked ? (
                    <span className="flex items-center gap-1 text-gold-500 text-[10px] uppercase tracking-wide font-semibold">
                      <Icon name="lock" size={10} strokeWidth={2.5} /> Locked
                    </span>
                  ) : c.defenseCount != null && c.defenseCount > 0 ? (
                    <span className="flex items-center gap-1 text-cyan-400 text-[10px] uppercase tracking-wide font-semibold">
                      <Icon name="shield" size={10} strokeWidth={2.5} /> {c.defenseCount}/2
                    </span>
                  ) : c.onClock ? (
                    <span className="text-cyan-400 text-[10px] uppercase tracking-wide font-semibold">On the clock</span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm flex-1">{c.onClock ? 'On the clock' : 'Open'}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
