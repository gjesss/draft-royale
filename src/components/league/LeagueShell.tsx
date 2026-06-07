import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useLeague, useDraftHistory } from '../../hooks/useLeague'
import { Game } from '../../types/db'
import LeagueHeader from '../layout/LeagueHeader'
import BottomNav, { NavTab } from '../layout/BottomNav'
import DraftBoard, { BoardCell } from './DraftBoard'
import InvitePanel from './InvitePanel'
import GameHistory from './GameHistory'
import ProfileScreen from '../ProfileScreen'
import Avatar from '../ui/Avatar'

interface Props {
  leagueId: string
  onStartGame: (gameId: string, isCommissioner: boolean) => void
  onOpenSwitcher: () => void
  onOpenRules: () => void
  onExit: () => void
}

export default function LeagueShell({ leagueId, onStartGame, onOpenSwitcher, onOpenRules, onExit }: Props) {
  const { user } = useAuth()
  const { league, games, loading, error, createGame, createSeason } = useLeague(leagueId)
  const [tab, setTab] = useState<NavTab>('board')

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading league…</div>
  }
  if (!league || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-400 mb-4">This league is unavailable.</p>
        <button className="btn-ghost" onClick={onExit}>← Back to home</button>
      </div>
    )
  }

  const isCommissioner = league.commissionerId === user?.uid

  return (
    <div className="min-h-screen pb-20">
      <LeagueHeader
        leagueName={league.name} leagueId={league.id} sport={league.sport}
        isCommissioner={isCommissioner}
        onOpenSwitcher={onOpenSwitcher}
        onOpenProfile={() => setTab('profile')}
      />

      <div className="max-w-lg mx-auto">
        {tab === 'board' && (
          <BoardTab
            leagueId={leagueId} games={games} isCommissioner={isCommissioner}
            seasons={league.seasons} sport={league.sport}
            createGame={createGame} createSeason={createSeason}
            onStartGame={onStartGame} userId={user?.uid ?? ''}
          />
        )}
        {tab === 'members' && <MembersTab members={league.members} leagueId={leagueId} userId={user?.uid ?? ''} />}
        {tab === 'invite' && <div className="px-4 py-4"><InvitePanel leagueId={leagueId} isCommissioner={isCommissioner} leagueName={league.name} /></div>}
        {tab === 'profile' && <ProfileScreen onOpenRules={onOpenRules} />}
      </div>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

// ── Board tab: live/lobby games, start new, and the latest draft board ────────
function BoardTab({ leagueId, games, isCommissioner, seasons, sport, createGame, createSeason, onStartGame, userId }: {
  leagueId: string
  games: Game[]
  isCommissioner: boolean
  seasons: { id: string; name: string; year: number; status: string }[]
  sport: string
  createGame: (commissionerId: string, seasonId?: string) => Promise<{ data: { id: string } | null; error: unknown }>
  createSeason: (name: string, year: number, sport: string) => Promise<unknown>
  onStartGame: (gameId: string, isCommissioner: boolean) => void
  userId: string
}) {
  const { history } = useDraftHistory(leagueId)
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [seasonName, setSeasonName] = useState('')
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())

  const activeSeason = seasons.find(s => s.status === 'active')
  const liveGames = games.filter(g => g.status !== 'complete')
  const latest = history[0] // most recent completed draft

  const handleNewGame = async () => {
    const { data } = await createGame(userId, activeSeason?.id)
    if (data) onStartGame(data.id, true)
  }
  const handleCreateSeason = async () => {
    if (!seasonName.trim()) return
    await createSeason(seasonName.trim(), seasonYear, sport)
    setShowNewSeason(false); setSeasonName('')
  }

  const cells: BoardCell[] = latest
    ? [...latest.results].sort((a, b) => a.pickPosition - b.pickPosition).map(r => ({
        position: r.pickPosition, name: r.playerName, seed: r.userId ?? r.playerName, locked: r.locked,
      }))
    : []

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Start / live game */}
      {isCommissioner && (
        <button className="btn-primary w-full py-4 text-base animate-pulse-cyan" onClick={handleNewGame}>
          🎱 Start New Draft
        </button>
      )}

      {liveGames.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">In Progress</p>
          {liveGames.map(g => (
            <button key={g.id} onClick={() => onStartGame(g.id, g.commissionerId === userId)}
              className="card-interactive w-full flex items-center justify-between">
              <div className="text-left">
                <p className="font-semibold text-white text-sm">Draft — {new Date(g.createdAt).toLocaleDateString()}</p>
                <p className={`text-xs mt-0.5 ${g.status === 'playing' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {g.status === 'playing' ? '🟢 Live now' : '⏳ Lobby'}
                </p>
              </div>
              <span className="chip-accent">{g.status === 'lobby' && g.commissionerId === userId ? 'Open' : 'Join'}</span>
            </button>
          ))}
        </div>
      )}

      {/* Season creation (commissioner, when none) */}
      {seasons.length === 0 && isCommissioner && (
        showNewSeason ? (
          <div className="card space-y-3 border-cyan-500/30">
            <h3 className="font-bold text-white text-sm">New Season</h3>
            <input type="text" placeholder="Season name (e.g. 2025 Season)" value={seasonName}
              onChange={e => setSeasonName(e.target.value)} autoFocus
              className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm" />
            <input type="number" placeholder="Year" value={seasonYear}
              onChange={e => setSeasonYear(Number(e.target.value))}
              className="w-full bg-black/50 border border-royal-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm" />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 py-2 text-sm" onClick={() => setShowNewSeason(false)}>Cancel</button>
              <button className="btn-primary flex-1 py-2 text-sm" onClick={handleCreateSeason}>Create</button>
            </div>
          </div>
        ) : (
          <button className="text-cyan-400 text-sm" onClick={() => setShowNewSeason(true)}>+ Create a season</button>
        )
      )}

      {/* Latest draft board */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="section-label">{latest ? 'Latest Draft Order' : 'Draft Board'}</p>
          {activeSeason && <span className="chip">{activeSeason.name}</span>}
        </div>
        {cells.length > 0 ? (
          <DraftBoard cells={cells} />
        ) : (
          <div className="card text-center py-10">
            <p className="text-4xl mb-2">🎱</p>
            <p className="text-gray-400 text-sm">No drafts yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              {isCommissioner ? 'Tap "Start New Draft" to run one.' : 'Waiting for the commissioner to start a draft.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Members tab: avatars + roles, with draft history below ────────────────────
function MembersTab({ members, leagueId, userId }: {
  members: { userId: string; displayName: string; username: string; role: string }[]
  leagueId: string
  userId: string
}) {
  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <p className="section-label mb-2">Members · {members.length}</p>
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.userId} className="card flex items-center gap-3 py-2.5">
              <Avatar name={m.displayName} seed={m.userId} size="md" ring={m.userId === userId} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate">{m.displayName}{m.userId === userId && <span className="text-gray-500 font-normal"> (you)</span>}</p>
                <p className="text-gray-500 text-xs truncate">@{m.username}</p>
              </div>
              {m.role === 'commissioner' && <span className="chip-accent">Commish</span>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="section-label mb-2">Draft History</p>
        <GameHistory leagueId={leagueId} />
      </div>
    </div>
  )
}
