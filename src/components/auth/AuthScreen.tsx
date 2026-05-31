import { useState, FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'

type Mode = 'login' | 'register'

interface Props {
  redirectNote?: string
}

export default function AuthScreen({ redirectNote }: Props) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(friendlyError(error.message))
    } else {
      const { error } = await signUp(email, password)
      if (error) setError(friendlyError(error.message))
      else setRegistered(true)
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError(friendlyError((error as Error).message))
    setGoogleLoading(false)
  }

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">📧</p>
          <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account, then log in.
          </p>
          <button className="btn-ghost w-full" onClick={() => { setMode('login'); setRegistered(false) }}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 safe-bottom">
      {/* Logo */}
      <div className="text-center mb-8">
        <span className="text-5xl">👑</span>
        <h1 className="text-4xl font-bold mt-3 tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-white">DRAFT</span><span className="neon-text"> ROYAL</span>
        </h1>
        {redirectNote && (
          <p className="mt-3 text-cyan-400 text-sm bg-cyan-900/20 border border-cyan-800 rounded-xl px-4 py-2">
            {redirectNote}
          </p>
        )}
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100
                     text-gray-800 font-semibold py-3.5 px-6 rounded-xl transition-all
                     active:scale-95 disabled:opacity-60 shadow-sm"
        >
          <GoogleIcon />
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-royal-border" />
          <span className="text-gray-600 text-xs">or</span>
          <div className="flex-1 h-px bg-royal-border" />
        </div>

        {/* Email/password tab */}
        <div className="flex border border-royal-border rounded-xl overflow-hidden">
          {(['login', 'register'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors
                ${mode === m ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required autoComplete="email"
            className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-3.5
                       text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-base"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full bg-royal-card border border-royal-border rounded-xl px-4 py-3.5
                       text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-base"
          />

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
            {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function friendlyError(msg: string): string {
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'Incorrect email or password'
  if (msg.includes('email-already-in-use'))
    return 'An account with this email already exists'
  if (msg.includes('weak-password'))
    return 'Password must be at least 6 characters'
  if (msg.includes('invalid-email'))
    return 'Please enter a valid email address'
  if (msg.includes('popup-closed'))
    return 'Sign-in window was closed — try again'
  return msg
}
