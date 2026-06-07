import { useState } from 'react'
import { useAuth } from '../store/AuthContext'
import { useMyLeagues } from '../hooks/useLeague'
import { TrophyIcon } from './Logo'
import Avatar from './ui/Avatar'

interface Props {
  onOpenRules: () => void
}

export default function ProfileScreen({ onOpenRules }: Props) {
  const { user, profile, signOut, updateDisplayName } = useAuth()
  const { leagues } = useMyLeagues(user?.uid ?? null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(profile?.displayName ?? '')
  const [saving, setSaving] = useState(false)

  const commishCount = leagues.filter(l => l.commissionerId === user?.uid).length

  const handleSave = async () => {
    if (!draftName.trim()) return
    setSaving(true)
    await updateDisplayName(draftName.trim())
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pt-8 pb-28">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-3">
          <Avatar name={profile?.displayName ?? 'You'} seed={profile?.uid} size="xl" />
        </div>
        {editing ? (
          <div className="w-full max-w-xs space-y-2">
            <input
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              maxLength={40}
              className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-2.5
                         text-white text-center focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => { setEditing(false); setDraftName(profile?.displayName ?? '') }}>
                Cancel
              </button>
              <button className="btn-primary flex-1 py-2 text-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white">{profile?.displayName}</h2>
            <p className="text-gray-500">@{profile?.username}</p>
            <button onClick={() => setEditing(true)} className="text-cyan-400 text-sm mt-2">
              Edit name
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card text-center py-5">
          <p className="text-3xl font-bold neon-text">{leagues.length}</p>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-wide">Leagues</p>
        </div>
        <div className="card text-center py-5">
          <p className="text-3xl font-bold text-yellow-400">{commishCount}</p>
          <p className="text-gray-500 text-xs mt-1 uppercase tracking-wide">Commissioner</p>
        </div>
      </div>

      {/* Account info */}
      <div className="card mb-4">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Account</p>
        <div className="flex items-center justify-between py-2 border-b border-royal-border">
          <span className="text-gray-400 text-sm">Email</span>
          <span className="text-white text-sm truncate ml-3">{user?.email ?? 'Google account'}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-400 text-sm">Username</span>
          <span className="text-white text-sm">@{profile?.username}</span>
        </div>
      </div>

      {/* Settings list */}
      <div className="card mb-4 divide-y divide-royal-border">
        <SettingsRow icon="📖" label="How to Play" onClick={onOpenRules} />
        <SettingsRow icon="⭐" label="Rate Draft Royale" onClick={() => {}} />
        <SettingsRow icon="💬" label="Send Feedback"
          onClick={() => { window.location.href = 'mailto:feedback@draftroyale.app?subject=Draft Royale Feedback' }} />
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-3.5 rounded-xl border border-red-900/60 text-red-400 font-medium
                   hover:bg-red-900/20 transition-colors active:scale-95"
      >
        Sign Out
      </button>

      <div className="flex items-center justify-center gap-2 mt-8 opacity-40">
        <TrophyIcon size={20} />
        <span className="text-gray-600 text-xs">Draft Royale · v1.0</span>
      </div>
    </div>
  )
}

function SettingsRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-3.5 text-left touch-manipulation active:opacity-60">
      <span className="text-xl">{icon}</span>
      <span className="text-white flex-1">{label}</span>
      <span className="text-gray-600">›</span>
    </button>
  )
}
