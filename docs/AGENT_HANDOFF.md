# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-20
- Worktree: `C:\Users\calvi\Documents\Codex\forth-ticket010`
- Branch: `codex/ticket-010-auth-entry`
- Implementation commit: `e9632dc`
- Base checkpoint: `codex/pr13-qa-fixes` (`f769978`), represented by draft PR #16
- Draft PR: https://github.com/CodingWCal/forth/pull/17
- Active ticket: TICKET-010 — authenticated landing, explicit disposable demo, and clean zero-ticket onboarding
- Release state: pushed as a stacked draft PR; not merged or deployed

## Implemented in this checkpoint

- Authenticated-first landing with Google and GitHub choices plus full-page redirect recovery.
- No ticket content before authentication resolves or the visitor explicitly enters demo mode.
- Demo persistence is isolated from cloud/legacy state; real workspaces start with one user-defined campaign and zero tickets.
- Save-before-switch/sign-out behavior, a first-snapshot editing gate, retry state, and safe browser-storage fallbacks.
- Atomic invitation acceptance, strict new guild IDs, and a rule blocking another user from pre-claiming a UID workspace path.
- Older-user readability/touch-target improvements and Playwright coverage at 320, 375, 768, and 1440px.

## Validation at handoff

- `pnpm test`: 50/50 passed.
- `pnpm test:rules`: 17/17 passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed after the final integrity changes.
- `pnpm audit`: no known vulnerabilities.
- `pnpm test:e2e`: 6/6 passed across 320, 375, 768, and 1440px viewports.
- `pnpm lint`: passed.

## Remaining before merge/deploy

1. Manually smoke-test Google and GitHub sign-in plus a two-account invitation on an authorized preview domain.
2. Merge PR #16, then retarget/rebase PR #17 onto `main` and rerun its checks.
3. Review and merge PR #17 only after the live auth/invitation gate passes; deployment remains a separate explicit action.

## Known next risk

TICKET-001 remains the next P0: Firestore still saves one last-write-wins workspace snapshot across simultaneous users. The ordered client queue prevents same-tab save races, but it is not multi-user conflict control.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commit, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
