/**
 * Global auth singleton — fixes the redirect bug where createProfile()
 * updated only the local hook instance, not App.tsx's instance.
 * All components share ONE auth state via context.
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  User, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as fbSignOut, sendEmailVerification, signInWithPopup,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, query, collection, where, getDocs,
} from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'
import { UserProfile } from '../types/db'
import { DEV_PREVIEW, mockUser, mockProfile } from '../devMock'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => void
  createProfile: (uid: string, username: string, displayName: string) => Promise<{ error: Error | null }>
  updateDisplayName: (displayName: string) => Promise<void>
  isUsernameAvailable: (username: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_PREVIEW ? mockUser : null)
  const [profile, setProfile] = useState<UserProfile | null>(DEV_PREVIEW ? mockProfile : null)
  const [loading, setLoading] = useState(!DEV_PREVIEW)

  const fetchProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  }, [])

  useEffect(() => {
    if (DEV_PREVIEW) return
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const p = await fetchProfile(u.uid)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
  }, [fetchProfile])

  const signUp = async (email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(cred.user)
      return { error: null }
    } catch (e) { return { error: e as Error } }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (e) { return { error: e as Error } }
  }

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const existing = await fetchProfile(cred.user.uid)
      if (!existing) {
        const displayName = cred.user.displayName ?? 'Player'
        const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'player'
        let username = base
        let attempt = 0
        while (true) {
          const q = query(collection(db, 'users'), where('username', '==', username))
          const snap = await getDocs(q)
          if (snap.empty) break
          username = `${base}${++attempt}`
        }
        const p: UserProfile = {
          uid: cred.user.uid, username, displayName,
          createdAt: new Date().toISOString(),
        }
        await setDoc(doc(db, 'users', cred.user.uid), p)
        setProfile(p) // ← directly update context state
      }
      return { error: null }
    } catch (e) { return { error: e as Error } }
  }

  const signOut = () => fbSignOut(auth)

  /** The critical fix: setProfile(p) here updates all consumers including App */
  const createProfile = async (uid: string, username: string, displayName: string) => {
    try {
      const p: UserProfile = {
        uid,
        username: username.toLowerCase(),
        displayName: displayName || username,
        createdAt: new Date().toISOString(),
      }
      await setDoc(doc(db, 'users', uid), p)
      setProfile(p) // ← this is what was missing — updates App instantly
      return { error: null }
    } catch (e) { return { error: e as Error } }
  }

  const updateDisplayName = async (displayName: string) => {
    if (!user || !profile) return
    const updated = { ...profile, displayName }
    await setDoc(doc(db, 'users', user.uid), updated)
    setProfile(updated)
  }

  const isUsernameAvailable = async (username: string) => {
    const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()))
    return (await getDocs(q)).empty
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signUp, signIn, signInWithGoogle, signOut,
      createProfile, updateDisplayName, isUsernameAvailable,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
