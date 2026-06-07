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
  doc, getDoc, setDoc, runTransaction,
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

/**
 * Atomically reserve a username and create the user profile in one Firestore
 * transaction. If `baseUsername` is taken, walk `${baseUsername}${n}` until we
 * find a free slot — bounded so we surface a clear error instead of spinning.
 *
 * Closes the TOCTOU race described in BUG-002: two concurrent signups can no
 * longer both claim the same username (Firestore guarantees document-id
 * uniqueness on the `usernames/{username}` collection).
 */
async function claimUsernameAndCreateProfile(
  uid: string, baseUsername: string, displayName: string,
): Promise<UserProfile> {
  const MAX_ATTEMPTS = 50
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? baseUsername : `${baseUsername}${attempt}`
    try {
      const profile: UserProfile = {
        uid, username: candidate, displayName,
        createdAt: new Date().toISOString(),
      }
      await runTransaction(db, async (tx) => {
        const unameRef = doc(db, 'usernames', candidate)
        const userRef  = doc(db, 'users',     uid)
        const existing = await tx.get(unameRef)
        if (existing.exists()) throw new Error('TAKEN')
        tx.set(unameRef, { uid, claimedAt: new Date().toISOString() })
        tx.set(userRef, profile)
      })
      return profile
    } catch (e) {
      if ((e as Error).message !== 'TAKEN') throw e
      // try next suffix
    }
  }
  throw new Error(`Could not find an available username starting with "${baseUsername}"`)
}

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
        // Atomically pick the first available `${base}${n}` and claim it via
        // the `usernames/{username}` uniqueness index. Bounded attempts so we
        // give up loudly instead of looping forever on a hot prefix.
        const p = await claimUsernameAndCreateProfile(
          cred.user.uid, base, displayName,
        )
        setProfile(p) // ← directly update context state
      }
      return { error: null }
    } catch (e) { return { error: e as Error } }
  }

  const signOut = () => fbSignOut(auth)

  /** The critical fix: setProfile(p) here updates all consumers including App */
  const createProfile = async (uid: string, username: string, displayName: string) => {
    try {
      // Transactional claim against `usernames/{username}` — closes the TOCTOU
      // race where two concurrent signups could both pass isUsernameAvailable
      // and both write the same username (BUG-002 in app-review-2026-06-07.md).
      const p = await claimUsernameAndCreateProfile(
        uid, username.toLowerCase(), displayName || username,
      )
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
    // Authoritative source is the `usernames/{username}` uniqueness index — a
    // single getDoc, not a where-query. The actual reservation still happens
    // transactionally in claimUsernameAndCreateProfile; this is a UX hint only.
    const snap = await getDoc(doc(db, 'usernames', username.toLowerCase()))
    return !snap.exists()
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
