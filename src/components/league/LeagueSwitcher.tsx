import { useAuth } from '../../store/AuthContext'
import { useMyLeagues } from '../../hooks/useLeague'
import Avatar from '../ui/Avatar'

interface Props {
  currentLeagueId: string | null
  onSelect: (leagueId: string) => void
  onCreate: () => void
  onJoin: () => void
  onClose: () => void
}

/** Translucent, bottom-anchored league switcher (Sleeper pattern). */
export default function LeagueSwitcher({ currentLeagueId, onSelect, onCreate, onJoin, onClose }: Props) {
  const { user } = useAuth()
  const { leagues } = useMyLeagues(user?.uid ?? null)
  // Most-recent first; current league pinned to the bottom (thumb-reachable).
  const ordered = [...leagues].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="p-4 pb-safe">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Your Leagues</p>
            <button onClick={onClose} className="text-gray-500 text-sm px-2">Close</button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {ordered.map(l => (
              <button key={l.id} onClick={() => onSelect(l.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all active:scale-[0.99]
                  ${l.id === currentLeagueId ? 'border-cyan-500 bg-cyan-500/10' : 'border-royal-border bg-royal-card'}`}>
                <Avatar name={l.name} seed={l.id} size="md" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-white truncate">{l.name}</p>
                  <p className="text-gray-500 text-xs truncate">{l.sport}</p>
                </div>
                {l.id === currentLeagueId && <span className="text-cyan-400 text-xs">● current</span>}
                {l.commissionerId === user?.uid && l.id !== currentLeagueId && (
                  <span className="chip-accent">Commish</span>
                )}
              </button>
            ))}
            {ordered.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No leagues yet.</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn-primary flex-1 py-3 text-sm" onClick={onCreate}>+ Create League</button>
            <button className="btn-ghost flex-1 py-3 text-sm" onClick={onJoin}>🔗 Join</button>
          </div>
        </div>
      </div>
    </div>
  )
}
