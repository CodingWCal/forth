# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-21
- Worktree: `C:\Users\calvi\Documents\Codex\forth-ticket001`
- Branch: `codex/ticket-001-conflict-safe-sync`
- Base: `origin/staging` at `9ace9c5`
- Active ticket: TICKET-001 conflict-safe cloud persistence
- Release state: isolated implementation only; do not merge, publish Firestore rules, or deploy to production without maintainer approval and the coordinated migration procedure in `docs/PHASE2.md`
- Related isolated work: draft PR #22 owns the task-first dashboard cleanup; draft PR #23 owns the patched `sharp` dependency. Do not combine their diffs into this ticket.

## Implemented in this checkpoint

- Replaced blind whole-board cloud writes with normalized project/ticket records and a small revision metadata document.
- Added optimistic concurrency control: a save commits only if the cloud revision still matches the revision originally loaded.
- Added an explicit conflict state that preserves the stale tab's visible edits and asks before discarding them to load the latest cloud version.
- Added a lazy legacy migration that writes one immutable `recovery/legacy-v2` snapshot before normalizing the first save.
- Tightened Firestore rules so record mutations must be coupled atomically to exactly one revision advance.
- Added real adapter-plus-emulator coverage for sequential stale writes, simultaneous saves, uncoupled writes, and legacy migration.
- Documented the schema, migration, rollback boundary, and remaining TICKET-024 scale work.

## Validation at handoff

- `pnpm install --frozen-lockfile`: passed; 455 packages reused from the locked store.
- `pnpm run lint`: passed before the final rule-validation tightening; rerun before commit.
- `pnpm run typecheck`: passed before the final rule-validation tightening; rerun before commit.
- `pnpm run test`: passed, 50/50 unit tests; rerun before commit.
- `pnpm run test:rules`: passed, 21/21 tests before the final rule-validation tightening; rerun before commit.
- `pnpm run test:e2e`: passed, 7/7 Playwright tests.
- `pnpm run build`: passed; rerun if code changes after this handoff update.
- `pnpm audit --prod`: baseline advisory remains for `sharp@0.34.5`; isolated draft PR #23 updates to the clean patched path. Do not promote this branch until that patch is integrated or this branch is rebased on it.
- `git diff --check`: passed before final documentation edits; rerun before commit.
- Still required: authenticated two-tab staging smoke, a legacy migration dry run, and production backup/rollback rehearsal.

## Next delivery sequence

1. Rerun the complete automated gate and added-line secret scan.
2. Commit, push, and open a draft PR into `staging`; do not merge it.
3. Integrate or stack the dependency patch from draft PR #23 before any production promotion.
4. On a stable authenticated staging hostname, run the documented two-tab race and legacy migration checks.
5. Review the migration/rollback plan with the maintainer before publishing rules or promoting the app.
6. Keep the dashboard simplification in draft PR #22 separately reviewable.

## Known next risk

The new application and new Firestore rules are a matched pair. Deploying only one side can block saves, and rolling back only the frontend after any workspace migrates is unsafe. TICKET-024 still owns 30+ user load testing, granular listeners, pagination, and richer merge UX; TICKET-001 prevents silent overwrites but does not claim Google Docs-style merging.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commits, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
