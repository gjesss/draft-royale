import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useMyLeagues } from '../../hooks/useLeague'
import { supabase } from '../../lib/supabase'
import { League } from '../../types/database'

interface Props {
  onSelectLeague: (leagueId: string) => void
  onJoinViaToken: () => void
}

const SPORTS = ['Fantasy Football', 'Fantasy Basketball', 'Fantasy Baseball', 'Fantasy Hockey', 'Other']

export default function Dashboard({ onSelectLeague, onJoinViaToken }: Props) {
  const { user, profile, signOut } = useAuth()
  const { leagues, loading, refresh } = useMyLeagues(user?.id ?? null)
  const [showCreate, setShowCreate] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')
  const [newLeagueSport, setNewLeagueSport] = useState('Fantasy Football')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreateLeague = async () => {
    if (!user || !newLeagueName.trim()) return
    setCreating(true)
    setError('')

    // Create league
    const { data: league, error: leagueErr } = await supabase
      .from('leagues')
      .insert({ name: newLeagueName.trim(), sport: newLeagueSport, commissioner_id: user.id })
      .select()
      .single()

    if (leagueErr || !league) {
      setError(leagueErr?.message ?? 'Failed to create league')
      setCreating(false)
      return
    }

    // Add creator as commissioner member
    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
      role: 'commissioner',
    })

    await refresh()
    setShowCreate(false)
    setNewLeagueName('')
    setCreating(false)
    onSelectLeague(league.id)
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-bold">
            <span className="text-white">DRAFT</span>{' '}
            <span className="neon-text">ROYALE</span>
          </h1>
          <p className="text-gray-500 text-sm">
            @{profile?.username ?? '...'} 👑
          </p>
        </div>
        <button className="text-gray-500 hover:text-red-400 text-sm py-2 px-3" onClick={signOut}>
          Sign out
        </button>
      </div>

      {/* My Leagues */}
      <div className="flex-1 px-4 py-2 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-400 text-sm uppercase tracking-wide font-medium">My Leagues</h2>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-600">Loading...</div>
        ) : leagues.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">🏈</p>
            <p className="text-gray-400">No leagues yet.</p>
            <p className="text-gray-600 text-sm mt-1">Create one or join via an invite link.</p>
          </div>
        ) : (
          leagues.map(l => <LeagueCard key={l.id} league={l} onClick={() => onSelectLeague(l.id)} userId={user?.id ?? ''} />)
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-8 pt-4 space-y-3 border-t border-royal-border">
        {showCreate ? (
          <div className="card space-y-3">
            <h3 className="font-bold text-white">New League</h3>
            <input
              type="text"
              placeholder="League name"
              value={newLeagueName}
              onChange={e => setNewLeagueName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateLeague()}
              maxLength={50}
              className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                         text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
              autoFocus
            />
            <select
              value={newLeagueSport}
              onChange={e => setNewLeagueSport(e.target.value)}
              className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                         text-white focus:outline-none focus:border-cyan-500 text-sm"
            >
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-2.5 text-sm" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                className="btn-primary flex-1 py-2.5 text-sm"
                onClick={handleCreateLeague}
                disabled={creating || !newLeagueName.trim()}
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="btn-primary w-full py-3.5" onClick={() => setShowCreate(true)}>
              + Create League
            </button>
            <button className="btn-ghost w-full py-3" onClick={onJoinViaToken}>
              🔗 Join via Invite Link
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LeagueCard({ league, onClick, userId }: { league: League; onClick: () => void; userId: string }) {
  const isComm = league.commissioner_id === userId
  return (
    <button
      onClick={onClick}
      className="card w-full flex items-center justify-between hover:border-cyan-500/50 transition-colors active:scale-[0.99] text-left"
    >
      <div>
        <p className="font-bold text-white">{league.name}</p>
        <p className="text-gray-500 text-sm mt-0.5">{league.sport}</p>
      </div>
      <div className="flex items-center gap-2">
        {isComm && (
          <span className="text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full">
            Commissioner
          </span>
        )}
        <span className="text-gray-600">›</span>
      </div>
    </button>
  )
}
