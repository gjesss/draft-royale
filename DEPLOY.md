# Deploying the Firestore hardening (2026-06-07)

This walks through the **CRITICAL → HIGH** fixes from `app-review-2026-06-07.md`.
Most of the work is already in the repo — the only commands you need to run
yourself are listed under "What you do" in each step. Roughly **10–20 minutes** end-to-end.

---

## TL;DR

```powershell
# 0. Install the Firebase CLI (one time)
npm install -g firebase-tools

# 1. Sign in to your Google account (one time)
firebase login

# 2. Confirm we point at the right project
firebase use draft-royal      # the project ref from CONNECTIONS.local.md

# 3. Deploy the rewritten rules
firebase deploy --only firestore:rules

# 4. (Optional) test locally first with the emulator
firebase emulators:start
```

Steps 0 and 1 are interactive; steps 2 and 3 are one-shot. Step 4 is optional but
recommended — see "Test in the emulator first" below.

---

## Step 1 — Verify the live ruleset (SEC-001)

Per the project's memory notes, Firestore may still be in test mode (open
read/write to anyone). Confirm before you do anything else:

**What you do:** open the [Firebase Console](https://console.firebase.google.com/),
pick the `draft-royal` project → **Firestore Database → Rules** tab. Look at
what's actually deployed.

- If it starts with `allow read, write: if request.time < timestamp.date(...)` → **test mode, ship the new rules now.**
- If it matches the OLD `firestore.rules` (with the `allow write: if request.auth != null` lines on members/leagueMembers/inviteTokens) → still vulnerable to SEC-002 etc., ship the new rules.
- If something else is deployed → screenshot it before we overwrite.

---

## Step 2 — Test in the emulator first (recommended)

The new rules are stricter; test them locally before touching prod so existing
flows (signup, create league, invite, accept, play a game) all still work.

```powershell
# Install the Firebase CLI if you haven't:
npm install -g firebase-tools

# Start every emulator (auth + firestore + functions UI) on local ports:
firebase emulators:start
```

The emulator UI opens at `http://localhost:4000`. Tell the web app to use it by
adding to `src/lib/firebase.ts` (temporarily, only for local testing):

```ts
import { connectAuthEmulator } from 'firebase/auth'
import { connectFirestoreEmulator } from 'firebase/firestore'
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099')
  connectFirestoreEmulator(db, 'localhost', 8080)
}
```

Then `npm run dev` and walk through: sign up → create league → invite a second
user (open another browser) → accept → start a game → take a turn → take
someone else's turn (should fail in the console with a permission-denied).

---

## Step 3 — Deploy the rules

```powershell
firebase login                      # browser opens; sign in as gjesss@yahoo.com
firebase use draft-royal            # the project ref
firebase deploy --only firestore:rules
```

`firebase deploy --only firestore:rules` is cheap and instant; it doesn't touch
data. Roll back by re-deploying the previous rules — keep a copy in git in case.

---

## Step 4 — Migrate existing data (one-time)

The new rules require two things that older data may not have:

### 4a. `inviteTokens.expiresAt` must be a number (epoch ms)

Old token rows have an ISO string; new rules need numeric. Either:

- **Easy** — let them expire naturally over 7 days (`lookupInviteToken` already
  tolerates both formats), or
- **One-shot script** — in the Firebase console **Firestore Database → Data**
  tab, open each row in `inviteTokens` and replace `expiresAt` with a number
  (the epoch ms equivalent — `new Date('2026-06-14T...').getTime()`). Fast if
  there are only a few.

### 4b. `usernames/{username}` uniqueness index needs backfill

Existing users have a `username` on their user doc but no row in `usernames/`.
Until they get one, two future signups could still race a brand-new user with
an EXISTING username. One-shot backfill script — paste into the browser
console at https://console.firebase.google.com/ (Firestore Data tab) or run
as a node script with the Admin SDK:

```js
// Node script using firebase-admin (one-shot)
const admin = require('firebase-admin')
admin.initializeApp({ /* your service-account creds */ })
const db = admin.firestore()
;(async () => {
  const users = await db.collection('users').get()
  const batch = db.batch()
  users.forEach(u => {
    const { username, uid } = u.data()
    if (username) batch.set(db.doc(`usernames/${username}`), { uid, claimedAt: u.data().createdAt })
  })
  await batch.commit()
  console.log(`backfilled ${users.size} usernames`)
})()
```

---

## What this leaves unfinished

The rules-only hardening closes SEC-001/002/004/005/006/007 and BUG-001/002
fully, and SEC-003 in the strongest pure-rules form (only the current
turn-holder or commissioner can advance the game; a malicious turn-holder can
still write a fabricated next-state on their own turn).

The full server-authoritative fix for SEC-003 lives in
[`functions/src/index.ts`](functions/src/index.ts) — `submitGameAction` and
`joinLeague`. To enable:

1. Upgrade the project to the **Blaze (pay-as-you-go) plan** in the Firebase
   console. Has a generous free tier (2M function invocations/month); a
   friends-and-family draft app is typically pennies/month.
2. Copy `src/store/gameReducer.ts` and `src/types/game.ts` into `functions/src/`
   (or set up a workspace package shared between the two), then uncomment the
   reducer call in `submitGameAction`.
3. `cd functions && npm install && cd .. && firebase deploy --only functions`.
4. Switch the client `GameContext.tsx` write effect to call
   `httpsCallable('submitGameAction')` instead of `updateDoc` directly.
5. Tighten the games rule to `allow update: if false`.

Until then, the rules-only path is a very large improvement over the
status quo.

---

## After deploying — re-run the review

The skill's `app-review` will read the previous `report.json` and show you a
"Since last review" diff with all the fixed findings marked ✅.

```
# Just ask: "re-run app-review on draft-royale"
```
