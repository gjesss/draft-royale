// Firestore document types

export interface UserProfile {
  uid: string
  username: string        // unique, lowercase
  displayName: string
  createdAt: string
}

export interface League {
  id: string
  name: string
  sport: string
  commissionerId: string
  createdAt: string
}

export interface LeagueMember {
  userId: string
  role: 'commissioner' | 'member'
  displayName: string
  username: string
  joinedAt: string
}

export interface LeagueInvite {
  id: string
  token: string
  leagueId: string
  leagueName: string
  email: string
  invitedBy: string
  status: 'pending' | 'accepted' | 'revoked'
  createdAt: string
  expiresAt: string
}

export interface Season {
  id: string
  name: string
  year: number
  sport: string
  status: 'active' | 'complete'
  createdAt: string
}

export interface Game {
  id: string
  leagueId: string
  seasonId: string | null
  commissionerId: string
  status: 'lobby' | 'playing' | 'complete'
  gameState: Record<string, unknown> | null
  createdAt: string
  completedAt: string | null
}

export interface DraftResult {
  id: string
  gameId: string
  seasonId: string | null
  userId: string | null
  playerName: string
  pickPosition: number
  locked: boolean
  createdAt: string
}
