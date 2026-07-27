# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-27
- Branch: `claude/firebase-cloud-save-error-df6g6u`, based on `main` at `899c5bc`
- Session scope: diagnose the production "Cloud save needs attention" error on https://forth-bice.vercel.app/, then fix the unresponsive Activity chart the maintainer screenshotted
- Active tickets: TICKET-034 (diagnosed, blocked on maintainer deploy), TICKET-035 (fixed), TICKET-036 (fixed)
- Production baseline: `origin/main` at `899c5bc`
- Firebase project: `forth-86e26`

## The production cloud-save failure has two independent causes

Both must be resolved before an authenticated account can save reliably. Only the second is fixable in code.

### 1. Deployed Firestore rules are behind the deployed app (TICKET-034, maintainer action)

TICKET-001 moved cloud storage from one whole-state document to normalized `projects/*` and `tasks/*` records plus a `recovery/legacy-v2` point. That client shipped to production through `main`. The matching `firestore.rules` policy is committed in the same commit (`4739d46`) but reaches Firestore only through a manual `firebase deploy`, and nothing in the repository performs or verifies it.

Replayed in the emulator, the current `saveWorkspaceToDatabase` against the previous ruleset fails every save with `PERMISSION_DENIED`. Probing the individual writes:

| Write | Previous rules | Current rules |
|---|---|---|
| `workspaces/{id}/data/current` | allowed | allowed |
| `workspaces/{id}/projects/*` | No matching allow statements | allowed |
| `workspaces/{id}/tasks/*` | No matching allow statements | allowed |
| `workspaces/{id}/recovery/legacy-v2` | No matching allow statements | allowed |

Reads still succeed, which is why the reported workspace renders its tickets and only saving fails.

**Not performed by this session, per `AGENTS.md`:** the deploy itself. The maintainer should diff the console's active ruleset against `firestore.rules`, then run `firebase deploy --only firestore:rules --project forth-86e26`, then confirm an authenticated save on staging.

### 2. The cloud-save baseline was destroyed by its own success (TICKET-035, fixed here)

`remoteStateRef` was both the baseline every conflict-safe save diffs against and the marker meaning "this render came from Firestore." The save effect consumed the marker by nulling the ref. Once the workspace listener applied any snapshot while no save was pending — normally the echo of the user's own committed save, and always after `loadLatestAfterConflict` — the baseline was gone. The next edit reached `queueCloudSave` with `baseState === null`, threw "Forth has not established a safe cloud-save baseline yet," and surfaced through the generic branch as the reported "Forth could not save your latest changes." `retryCloudSync` re-entered the same path, so only a reload cleared it.

Fixed by splitting the one-shot echo marker (`appliedCloudStateRef`) from the persistent baseline (`remoteStateRef`), and clearing both on workspace switch.

## Implemented in this checkpoint

- Separated the cloud-save baseline from the snapshot-echo marker in `components/forth-app.tsx`; both refs now reset when the active workspace changes.
- Replaced the Activity seven-day chart's fixed two-track grid with wrapping flex items (`flex-basis` plus `min-width: 0`) and `minmax(0, 1fr)` day columns, so it stacks on its card's width instead of a viewport breakpoint. Removed the now-inert `@media (max-width: 900px)` override.
- Added six Playwright element-boundary assertions for the chart at 375, 768, 1200, 1280, 1362, and 1440px.
- Added TICKET-034, TICKET-035, and TICKET-036 to the backlog with the evidence above.

## Validation at handoff

- `pnpm install --frozen-lockfile`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 50/50.
- `pnpm test:rules`: passed, 22/22.
- `pnpm test:e2e`: passed, 16/16. The sandbox's preinstalled Chromium does not match the pinned Playwright build, so the run used a local config overriding `executablePath` to `/opt/pw-browsers/chromium`; the committed `playwright.config.ts` is unchanged and works on a normal machine.
- `pnpm build`: passed.
- Chart regression proven both ways: the new assertions fail against the pre-fix stylesheet at 1200, 1280, 1362, and 1440px and pass after the fix. Visual captures inspected at 375, 768, 1362, and 1920px.
- Rules diagnosis proven in the Firestore emulator by replaying the real client save path against both rulesets, and by probing each write path individually.
- **Not verified:** the live ruleset on `forth-86e26`. This session has no credentials for that project, so TICKET-034 is a strongly evidenced diagnosis, not a confirmed observation of production state. The maintainer should check the console's active rules version before assuming it.
- **Not covered:** TICKET-035 has no automated regression test. The repository has no component-rendering harness, so the fix is verified by code trace and review only. See the note on TICKET-035.

## Next delivery sequence

1. Maintainer: diff and deploy `firestore.rules` to `forth-86e26`, then record the deployed version and timestamp (TICKET-034).
2. Maintainer: authenticated staging smoke — create, edit, and complete a ticket; make several consecutive edits without reloading; confirm a legacy workspace migrates and writes exactly one `recovery/legacy-v2` document.
3. Add the rule-parity release gate and a component-rendering test harness with TICKET-015, so neither of this session's two causes can recur undetected.
4. Resume the TICKET-013 preview and three-person usability exercise.

## Known next risk

Rules are deploy-time state, not repository state. Committed-and-passing rules say nothing about what Firestore is enforcing, and there is still no automated check on that gap. Until TICKET-034's release gate exists, any change to stored document shape can repeat this outage. The `sharp` advisory tracked as TICKET-032 also remains open before the next production promotion.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commits, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
