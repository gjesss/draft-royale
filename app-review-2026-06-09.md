# App Review Report — Optimization Pass

- **Project:** draft-royale
- **Date:** 2026-06-09
- **Scope:** Whole codebase, optimization-focused (performance, bundle, render work, Firestore I/O) + quick correctness wins. Follows the full UI redesign (sportsbook theme, emoji purge).
- **Stack:** React 18 + TypeScript + Vite + Tailwind, vite-plugin-pwa, Firebase (Auth + Firestore). Client-only.
- **Reviewer:** Claude Code (`app-review` skill, enhanced mode with `app-review-kit`)
- **Scanners:** config-builtin ran (0 findings). gitleaks / npm-audit / semgrep not installed.

## Summary

| Dimension   | Critical | High | Medium | Low | Info | Total |
|-------------|:-------:|:----:|:------:|:---:|:----:|:-----:|
| Performance |    0    |  1   |   3    |  1  |  1   |   6   |
| Correctness |    0    |  0   |   0    |  2  |  0   |   2   |
| **Total**   |  **0**  |**1** | **3**  |**3**|**1** |   8   |

### Top priorities
1. **[PERF-101 — High]** The 467 KB `logo.png` is the favicon AND is rendered at 32px in the game header — ~455 KB wasted on every load that touches it.
2. **[PERF-102 — Medium]** `useDraftHistory` reads **all** `draftResults` (no `limit`) on every league-hub open; cost grows unbounded with league history.
3. **[PERF-103 — Medium]** All 5 challenge games + modals are statically bundled into the main chunk (~680 KB JS); they're only needed mid-challenge → lazy-load candidates.
4. **[BUG-101 — Low]** `GameHistory.tsx` is dead code after the Phase-2 redesign (no longer rendered).

## Findings

### Performance

#### [PERF-101] 467 KB logo.png used as favicon and as a 32px inline icon
- **Severity:** High · **Confidence:** High
- **Location:** `index.html:5-6` (favicon + apple-touch-icon), `src/components/GameBoard.tsx:40` (`<img src="/logo.png" width={32}>`), `src/components/Logo.tsx:14,28` (`TrophyIcon`/`LogoMark`)
- **Description:** `public/logo.png` is **467 KB**. It's loaded as the favicon, the apple-touch icon, the 32px game-header mark, and the `TrophyIcon` (used at sizes 20–48 in loading spinner, profile footer, dashboard). The properly-sized `logo-192.png` (12 KB) and `logo-512.png` (66 KB) already exist but are only referenced by the PWA manifest.
- **Impact:** ~455 KB of unnecessary transfer/decode on first paint and anywhere the mark appears small. On a phone on venue wifi this is the single biggest easy win.
- **Fix:** Point the favicon/apple-touch-icon and `TrophyIcon` at `logo-192.png`; use `logo-512.png` for the large auth `LogoMark`. Keep `logo.png` only if a truly large render needs it (it doesn't).

#### [PERF-102] `useDraftHistory` reads every draftResult with no limit
- **Severity:** Medium · **Confidence:** High
- **Location:** `src/hooks/useLeague.ts` → `useDraftHistory` (`getDocs(query(... orderBy('createdAt','desc')))` with no `limit`)
- **Description:** Every time the league hub opens, this fetches **all** draft-result docs for the league (one per pick, per game, forever). The Board tab only needs the latest draft + recent activity; standings need all of them but could be capped. Billed reads and payload scale linearly with league age.
- **Impact:** Small now, grows with every draft. A league that's run 30 drafts of 12 players = 360 doc reads on every hub open.
- **Fix:** Add `limit(300)` (covers many recent drafts) or paginate. For standings, consider a denormalized per-player aggregate doc updated on game completion instead of recomputing from raw rows.

#### [PERF-103] All challenge games + modals statically bundled
- **Severity:** Medium · **Confidence:** Medium
- **Location:** `src/components/modals/ChallengeModal.tsx` imports `HighCardGame`/`HoldemGame`/`BeerPongGame`/`FlipCupGame`/`QuartersGame`; all reachable from the main entry
- **Description:** The five mini-games (incl. the Hold'em hand evaluator and beer-pong physics) ship in the initial JS chunk (~680 KB). They're only used once a pick-swap challenge starts.
- **Impact:** Slower first load / larger PWA precache than necessary.
- **Fix:** `React.lazy(() => import('../games/BeerPongGame'))` etc., wrapped in `<Suspense>`. Also consider `manualChunks` to split Firebase into its own chunk.

#### [PERF-104] Standings/activity recomputed every render
- **Severity:** Low · **Confidence:** High
- **Location:** `src/components/league/LeagueShell.tsx` (`computeStandings(history)` / `computeActivity(history)` called in render body)
- **Description:** Both run on every render of the shell (e.g. each tab switch), re-scanning all history. Cheap individually but unnecessary.
- **Fix:** `useMemo(() => computeStandings(history), [history])` (same for activity).

#### [PERF-105] Render-blocking web fonts (2 families × 5 weights)
- **Severity:** Info · **Confidence:** High
- **Location:** `index.html` Google Fonts link (Inter 400/500/600/700 + Oswald 500/600/700)
- **Description:** Acceptable and uses `display=swap`, but it's a render-blocking stylesheet + multiple weight files. Oswald is only used for headings/labels.
- **Fix (optional):** Drop unused weights (e.g. Inter 500, Oswald 500), or self-host subset. Low priority.

### Correctness / cleanup

#### [BUG-101] `GameHistory.tsx` is dead code
- **Severity:** Low · **Confidence:** High
- **Location:** `src/components/league/GameHistory.tsx`
- **Description:** After the Phase-2 redesign, the Members tab renders `Standings` + member rows; `GameHistory` is no longer imported anywhere. It still defines its own `useDraftHistory` call (harmless only because it never mounts).
- **Fix:** Delete the file (per-player pick history now lives in `MemberSheet`).

#### [BUG-102] Unused `emoji` fields in display maps
- **Severity:** Low · **Confidence:** High
- **Location:** `src/utils/gameLogic.ts` → `BALL_DISPLAY[*].emoji`, `CHALLENGE_GAME_DISPLAY[*].emoji`
- **Description:** After the emoji purge these fields are no longer rendered (DrawResultModal uses an icon map; ChallengeModal dropped `g.emoji`). Dead data.
- **Fix:** Remove the `emoji` keys and their type from the records.

## Since last review (app-review-2026-06-07.md)

| Prior finding | Status |
|---|---|
| **PERF-001** N+1 `getDoc` per league in `useMyLeagues` | ✅ Fixed — batched `where(documentId(),'in',chunk)` (chunks of 30) |
| **BUG-001** non-atomic `acceptInvite` | ✅ Fixed — single `writeBatch` |
| **BUG-002** username TOCTOU race | ✅ Fixed — `runTransaction` + `usernames/{username}` uniqueness index |
| **SEC-002/004/005/006/007** rules authz holes | ✅ Addressed in `firestore.rules` (member/leagueMembers gated by invite-token claim; inviteTokens get-only; draftResults scoped; commissioner-only invite mutation; rule-level expiry) |
| **SEC-003** client-only turn trust | ◑ Strong pure-rules form (game update gated to `currentTurnUid`/commissioner); full server-authoritative path scaffolded in `functions/` (needs Blaze) |
| **SEC-001** Firestore in test mode | ⏳ Rules now deployable AND a creation-breaking regression was fixed this session (commissioner self-add branch added). Awaiting `firebase deploy --only firestore:rules` (in progress with the user). |

## Coverage
- **Reviewed:** redesign components, hooks (`useLeague`, `useTurnControl`), contexts, `vite.config.ts`, `index.html`, `tailwind.config.js`, public assets.
- **Not verified:** live deployed Firestore rules (can't read the console); production bundle analyzer numbers (estimated from precache size); per-game physics math.
- **Notes:** Firebase web API key in the bundle is public by design (non-finding). Scanners found nothing; gitleaks/semgrep not installed.
