import { useState } from 'react'
import { useAuth } from '../../store/AuthContext'
import { useLeague, useDraftHistory } from '../../hooks/useLeague'
import { Game } from '../../types/db'
import { computeStandings, computeActivity, PlayerStat, DraftGroup } from '../../utils/standings'
import LeagueHeader from '../layout/LeagueHeader'
import BottomNav, { NavTab } from '../layout/BottomNav'
import DraftBoard, { BoardCell } from './DraftBoard'
import InvitePanel from './InvitePanel'
import Standings from './Standings'
import ActivityFeed from './ActivityFeed'
import MemberSheet from './MemberSheet'
import ProfileScreen from '../ProfileScreen'
import Avatar from '../ui/Avatar'
import Icon from '../ui/Icon'
import { SkeletonHub } from '../ui/Skeleton'

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
  const { history } = useDraftHistory(leagueId)
  const [tab, setTab] = useState<NavTab>('board')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const stats = computeStandings(history)
  const activity = computeActivity(history)
  const selectedStat = stats.find(s => s.name === selectedMember) ?? null

  if (loading) return <SkeletonHub />
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
            games={games} isCommissioner={isCommissioner}
            seasons={league.seasons} sport={league.sport}
            history={history} activity={activity}
            createGame={createGame} createSeason={createSeason}
            onStartGame={onStartGame} userId={user?.uid ?? ''}
          />
        )}
        {tab === 'members' && (
          <MembersTab members={league.members} stats={stats} userId={user?.uid ?? ''}
            onSelect={setSelectedMember} />
        )}
        {tab === 'invite' && <div className="px-4 py-4"><InvitePanel leagueId={leagueId} isCommissioner={isCommissioner} leagueName={league.name} /></div>}
        {tab === 'profile' && <ProfileScreen onOpenRules={onOpenRules} />}
      </div>

      {selectedStat && <MemberSheet stat={selectedStat} onClose={() => setSelectedMember(null)} />}

      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

// ── Board tab: live games, start new, latest draft order, recent activity ─────
function BoardTab({ games, isCommissioner, seasons, sport, history, activity, createGame, createSeason, onStartGame, userId }: {
  games: Game[]
  isCommissioner: boolean
  seasons: { id: string; name: string; year: number; status: string }[]
  sport: string
  history: DraftGroup[]
  activity: ReturnType<typeof computeActivity>
  createGame: (commissionerId: string, seasonId?: string) => Promise<{ data: { id: string } | null; error: unknown }>
  createSeason: (name: string, year: number, sport: string) => Promise<unknown>
  onStartGame: (gameId: string, isCommissioner: boolean) => void
  userId: string
}) {
  const [showNewSeason, setShowNewSeason] = useState(false)
  const [seasonName, setSeasonName] = useState('')
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())

  const activeSeason = seasons.find(s => s.status === 'active')
  const liveGames = games.filter(g => g.status !== 'complete')
  const latest = history[0]

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
      {isCommissioner && (
        <button className="btn-primary w-full py-4 text-base animate-pulse-cyan flex items-center justify-center gap-2" onClick={handleNewGame}>
          <Icon name="play" size={18} /> Start New Draft
        </button>
      )}

      {liveGames.length > 0 && (
        <div className="space-y-2">
          <p className="section-label">In Progress</p>
          {liveGames.map(g => (
            <button key={g.id} onClick={() => onStartGame(g.id, g.commissionerId === userId)}
              className="card-interactive w-full flex items-center justify-between">
              <div className="text-left">
                <p className="font-semibold text-white text-sm">Draft · {new Date(g.createdAt).toLocaleDateString()}</p>
                <p className={`text-xs mt-0.5 flex items-center gap-1.5 uppercase tracking-wide font-semibold ${g.status === 'playing' ? 'text-cyan-400' : 'text-gold-400'}`}>
                  {g.status === 'playing'
                    ? <><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live now</>
                    : <><Icon name="clock" size={12} /> Lobby</>}
                </p>
              </div>
              <span className="chip-accent">{g.status === 'lobby' && g.commissionerId === userId ? 'Open' : 'Join'}</span>
            </button>
          ))}
        </div>
      )}

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
            <Icon name="target" size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-300 text-sm font-semibold">No drafts yet</p>
            <p className="text-gray-600 text-xs mt-1">
              {isCommissioner ? 'Hit Start New Draft to run one.' : 'Waiting on the commissioner to start a draft.'}
            </p>
          </div>
        )}
      </div>

      {/* Recent activity */}
      {activity.length > 0 && (
        <div>
          <p className="section-label mb-2">Recent Activity</p>
          <ActivityFeed events={activity} limit={5} />
        </div>
      )}
    </div>
  )
}

// ── Members tab: standings leaderboard + roster, tap → member profile ─────────
function MembersTab({ members, stats, userId, onSelect }: {
  members: { userId: string; displayName: string; username: string; role: string }[]
  stats: PlayerStat[]
  userId: string
  onSelect: (name: string) => void
}) {
  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <p className="section-label mb-2">Standings</p>
        <Standings stats={stats} onSelect={onSelect} />
      </div>

      <div>
        <p className="section-label mb-2">Members · {members.length}</p>
        <div className="space-y-2">
          {members.map(m => (
            <button key={m.userId} onClick={() => onSelect(m.displayName)}
              className="card-interactive w-full flex items-center gap-3 py-2.5 text-left">
              <Avatar name={m.displayName} seed={m.userId} size="md" ring={m.userId === userId} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate">{m.displayName}{m.userId === userId && <span className="text-gray-500 font-normal"> (you)</span>}</p>
                <p className="text-gray-500 text-xs truncate">@{m.username}</p>
              </div>
              {m.role === 'commissioner' && <span className="chip-accent">Commish</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
