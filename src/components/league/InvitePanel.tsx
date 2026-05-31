import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useLeague } from '../../hooks/useLeague'
import { LeagueInvite } from '../../types/database'

interface Props {
  leagueId: string
  isCommissioner: boolean
}

export default function InvitePanel({ leagueId, isCommissioner }: Props) {
  const { user } = useAuth()
  const { createInvite, revokeInvite, getInvites } = useLeague(leagueId)
  const [invites, setInvites] = useState<LeagueInvite[]>([])
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null)

  const baseUrl = window.location.origin

  useEffect(() => {
    getInvites().then(setInvites)
  }, [leagueId])

  const handleCreate = async () => {
    if (!user) return
    setCreating(true)
    const { data, error } = await createInvite(user.id, email.trim() || undefined)
    if (data && !error) {
      const link = `${baseUrl}/join/${data.token}`
      setNewInviteLink(link)
      setInvites(prev => [data, ...prev])
      setEmail('')
    }
    setCreating(false)
  }

  const copyLink = async (token: string, inviteId: string) => {
    const link = `${baseUrl}/join/${token}`
    await navigator.clipboard.writeText(link).catch(() => {})
    setCopiedId(inviteId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const shareLink = async (token: string) => {
    const link = `${baseUrl}/join/${token}`
    if (navigator.share) {
      await navigator.share({ title: 'Join my Draft Royale league!', url: link }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(link)
    }
  }

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId)
    setInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  return (
    <div className="space-y-4">
      {isCommissioner && (
        <div className="card space-y-3">
          <h3 className="font-bold text-white text-sm">Create Invite Link</h3>
          <input
            type="email"
            placeholder="Email (optional, for your reference)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                       text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
          />
          <button
            className="btn-primary w-full py-3 text-sm"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Generating...' : '🔗 Generate Invite Link'}
          </button>

          {newInviteLink && (
            <div className="bg-cyan-900/20 border border-cyan-700 rounded-xl p-3">
              <p className="text-cyan-400 text-xs font-medium mb-2">✅ Invite link created! Share it:</p>
              <p className="text-white text-xs break-all font-mono bg-black/40 rounded-lg px-3 py-2 mb-2">
                {newInviteLink}
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 text-xs btn-primary"
                  onClick={() => navigator.share
                    ? navigator.share({ title: 'Join my Draft Royale league!', url: newInviteLink })
                    : navigator.clipboard.writeText(newInviteLink)
                  }
                >
                  📤 Share
                </button>
                <button
                  className="flex-1 py-2 text-xs btn-ghost"
                  onClick={() => navigator.clipboard.writeText(newInviteLink).then(() => {
                    setCopiedId('new')
                    setTimeout(() => setCopiedId(null), 2000)
                  })}
                >
                  {copiedId === 'new' ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active invites */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Active Invites ({invites.length})
        </p>
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
                  <p className="text-white text-sm truncate">
                    {inv.email ?? `Token: ${inv.token.slice(0, 12)}...`}
                  </p>
                  <p className="text-gray-600 text-xs">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {isCommissioner && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(inv.token, inv.id)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-royal-muted hover:bg-gray-600 text-gray-300 transition-colors"
                    >
                      {copiedId === inv.id ? '✓' : '📋'}
                    </button>
                    <button
                      onClick={() => shareLink(inv.token)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-royal-muted hover:bg-gray-600 text-gray-300 transition-colors"
                    >
                      📤
                    </button>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="text-xs px-2 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 transition-colors"
                    >
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
