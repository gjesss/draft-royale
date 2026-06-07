// Deterministic, dark-friendly avatars. Initials on a gradient picked from a
// hash of a stable seed (uid/username) so a person always looks the same.

const PALETTE: [string, string][] = [
  ['#0891b2', '#0e7490'], // cyan
  ['#7c3aed', '#5b21b6'], // violet
  ['#db2777', '#9d174d'], // pink
  ['#ea580c', '#9a3412'], // orange
  ['#16a34a', '#166534'], // green
  ['#2563eb', '#1e40af'], // blue
  ['#d97706', '#92400e'], // amber
  ['#dc2626', '#991b1b'], // red
]

const SIZES = {
  sm: { box: 28, font: 11 },
  md: { box: 40, font: 15 },
  lg: { box: 56, font: 20 },
  xl: { box: 96, font: 34 },
} as const

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface AvatarProps {
  name: string
  /** Stable identity for color (uid/username). Falls back to name. */
  seed?: string
  size?: keyof typeof SIZES
  className?: string
  /** Cyan ring (e.g. "it's their turn" / commissioner highlight). */
  ring?: boolean
}

export default function Avatar({ name, seed, size = 'md', className = '', ring }: AvatarProps) {
  const [from, to] = PALETTE[hash(seed || name) % PALETTE.length]
  const { box, font } = SIZES[size]
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-bold text-white
        ${ring ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-royal-dark' : ''} ${className}`}
      style={{
        width: box, height: box, fontSize: font,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  )
}
