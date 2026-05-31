import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { League, LeagueMember, Profile, Season, Game, DraftResult } from '../types/database'

export type MemberWithProfile = LeagueMember & { profiles: Profile }

export interface FullLeague extends League {
  league_members: MemberWithProfile[]
  seasons: Season[]
}

export function useLeague(leagueId: string | null) {
  const [league, setLeague] = useState<FullLeague | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeague = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)

    const [leagueRes, gamesRes] = await Promise.all([
      supabase
        .from('leagues')
        .select(`*, league_members(*, profiles(*)), seasons(*)`)
        .eq('id', leagueId)
        .single(),
      supabase
        .from('games')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (leagueRes.error) setError(leagueRes.error.message)
    else setLeague(leagueRes.data as unknown as FullLeague)

    if (!gamesRes.error) setGames(gamesRes.data ?? [])
    setLoading(false)
  }, [leagueId])

  useEffect(() => {
    fetchLeague()
  }, [fetchLeague])

  // ── Seasons ──────────────────────────────────────────────
  const createSeason = async (name: string, year: number, sport: string) => {
    if (!leagueId) return { error: 'No league' }
    const { data, error } = await supabase
      .from('seasons')
      .insert({ league_id: leagueId, name, year, sport })
      .select()
      .single()

    if (!error) await fetchLeague()
    return { data, error }
  }

  // ── Invites ──────────────────────────────────────────────
  const createInvite = async (userId: string, email?: string) => {
    if (!leagueId) return { data: null, error: 'No league' }
    const { data, error } = await supabase
      .from('league_invites')
      .insert({ league_id: leagueId, email: email || null, invited_by: userId })
      .select()
      .single()

    return { data, error }
  }

  const revokeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('league_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)

    if (!error) await fetchLeague()
    return { error }
  }

  const getInvites = async () => {
    if (!leagueId) return []
    const { data } = await supabase
      .from('league_invites')
      .select('*')
      .eq('league_id', leagueId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    return data ?? []
  }

  // ── Members ──────────────────────────────────────────────
  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from('league_members').delete().eq('id', memberId)
    if (!error) await fetchLeague()
    return { error }
  }

  // ── Games ────────────────────────────────────────────────
  const createGame = async (commissionerId: string, seasonId?: string) => {
    if (!leagueId) return { data: null, error: 'No league' }
    const { data, error } = await supabase
      .from('games')
      .insert({
        league_id: leagueId,
        season_id: seasonId ?? null,
        commissioner_id: commissionerId,
        status: 'lobby',
      })
      .select()
      .single()

    if (!error) await fetchLeague()
    return { data, error }
  }

  return {
    league,
    games,
    loading,
    error,
    refresh: fetchLeague,
    createSeason,
    createInvite,
    revokeInvite,
    getInvites,
    removeMember,
    createGame,
  }
}

// ── User's leagues list ───────────────────────────────────
export function useMyLeagues(userId: string | null) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return }
    const { data } = await supabase
      .from('league_members')
      .select('league_id, leagues(*)')
      .eq('user_id', userId)

    const ls = (data ?? []).map((m: any) => m.leagues).filter(Boolean) as League[]
    setLeagues(ls)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetch() }, [fetch])

  return { leagues, loading, refresh: fetch }
}

// ── Draft results history ─────────────────────────────────
export function useDraftHistory(leagueId: string | null, seasonId?: string) {
  const [history, setHistory] = useState<(DraftResult & { game: Game })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId) return
    let q = supabase
      .from('draft_results')
      .select('*, game:games(*)')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    if (seasonId) q = q.eq('season_id', seasonId)

    q.then(({ data }) => {
      setHistory((data ?? []) as any)
      setLoading(false)
    })
  }, [leagueId, seasonId])

  return { history, loading }
}
