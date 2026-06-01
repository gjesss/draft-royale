/**
 * DEV-ONLY preview harness. Lets us render authenticated screens with sample
 * data for visual work, WITHOUT a real Firebase login.
 *
 * SAFETY: gated behind `import.meta.env.DEV`, which is ALWAYS false in
 * `vite build` (production). Flip the `&& true` to `&& false` to disable
 * during local dev too. Never affects the deployed app.
 */
import type { User } from 'firebase/auth'
import type { UserProfile, League, LeagueMember, Season, Game, DraftResult } from './types/db'

export const DEV_PREVIEW = import.meta.env.DEV && false

export const MOCK_UID = 'dev-user-1'

export const mockUser = {
  uid: MOCK_UID,
  email: 'commish@draftroyale.app',
  displayName: 'Jordan Blake',
  emailVerified: true,
} as unknown as User

export const mockProfile: UserProfile = {
  uid: MOCK_UID,
  username: 'jordanb',
  displayName: 'Jordan Blake',
  createdAt: '2025-08-01T00:00:00.000Z',
}

export const mockLeagues: League[] = [
  { id: 'lg-1', name: 'Sunday Funday League', sport: 'Fantasy Football', commissionerId: MOCK_UID, createdAt: '2025-08-01T00:00:00.000Z' },
  { id: 'lg-2', name: 'The Hardwood Hoopers', sport: 'Fantasy Basketball', commissionerId: 'other-user', createdAt: '2025-09-15T00:00:00.000Z' },
]

const mockMembers: LeagueMember[] = [
  { userId: MOCK_UID, role: 'commissioner', displayName: 'Jordan Blake', username: 'jordanb', joinedAt: '2025-08-01T00:00:00.000Z' },
  { userId: 'u2', role: 'member', displayName: 'Sam Rivera', username: 'samr', joinedAt: '2025-08-02T00:00:00.000Z' },
  { userId: 'u3', role: 'member', displayName: 'Alex Chen', username: 'achen', joinedAt: '2025-08-03T00:00:00.000Z' },
  { userId: 'u4', role: 'member', displayName: 'Taylor Reed', username: 'treed', joinedAt: '2025-08-04T00:00:00.000Z' },
  { userId: 'u5', role: 'member', displayName: 'Mike Dunn', username: 'mdunn', joinedAt: '2025-08-05T00:00:00.000Z' },
  { userId: 'u6', role: 'member', displayName: 'Chris Park', username: 'cpark', joinedAt: '2025-08-06T00:00:00.000Z' },
  { userId: 'u7', role: 'member', displayName: 'Jamie Fox', username: 'jfox', joinedAt: '2025-08-07T00:00:00.000Z' },
  { userId: 'u8', role: 'member', displayName: 'Pat Quinn', username: 'pquinn', joinedAt: '2025-08-08T00:00:00.000Z' },
]

const mockSeasons: Season[] = [
  { id: 's-2025', name: '2025 Season', year: 2025, sport: 'Fantasy Football', status: 'active', createdAt: '2025-08-01T00:00:00.000Z' },
]

const mockGames: Game[] = [
  { id: 'g-1', leagueId: 'lg-1', seasonId: 's-2025', commissionerId: MOCK_UID, status: 'complete', gameState: null, createdAt: '2025-08-20T00:00:00.000Z', completedAt: '2025-08-20T01:00:00.000Z' },
  { id: 'g-2', leagueId: 'lg-1', seasonId: 's-2025', commissionerId: MOCK_UID, status: 'lobby', gameState: null, createdAt: '2025-09-01T00:00:00.000Z', completedAt: null },
]

export function mockFullLeague(leagueId: string) {
  const base = mockLeagues.find(l => l.id === leagueId) ?? mockLeagues[0]
  return { ...base, members: mockMembers, seasons: mockSeasons }
}
export const mockGamesFor = (_leagueId: string) => mockGames

export const mockHistory: { gameId: string; date: string; results: DraftResult[] }[] = [
  {
    gameId: 'g-1',
    date: '2025-08-20T00:00:00.000Z',
    results: mockMembers.map((m, i) => ({
      id: `r-${i}`, gameId: 'g-1', seasonId: 's-2025', userId: m.userId,
      playerName: m.displayName, pickPosition: i + 1, locked: i < 2,
      createdAt: '2025-08-20T01:00:00.000Z',
    })),
  },
]
