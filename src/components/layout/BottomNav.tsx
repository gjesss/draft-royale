export type NavTab = 'board' | 'members' | 'invite' | 'profile'

interface Props {
  active: NavTab
  onChange: (tab: NavTab) => void
}

const TABS: { id: NavTab; label: string; icon: (a: boolean) => JSX.Element }[] = [
  {
    id: 'board', label: 'Board',
    icon: a => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="11" rx="1" />
      </svg>
    ),
  },
  {
    id: 'members', label: 'Members',
    icon: a => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 6.5a3 3 0 0 1 0 5.5M18 20c0-2.5-1-4-2.5-4.7" />
      </svg>
    ),
  },
  {
    id: 'invite', label: 'Invite',
    icon: a => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M19 8v6M16 11h6" />
      </svg>
    ),
  },
  {
    id: 'profile', label: 'Profile',
    icon: a => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-royal-card/95 backdrop-blur border-t border-royal-border z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-lg mx-auto flex">
        {TABS.map(t => {
          const isActive = active === t.id
          return (
            <button key={t.id} onClick={() => onChange(t.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 touch-manipulation transition-colors">
              {t.icon(isActive)}
              <span className={`text-[11px] font-medium ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
