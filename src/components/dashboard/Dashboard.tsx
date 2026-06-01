import { useState } from 'react'
import { doc, setDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../store/AuthContext'
import { useMyLeagues } from '../../hooks/useLeague'
import { TrophyIcon } from '../Logo'

interface Props {
  onSelectLeague: (leagueId: string) => void
  onJoinViaToken: () => void
}

const SPORTS = ['Fantasy Football', 'Fantasy Basketball', 'Fantasy Baseball', 'Fantasy Hockey', 'Other']

export default function Dashboard({ onSelectLeague, onJoinViaToken }: Props) {
  const { user, profile } = useAuth()
  const { leagues, loading, refresh } = useMyLeagues(user?.uid ?? null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('Fantasy Football')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!user || !profile || !newName.trim()) return
    setCreating(true); setError('')
    try {
      // Create league doc
      const leagueRef = await addDoc(collection(db, 'leagues'), {
        name: newName.trim(), sport: newSport,
        commissionerId: user.uid, createdAt: new Date().toISOString(),
      })
      // Add commissioner as member (subcollection)
      await setDoc(doc(db, 'leagues', leagueRef.id, 'members', user.uid), {
        userId: user.uid, role: 'commissioner',
        displayName: profile.displayName, username: profile.username,
        joinedAt: new Date().toISOString(),
      })
      // Add leagueMembers index
      await setDoc(doc(db, 'leagueMembers', `${leagueRef.id}_${user.uid}`), {
        userId: user.uid, leagueId: leagueRef.id, role: 'commissioner',
      })
      await refresh()
      setShowCreate(false); setNewName('')
      onSelectLeague(leagueRef.id)
    } catch (e: unknown) { setError((e as Error).message) }
    setCreating(false)
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-4 pt-8 pb-4">
        <TrophyIcon size={48} />
        <div>
          <h1 className="text-xl font-bold leading-none tracking-wide">
            <span className="text-white">DRAFT</span>{' '}
            <span className="neon-text">ROYALE</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">@{profile?.username ?? '...'}</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-2 space-y-3">
        <p className="text-gray-400 text-sm uppercase tracking-wide font-medium">My Leagues</p>

        {loading ? (
          <div className="text-center py-10 text-gray-600">Loading...</div>
        ) : leagues.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-4xl mb-3">🏈</p>
            <p className="text-gray-400">No leagues yet.</p>
            <p className="text-gray-600 text-sm mt-1">Create one, or tap Join to enter a code.</p>
          </div>
        ) : (
          leagues.map(l => (
            <button key={l.id} onClick={() => onSelectLeague(l.id)}
              className="card w-full flex items-center justify-between hover:border-cyan-500/50 transition-colors active:scale-[0.99] text-left">
              <div>
                <p className="font-bold text-white">{l.name}</p>
                <p className="text-gray-500 text-sm mt-0.5">{l.sport}</p>
              </div>
              <div className="flex items-center gap-2">
                {l.commissionerId === user?.uid && (
                  <span className="text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full">
                    Commissioner
                  </span>
                )}
                <span className="text-gray-600">›</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="px-4 pb-8 pt-4 space-y-3 border-t border-royal-border">
        {showCreate ? (
          <div className="card space-y-3">
            <h3 className="font-bold text-white">New League</h3>
            <input type="text" placeholder="League name" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} maxLength={50} autoFocus
              className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                         text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
            />
            <select value={newSport} onChange={e => setNewSport(e.target.value)}
              className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                         text-white focus:outline-none focus:border-cyan-500 text-sm">
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-2.5 text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary flex-1 py-2.5 text-sm" onClick={handleCreate}
                disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-primary w-full py-3.5" onClick={() => setShowCreate(true)}>+ Create League</button>
        )}
      </div>
    </div>
  )
}
