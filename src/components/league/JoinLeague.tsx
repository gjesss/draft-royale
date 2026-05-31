import { useEffect, useState } from 'react'
import { lookupInviteToken, acceptInvite } from '../../hooks/useLeague'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  token: string
  onJoined: (leagueId: string) => void
  onError: () => void
}

export default function JoinLeague({ token, onJoined, onError }: Props) {
  const { user, profile } = useAuth()
  const [invite, setInvite] = useState<{
    inviteId: string; leagueId: string; leagueName: string; status: string
  } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'error' | 'already-member'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    lookupInviteToken(token).then(result => {
      if (!result) {
        setStatus('error')
        setErrorMsg('Invite link is invalid or has expired.')
        return
      }
      if (result.status !== 'pending') {
        setStatus('error')
        setErrorMsg('This invite has already been used or revoked.')
        return
      }
      setInvite(result)
      setStatus('ready')
    })
  }, [token])

  const handleJoin = async () => {
    if (!user || !invite || !profile) return
    setStatus('joining')

    try {
      await acceptInvite(
        token, invite.inviteId, invite.leagueId,
        user.uid, profile.displayName, profile.username
      )
      onJoined(invite.leagueId)
    } catch (e: unknown) {
      setStatus('error')
      setErrorMsg((e as Error).message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <span className="text-5xl mb-4">🔗</span>

      {status === 'loading' && <p className="text-gray-400">Checking invite...</p>}

      {status === 'ready' && invite && (
        <>
          <h2 className="text-xl font-bold text-white mb-1">You're invited!</h2>
          <p className="text-gray-400 mb-1">Join</p>
          <p className="text-2xl font-bold neon-text mb-6">{invite.leagueName}</p>
          <button className="btn-primary w-full max-w-xs py-4 text-lg" onClick={handleJoin}>
            Join League →
          </button>
        </>
      )}

      {status === 'joining' && <p className="text-cyan-400">Joining league...</p>}

      {status === 'error' && (
        <>
          <p className="text-red-400 mb-4">{errorMsg}</p>
          <button className="btn-ghost" onClick={onError}>← Back</button>
        </>
      )}
    </div>
  )
}
