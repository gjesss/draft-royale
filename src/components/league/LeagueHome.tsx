import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useLeague } from '../../hooks/useLeague'
import InvitePanel from './InvitePanel'
import GameHistory from './GameHistory'
import { Game } from '../../types/db'

interface Props {
  leagueId: string
  onBack: () => void
  onStartGame: (gameId: string, isCommissioner: boolean) => void
}

type Tab = 'games' | 'members' | 'invites' | 'history'

export default function LeagueHome({ leagueId, onBack, onStartGame }: Props) {
  const { user } = useAuth()
  const { league, games, loading, createGame, createSeason } = useLeague(leagueId)
  const [tab, setTab] = useState<Tab>('games')
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [seasonName, setSeasonName] = useState('')
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>
  if (!league) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="text-gray-400 mb-4">League not found.</p>
      <button className="btn-ghost" onClick={onBack}>← Back</button>
    </div>
  )

  const isCommissioner = league.commissionerId === user?.uid
  const activeSeason = league.seasons.find(s => s.status === 'active')

  const handleNewGame = async () => {
    if (!user) return
    const { data } = await createGame(user.uid, activeSeason?.id)
    if (data) onStartGame(data.id, true)
  }

  const handleJoinGame = (game: Game) => {
    onStartGame(game.id, game.commissionerId === user?.uid)
  }

  const handleCreateSeason = async () => {
    if (!seasonName.trim()) return
    await createSeason(seasonName.trim(), seasonYear, league.sport)
    setShowNewSeason(false); setSeasonName('')
  }

  const TABS: [Tab, string][] = [['games', '🎱 Games'], ['members', '👥 Members'], ['invites', '🔗 Invites'], ['history', '📊 History']]

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <div className="px-4 pt-6 pb-3 border-b border-royal-border">
        <button className="text-gray-400 text-sm hover:text-white mb-2" onClick={onBack}>← Leagues</button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{league.name}</h2>
            <p className="text-gray-500 text-sm">{league.sport}</p>
            {activeSeason && <p className="text-cyan-400 text-xs mt-0.5">📅 {activeSeason.name}</p>}
          </div>
          {isCommissioner && (
            <span className="text-xs bg-cyan-900/40 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full mt-1">
              Commissioner
            </span>
          )}
        </div>
      </div>

      <div className="flex border-b border-royal-border overflow-x-auto">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
              ${tab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {tab === 'games' && (
          <div className="space-y-4">
            {league.seasons.length === 0 && isCommissioner && !showNewSeason && (
              <div className="card text-center py-6">
                <p className="text-gray-400 mb-3">Create your first season to start tracking.</p>
                <button className="btn-primary py-2.5 px-5 text-sm" onClick={() => setShowNewSeason(true)}>
                  + Create Season
                </button>
              </div>
            )}

            {showNewSeason && (
              <div className="card space-y-3 border-cyan-500/30">
                <h3 className="font-bold text-white text-sm">New Season</h3>
                <input type="text" placeholder="Season name (e.g. 2025 Season)" value={seasonName}
                  onChange={e => setSeasonName(e.target.value)} autoFocus
                  className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                             text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
                />
                <input type="number" placeholder="Year" value={seasonYear}
                  onChange={e => setSeasonYear(Number(e.target.value))}
                  className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5
                             text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm"
                />
                <div className="flex gap-2">
                  <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => setShowNewSeason(false)}>Cancel</button>
                  <button className="btn-primary flex-1 py-2 text-sm" onClick={handleCreateSeason}>Create</button>
                </div>
              </div>
            )}

            {isCommissioner && (
              <button className="btn-primary w-full py-4 text-base animate-pulse-cyan" onClick={handleNewGame}>
                🎱 Start New Draft Royale
              </button>
            )}

            {games.length === 0 ? (
              <div className="card text-center py-8"><p className="text-gray-500 text-sm">No games yet.</p></div>
            ) : games.map(g => (
              <div key={g.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-white text-sm">
                    Draft — {new Date(g.createdAt).toLocaleDateString()}
                  </p>
                  <p className={`text-xs mt-0.5 ${{ lobby: 'text-yellow-400', playing: 'text-green-400', complete: 'text-gray-500' }[g.status]}`}>
                    {{ lobby: '⏳ Lobby', playing: '🎱 Live', complete: '✅ Complete' }[g.status]}
                  </p>
                </div>
                {g.status !== 'complete' && (
                  <button onClick={() => handleJoinGame(g)}
                    className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors
                      ${g.status === 'playing' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'btn-ghost'}`}>
                    {g.status === 'lobby' && isCommissioner ? 'Open' : 'Watch'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-2">
            {league.members.map(m => (
              <div key={m.userId} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{m.displayName}</p>
                  <p className="text-gray-500 text-xs">@{m.username}</p>
                </div>
                {m.role === 'commissioner' && (
                  <span className="text-xs text-cyan-400 bg-cyan-900/30 border border-cyan-800 px-2 py-0.5 rounded-full">
                    Commissioner
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'invites' && (
          <InvitePanel leagueId={leagueId} isCommissioner={isCommissioner} leagueName={league.name} />
        )}

        {tab === 'history' && <GameHistory leagueId={leagueId} />}
      </div>
    </div>
  )
}
