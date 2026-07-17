# Ticket Backlog

Generated: 2026-07-16  
Repo/app: Forth  
Audit scope: Product/design docs, responsive UI, workspace state, Firebase Auth/Firestore persistence, security rules, dependencies, tests, and production build.

## Product Intent Snapshot

- Plain English: Forth turns a small engineering team’s real ticket queue into a calm fantasy quest board. It rewards finishing meaningful work without leaderboards, punishment, or streak anxiety.
- Engineering framing: Next.js 16/React 19 with a strict TypeScript reducer domain, localStorage fallback, and an authenticated Firestore workspace document synchronized through a client adapter.
- Brand/design guardrails: Preserve Iron & Parchment: SNES-era medieval guild framing, warm parchment, near-black green, moss, oxblood, amber, square pixel edges, serif display type, restrained sprite motion, and literal engineering meaning beneath themed labels.
- Assumptions: The current target is a small private beta. It is not yet a conflict-safe, multi-team production SaaS.

## Verification Summary

- Commands run: `pnpm lint` → pass; `pnpm typecheck` → pass; `pnpm test` → 15/15 pass; `pnpm build` → pass; `pnpm test:rules` → 6/6 pass; `corepack pnpm audit --prod` → no known vulnerabilities.
- Security checks: no committed Firebase key/private-key patterns; only the safe `.env.example` is tracked; Firebase public browser configuration stays in `NEXT_PUBLIC_*`; authorization is enforced by `firestore.rules` and emulator tests cover owner, member, outsider, and signed-out access.
- Visual/app checks: Today, Realm Map, responsive navigation, and the New Quest dialog inspected at 375×812, 768×1024, and 1440×1000. No page-level horizontal overflow was observed. Native dialog Escape behavior passed.
- Not run: automated browser E2E and assistive-technology screen-reader testing; both remain backlog work.

## Priority Guide

- P0 Critical: security, data loss, app-breaking, or launch-blocking.
- P1 High: major UX/correctness gaps or important release quality issues.
- P2 Medium: meaningful improvements, refactors, test gaps, performance work.
- P3 Low: polish, nice-to-have enhancements, cleanup.

## Tickets

### TICKET-001: Prevent last-write-wins data loss during concurrent cloud edits

- Priority: P1 High
- Type: Architecture/Reliability
- Area: `lib/firebase/workspace.ts`, Firestore workspace data model
- Effort: L
- Confidence: High
- Evidence: `saveWorkspace` writes the entire `WorkspaceState` into `workspaces/{uid}/data/current` after each local change. Two open clients can overwrite one another, and the document will eventually approach Firestore’s document-size ceiling as Proof grows.
- Plain English: Cloud saving works, but two devices editing at once can accidentally replace each other’s latest work.
- Learning brief (layman terms):
  - What is happening now: Every save replaces one large snapshot of the whole board.
  - Why it matters: The newest writer wins even if it started from older data, so a teammate’s change can disappear.
  - What changing it means: Store projects/tasks as smaller records or add revision checks so conflicting writes are detected instead of silently accepted.
  - Concept to learn: Concurrency control is how a system prevents simultaneous edits from unknowingly overwriting one another.
- Engineering framing: Replace whole-state blind writes with normalized documents and transactions/version preconditions, or explicitly constrain private beta to single-user workspaces until implemented.
- Scope:
  - Choose and document a normalized Firestore schema or revisioned snapshot strategy.
  - Detect stale writes and expose a recoverable conflict state.
  - Preserve local demo behavior and the reducer domain contract.
- Out of scope:
  - Google Docs-style collaborative text editing.
  - Enterprise audit history.
- Acceptance criteria:
  - Two simulated clients cannot silently erase one another’s ticket updates.
  - Proof history can grow without one unbounded state document.
  - Emulator/integration tests cover stale and concurrent writes.
- Suggested files:
  - `lib/firebase/workspace.ts`
  - `lib/types.ts`
  - `firestore.rules`
  - `tests/firestore.rules.test.ts`
- Validation:
  - Run rule tests, integration tests, lint, typecheck, unit tests, and build.
- Subagent prompt:
  > Implement TICKET-001 using the current Forth domain model. Preserve Iron & Parchment and local mode. Prove concurrent cloud updates cannot silently overwrite each other, and explain the chosen concurrency strategy in plain English and engineering terms.

### TICKET-002: Make sync failures actionable and retryable

- Priority: P1 High
- Type: UX/Reliability
- Area: `components/forth-app.tsx`, `lib/firebase/workspace.ts`
- Effort: M
- Confidence: High
- Evidence: The app records a generic `error` sync state after failed writes, but does not retain the failed operation, provide a retry control, or explain whether the local edit is waiting, saved locally, or lost.
- Plain English: A user can learn that cloud saving failed, but not what to do next.
- Learning brief (layman terms):
  - What is happening now: The cloud rune changes to an error state after a failed request.
  - Why it matters: People may close the tab believing their ticket was safely stored.
  - What changing it means: Keep local work safe, show a precise message, and provide a retry path.
  - Concept to learn: Failure recovery is the designed path from an error back to a trustworthy state.
- Engineering framing: Add an explicit sync state machine with pending/failed payload handling, retry/backoff, offline awareness, and non-sensitive error reporting.
- Scope:
  - Distinguish local-only, syncing, synced, offline, and retry-required states.
  - Preserve the latest local state until a remote acknowledgement succeeds.
  - Add a visible retry action and test failure/recovery transitions.
- Out of scope:
  - Full conflict resolution from TICKET-001.
- Acceptance criteria:
  - A failed write never presents as synced.
  - Users can retry without recreating their ticket.
  - Copy explains the state without exposing Firebase internals.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/firebase/workspace.ts`
  - `tests/workspace.test.ts`
- Validation:
  - Simulate offline and rejected writes, then run the complete QA gate.
- Subagent prompt:
  > Implement TICKET-002. Keep the fantasy UI language paired with literal save-state meaning. Add focused tests for the sync state machine and preserve all local work during failure and retry.

### TICKET-003: Add automated E2E coverage for the complete quest loop

- Priority: P2 Medium
- Type: Test/QA
- Area: Today, Realm Map, Chronicle, Guild Hall, New Quest dialog
- Effort: M
- Confidence: High
- Evidence: Reducer and rule tests pass, and manual responsive QA passed, but no committed browser suite proves create → focus → forge → ship → Chronicle → refresh persistence.
- Plain English: The rules are tested, but an automated test should also click through the same journey a user takes.
- Learning brief (layman terms):
  - What is happening now: Browser behavior is checked manually.
  - Why it matters: A future CSS or component change can break a button while unit tests remain green.
  - What changing it means: Add a browser robot that completes the core workflow on desktop and phone.
  - Concept to learn: End-to-end testing verifies that separate parts work together through the real interface.
- Engineering framing: Add Playwright coverage with deterministic localStorage fixtures, responsive assertions, keyboard dialog behavior, WIP limits, and persistence after reload.
- Scope:
  - Cover the core local-mode workflow and empty/error states.
  - Assert no page-level overflow at 375 px.
  - Verify visible focus and dialog focus return.
- Out of scope:
  - Pixel-perfect screenshot snapshots.
  - Live Google OAuth automation.
- Acceptance criteria:
  - `pnpm test:e2e` passes locally and in CI.
  - The main quest loop and mobile navigation are covered.
- Suggested files:
  - `playwright.config.ts`
  - `tests/e2e/forth-loop.spec.ts`
  - `package.json`
- Validation:
  - Run E2E plus lint, typecheck, unit/rules tests, and build.
- Subagent prompt:
  > Implement TICKET-003 with a minimal Playwright setup. Use local mode, deterministic fixtures, and resilient role-based locators. Preserve the current UI and explain what each journey protects.

### TICKET-004: Make project tabs follow the full keyboard pattern

- Priority: P2 Medium
- Type: A11y/UX
- Area: Realm Map project switcher
- Effort: S
- Confidence: High
- Evidence: The switcher declares `tablist`/`tab` semantics and selection state, but manual DOM inspection found no Arrow Left/Right, Home/End, or roving-tabindex behavior.
- Plain English: Mouse users can switch campaigns easily; keyboard users should get the behavior promised by a tab control.
- Learning brief (layman terms):
  - What is happening now: The controls look and announce themselves as tabs but behave like independent buttons.
  - Why it matters: Screen-reader and keyboard users rely on predictable arrow-key navigation.
  - What changing it means: Add the standard tab keyboard behavior or use simpler button semantics.
  - Concept to learn: ARIA is a behavioral contract, not only a label.
- Engineering framing: Implement the WAI-ARIA Tabs pattern with roving `tabIndex`, keyboard navigation, and correctly associated tabpanels, or remove tab roles if the simpler model is intentional.
- Scope:
  - Add keyboard behavior and focus management.
  - Add E2E/component coverage.
- Out of scope:
  - Full third-party accessibility certification.
- Acceptance criteria:
  - Arrow, Home, and End keys work predictably.
  - Only the active tab is in the normal tab order.
  - Roles and controlled panel relationships are valid.
- Suggested files:
  - `components/forth-app.tsx`
  - `tests/e2e/forth-loop.spec.ts`
- Validation:
  - Keyboard-only and screen-reader smoke test, then the standard QA gate.
- Subagent prompt:
  > Implement TICKET-004 following the ARIA Tabs pattern without changing the Iron & Parchment visual design. Add focused keyboard coverage and document the semantic decisions.

### TICKET-005: Introduce an explicit demo-data onboarding and migration choice

- Priority: P2 Medium
- Type: Product/UX/Data
- Area: First run, reset flow, seeded workspace, existing Firebase workspaces
- Effort: M
- Confidence: High
- Evidence: New engineering seed data applies only to fresh/reset local state. Existing cloud users correctly retain their earlier workspace snapshot, but the app does not explain or offer an intentional keep/replace/start-clean choice.
- Plain English: Existing users should not be surprised that old demo tickets remain, and new users should know which quests are examples.
- Learning brief (layman terms):
  - What is happening now: Safe persistence prevents the redesign from erasing existing cloud data.
  - Why it matters: That safety also means sample content can look like permanent user work.
  - What changing it means: Add a one-time choice to keep existing work, load the engineering demo, or start empty.
  - Concept to learn: A data migration changes stored information deliberately while protecting user-owned records.
- Engineering framing: Add a versioned onboarding/migration state with explicit, idempotent user choice and no destructive automatic overwrite.
- Scope:
  - Label sample data clearly.
  - Offer keep, demo, and empty-workspace paths.
  - Require confirmation before replacing cloud state.
- Out of scope:
  - Automatic deletion of existing Firestore workspaces.
- Acceptance criteria:
  - Existing cloud data is never replaced without confirmation.
  - New users can begin empty or with the engineering demo.
  - The choice does not reappear after completion unless invoked from Guild Hall.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/seed.ts`
  - `lib/types.ts`
  - `lib/workspace.ts`
- Validation:
  - Test fresh local, returning local, returning cloud, cancel, and confirmed replacement paths.
- Subagent prompt:
  > Implement TICKET-005 as a safe, versioned onboarding/migration flow. Do not overwrite cloud data implicitly. Preserve the themed language while making every data consequence literal.

### TICKET-006: Back assignments with authenticated guild membership

- Priority: P1 High
- Type: Feature/Security
- Area: Guild Hall, task editor, Firestore members collection and rules
- Effort: L
- Confidence: High
- Evidence: Tickets now support complete editing and named assignees, but Forth has no invitation flow or authenticated member directory. A typed assignee is useful planning metadata, not proof that the named person can access the workspace.
- Plain English: You can put a teammate's name on a quest now; the next step is inviting that real account into the guild and assigning from a verified member list.
- Engineering framing: Add an invitation and membership lifecycle, query owner-scoped member documents, reference immutable member UIDs from tasks, and preserve display-name snapshots for historical Proof entries.
- Acceptance criteria:
  - Owners can invite, revoke, and view authenticated members.
  - The ticket editor assigns only active workspace members by UID.
  - Removed members cannot access workspace data, while existing Chronicle entries retain readable attribution.
  - Emulator tests cover invitation acceptance, owner controls, revocation, and outsider denial.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/firebase/workspace.ts`
  - `lib/types.ts`
  - `firestore.rules`
  - `tests/firestore.rules.test.ts`
- Validation:
  - Run member lifecycle integration tests, Firestore rule tests, and the complete release gate.
- Subagent prompt:
  > Implement TICKET-006 without weakening the owner-scoped private-beta rules. Store task assignment by member UID plus a display snapshot, add an owner-only invitation flow, and prove revoked users lose access.
