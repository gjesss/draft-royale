import { ActivityEvent, fmtDate } from '../../utils/standings'

export default function ActivityFeed({ events, limit }: { events: ActivityEvent[]; limit?: number }) {
  const shown = limit ? events.slice(0, limit) : events
  if (shown.length === 0) {
    return (
      <div className="card text-center py-6">
        <p className="text-gray-500 text-sm">No activity yet.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {shown.map(e => (
        <div key={e.id} className="card flex items-center gap-3 py-2.5">
          <span className="text-2xl shrink-0">{e.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{e.title}</p>
            <p className="text-gray-500 text-xs truncate">{e.subtitle}</p>
          </div>
          <span className="text-gray-600 text-xs shrink-0">{fmtDate(e.date)}</span>
        </div>
      ))}
    </div>
  )
}
