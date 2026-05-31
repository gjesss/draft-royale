import { useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data ?? null
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({ user: session.user, profile, session, loading: false })
      } else {
        setState(s => ({ ...s, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({ user: session.user, profile, session, loading: false })
      } else {
        setState({ user: null, profile: null, session: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const createProfile = async (userId: string, username: string, displayName: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, username: username.toLowerCase(), display_name: displayName })
      .select()
      .single()

    if (data) {
      setState(s => ({ ...s, profile: data }))
    }

    return { data, error }
  }

  const refreshProfile = async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    setState(s => ({ ...s, profile }))
  }

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    createProfile,
    refreshProfile,
    isCommissioner: (leagueCommissionerId: string) => state.user?.id === leagueCommissionerId,
  }
}
