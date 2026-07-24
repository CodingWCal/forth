# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-21
- Worktree: `C:\Users\calvi\Documents\Codex\forth-ticket032`
- Branch: `codex/ticket-032-patch-sharp`
- Base: `origin/staging` at `9ace9c5`
- Active ticket: TICKET-032, patch the transitive sharp/libvips advisory
- Parallel active work: draft PR #22 implements TICKET-013/TICKET-030 on `codex/ticket-013-task-first-quest-log`; do not mix or reimplement its UI changes here
- Draft PR: https://github.com/CodingWCal/forth/pull/23 (targets `staging`)
- Implementation commit: `793c8d3`
- Release state: dependency patch is pushed; local QA, GitGuardian, and the Vercel clean preview build pass; maintainer preview smoke and approval remain
- Stable staging URL: https://forth-git-staging-calvintrinhvan-2763s-projects.vercel.app/

## Implemented in this checkpoint

- Confirmed that stable Next.js 16.2.11 and canary 16.3.0-canary.92 still request `sharp ^0.34.5`, so a framework patch alone does not resolve GHSA-f88m-g3jw-g9cj.
- Added a root pnpm 11 override in `pnpm-workspace.yaml` that resolves Next 16.2.10's optional image dependency to patched `sharp 0.35.0` while preserving the existing postcss override and trusted-build policy.
- Regenerated `pnpm-lock.yaml`; the resolved production graph contains `next@16.2.10 -> sharp@0.35.0` and no `sharp@0.34.5` lock entry.
- Loaded the installed runtime directly and confirmed `sharp 0.35.0` with libvips `8.18.3`.
- Built and started the production server, then requested `/_next/image` for the code-squire sprite; Next returned HTTP 200 and `image/png` through the patched optimizer.

## Validation at handoff

- `pnpm install --frozen-lockfile`: passed.
- `pnpm audit --prod`: passed; no known vulnerabilities.
- Resolved dependency check: `next@16.2.10 -> sharp@0.35.0`.
- Runtime version check: `sharp 0.35.0`, libvips `8.18.3`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 50/50 unit tests.
- `pnpm test:e2e`: passed, 7/7 browser tests on the staging baseline.
- `pnpm build`: passed.
- Local production image optimizer: HTTP 200, `Content-Type: image/png`, 3,864-byte optimized response.
- GitGuardian Security Checks: passed on draft PR #23.
- Vercel clean install/build: passed on draft PR #23.
- Vercel preview: https://forth-git-codex-ticket-032-c05262-calvintrinhvan-2763s-projects.vercel.app (feature preview protection may require the maintainer's Vercel login; do not add it to Firebase authorized domains).
- `pnpm test:rules`: not rerun because this branch changes no Firebase adapter, schema, authentication, membership, or Firestore rules behavior; staging baseline is 17/17.
- `git diff --check`: passed.
- Added-line credential-pattern scan: passed; zero matches.

## Next delivery sequence

1. Open draft PR #23's preview while signed into Vercel and confirm the code-squire sprite renders without a server error.
2. Merge only after maintainer approval; do not promote to production until draft PR #22 and the remaining release gates are separately accepted.
3. Remove this override when a supported Next.js release accepts `sharp >=0.35.0`; do not let the temporary compatibility pin become invisible permanent policy.

## Known next risk

The override crosses Next's declared `^0.34.5` range because upstream has not yet adopted sharp 0.35. Local compatibility is proven for build and image optimization, but the Vercel runtime must still pass. A rollback reintroduces the vulnerability, so rollback means holding release while waiting for an upstream-compatible patch rather than silently shipping `sharp 0.34.5`.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commits, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
