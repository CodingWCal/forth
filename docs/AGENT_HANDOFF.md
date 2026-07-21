# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-21
- Worktree: `C:\Users\calvi\Documents\Codex\forth-staging`
- Branch: `staging`
- Production baseline: `origin/main` at merge commit `d547e4b` after PR #21
- Staging commits: `94a7492` (stable staging marker) and `3574584` (TICKET-030 backlog entry)
- Active ticket: TICKET-013 task-first Quest Log redesign; TICKET-030 is a planned responsive quick fix
- Release state: PR #21 merged and deployed successfully; production and stable staging both return HTTP 200
- Stable staging URL: https://forth-git-staging-calvintrinhvan-2763s-projects.vercel.app/

## Implemented in this checkpoint

- Reconciled Roger's first-visit welcome guide with Forth's authenticated-entry architecture instead of merging the outdated local-first assumptions.
- Opens the cloud guide only after a verified Firestore snapshot; demo copy explicitly states that sample tickets remain disposable and browser-local.
- Stores welcome state safely and separately for demo mode and each authenticated account on a shared device.
- Pairs the core fantasy labels with literal PM terms for daily capacity, tickets, Kanban status, and completed work.
- Keeps the native dialog keyboard/backdrop/close behavior, returns focus to the Guild Hall help trigger, and enforces 44px actions.
- Documents the feature in README and records PR #13/#18 intake status in the canonical backlog.

## Validation at handoff

- `pnpm install --frozen-lockfile`: passed; 455 packages reused from the locked store.
- `pnpm run lint`: passed.
- `pnpm run typecheck`: passed.
- `pnpm run test`: passed, 50/50 unit tests.
- `pnpm run test:rules`: passed, 17/17 Firestore emulator tests.
- `pnpm run test:e2e`: passed, 7/7 Playwright tests across 320, 375, 768, and 1440px viewports.
- `pnpm run build`: passed.
- `pnpm audit --prod`: no known vulnerabilities.
- `git diff --check`: passed.
- Added-line credential-pattern scan: passed.
- Hosted GitGuardian and Vercel checks on draft PR #21: passed.
- Live authenticated preview guide (cloud timing, copy, close/reopen behavior): passed by maintainer on 2026-07-21.

## Next delivery sequence

1. Implement TICKET-013 on a dedicated branch based on `staging` and open a draft PR into `staging`.
2. Keep TICKET-030 as a separately reviewable responsive quick fix.
3. Start TICKET-029 only after the task-first hierarchy is stable so tour anchors do not immediately become stale.
4. Promote `staging` to `main` only after automated QA, authenticated staging smoke, and explicit maintainer approval.

## Known next risk

Firebase Authentication requires an exact authorized hostname. The stable staging hostname needs to be added once; temporary feature-preview hostnames should not be added after every push. The centralized terminology map and persistent plain-language preference remain future TICKET-022 work.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commits, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
