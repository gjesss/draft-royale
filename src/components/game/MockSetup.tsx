import { useState } from 'react'
import { useGame } from '../../store/GameContext'
import { useAuth } from '../../store/AuthContext'
import { DEFAULT_SETTINGS, TurnOrderMode } from '../../types/game'

interface Props { onBack: () => void }

const BOT_NAMES = [
  'Ricky', 'Vanessa', 'Deebo', 'Tank', 'Marcus', 'Priya', 'Lena', 'Hank',
  'Diego', 'Kira', 'Bubba', 'Shawna', 'Otis', 'Mei', 'Cole', 'Reggie',
  'Nadia', 'Sully', 'Trish', 'Vince',
]

export default function MockSetup({ onBack }: Props) {
  const { dispatch } = useGame()
  const { profile } = useAuth()
  const [myName, setMyName] = useState(profile?.displayName || 'You')
  const [opponents, setOpponents] = useState(7)
  const [turnMode, setTurnMode] = useState<TurnOrderMode>('random')

  const start = () => {
    const names = [...BOT_NAMES]
    // shuffle bot names
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));[names[i], names[j]] = [names[j], names[i]]
    }
    const bots = names.slice(0, opponents).map(name => ({ name, isBot: true }))
    const players = [{ name: myName.trim() || 'You', isBot: false }, ...bots]
    dispatch({
      type: 'START_GAME',
      players,
      settings: { ...DEFAULT_SETTINGS, turnOrderMode: turnMode },
      isMock: true,
    })
  }

  return (
    <div className="min-h-screen max-w-lg mx-auto flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-royal-border">
        <button className="text-gray-400 hover:text-white p-2 -ml-2" onClick={onBack}>← Back</button>
        <h2 className="text-xl font-bold neon-text">Mock Draft</h2>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        <p className="text-gray-400 text-sm">
          Practice solo against auto-players. They draw, challenge, and play for pick swaps on
          their own — you just take your turns. Nothing is saved.
        </p>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Your name</label>
          <input value={myName} onChange={e => setMyName(e.target.value)} maxLength={20}
            className="w-full mt-1 bg-royal-card border border-royal-border rounded-xl px-4 py-3
                       text-white focus:outline-none focus:border-cyan-500" />
        </div>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Auto-players</label>
          <div className="flex items-center gap-4 mt-2">
            <button className="w-12 h-12 rounded-xl bg-royal-muted text-xl font-bold active:scale-95"
              onClick={() => setOpponents(n => Math.max(1, n - 1))} disabled={opponents <= 1}>−</button>
            <span className="text-4xl font-bold neon-text w-12 text-center">{opponents}</span>
            <button className="w-12 h-12 rounded-xl bg-royal-muted text-xl font-bold active:scale-95"
              onClick={() => setOpponents(n => Math.min(11, n + 1))} disabled={opponents >= 11}>+</button>
            <span className="text-gray-500 text-sm">{opponents + 1} players total</span>
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wide">Draw order</label>
          <select value={turnMode} onChange={e => setTurnMode(e.target.value as TurnOrderMode)}
            className="w-full mt-1 bg-royal-card border border-royal-border rounded-xl px-4 py-3
                       text-white focus:outline-none focus:border-cyan-500 text-sm">
            <option value="random">Random</option>
            <option value="manual">In listed order (you draw first)</option>
          </select>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 border-t border-royal-border">
        <button className="btn-primary w-full py-4 text-lg" onClick={start}>
          Start Mock Draft
        </button>
      </div>
    </div>
  )
}
