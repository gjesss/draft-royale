import { useEffect, useState, useCallback } from 'react'
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithPopup,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, query,
  collection, where, getDocs,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'
import { UserProfile } from '../types/db'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true })

  const fetchProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await fetchProfile(user.uid)
        setState({ user, profile, loading: false })
      } else {
        setState({ user: null, profile: null, loading: false })
      }
    })
    return unsub
  }, [fetchProfile])

  const signUp = async (email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(cred.user)
      return { data: cred, error: null }
    } catch (e: unknown) {
      return { data: null, error: e as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      return { data: cred, error: null }
    } catch (e: unknown) {
      return { data: null, error: e as Error }
    }
  }

  const signOut = () => fbSignOut(auth)

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      // If new Google user, auto-create a profile from their Google display name
      const profile = await fetchProfile(cred.user.uid)
      if (!profile) {
        const displayName = cred.user.displayName ?? 'Player'
        const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'player'
        // Ensure username is unique by appending suffix if needed
        let username = base
        let attempt = 0
        while (true) {
          const q = query(collection(db, 'users'), where('username', '==', username))
          const snap = await getDocs(q)
          if (snap.empty) break
          attempt++
          username = `${base}${attempt}`
        }
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          username,
          displayName,
          createdAt: new Date().toISOString(),
        } as UserProfile)
      }
      return { data: cred, error: null }
    } catch (e: unknown) {
      return { data: null, error: e as Error }
    }
  }

  const createProfile = async (uid: string, username: string, displayName: string) => {
    try {
      const profile: UserProfile = {
        uid,
        username: username.toLowerCase(),
        displayName: displayName || username,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', uid), profile)
      setState(s => ({ ...s, profile }))
      return { data: profile, error: null }
    } catch (e: unknown) {
      return { data: null, error: e as Error }
    }
  }

  const isUsernameAvailable = async (username: string): Promise<boolean> => {
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
    const snap = await getDocs(q)
    return snap.empty
  }

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    createProfile,
    isUsernameAvailable,
  }
}
