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

### TICKET-007: Show pending guild invitations inside Forth

- Priority: P1 High
- Type: Feature/UX
- Area: Guild Hall, Firebase workspace adapter, authenticated onboarding
- Effort: M
- Confidence: High
- Evidence: The current invite flow writes an email-keyed Firestore invite, but the recipient must receive the guild code out of band and manually enter it. There is no recipient-facing inbox or pending-invitation state.
- Plain English: A teammate who signs in should immediately see that someone invited them instead of needing a separate message and a secret-looking code.
- Learning brief (layman terms):
  - What is happening now: The invitation exists in the database, but only the owner sees confirmation and the recipient sees nothing.
  - Why it matters: The feature feels broken even when the database record was created successfully.
  - What changing it means: After sign-in, Forth checks for invitations addressed to that Google email and presents clear Accept and Decline actions.
  - Concept to learn: A pending state is a piece of data that represents work waiting for a user decision; it should have visible loading, empty, success, and failure states.
- Engineering framing: Add a recipient-scoped invitation query/listener, an explicit invitation DTO, and reducer/UI state for loading, empty, accepted, declined, and failed outcomes. Keep reads limited to invitations whose document key matches the authenticated normalized email.
- Scope:
  - Add `listPendingGuildInvites` and accept/decline operations to the Firebase adapter.
  - Add a Pending invitations panel to Guild Hall and signed-in onboarding.
  - Refresh the guild directory and active workspace after acceptance.
  - Add Firestore rules and emulator coverage for recipient-only reads and owner-controlled invite creation.
- Out of scope:
  - Sending email.
  - Cross-account invitation search or public invite listings.
- Acceptance criteria:
  - A signed-in invited Google account sees the guild name and inviter without entering a code.
  - An uninvited account sees a clear empty state and cannot read another email's invite.
  - Accept joins the workspace exactly once and removes or marks the invite consumed.
  - Decline removes or marks only that recipient's invitation and does not affect the guild.
  - Loading and Firestore errors are visible and retryable.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/firebase/workspace.ts`
  - `firestore.rules`
  - `tests/firestore.rules.test.ts`
- Validation:
  - Test invited, uninvited, already-accepted, declined, signed-out, loading, and failed-query states in the emulator and browser.
- Subagent prompt:
  > Implement TICKET-007 as an in-app pending invitation experience. Preserve the Iron & Parchment Guild Hall design, enforce recipient-scoped Firestore reads, and add focused UI plus rules tests.

### TICKET-008: Add invitation decline, cancellation, and expiry lifecycle

- Priority: P2 Medium
- Type: Feature/Security
- Area: Guild Hall, invitation documents, owner roster controls
- Effort: M
- Confidence: Medium
- Evidence: The current invitation record has no lifecycle beyond creation and acceptance. Owners cannot cancel a typo or stale invite, and recipients cannot remove an unwanted invite.
- Plain English: Invitations need a tidy way to be withdrawn or allowed to expire so an old email never stays actionable forever.
- Learning brief (layman terms):
  - What is happening now: An invitation remains available until it is accepted, with no way to clean up mistakes.
  - Why it matters: Old or mistyped invitations create confusion and leave unnecessary records in the workspace.
  - What changing it means: Add cancel, decline, and expiry behavior with clear statuses and timestamps.
  - Concept to learn: A lifecycle is the set of valid states a record can move through, such as pending, accepted, declined, cancelled, or expired.
- Engineering framing: Model invitation status and `expiresAt` explicitly, make transitions idempotent, and enforce owner-only cancellation plus recipient-only decline in rules. Avoid relying solely on client clocks for authorization.
- Scope:
  - Add invitation status, created/updated timestamps, and expiry policy.
  - Add owner roster controls to cancel pending invites.
  - Add recipient decline action and stale-invite messaging.
  - Preserve audit-safe metadata without storing unnecessary personal data.
- Out of scope:
  - Automated email reminders.
  - Bulk invite management.
- Acceptance criteria:
  - Owners can cancel only their workspace's pending invites.
  - Recipients can decline only invites addressed to their authenticated email.
  - Expired invites cannot be accepted and explain why.
  - Repeating accept, decline, or cancel requests produces no duplicate membership or errors that imply data loss.
- Suggested files:
  - `lib/firebase/workspace.ts`
  - `components/forth-app.tsx`
  - `firestore.rules`
  - `tests/firestore.rules.test.ts`
- Validation:
  - Emulator tests for every transition, expiry boundary, repeated request, outsider, and signed-out case.
- Subagent prompt:
  > Implement TICKET-008 as a small, explicit invitation state machine. Preserve privacy and owner/recipient authorization boundaries, and prove transitions are idempotent with emulator tests.

### TICKET-009: Add optional transactional email delivery for invitations

- Priority: P2 Medium
- Type: Feature/Ops/Security
- Area: Server-side invitation workflow, email provider integration, environment configuration
- Effort: L
- Confidence: High
- Evidence: Forth currently documents that invitation delivery is out-of-band; the app does not send an email notification. The desired experience is for invited teammates to receive a direct join notification.
- Plain English: In-app invitations solve discovery, but an optional email makes sure teammates know they were invited even when they are not currently using Forth.
- Learning brief (layman terms):
  - What is happening now: The app can record an invitation but has no trusted service that sends a message.
  - Why it matters: People may never return to the app to discover a pending invitation.
  - What changing it means: A server-side function sends a short, branded email containing a safe link back to Forth; the in-app invitation remains the source of truth.
  - Concept to learn: Server-side secrets belong in a backend boundary, not in browser code, because anything shipped to the browser can be inspected.
- Engineering framing: Add a Next.js server action/API route or Firebase Cloud Function that validates an owner-authenticated invite request, writes the Firestore invite, and invokes a transactional email provider using server-only credentials. Use an idempotency key and never place provider keys in `NEXT_PUBLIC_*` variables.
- Scope:
  - Select and document one email provider and sender identity.
  - Add server-side invite creation and delivery status.
  - Add environment variables to `.env.example` and deployment setup docs without committing secrets.
  - Keep accept/decline functionality working if delivery fails.
  - Add rate limits, abuse protection, and structured non-sensitive logs.
- Out of scope:
  - Marketing campaigns or bulk newsletters.
  - Treating email delivery as proof of workspace membership.
- Acceptance criteria:
  - A valid owner invite creates exactly one pending invite and at most one email per idempotency key.
  - Provider failures leave the in-app invite usable and show an actionable status to the owner.
  - No private provider credential appears in browser bundles, Git history, or logs.
  - Local development and tests work with a mail stub; production setup is documented.
- Suggested files:
  - `app/api/` or `functions/`
  - `lib/firebase/workspace.ts`
  - `.env.example`
  - `docs/ENVIRONMENT.md`
  - `firestore.rules`
- Validation:
  - Unit-test provider adapter with a stub, inspect the production bundle for secret leakage, run emulator authorization tests, and perform one end-to-end delivery test in a non-production mailbox.
- Subagent prompt:
  > Implement TICKET-009 only after TICKET-007 is complete. Keep Firestore as the invitation source of truth, put email credentials behind a server-only boundary, make delivery idempotent, and preserve the existing fantasy engineering aesthetic in the email copy.
