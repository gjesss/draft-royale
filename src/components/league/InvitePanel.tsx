import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useLeague } from '../../hooks/useLeague'
import { LeagueInvite } from '../../types/db'

interface Props { leagueId: string; isCommissioner: boolean; leagueName: string }

export default function InvitePanel({ leagueId, isCommissioner, leagueName }: Props) {
  const { user } = useAuth()
  const { createInvite, revokeInvite, getInvites } = useLeague(leagueId)
  const [invites, setInvites] = useState<LeagueInvite[]>([])
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [newLink, setNewLink] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const base = window.location.origin

  useEffect(() => { getInvites().then(setInvites) }, [leagueId])

  const handleCreate = async () => {
    if (!user) return
    setCreating(true)
    const { data } = await createInvite(user.uid, leagueName, email.trim())
    if (data) {
      const link = `${base}/join/${data.token}`
      setNewLink(link)
      setInvites(prev => [data as LeagueInvite, ...prev])
      setEmail('')
    }
    setCreating(false)
  }

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const share = (token: string) => {
    const link = `${base}/join/${token}`
    if (navigator.share) navigator.share({ title: 'Join my Draft Royale league!', url: link })
    else navigator.clipboard.writeText(link)
  }

  const handleRevoke = async (inv: LeagueInvite) => {
    await revokeInvite(inv.id, inv.token)
    setInvites(prev => prev.filter(i => i.id !== inv.id))
  }

  return (
    <div className="space-y-4">
      {isCommissioner && (
        <div className="card space-y-3">
          <h3 className="font-bold text-white text-sm">Create Invite Link</h3>
          <input
            type="email" placeholder="Email (optional, for reference)"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                       text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button className="btn-primary w-full py-3 text-sm" onClick={handleCreate} disabled={creating}>
            {creating ? 'Generating...' : '🔗 Generate Invite Link'}
          </button>
          {newLink && (
            <div className="bg-cyan-900/20 border border-cyan-700 rounded-xl p-3">
              <p className="text-cyan-400 text-xs font-medium mb-2">✅ Invite created! Share it:</p>
              <p className="text-white text-xs break-all font-mono bg-black/40 rounded-lg px-3 py-2 mb-2">
                {newLink}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 text-xs btn-primary"
                  onClick={() => navigator.share
                    ? navigator.share({ title: 'Join my Draft Royale league!', url: newLink })
                    : navigator.clipboard.writeText(newLink)}>
                  📤 Share
                </button>
                <button className="flex-1 py-2 text-xs btn-ghost"
                  onClick={() => copy(newLink, 'new')}>
                  {copiedId === 'new' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Active Invites ({invites.length})</p>
        {invites.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-gray-500 text-sm">
              {isCommissioner ? 'No active invites. Generate one above.' : 'No pending invites.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="card flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm truncate">{inv.email || `Token: ${inv.token.slice(0, 12)}...`}</p>
                  <p className="text-gray-600 text-xs">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                {isCommissioner && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => copy(`${base}/join/${inv.token}`, inv.id)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-royal-muted hover:bg-gray-600 text-gray-300">
                      {copiedId === inv.id ? '✓' : '📋'}
                    </button>
                    <button onClick={() => share(inv.token)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-royal-muted hover:bg-gray-600 text-gray-300">
                      📤
                    </button>
                    <button onClick={() => handleRevoke(inv)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400">
                      ✕
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
