import { useState } from 'react'
import { doc, setDoc, addDoc, collection } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../store/AuthContext'
import { useMyLeagues } from '../../hooks/useLeague'
import { TrophyIcon } from '../Logo'
import { TurnOrderMode, AbsentBehavior, BallMode } from '../../types/game'

interface Props {
  onSelectLeague: (leagueId: string) => void
  onJoinViaToken: () => void
  onMockDraft?: () => void
}

const SPORTS = ['Fantasy Football', 'Fantasy Basketball', 'Fantasy Baseball', 'Fantasy Hockey', 'Other']

export default function Dashboard({ onSelectLeague, onJoinViaToken, onMockDraft }: Props) {
  const { user, profile } = useAuth()
  const { leagues, loading, refresh } = useMyLeagues(user?.uid ?? null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState('Fantasy Football')
  const [turnMode, setTurnMode] = useState<TurnOrderMode>('random')
  const [absent, setAbsent] = useState<AbsentBehavior>('skip')
  const [ballMode, setBallMode] = useState<BallMode>('scaled')
  const [swapsPP, setSwapsPP] = useState(3)
  const [shotgunsPP, setShotgunsPP] = useState(2)
  const [customSwaps, setCustomSwaps] = useState(30)
  const [customShotguns, setCustomShotguns] = useState(24)
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
        settings: {
          turnOrderMode: turnMode, absentBehavior: absent,
          ballMode, swapsPerPlayer: swapsPP, shotgunsPerPlayer: shotgunsPP,
          customSwaps, customShotguns,
        },
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
    <div className="max-w-lg mx-auto px-4 pt-8 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-wide">
          <span className="text-white">DRAFT</span>{' '}
          <span className="neon-text">ROYALE</span>
        </h1>
        <span className="text-gray-500 text-sm">@{profile?.username ?? '...'}</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm uppercase tracking-wide font-medium">My Leagues</p>
          {!showCreate && leagues.length > 0 && (
            <button className="text-cyan-400 text-sm font-medium" onClick={() => setShowCreate(true)}>
              + New
            </button>
          )}
        </div>

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

        {/* Create form (inline) */}
        {showCreate && (
          <div className="card space-y-3 border-cyan-500/30 mt-2">
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

            {/* Game settings */}
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide">Draw order</label>
                <select value={turnMode} onChange={e => setTurnMode(e.target.value as TurnOrderMode)}
                  className="w-full mt-1 bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                             text-white focus:outline-none focus:border-cyan-500 text-sm">
                  <option value="random">Random (shuffled at game start)</option>
                  <option value="manual">Manual (commissioner sets in lobby)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide">If a player is away on their turn</label>
                <select value={absent} onChange={e => setAbsent(e.target.value as AbsentBehavior)}
                  className="w-full mt-1 bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                             text-white focus:outline-none focus:border-cyan-500 text-sm">
                  <option value="skip">Skip them</option>
                  <option value="commissioner">Commissioner draws for them</option>
                  <option value="auto">Auto-draw after a countdown</option>
                  <option value="wait">Wait for them</option>
                </select>
              </div>

              {/* Ball pool */}
              <div>
                <label className="text-gray-400 text-xs uppercase tracking-wide">Ball pool</label>
                <select value={ballMode} onChange={e => setBallMode(e.target.value as BallMode)}
                  className="w-full mt-1 bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                             text-white focus:outline-none focus:border-cyan-500 text-sm">
                  <option value="scaled">Scale to number of players</option>
                  <option value="custom">Custom totals</option>
                </select>
                <p className="text-gray-600 text-xs mt-1 pl-1">🎯 Name balls are always 1 per player.</p>

                {ballMode === 'scaled' ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <BallField label="🔄 Swaps / player" value={swapsPP} onChange={setSwapsPP} max={10} />
                    <BallField label="🍺 Shotguns / player" value={shotgunsPP} onChange={setShotgunsPP} max={10} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <BallField label="🔄 Total swaps" value={customSwaps} onChange={setCustomSwaps} max={200} />
                    <BallField label="🍺 Total shotguns" value={customShotguns} onChange={setCustomShotguns} max={200} />
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-2.5 text-sm" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary flex-1 py-2.5 text-sm" onClick={handleCreate}
                disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Primary create button when no leagues yet */}
        {!showCreate && leagues.length === 0 && (
          <button className="btn-primary w-full py-3.5" onClick={() => setShowCreate(true)}>
            + Create League
          </button>
        )}
      </div>

      {/* Practice / onboarding */}
      {onMockDraft && (
        <div className="mt-8 pt-5 border-t border-royal-border">
          <p className="text-gray-400 text-sm uppercase tracking-wide font-medium mb-2">Practice</p>
          <button
            onClick={onMockDraft}
            className="card w-full flex items-center gap-3 hover:border-cyan-500/50 transition-colors active:scale-[0.99] text-left"
          >
            <span className="text-2xl">🎮</span>
            <div className="flex-1">
              <p className="font-bold text-white">Mock Draft</p>
              <p className="text-gray-500 text-sm">Solo practice vs. auto-players — learn the flow in 2 minutes</p>
            </div>
            <span className="text-gray-600">›</span>
          </button>
        </div>
      )}
    </div>
  )
}

function BallField({ label, value, onChange, max }: {
  label: string; value: number; onChange: (n: number) => void; max: number
}) {
  return (
    <div className="bg-black/40 border border-royal-border rounded-xl px-3 py-2">
      <p className="text-gray-400 text-[11px] mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <button type="button" className="w-7 h-7 rounded-lg bg-royal-muted text-lg leading-none active:scale-95"
          onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <span className="text-white font-bold">{value}</span>
        <button type="button" className="w-7 h-7 rounded-lg bg-royal-muted text-lg leading-none active:scale-95"
          onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}
