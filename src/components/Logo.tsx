interface LogoProps {
  size?: number
  className?: string
}

/** Trophy mark — replaces the old crown. Cyan neon on dark. */
export function TrophyIcon({ size = 48, className = '' }: LogoProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" fill="none"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px #00d4ff80)' }}
    >
      {/* Cup body */}
      <path
        d="M20 10h24v10c0 8-5 14-12 14s-12-6-12-14V10Z"
        fill="#111827" stroke="#00d4ff" strokeWidth="2.5" strokeLinejoin="round"
      />
      {/* Left handle */}
      <path d="M20 13H13c-2 0-3 1-3 3v3c0 4 3 7 8 7"
        fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
      {/* Right handle */}
      <path d="M44 13h7c2 0 3 1 3 3v3c0 4-3 7-8 7"
        fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stem */}
      <rect x="29" y="34" width="6" height="8" fill="#00d4ff" />
      {/* Base */}
      <path d="M22 42h20l-2 6H24l-2-6Z" fill="#00d4ff" />
      <rect x="20" y="48" width="24" height="5" rx="1.5" fill="#00d4ff" />
      {/* Star detail */}
      <path d="M32 16l1.5 3.2 3.5.4-2.6 2.4.7 3.5L32 23.9 28.9 25.5l.7-3.5L27 19.6l3.5-.4L32 16Z"
        fill="#0a0a0a" />
    </svg>
  )
}

/** Full wordmark lockup used on auth / headers */
export function LogoMark({ size = 48 }: LogoProps) {
  return (
    <div className="flex flex-col items-center">
      <TrophyIcon size={size} />
      <h1 className="text-4xl font-bold mt-3 tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>
        <span className="text-white">DRAFT</span><span className="neon-text"> ROYAL</span>
      </h1>
    </div>
  )
}
