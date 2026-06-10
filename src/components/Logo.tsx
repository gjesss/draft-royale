interface LogoProps {
  size?: number
  className?: string
}

/**
 * Official Draft Royale logo (crown + shield wordmark).
 * Source file lives at /public/logo.png.
 * Kept the export name `TrophyIcon` for backwards-compat with existing imports.
 */
export function TrophyIcon({ size = 48, className = '' }: LogoProps) {
  return (
    <img
      src="/logo-192.png"
      alt="Draft Royale"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

/** Large hero lockup — the official logo already contains the wordmark. */
export function LogoMark({ size = 200 }: LogoProps) {
  return (
    <img
      src="/logo-512.png"
      alt="Draft Royale"
      width={size}
      height={size}
      className="object-contain mx-auto"
      style={{ width: size, height: size, filter: 'drop-shadow(0 0 24px #00d4ff40)' }}
    />
  )
}
