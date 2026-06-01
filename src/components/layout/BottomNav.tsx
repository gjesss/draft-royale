export type NavTab = 'leagues' | 'join' | 'profile'

interface Props {
  active: NavTab
  onChange: (tab: NavTab) => void
}

const TABS: { id: NavTab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'leagues',
    label: 'Leagues',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
  {
    id: 'join',
    label: 'Join',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={a ? '#00d4ff' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-royal-card/95 backdrop-blur border-t border-royal-border z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex">
        {TABS.map(t => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 touch-manipulation transition-colors"
            >
              {t.icon(isActive)}
              <span className={`text-[11px] font-medium ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
