# App Review Report

- **Project:** draft-royale
- **Date:** 2026-06-07
- **Scope:** Whole codebase (`src/`, `firestore.rules`, `vite.config.ts`, `package.json`). Excludes `node_modules/`, `dist/`.
- **Stacks detected:** React 18 + TypeScript + Vite + Tailwind, vite-plugin-pwa, Firebase (Auth + Firestore real-time sync). No custom backend — all logic is client-side.
- **Reviewer:** Claude Code (`app-review` skill, enhanced mode with `app-review-kit`)

## Summary

| Dimension     | Critical | High | Medium | Low | Info | Total |
|---------------|:-------:|:----:|:------:|:---:|:----:|:-----:|
| Security      |    2    |  3   |   2    |  2  |  0   |   9   |
| Performance   |    0    |  0   |   1    |  0  |  0   |   1   |
| Correctness   |    0    |  1   |   1    |  0  |  0   |   2   |
| **Total**     |  **2**  |**4** | **4**  |**2**|**0** |**12** |

> ⚠️ **This review surfaces critical, exploitable issues.** Firebase web API keys in the bundle are PUBLIC by design — Firestore Security Rules are the only thing standing between any internet visitor and the database. Per the project's own memory notes, the rules in `firestore.rules` may not even be deployed yet (TEST MODE is suspected to be live). Treat fixing SEC-001 through SEC-005 as a release-blocker before sharing the app more widely.

### Top priorities
1. **[SEC-001 — CRITICAL]** Firestore likely still in TEST MODE — every document world-readable AND world-writable until the mode expires to deny-all.
2. **[SEC-002 — CRITICAL]** Even with rules deployed, ANY signed-in user can `setDoc` themselves into any league's `members` subcollection and instantly join → read+write everything.
3. **[SEC-003 — HIGH]** Game state has no server-side turn validation — any league member can overwrite `gameState` to fabricate draft outcomes.
4. **[SEC-004 — HIGH]** `inviteTokens` collection is world-readable AND world-writable to any signed-in user (enumerate + hijack pending invites).
5. **[BUG-001 — HIGH]** `acceptInvite` is 4 separate Firestore writes with no batch/transaction → half-joined users on any partial failure.

## Scanners

| Scanner | Ran | Version | Findings | Note |
|---|:---:|---|:---:|---|
| gitleaks | ⏭️ | — | — | not installed |
| npm-audit | ✅ | 11.13.0 | 3 | `esbuild`, `vite`, `vite-plugin-pwa` — first two are dev-server-only |
| semgrep | ⏭️ | — | — | not installed |
| config-builtin | ✅ | 1.0 | 0 | no `dangerouslySetInnerHTML` / `eval` / cleartext-traffic hits |

## Coverage

- **Reviewed:** `firestore.rules` (the security boundary), `src/lib/firebase.ts`, `src/store/{AuthContext,GameContext,gameReducer}.tsx`, `src/hooks/{useLeague,useAuth,useTurnControl}.ts`, the invite flow component, type definitions.
- **Not reviewed:** `node_modules/`, `dist/`, per-game physics UIs (BeerPong/FlipCup/Quarters/HighCard/Holdem — only their multiplayer data model, not the math/feel tuning), live Firebase project rules in the console.
- **Assumptions:** Firebase web API keys in the bundle are public by design (correct per Firebase docs). The `firestore.rules` in the repo represents the intended deployed policy. Leagues are small (≤20 members).

## Findings

### Security

#### [SEC-001] Firestore is reportedly still in TEST MODE — every document world-readable AND world-writable
- **Severity:** Critical  ·  **Confidence:** Medium
- **Category:** OWASP A01:2021 — Broken Access Control  ·  **CWE:** CWE-284
- **Source:** llm
- **Location:** `firestore.rules` (and the deployed Firebase project rules)
- **Description:** Per the project's own memory notes ("Firestore is in test mode (open writes) so live works today; `firestore.rules` updated... needs `firebase deploy` — CLI not yet set up"), the live database is governed by Firebase's default TEST MODE rules: `allow read, write: if request.time < <expiry-date>;`. That is effectively allow-all without even requiring auth, plus a built-in auto-expiry to deny-all on the deadline.
- **Impact:** Any unauthenticated visitor on the public Vercel URL — or anyone hitting the Firestore REST API directly using the public project ID — can read every user profile, league, game, invite token, and draft history; and can overwrite or delete all of it. When the test-mode expiry hits, the live app silently starts 403'ing every read.
- **Recommendation:** **Today**: open the Firebase console → Firestore → Rules and verify. **If test mode is active**: deploy `firestore.rules` immediately: `npm i -g firebase-tools && firebase login && firebase init firestore` (point at the existing project), then `firebase deploy --only firestore:rules`. After deploying, address SEC-002 through SEC-006 — those are problems IN the rules file itself.

#### [SEC-002] Members subcollection world-writable — any signed-in user can add themselves to ANY league
- **Severity:** Critical  ·  **Confidence:** High
- **Category:** OWASP A01:2021 — Broken Access Control (Authorization Bypass)  ·  **CWE:** CWE-285
- **Source:** llm
- **Location:** `firestore.rules:38-42 → leagues/{leagueId}/members`; also `firestore.rules:12-15 → leagueMembers` global index
- **Description:** `allow write: if request.auth != null;` lets any signed-in user `setDoc(doc(db, 'leagues', '<some-league-id>', 'members', myUid), {role: 'member', ...})` and instantly become a member of someone else's league. Every other rule gates read/update via `exists(...members/$(request.auth.uid))` — so this one permission opens every gated path. League IDs are short Firestore IDs that can be guessed/enumerated from any leaked invite URL or screenshot.
- **Impact:** An attacker (or any curious user) can join arbitrary leagues without an invite. Once joined they read every game state, every draft result, every member's display name, and (per SEC-003) can also overwrite the live game state. The trust model ("member of league X" = "explicitly invited") is broken.
- **Recommendation:** **(1)** Cleanest: move the member-add to a Cloud Function with the Admin SDK that validates an accepted invite, and set the rule to `allow write: if false`. **(2)** If staying client-side, require an invite token in `request.resource.data.inviteToken` and validate via `get(...)` against the matching invite doc. Same fix on the `leagueMembers` global index.

#### [SEC-003] Game state writable by ANY league member at any time — server has no notion of "whose turn"
- **Severity:** High  ·  **Confidence:** High
- **Category:** OWASP A04:2021 — Insecure Design (Client-Side Trust Violation)  ·  **CWE:** CWE-602
- **Source:** llm
- **Location:** `firestore.rules:63-73 → leagues/{leagueId}/games/{gameId}`; `src/store/GameContext.tsx:33-53`; `src/hooks/useTurnControl.ts:1-30`
- **Description:** The rule's own comment is the giveaway: *"Live turn-based play: ANY league member may advance the shared game state (the app gates who can act on their turn). Last-write-wins is acceptable because turns are serialized in the UI."* That gating lives entirely in the React client (`useTurnControl.canActAs`). Anyone with a browser console (or `curl`) can `updateDoc(doc(db, 'leagues', L, 'games', G), { gameState: <anything> })` and force any outcome — claim wins, undo a swap, set `phase: 'complete'` with a fabricated `pickOrder`. Combined with SEC-002, a non-member can self-add and then do it.
- **Impact:** Draft outcomes are forgeable by any participant. In a drinking-game context this is mostly trust/pranking — but the app exists to BE the source of truth for draft order, and draft results are written to `draftResults` (also writable by anyone — see SEC-005). A bored member can rewrite history.
- **Recommendation:** Move the turn check server-side. Cleanest: a Cloud Function `submitGameAction(action, expectedVersion)` re-runs the reducer, validates `request.auth.uid === turnOrder[currentTurnIndex].uid` (or commissioner override), writes the new state with `version + 1`. Rules become `allow update: if false` on the games doc. Cheaper alternative: rules-level check that the writer matches `turnOrder[currentTurnIndex].uid` — but the rules language is constrained and a determined attacker can craft a payload that satisfies it while corrupting unrelated fields, so the Cloud Function path is safer.

#### [SEC-004] `inviteTokens` collection is world-readable AND world-writable for any signed-in user
- **Severity:** High  ·  **Confidence:** High
- **Category:** OWASP A01:2021 — Broken Access Control  ·  **CWE:** CWE-639
- **Source:** llm
- **Location:** `firestore.rules:18-21 → inviteTokens`
- **Description:** Two problems: **read** has no scoping at the collection level, so `getDocs(collection(db, 'inviteTokens'))` returns every outstanding token — the 6-char `randomToken()` is pointless as a secret because they're all listable in one round-trip. **write** lets any user overwrite a victim's pending invite (swap `leagueId`/`inviteId`/`expiresAt`) or create fake token rows for social engineering.
- **Impact:** Any signed-in user can enumerate every pending invite, then call `acceptInvite(token, …)` to join any league. Redundant with SEC-002 but needs to be closed independently.
- **Recommendation:** Move invite-token lookup behind a Cloud Function (`POST /lookupInvite { token }`), set rules to `allow read, write: if false` on `inviteTokens`. If keeping client-side: `allow get: if request.auth != null; allow list: if false` (the rules language distinguishes these — `list` is collection queries) AND restrict writes to the league's commissioner.

#### [SEC-005] `draftResults` create permission is not scoped to league membership
- **Severity:** High  ·  **Confidence:** High
- **Category:** OWASP A01:2021 — Broken Access Control  ·  **CWE:** CWE-285
- **Source:** llm
- **Location:** `firestore.rules:76-80 → leagues/{leagueId}/draftResults`
- **Description:** `allow create: if request.auth != null;` — no `exists(...members/$(request.auth.uid))` check. Read requires membership; create doesn't. Any signed-in user can write fake draft-result documents into any league's history.
- **Impact:** Permanent corruption of league history; fake entries appear next to real ones in the GameHistory UI.
- **Recommendation:** Match the read rule (`... && exists(...members/$(request.auth.uid))`), and ideally restrict to the commissioner. Also consider write-once: `allow update, delete: if false` so finalized history can't be retroactively edited.

#### [SEC-006] Invite subcollection allows update/delete by any signed-in user
- **Severity:** Medium  ·  **Confidence:** High
- **Category:** OWASP A01:2021  ·  **CWE:** CWE-285
- **Source:** llm
- **Location:** `firestore.rules:45-52 → leagues/{leagueId}/invites`
- **Description:** Any signed-in user can revoke, expire, or modify any pending invite for any league. Less impactful than SEC-002/SEC-004 (the tokens are already exposed by those), but adds griefing potential — silently revoke every pending invite for a target league before the recipients can use them.
- **Recommendation:** Restrict update/delete to the league's commissioner: `get(/databases/$(database)/documents/leagues/$(leagueId)).data.commissionerId == request.auth.uid`. Match the `create` rule that already exists.

#### [SEC-007] Invite expiration is checked on the client only
- **Severity:** Medium  ·  **Confidence:** High
- **Category:** Insufficient Session/Token Expiration  ·  **CWE:** CWE-613
- **Source:** llm
- **Location:** `src/hooks/useLeague.ts:174-188 → lookupInviteToken`
- **Description:** `if (new Date(expiresAt) < new Date()) return null;` is entirely client-side. An attacker who finds an expired token (per SEC-004 they can list all of them) can skip this check by calling `acceptInvite` directly. Or just set the system clock back. Firestore rules don't validate `expiresAt`.
- **Recommendation:** Enforce in Firestore rules (or the recommended Cloud Function): `request.time < invite.expiresAt`. The client check is fine as a UX nicety; it can't be the gate.

#### [SEC-008] Vulnerable dev dependency: `esbuild` (moderate)
- **Severity:** Low  ·  **Confidence:** High
- **Category:** OWASP A06:2021  ·  **CWE:** CWE-1395
- **Source:** scanner:npm-audit
- **Location:** `package.json → esbuild`
- **Description:** "any website can send requests to the dev server and read the response" — dev-server-only. Production is a static build → Vercel CDN; impact in prod is zero. Downgraded from scanner's medium.
- **Recommendation:** `npm audit fix`.

#### [SEC-009] Vulnerable dev dependency: `vite` (moderate)
- **Severity:** Low  ·  **Confidence:** High
- **Source:** scanner:npm-audit
- **Location:** `package.json → vite`
- **Description:** Path traversal in optimized-deps `.map` handling. Dev-server-only. Same risk class as SEC-008.
- **Recommendation:** `npm audit fix`.

### Performance

#### [PERF-001] `useMyLeagues` does an N+1 read: one `getDoc` per league
- **Severity:** Medium  ·  **Confidence:** High
- **Category:** I/O — N+1 reads
- **Source:** llm
- **Location:** `src/hooks/useLeague.ts:28-53 → useMyLeagues`
- **Description:** After fetching the user's `leagueMembers` index rows, the hook does `Promise.all(leagueIds.map(id => getDoc(...)))` — one round-trip per league. Each `getDoc` is a billed Firestore read; wall-clock is dominated by the slowest round-trip but cost scales linearly.
- **Impact:** Small at current scale. Becomes visible if power users are in 10+ leagues. Also: `fetch` re-runs on every mount of `useMyLeagues`.
- **Recommendation:** Use Firestore's `in` query: `query(collection(db, 'leagues'), where(documentId(), 'in', leagueIds))` — one round-trip for up to 30 IDs. For >30, chunk into batches of 30 and `Promise.all`. Bonus: denormalize league name/icon onto `leagueMembers` so the dashboard renders from the first query alone.

### Correctness

#### [BUG-001] `acceptInvite` is not atomic — 4 sequential writes leave half-joined state on failure
- **Severity:** High  ·  **Confidence:** High
- **Category:** Atomicity / data consistency  ·  **CWE:** CWE-662
- **Source:** llm
- **Location:** `src/hooks/useLeague.ts:190-205 → acceptInvite`
- **Description:** Four separate writes run sequentially with no transaction: (1) `setDoc(.../members/{uid})`, (2) `setDoc(leagueMembers/{leagueId}_{uid})`, (3) `updateDoc(.../invites/{inviteId}, status: 'accepted')`, (4) `deleteDoc(inviteTokens/{token})`. A network drop, retry exhaustion, or the user closing the tab between any two leaves the system partial.
- **Impact:** Half-joined users report "I can't see the league on my dashboard but I can open it from the link" — real support headache. Worst case: index row exists but member doc doesn't → user shows the league in their list but can't access anything.
- **Recommendation:** `writeBatch`: `const batch = writeBatch(db); batch.set(memberRef, …); batch.set(indexRef, …); batch.update(inviteRef, …); batch.delete(tokenRef); await batch.commit();`. Atomic across up to 500 ops — exactly the right primitive here.

#### [BUG-002] Username uniqueness has a TOCTOU race — two users can claim the same username
- **Severity:** Medium  ·  **Confidence:** High
- **Category:** Race condition  ·  **CWE:** CWE-367
- **Source:** llm
- **Location:** `src/store/AuthContext.tsx:102-114 → createProfile`, `:123-126 → isUsernameAvailable`
- **Description:** `isUsernameAvailable` runs `query(users where username == X)` — if empty, UI submits. `createProfile` then `setDoc(...)` without a Firestore-enforced uniqueness constraint. Two concurrent signups can both pass the check and both write the same username. Same race exists in `signInWithGoogle`'s username-derivation loop (`:80-87`).
- **Impact:** Duplicate usernames silently coexist. Any feature assuming uniqueness (mentions, lookups, leaderboards) returns ambiguous results.
- **Recommendation:** Use a separate `usernames/{username}` collection where the docId IS the username (Firestore guarantees docId uniqueness): `runTransaction(tx => { const snap = await tx.get(usernamesRef); if (snap.exists()) throw 'taken'; tx.set(usernamesRef, {uid}); tx.set(userRef, {username, …}); })`. Add a rule preventing overwrite. On username change, transactionally delete-old + create-new.

## Notes

**Verified non-findings:**

- **Firebase web API key in `firebase.ts` is NOT a secret.** Firebase web SDK config (apiKey, authDomain, projectId, etc.) is *by design* public — it identifies the project, it doesn't authorize access. The actual security boundary is Firestore Security Rules (which is exactly why SEC-001 through SEC-006 are so impactful). If a scanner ever flags `VITE_FIREBASE_API_KEY`, it's a false positive in this stack.
- **`randomToken()` uses `crypto.getRandomValues`** — cryptographic-quality randomness (not `Math.random`). Good. The token is only 6 characters from a 30-char alphabet (~30 bits) which is fine for short-lived invite tokens but would be too short for anything long-lived.
- **`gameReducer` is a pure reducer with `REPLACE_STATE`** — the echo-suppression pattern (`lastSyncRef` + `JSON.stringify(state)`) is sound; remote snapshots are applied via `REPLACE_STATE` without re-writing.
- **Email/password auth is delegated to Firebase Auth** (industry-standard hashing, token rotation, email verification on signup). No custom password code to review.
- **No XSS sinks.** No `dangerouslySetInnerHTML`, no `eval`, no untrusted HTML rendering — React's default escaping covers the entire UI. The config-builtin scanner correctly found 0 hits.
- **`safeNext`-style open-redirect class doesn't exist** — no `?next=` patterns; navigation is client-side via React state, not URL-driven.
- **`devMock.ts` is correctly Vite-dev-gated** (`import.meta.env.DEV && false`) and prod-safe.
- **The "commissioner can act on anyone's behalf" override** (`useTurnControl.canActAs`) is a deliberate stall-breaker and is correctly client-side only — it'd be fine in a world where SEC-003 was fixed, since the Cloud Function would also recognize the commissioner exception.

**Suggested follow-ups:**
- Install `gitleaks` and `semgrep` to widen scanner coverage.
- **Critical path before sharing this app more widely:** SEC-001 → SEC-002 → SEC-003 → SEC-004 → SEC-005 → BUG-001, in that order. Roughly: deploy the rules file, then move sensitive writes to Cloud Functions (members, invite-acceptance, game-state-updates) and tighten the rules to `allow write: if false` for those paths.
- Set up `firebase emulators:start` locally so you can iterate on rules + Cloud Functions without touching the prod project.
- After fixes land, re-run the review — the `since-last-review` diff will show what's closed.
