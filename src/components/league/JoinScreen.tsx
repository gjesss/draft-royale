import { useState } from 'react'

interface Props {
  onJoinCode: (token: string) => void
}

export default function JoinScreen({ onJoinCode }: Props) {
  const [code, setCode] = useState('')

  const submit = () => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length >= 4) onJoinCode(clean)
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pt-10 flex flex-col items-center">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-700 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔗</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Join a League</h2>
        <p className="text-gray-400 text-sm mt-1">Enter the 6-character code a commissioner shared with you.</p>
      </div>

      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="ABC123"
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect="off"
        className="w-full max-w-xs bg-royal-card border-2 border-royal-border rounded-2xl px-4 py-5
                   text-center text-3xl font-bold tracking-[0.4em] text-white uppercase
                   focus:outline-none focus:border-cyan-500 placeholder-gray-700"
      />

      <button
        className="btn-primary w-full max-w-xs mt-4 py-3.5"
        onClick={submit}
        disabled={code.trim().length < 4}
      >
        Join League →
      </button>

      <p className="text-gray-600 text-xs mt-6 text-center max-w-xs">
        Tip: if someone texted you a link, just tap it — you'll be taken straight here.
      </p>
    </div>
  )
}
