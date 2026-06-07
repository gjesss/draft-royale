import Avatar from '../ui/Avatar'
import { useAuth } from '../../store/AuthContext'

interface Props {
  leagueName: string
  leagueId: string
  sport?: string
  isCommissioner?: boolean
  onOpenSwitcher: () => void
  onOpenProfile: () => void
}

/** Sticky league context bar. Left: league avatar + name (→ switcher).
 *  Right: your avatar (→ profile). Present on every in-league screen. */
export default function LeagueHeader({ leagueName, leagueId, sport, isCommissioner, onOpenSwitcher, onOpenProfile }: Props) {
  const { profile } = useAuth()
  return (
    <div className="sticky top-0 z-30 bg-royal-dark/95 backdrop-blur border-b border-royal-border"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-between px-3 py-2.5">
        <button onClick={onOpenSwitcher} className="flex items-center gap-2.5 min-w-0 active:opacity-70">
          <Avatar name={leagueName} seed={leagueId} size="md" />
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-white truncate max-w-[180px]">{leagueName}</p>
              <span className="text-gray-500 text-xs">▾</span>
            </div>
            <p className="text-gray-500 text-xs truncate">
              {sport}{isCommissioner ? ' · Commissioner' : ''}
            </p>
          </div>
        </button>
        <button onClick={onOpenProfile} className="active:opacity-70 shrink-0">
          <Avatar name={profile?.displayName ?? 'You'} seed={profile?.uid} size="md" />
        </button>
      </div>
    </div>
  )
}
