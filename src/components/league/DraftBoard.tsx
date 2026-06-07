import Avatar from '../ui/Avatar'

export interface BoardCell {
  position: number
  name: string | null      // null = not yet drawn
  seed?: string            // stable color seed (uid/name)
  locked?: boolean
  defenseCount?: number    // 0..2
  onClock?: boolean        // next pick to be filled
}

/** Spatial draft board — the Sleeper-style centerpiece. 1 column on phones,
 *  2 columns once the league is large enough to benefit. */
export default function DraftBoard({ cells, dense }: { cells: BoardCell[]; dense?: boolean }) {
  const twoCol = cells.length > 8
  return (
    <div className={`grid gap-2 ${twoCol ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {cells.map(c => {
        const filled = !!c.name
        return (
          <div
            key={c.position}
            className={`flex items-center gap-2.5 rounded-xl border px-2.5 ${dense ? 'py-2' : 'py-2.5'}
              transition-all
              ${c.locked
                ? 'border-yellow-600/60 bg-yellow-900/10'
                : c.onClock
                ? 'border-cyan-500 bg-cyan-500/10 shadow-neon-sm animate-pulse-cyan'
                : filled
                ? 'border-royal-border bg-royal-card'
                : 'border-dashed border-royal-border/60 bg-black/20'}`}
          >
            {/* Pick number */}
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
              ${c.locked ? 'bg-yellow-500 text-black' : filled ? 'bg-royal-muted text-gray-200' : 'bg-black/40 text-gray-600'}`}>
              {c.position}
            </div>

            {/* Player */}
            {filled ? (
              <>
                <Avatar name={c.name!} seed={c.seed} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold leading-tight ${c.locked ? 'text-yellow-400' : 'text-white'}`}>
                    {c.name}
                  </p>
                  {/* defense pips / locked */}
                  {c.locked ? (
                    <span className="text-yellow-500 text-[10px]">👑 Locked</span>
                  ) : c.defenseCount != null && c.defenseCount > 0 ? (
                    <span className="text-cyan-400 text-[10px]">🛡 {c.defenseCount}/2</span>
                  ) : c.onClock ? (
                    <span className="text-cyan-400 text-[10px]">● on the clock</span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm italic flex-1">
                {c.onClock ? 'On the clock…' : 'Open'}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
