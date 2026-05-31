import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  token: string
  onJoined: (leagueId: string) => void
  onError: () => void
}

export default function JoinLeague({ token, onJoined, onError }: Props) {
  const { user } = useAuth()
  const [invite, setInvite] = useState<{ id: string; league_id: string; league_name: string } | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'joining' | 'error' | 'already-member'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.rpc('get_invite_by_token', { p_token: token }).then(({ data, error }) => {
      if (error || !data || data.length === 0) {
        setStatus('error')
        setErrorMsg('Invite link is invalid or has expired.')
        return
      }
      const inv = data[0]
      if (inv.status !== 'pending') {
        setStatus('error')
        setErrorMsg('This invite has already been used or revoked.')
        return
      }
      setInvite(inv)
      setStatus('ready')
    })
  }, [token])

  const handleJoin = async () => {
    if (!user || !invite) return
    setStatus('joining')

    // Check if already a member
    const { data: existing } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', invite.league_id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      setStatus('already-member')
      setTimeout(() => onJoined(invite.league_id), 1500)
      return
    }

    // Join league
    const { error: joinErr } = await supabase.from('league_members').insert({
      league_id: invite.league_id,
      user_id: user.id,
      role: 'member',
    })

    if (joinErr) {
      setStatus('error')
      setErrorMsg(joinErr.message)
      return
    }

    // Mark invite as accepted
    await supabase.from('league_invites').update({ status: 'accepted' }).eq('id', invite.id)

    onJoined(invite.league_id)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <span className="text-5xl mb-4">🔗</span>

      {status === 'loading' && <p className="text-gray-400">Checking invite...</p>}

      {status === 'ready' && invite && (
        <>
          <h2 className="text-xl font-bold text-white mb-1">You're invited!</h2>
          <p className="text-gray-400 mb-1">Join</p>
          <p className="text-2xl font-bold neon-text mb-6">{invite.league_name}</p>
          <button className="btn-primary w-full max-w-xs py-4 text-lg" onClick={handleJoin}>
            Join League →
          </button>
        </>
      )}

      {status === 'joining' && <p className="text-cyan-400">Joining league...</p>}

      {status === 'already-member' && (
        <p className="text-green-400">You're already a member! Redirecting...</p>
      )}

      {status === 'error' && (
        <>
          <p className="text-red-400 mb-4">{errorMsg}</p>
          <button className="btn-ghost" onClick={onError}>← Back</button>
        </>
      )}
    </div>
  )
}
