# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-27
- Branch: `claude/firebase-cloud-save-error-df6g6u`, based on `origin/staging` at `664096e`
- Session scope: diagnose the production "Cloud save needs attention" error on https://forth-bice.vercel.app/, then fix the unresponsive Activity chart the maintainer screenshotted
- Active tickets: TICKET-035 (fixed, sole cause of the outage), TICKET-036 (fixed), TICKET-034 (reduced to a process gap, see below)
- Production baseline: `origin/main` at `899c5bc`
- Firebase project: `forth-86e26`

## Root cause: the cloud-save baseline was destroyed by its own success (TICKET-035, fixed here)

`remoteStateRef` was doing two jobs: the baseline every conflict-safe save diffs against, and the marker meaning "this render came from Firestore, not from a person." The save effect consumed the marker by setting the ref to `null`. Once the workspace listener applied any snapshot while no save was pending — normally the echo of the user's own committed save, and always after `loadLatestAfterConflict` — the baseline was gone.

The next edit reached `queueCloudSave` with `baseState === null`, threw "Forth has not established a safe cloud-save baseline yet," and surfaced through the generic branch as the reported "Forth could not save your latest changes." `retryCloudSync` re-entered the same path, so only a page reload cleared it.

This matches the reported symptom exactly: the workspace loads and renders, data is intact, the first save may succeed, and every later save fails until reload.

Fixed by splitting the one-shot echo marker (`appliedCloudStateRef`) from the persistent baseline (`remoteStateRef`), and clearing both when the active workspace changes.

## Ruled out: deployed Firestore rules (TICKET-034)

An earlier hypothesis in this session was that the live rules were behind the deployed app — TICKET-001's normalized `projects/*` and `tasks/*` collections shipped through `main`, and rules reach Firestore only through a manual deploy that nothing in the repository performs or verifies.

**Checked and rejected on 2026-07-27.** The maintainer confirmed in the Firebase console that the active ruleset contains both `isNormalizedTask` (TICKET-001) and `isOpenCohortGuild` (TICKET-031). The console's active version is dated Jul 24, 2026 · 5:17 PM, four minutes after `4e572e5`, the most recent commit touching `firestore.rules`. The deployed rules are current. **Do not deploy rules to fix this outage; there is nothing to deploy.**

The emulator evidence gathered while testing that hypothesis is still worth keeping, because it documents what a future drift would look like. Replaying the real client save path against the pre-TICKET-001 ruleset denies every save while reads keep working:

| Write | Pre-TICKET-001 rules | Current rules |
|---|---|---|
| `workspaces/{id}/data/current` | allowed | allowed |
| `workspaces/{id}/projects/*` | No matching allow statements | allowed |
| `workspaces/{id}/tasks/*` | No matching allow statements | allowed |
| `workspaces/{id}/recovery/legacy-v2` | No matching allow statements | allowed |

TICKET-034 survives as a process ticket only: there is still no automated check that committed rules match deployed rules, so the drift this session went looking for remains possible in the future. It is no longer a P0 and no longer blocks anything.

## Implemented in this checkpoint

- Separated the cloud-save baseline from the snapshot-echo marker in `components/forth-app.tsx`; both refs now reset when the active workspace changes.
- Replaced the Activity seven-day chart's fixed two-track grid with wrapping flex items (`flex-basis` plus `min-width: 0`) and `minmax(0, 1fr)` day columns, so it stacks on its card's width instead of a viewport breakpoint. Removed the now-inert `@media (max-width: 900px)` override.
- Added six Playwright element-boundary assertions for the chart at 375, 768, 1200, 1280, 1362, and 1440px.
- Added TICKET-034, TICKET-035, and TICKET-036 to the backlog.
- Added `docs/FIRESTORE_RULES_DEPLOY.md` so the next rules change has a written procedure, including the rollback copy and the parity check that resolved this investigation.

## Validation at handoff

- `pnpm install --frozen-lockfile`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 50/50.
- `pnpm test:rules`: passed, 22/22.
- `pnpm test:e2e`: passed, 17/17 on the staging base. The sandbox's preinstalled Chromium does not match the pinned Playwright build, so the run used a local config overriding `executablePath` to `/opt/pw-browsers/chromium`; the committed `playwright.config.ts` is unchanged and works on a normal machine.
- `pnpm build`: passed.
- Chart regression proven both ways: the new assertions fail against the pre-fix stylesheet at 1200, 1280, 1362, and 1440px and pass after the fix. Visual captures inspected at 375, 768, 1362, and 1920px.
- Deployed-rules parity: confirmed by the maintainer in the Firebase console, not by this session. No credentials for `forth-86e26` exist here.
- **Not covered:** TICKET-035 has no automated regression test. The repository has no component-rendering harness, so the fix is verified by code trace and review only. This is the most important follow-up in this handoff — the sole cause of a production outage is protected by nothing.

## Next delivery sequence

1. Land this branch into `staging`, then promote to production. This is the fix; no cloud action accompanies it.
2. Authenticated smoke on staging: create, edit, and complete a ticket, then **make several consecutive edits without reloading**. One successful save does not exercise the bug.
3. Add a component-rendering test harness (React Testing Library plus a jsdom Vitest environment, or Playwright against the Firebase emulators) and cover edit → save → snapshot echo → edit again, with TICKET-015.
4. Add the rules parity check (TICKET-034) whenever CI work happens; it is no longer urgent.
5. Resume the TICKET-013 preview and three-person usability exercise.

## Known next risk

The cloud sync path coordinates several refs (`remoteStateRef`, `appliedCloudStateRef`, `dirtyRef`, `revisionRef`, `savedRevisionRef`, `pendingSaveCountRef`) across three effects and an async save chain, and none of that choreography is reachable by the current test suite. This session's bug was an aliasing mistake in exactly that area, found by reading rather than by a failing test. Until a component harness exists, treat any change to those effects as high risk and validate it by hand with consecutive authenticated edits.

The `sharp` advisory tracked as TICKET-032 also remains open before the next production promotion.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commits, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
