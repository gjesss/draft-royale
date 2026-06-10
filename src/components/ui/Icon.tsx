// Sharp, stroke-based icon set (Lucide-style) — replaces all emoji usage.
// Single family, currentColor, consistent 24px grid.

export type IconName =
  | 'trophy' | 'lock' | 'shield' | 'swords' | 'target' | 'dice' | 'flame'
  | 'chevronRight' | 'chevronDown' | 'plus' | 'minus' | 'check' | 'x'
  | 'users' | 'user' | 'link' | 'share' | 'home' | 'gamepad' | 'cup'
  | 'medal' | 'clock' | 'play' | 'cards' | 'crosshair' | 'message'
  | 'star' | 'arrowLeft' | 'logout' | 'book' | 'refresh' | 'sparkle'

const P: Record<IconName, JSX.Element> = {
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a4 4 0 0 0 4 4M17 6h3v1a4 4 0 0 1-4 4" /><path d="M10 14.5V18M14 14.5V18M8 21h8M9 18h6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  shield: <><path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /></>,
  swords: <><path d="M3 3l7 7M5 3H3v2M3 17l5-5M21 3l-7 7M19 3h2v2M21 17l-5-5M14 14l5 5h2v-2l-5-5" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  crosshair: <><circle cx="12" cy="12" r="8" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><circle cx="9" cy="15" r="1.2" fill="currentColor" /></>,
  cards: <><rect x="7" y="4" width="11" height="15" rx="2" transform="rotate(8 12 11)" /><rect x="5" y="6" width="11" height="15" rx="2" transform="rotate(-8 11 13)" /></>,
  flame: <><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C9 9 9 7 12 3Z" /></>,
  chevronRight: <><path d="M9 6l6 6-6 6" /></>,
  chevronDown: <><path d="M6 9l6 6 6-6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  check: <><path d="M5 12l5 5 9-11" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><path d="M16 6.5a3 3 0 0 1 0 5.5M18 20c0-2.5-1-4-2.5-4.7" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  link: <><path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8 15.8 7.2M8.2 13.2l7.6 3.6" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>,
  gamepad: <><rect x="2" y="7" width="20" height="11" rx="4" /><path d="M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01" /></>,
  cup: <><path d="M6 8h12l-1 8a3 3 0 0 1-3 2.5h-4A3 3 0 0 1 7 16L6 8Z" /><path d="M6 8l-.5-3h13L18 8" /></>,
  medal: <><circle cx="12" cy="15" r="5" /><path d="M9 10 7 3M15 10l2-7M12 13l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2.8-1.6Z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  play: <><path d="M7 5l11 7-11 7V5Z" /></>,
  message: <><path d="M4 5h16v11H8l-4 3V5Z" /></>,
  star: <><path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5L12 3Z" /></>,
  arrowLeft: <><path d="M15 6l-6 6 6 6M9 12h11" /></>,
  logout: <><path d="M14 4h4v16h-4M14 12H4m0 0 3-3m-3 3 3 3" /></>,
  book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 0-2 2V4Z" /><path d="M5 18a2 2 0 0 0 2 2h11" /></>,
  refresh: <><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M18 4v5h-5M6 20v-5h5" /></>,
  sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></>,
}

interface Props {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 2 }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {P[name]}
    </svg>
  )
}
