export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-royal-card ${className}`} />
}

/** Placeholder rows that mimic a list of cards while data loads. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3 py-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Full league-hub loading state (header bar + content). */
export function SkeletonHub() {
  return (
    <div className="min-h-screen max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-royal-border">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-2.5 w-24" /></div>
      </div>
      <div className="px-4 py-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <SkeletonList rows={5} />
      </div>
    </div>
  )
}
