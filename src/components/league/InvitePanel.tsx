import { useState, useEffect } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useLeague } from '../../hooks/useLeague'
import { LeagueInvite } from '../../types/db'
import Icon from '../ui/Icon'

interface Props { leagueId: string; isCommissioner: boolean; leagueName: string }

export default function InvitePanel({ leagueId, isCommissioner, leagueName }: Props) {
  const { user } = useAuth()
  const { createInvite, revokeInvite, getInvites } = useLeague(leagueId)
  const [invites, setInvites] = useState<LeagueInvite[]>([])
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const base = window.location.origin

  useEffect(() => { getInvites().then(setInvites) }, [leagueId])

  const handleCreate = async () => {
    if (!user) return
    setCreating(true)
    const { data } = await createInvite(user.uid, leagueName)
    if (data) setInvites(prev => [data as LeagueInvite, ...prev])
    setCreating(false)
  }

  const linkFor = (token: string) => `${base}/join/${token}`

  /** Pre-filled message used for SMS / share sheet */
  const messageFor = (token: string) =>
    `Join my league "${leagueName}" on Draft Royale!\n\n` +
    `Tap to join: ${linkFor(token)}\n\n` +
    `Or enter code ${token} in the app.`

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }

  const shareSheet = async (token: string) => {
    const text = messageFor(token)
    if (navigator.share) {
      await navigator.share({ title: `Join ${leagueName} on Draft Royale`, text }).catch(() => {})
    } else {
      copy(text, token)
    }
  }

  // sms: deep link — opens Messages with the body pre-filled
  const smsHref = (token: string) =>
    `sms:&body=${encodeURIComponent(messageFor(token))}`

  const handleRevoke = async (inv: LeagueInvite) => {
    await revokeInvite(inv.id, inv.token)
    setInvites(prev => prev.filter(i => i.id !== inv.id))
  }

  const latest = invites[0]

  return (
    <div className="space-y-4">
      {isCommissioner && (
        <button className="btn-primary w-full py-3.5" onClick={handleCreate} disabled={creating}>
          {creating ? 'Generating…' : '+ Create New Invite'}
        </button>
      )}

      {/* Featured: the most recent invite, big and shareable */}
      {latest && (
        <div className="card border-cyan-500/40 bg-cyan-950/10">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-2 text-center">League Join Code</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            {latest.token.split('').map((ch, i) => (
              <span key={i} className="w-9 h-12 flex items-center justify-center bg-black/50 border border-cyan-700 rounded-lg text-2xl font-bold neon-text">
                {ch}
              </span>
            ))}
          </div>

          {/* Primary share actions */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <a href={smsHref(latest.token)}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95">
              Text Invite
            </a>
            <button onClick={() => shareSheet(latest.token)}
              className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-3 rounded-xl transition-colors active:scale-95">
              Share
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => copy(linkFor(latest.token), `link-${latest.token}`)}
              className="btn-ghost py-2.5 text-sm">
              {copied === `link-${latest.token}` ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => copy(latest.token, `code-${latest.token}`)}
              className="btn-ghost py-2.5 text-sm">
              {copied === `code-${latest.token}` ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>
          <p className="text-gray-600 text-xs text-center mt-3">
            Expires {new Date(latest.expiresAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Older invites */}
      {invites.length > 1 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Other Active Codes</p>
          <div className="space-y-2">
            {invites.slice(1).map(inv => (
              <div key={inv.id} className="card flex items-center justify-between gap-2 py-3">
                <span className="font-mono font-bold text-cyan-400 tracking-widest">{inv.token}</span>
                <div className="flex gap-1">
                  <a href={smsHref(inv.token)} className="px-2.5 py-1.5 rounded-lg bg-royal-muted text-gray-300" aria-label="Text invite"><Icon name="message" size={14} /></a>
                  <button onClick={() => copy(linkFor(inv.token), inv.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-royal-muted text-gray-300" aria-label="Copy link">
                    <Icon name={copied === inv.id ? 'check' : 'link'} size={14} />
                  </button>
                  {isCommissioner && (
                    <button onClick={() => handleRevoke(inv)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-900/30 text-red-400" aria-label="Revoke"><Icon name="x" size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invites.length === 0 && (
        <div className="card text-center py-8">
          <p className="text-gray-500 text-sm">
            {isCommissioner ? 'No invites yet. Create one above to invite players.' : 'No active invites.'}
          </p>
        </div>
      )}
    </div>
  )
}
