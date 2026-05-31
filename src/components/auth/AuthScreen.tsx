import { useState, FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'

type Mode = 'login' | 'register'

interface Props {
  /** If set, redirect context (e.g. joining a league via invite) */
  redirectNote?: string
}

export default function AuthScreen({ redirectNote }: Props) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(error.message)
      else setRegistered(true)
    }

    setLoading(false)
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">📧</p>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 mb-6">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.<br />
            Click it to activate your account, then come back to log in.
          </p>
          <button className="btn-ghost" onClick={() => { setMode('login'); setRegistered(false) }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="text-center mb-8">
        <span className="text-5xl">👑</span>
        <h1 className="text-3xl font-bold mt-2">
          <span className="text-white">DRAFT</span>{' '}
          <span className="neon-text">ROYALE</span>
        </h1>
        {redirectNote && (
          <p className="mt-3 text-cyan-400 text-sm bg-cyan-900/20 border border-cyan-800 rounded-xl px-4 py-2">
            {redirectNote}
          </p>
        )}
      </div>

      {/* Tab */}
      <div className="flex border border-royal-border rounded-xl overflow-hidden mb-6 w-full max-w-xs">
        {(['login', 'register'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors
              ${mode === m ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {m === 'login' ? 'Log In' : 'Sign Up'}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-3
                     text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-3
                     text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
          {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
