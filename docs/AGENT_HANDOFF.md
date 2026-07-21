# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-21
- Worktree: `C:\Users\calvi\Documents\Codex\forth-contributor-agent-policy`
- Branch: `codex/integrate-pr18-onboarding`
- Integration commits: `99e9613` (Roger's original PR #18 commit, preserving authorship) and `c49f1e4` (maintainer reconciliation and QA)
- Base: `origin/main` at `7aeb3c2` after merged PR #20
- Draft PR: pending publication
- Active ticket: TICKET-022 first-visit/contextual-help slice
- Release state: committed locally; not yet pushed, merged, or deployed

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

## Remaining before merge/deploy

1. Push this branch and open the replacement draft PR against `main`.
2. Link the replacement from the backlog/handoff, then close original PR #18 as superseded with contribution credit preserved.
3. Inspect hosted checks and manually verify the authenticated cloud-guide copy in the preview with a real Firebase account.
4. Do not merge or deploy until the maintainer reviews the draft and explicitly approves release.

## Known next risk

The automated suite covers signed-out protection, explicit demo entry, dialog behavior, keyboard focus, persistence, and responsive layouts. It does not automate a live third-party OAuth/Firestore session, so the cloud-guide timing still needs one manual preview smoke test. The centralized terminology map and persistent plain-language preference remain future TICKET-022 work.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commits, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
