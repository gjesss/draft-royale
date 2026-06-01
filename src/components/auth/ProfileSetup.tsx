import { useState, FormEvent } from 'react'
import { useAuth } from '../../store/AuthContext'
import { TrophyIcon } from '../Logo'

export default function ProfileSetup() {
  const { user, createProfile, isUsernameAvailable } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')

    const u = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(u)) {
      setError('Username must be 3–20 characters: letters, numbers, underscores only')
      return
    }

    setLoading(true)
    const available = await isUsernameAvailable(u)
    if (!available) { setError('That username is already taken'); setLoading(false); return }

    const { error: err } = await createProfile(user.uid, u, displayName.trim() || username.trim())
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center text-center mb-8">
        <TrophyIcon size={48} />
        <h2 className="text-2xl font-bold text-white mt-4">Set up your profile</h2>
        <p className="text-gray-400 text-sm mt-1">Choose a username for your leagues</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <div>
          <input
            type="text"
            placeholder="Username (e.g. johndoe23)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required maxLength={20}
            className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-3
                       text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
            autoCapitalize="none" autoCorrect="off"
          />
          <p className="text-gray-600 text-xs mt-1 pl-1">Letters, numbers, underscores. 3–20 chars.</p>
        </div>
        <input
          type="text"
          placeholder="Display name (e.g. John Doe)"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          maxLength={40}
          className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-3
                     text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
          autoCapitalize="words"
        />
        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
