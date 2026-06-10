import { useEffect, useState, useCallback } from 'react'
import {
  collection, doc, getDoc, getDocs, setDoc,
  addDoc, updateDoc, deleteDoc, query,
  where, orderBy, limit, serverTimestamp,
  writeBatch, documentId, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import {
  League, LeagueMember, LeagueInvite,
  Season, Game, DraftResult,
} from '../types/db'
import { DEV_PREVIEW, mockLeagues, mockFullLeague, mockGamesFor, mockHistory } from '../devMock'

function nowIso() { return new Date().toISOString() }
function expiresIso(days = 7) {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString()
}
/** Epoch-ms expiry — used on inviteTokens so Firestore rules can compare
 *  against `request.time.toMillis()` (string ISO comparisons aren't reliable
 *  in rules without a parse step). */
function expiresMillis(days = 7) {
  return Date.now() + days * 24 * 60 * 60 * 1000
}
// 6-char uppercase join code — short enough to type, clean in a text message.
// Excludes ambiguous chars (0/O, 1/I/L) so codes read clearly over SMS.
function randomToken() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => chars[b % chars.length]).join('')
}

// ── User's league list ────────────────────────────────────────────────────────
export function useMyLeagues(userId: string | null) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (DEV_PREVIEW) { setLeagues(mockLeagues); setLoading(false); return }
    if (!userId) { setLoading(false); return }
    // leagues where user is a member
    const memberSnaps = await getDocs(
      query(collection(db, 'leagueMembers'), where('userId', '==', userId))
    )
    const leagueIds = memberSnaps.docs.map(d => d.data().leagueId as string)
    if (leagueIds.length === 0) { setLeagues([]); setLoading(false); return }

    // Batched `in` query (≤30 ids per request) — was N+1 getDoc calls. See
    // PERF-001 in app-review-2026-06-07.md.
    const out: League[] = []
    for (let i = 0; i < leagueIds.length; i += 30) {
      const chunk = leagueIds.slice(i, i + 30)
      const snap = await getDocs(
        query(collection(db, 'leagues'), where(documentId(), 'in', chunk))
      )
      for (const d of snap.docs) out.push({ id: d.id, ...d.data() } as League)
    }
    setLeagues(out)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])
  return { leagues, loading, refresh: fetch }
}

// ── Full league data ──────────────────────────────────────────────────────────
export interface FullLeague extends League {
  members: LeagueMember[]
  seasons: Season[]
}

export function useLeague(leagueId: string | null) {
  const [league, setLeague] = useState<FullLeague | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeague = useCallback(async () => {
    if (!leagueId) return
    if (DEV_PREVIEW) {
      setLeague(mockFullLeague(leagueId) as FullLeague)
      setGames(mockGamesFor(leagueId))
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [leagueSnap, membersSnap, seasonsSnap, gamesSnap] = await Promise.all([
        getDoc(doc(db, 'leagues', leagueId)),
        getDocs(collection(db, 'leagues', leagueId, 'members')),
        getDocs(collection(db, 'leagues', leagueId, 'seasons')),
        getDocs(query(
          collection(db, 'leagues', leagueId, 'games'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )),
      ])

      if (!leagueSnap.exists()) { setError('League not found'); setLoading(false); return }

      setLeague({
        id: leagueSnap.id,
        ...leagueSnap.data(),
        members: membersSnap.docs.map(d => d.data() as LeagueMember),
        seasons: seasonsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Season),
      } as FullLeague)
      setGames(gamesSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Game))
    } catch (e: unknown) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [leagueId])

  useEffect(() => { fetchLeague() }, [fetchLeague])

  // ── Seasons ─────────────────────────────────────────────────────────────
  const createSeason = async (name: string, year: number, sport: string) => {
    if (!leagueId) return { error: 'No league' }
    const ref = await addDoc(collection(db, 'leagues', leagueId, 'seasons'), {
      name, year, sport, status: 'active', createdAt: nowIso(),
    })
    await fetchLeague()
    return { data: { id: ref.id }, error: null }
  }

  // ── Invites ─────────────────────────────────────────────────────────────
  const createInvite = async (invitedBy: string, leagueName: string, email = '') => {
    if (!leagueId) return { data: null, error: 'No league' }
    const token = randomToken()
    const expiresAtMs = expiresMillis(7)
    const invite: Omit<LeagueInvite, 'id'> = {
      token, leagueId, leagueName,
      email, invitedBy,
      status: 'pending',
      createdAt: nowIso(),
      expiresAt: expiresIso(7),
    }
    const ref = await addDoc(collection(db, 'leagues', leagueId, 'invites'), invite)
    // Token-index doc — `expiresAt` is numeric epoch-ms so Firestore rules can
    // compare directly against `request.time.toMillis()`.
    await setDoc(doc(db, 'inviteTokens', token), {
      leagueId, inviteId: ref.id, expiresAt: expiresAtMs,
    })
    return { data: { id: ref.id, ...invite }, error: null }
  }

  const revokeInvite = async (inviteId: string, token: string) => {
    if (!leagueId) return
    await updateDoc(doc(db, 'leagues', leagueId, 'invites', inviteId), { status: 'revoked' })
    await deleteDoc(doc(db, 'inviteTokens', token))
    await fetchLeague()
  }

  const getInvites = async (): Promise<LeagueInvite[]> => {
    if (!leagueId) return []
    const snap = await getDocs(
      query(collection(db, 'leagues', leagueId, 'invites'), where('status', '==', 'pending'))
    )
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as LeagueInvite)
  }

  // ── Games ────────────────────────────────────────────────────────────────
  const createGame = async (commissionerId: string, seasonId?: string) => {
    if (!leagueId) return { data: null, error: 'No league' }
    const ref = await addDoc(collection(db, 'leagues', leagueId, 'games'), {
      leagueId,
      seasonId: seasonId ?? null,
      commissionerId,
      status: 'lobby',
      gameState: null,
      createdAt: nowIso(),
      completedAt: null,
    })
    await fetchLeague()
    return { data: { id: ref.id }, error: null }
  }

  return {
    league, games, loading, error,
    refresh: fetchLeague,
    createSeason, createInvite, revokeInvite, getInvites, createGame,
  }
}

// ── Join via token ────────────────────────────────────────────────────────────
// NOTE: This is a UX-only preview ("you've been invited to <league>"). The
// authoritative check happens in Firestore rules at accept time
// (hasValidInviteToken). Don't add security checks here that the server doesn't
// also enforce — they're easy to bypass by calling acceptInvite directly.
export async function lookupInviteToken(token: string) {
  const snap = await getDoc(doc(db, 'inviteTokens', token))
  if (!snap.exists()) return null
  const { leagueId, inviteId, expiresAt } = snap.data()
  // expiresAt is now numeric epoch-ms; tolerate legacy ISO-string rows from
  // before the migration so old invites don't 500 the UI.
  const expiresMs = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt)
  if (Number.isFinite(expiresMs) && expiresMs < Date.now()) return null

  const inviteSnap = await getDoc(doc(db, 'leagues', leagueId, 'invites', inviteId))
  if (!inviteSnap.exists()) return null
  const invite = inviteSnap.data() as LeagueInvite

  const leagueSnap = await getDoc(doc(db, 'leagues', leagueId))
  const leagueName = leagueSnap.exists() ? leagueSnap.data().name : 'Unknown League'

  return { inviteId, leagueId, leagueName, status: invite.status, token }
}

/**
 * Atomically join a league using an invite token. All four writes commit
 * together via writeBatch — no more half-joined-user state (BUG-001 in
 * app-review-2026-06-07.md).
 *
 * The `inviteToken` field is included on the member docs because Firestore
 * rules validate it (see `hasValidInviteToken` in firestore.rules).
 */
export async function acceptInvite(
  token: string, inviteId: string, leagueId: string,
  userId: string, displayName: string, username: string
) {
  const batch = writeBatch(db)

  // 1. Member doc — `inviteToken` field is required by the rule to authorize
  //    this self-add. Without it the write is rejected.
  batch.set(doc(db, 'leagues', leagueId, 'members', userId), {
    userId, role: 'member', displayName, username,
    joinedAt: nowIso(),
    inviteToken: token,
  })

  // 2. leagueMembers index — same token claim.
  batch.set(doc(db, 'leagueMembers', `${leagueId}_${userId}`), {
    userId, leagueId, role: 'member',
    inviteToken: token,
  })

  // 3. Mark invite accepted (rule allows pending → accepted by signed-in users
  //    when ONLY the status field changes).
  batch.update(doc(db, 'leagues', leagueId, 'invites', inviteId), {
    status: 'accepted',
  })

  // 4. Delete the single-use token.
  batch.delete(doc(db, 'inviteTokens', token))

  await batch.commit()
}

// ── Draft history ─────────────────────────────────────────────────────────────
export function useDraftHistory(leagueId: string | null) {
  const [history, setHistory] = useState<{ gameId: string; date: string; results: DraftResult[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId) return
    if (DEV_PREVIEW) { setHistory(mockHistory); setLoading(false); return }
    getDocs(
      query(
        collection(db, 'leagues', leagueId, 'draftResults'),
        orderBy('createdAt', 'desc'),
        limit(300) // cap reads — covers ~25 recent full drafts (PERF-102)
      )
    ).then(snap => {
      const map = new Map<string, DraftResult[]>()
      snap.docs.forEach(d => {
        const r = { id: d.id, ...d.data() } as DraftResult
        const arr = map.get(r.gameId) ?? []
        arr.push(r)
        map.set(r.gameId, arr)
      })
      const groups = [...map.entries()].map(([gameId, results]) => ({
        gameId,
        date: results[0]?.createdAt ?? '',
        results: results.sort((a, b) => a.pickPosition - b.pickPosition),
      }))
      setHistory(groups)
      setLoading(false)
    })
  }, [leagueId])

  return { history, loading }
}
