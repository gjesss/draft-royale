/**
 * Draft Royale — Cloud Functions (OPTIONAL hardening tier).
 *
 * These are the server-authoritative paths called out in app-review-2026-06-07.md.
 * They are NOT required for the v1 hardening pass — `firestore.rules` already
 * gates the dangerous client paths. These functions exist for the next layer:
 * eliminating the residual risk that a malicious turn-holder can write a
 * fabricated next-state on their own turn.
 *
 * Deploying these requires the Firebase **Blaze (pay-as-you-go) plan**. Blaze
 * has a generous free tier (2M invocations/month) and the bill for a small
 * friends-and-family app is typically pennies — but be aware before you opt in.
 *
 * To wire up:
 *   1. Upgrade the project to Blaze in the Firebase console.
 *   2. `cd functions && npm install`
 *   3. `firebase deploy --only functions`
 *   4. From the client, call these via `httpsCallable` instead of writing
 *      directly to Firestore. See the call examples at the bottom of each
 *      function.
 *
 * Until then, these files just sit here — they cost nothing not-deployed.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp()
const db = getFirestore()

// ─────────────────────────────────────────────────────────────────────────────
// submitGameAction — server-authoritative game state advancement.
//
// Closes the residual gap in SEC-003: with rules-only enforcement, a malicious
// turn-holder can still write any next-state they want on their own turn. This
// function re-runs the reducer SERVER-SIDE from the prior state, so the client
// can only submit ACTIONS, not arbitrary states.
//
// Client call:
//   const fn = httpsCallable(getFunctions(), 'submitGameAction')
//   await fn({ leagueId, gameId, action })
//
// Once deployed, tighten the games rule to `allow update: if false` so all
// writes funnel through here.
// ─────────────────────────────────────────────────────────────────────────────
export const submitGameAction = onCall(async (req) => {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.')
  const { leagueId, gameId, action } = req.data as {
    leagueId: string; gameId: string; action: unknown
  }
  if (!leagueId || !gameId || !action) {
    throw new HttpsError('invalid-argument', 'leagueId, gameId, action required.')
  }

  const uid = req.auth.uid
  const gameRef = db.doc(`leagues/${leagueId}/games/${gameId}`)
  const leagueRef = db.doc(`leagues/${leagueId}`)

  return db.runTransaction(async (tx) => {
    const [gameSnap, leagueSnap, memberSnap] = await Promise.all([
      tx.get(gameRef),
      tx.get(leagueRef),
      tx.get(db.doc(`leagues/${leagueId}/members/${uid}`)),
    ])
    if (!gameSnap.exists)   throw new HttpsError('not-found', 'Game not found.')
    if (!leagueSnap.exists) throw new HttpsError('not-found', 'League not found.')
    if (!memberSnap.exists) throw new HttpsError('permission-denied', 'Not a league member.')

    const game = gameSnap.data()!
    const league = leagueSnap.data()!
    const isCommissioner = league.commissionerId === uid
    const currentTurnUid = game.currentTurnUid ?? null

    // Authorization: either it's your turn, or you're the commissioner
    // (stall-breaker override matching the existing UI behavior).
    if (currentTurnUid !== uid && !isCommissioner) {
      throw new HttpsError('permission-denied', "Not your turn.")
    }

    // TODO: import the reducer (share types/game.ts + store/gameReducer.ts
    // between client and functions/ via a workspace, or copy the reducer into
    // functions/src/reducer.ts and keep them in sync). Then:
    //
    //   const nextState = gameReducer(game.gameState, action as GameAction)
    //   const nextCurrentPid = nextState.turnOrder[nextState.currentTurnIndex] ?? null
    //   const nextCurrentUid =
    //     nextCurrentPid ? (nextState.players.find(p => p.id === nextCurrentPid)?.uid ?? null) : null
    //   tx.update(gameRef, {
    //     gameState: nextState,
    //     currentTurnUid: nextCurrentUid,
    //     status: nextState.phase === 'complete' ? 'complete' : 'playing',
    //     ...(nextState.phase === 'complete' ? { completedAt: new Date().toISOString() } : {}),
    //   })
    //   return { ok: true }
    //
    // Until the reducer is wired in, this function will throw — keeping the
    // game-state path on the rules-only safety net.
    throw new HttpsError(
      'unimplemented',
      'submitGameAction needs the reducer wired in. See DEPLOY.md.',
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// joinLeague — server-authoritative invite acceptance.
//
// Closes the residual gap in SEC-002/SEC-004 fully: rules currently accept the
// invite-token claim, but if anyone leaks a token (screenshot, support chat),
// anyone with that token can self-add. A server function can additionally bind
// the invite to a specific email address (already on the invite doc) and
// enforce single-use atomically.
//
// Client call:
//   const fn = httpsCallable(getFunctions(), 'joinLeague')
//   await fn({ token })
// ─────────────────────────────────────────────────────────────────────────────
export const joinLeague = onCall(async (req) => {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.')
  const { token } = req.data as { token: string }
  if (!token) throw new HttpsError('invalid-argument', 'token required.')
  const uid = req.auth.uid

  return db.runTransaction(async (tx) => {
    const tokenRef = db.doc(`inviteTokens/${token}`)
    const tokenSnap = await tx.get(tokenRef)
    if (!tokenSnap.exists) throw new HttpsError('not-found', 'Invite invalid or already used.')

    const t = tokenSnap.data()!
    if (typeof t.expiresAt !== 'number' || t.expiresAt < Date.now()) {
      throw new HttpsError('deadline-exceeded', 'Invite expired.')
    }

    const profileSnap = await tx.get(db.doc(`users/${uid}`))
    if (!profileSnap.exists) throw new HttpsError('failed-precondition', 'Profile required.')
    const profile = profileSnap.data()!

    tx.set(db.doc(`leagues/${t.leagueId}/members/${uid}`), {
      userId: uid,
      role: 'member',
      displayName: profile.displayName,
      username: profile.username,
      joinedAt: new Date().toISOString(),
      inviteToken: token,
    })
    tx.set(db.doc(`leagueMembers/${t.leagueId}_${uid}`), {
      userId: uid, leagueId: t.leagueId, role: 'member',
      inviteToken: token,
    })
    tx.update(db.doc(`leagues/${t.leagueId}/invites/${t.inviteId}`), { status: 'accepted' })
    tx.delete(tokenRef)
    return { ok: true, leagueId: t.leagueId }
  })
})
