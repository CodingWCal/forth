# Ticket Backlog

Generated: 2026-07-20
Repo/app: Forth  
Audit scope: Product/design docs, peer review, production desktop/mobile UI, workspace state, Firebase Auth/Firestore persistence, invitation lifecycle branch, security rules, dependencies, tests, build, accessibility heuristics, operations, and contributor readiness.

## Product Intent Snapshot

- Plain English: Forth turns a small engineering team’s real ticket queue into a calm fantasy quest board. It rewards finishing meaningful work without leaderboards, punishment, or streak anxiety.
- Engineering framing: Next.js 16/React 19 with a strict TypeScript reducer domain, localStorage fallback, and an authenticated Firestore workspace document synchronized through a client adapter.
- Brand/design guardrails: Preserve Iron & Parchment: SNES-era medieval guild framing, warm parchment, near-black green, moss, oxblood, amber, square pixel edges, serif display type, restrained sprite motion, and literal engineering meaning beneath themed labels.
- Assumptions: The current target is a small private beta. It is not yet a conflict-safe, multi-team production SaaS.

## Verification Summary

- Audited branch: `agent/invite-lifecycle` at `69fc03d`; production baseline: `main` at `7f64387`.
- Commands run: `pnpm install --frozen-lockfile` → pass; `pnpm lint` → pass; `pnpm typecheck` → pass; `pnpm test` → 16/16 pass; `pnpm build` → pass; `pnpm test:rules` → 16/16 pass; `corepack pnpm audit --prod` → no known vulnerabilities.
- Security checks: no committed Firebase key/private-key patterns; only the safe `.env.example` is tracked; Firebase public browser configuration stays in `NEXT_PUBLIC_*`; authorization is enforced by `firestore.rules` and emulator tests cover owner, member, outsider, and signed-out access.
- Visual/app checks: production Quest Log and Realm Map inspected at desktop and 375×812. No page-level horizontal overflow was observed. The first screen exposes five primary content regions plus a thematic campaign sidebar before account mode is explained; mobile contains several 8–10px labels and 38px action buttons.
- Peer-review findings reproduced in source: `app/page.tsx` renders seeded workspace content before authentication; projects support create only; task assignees remain free-typed strings derived from previous task text rather than authenticated members.
- Environment note: sandboxed typecheck/build initially hit package-read restrictions; both passed when rerun with normal filesystem access. This was an audit-environment limitation, not a repository failure.
- Not run: committed browser E2E (none exists), live two-account OAuth/invitation exercise, automated contrast scan, 200% zoom, screen reader, slow/offline network simulation, production restore drill, or penetration test. Tickets below cover the material gaps.

## Execution Status

| Ticket | Status | Note |
|---|---|---|
| TICKET-001–006 | Planned | Still required for production cohort use; TICKET-006 is partially unblocked by the invitation work. |
| TICKET-007 | Implemented on `main` | Pending invitations exist in code and rules; still needs live two-account E2E verification. |
| TICKET-008 | Implemented on `agent/invite-lifecycle` | Cancel/decline/expiry and rule tests pass; not yet released to production. |
| TICKET-009 | Planned | Optional email delivery must remain downstream of a reliable in-app invitation flow. |
| TICKET-010 | Implemented on `codex/ticket-010-auth-entry` | Automated gates pass; live Google/GitHub two-account smoke testing remains a release requirement. |
| TICKET-019 | Repository policy merged via PRs [#19](https://github.com/CodingWCal/forth/pull/19) and [#20](https://github.com/CodingWCal/forth/pull/20) | Human/agent contribution contract, ownership, templates, security reporting, decision log, and backlog-ownership policy are on `main`; hosted branch-protection settings and a fresh-contributor dry run still require maintainer verification. |
| TICKET-022 | Ready PR [#21](https://github.com/CodingWCal/forth/pull/21) | Roger's original PR #18 commit and authorship are preserved. The guide distinguishes authenticated cloud data from disposable demo data, pairs core fantasy terms with literal PM language, passes automated gates, and passed the maintainer's live authenticated preview smoke test. The centralized terminology map and plain-language preference remain planned. |
| TICKET-029 | Planned | Add an optional, accessible two-minute coach-mark tour after PR #21 lands; keep it separate so the verified static guide remains a reliable fallback. |
| TICKET-030 | Planned quick fix | Keep the daily energy meter and note inside the provisions card at every supported viewport; screenshot evidence shows the grid item crossing beneath the campaign rail. |
| TICKET-031 | Planned quick feature | After authentication, eligible Cursor Boston fellows can join the designated cohort guild from one explicit button without copying a guild code; authorization must be enforced beyond the client UI. |
| TICKET-032 | Planned security patch | GitHub advisory GHSA-f88m-g3jw-g9cj, published 2026-07-21, flags transitive `sharp@0.34.5`; update to a compatible patched path and rerun image/build/deploy QA before the next production promotion. |

## External Contribution Intake

| Contribution | Status | Primary backlog mapping | Related quality gates | Recommendation |
|---|---|---|---|---|
| [PR #18 - Add a first-visit welcome guide modal](https://github.com/CodingWCal/forth/pull/18) | Closed as superseded by draft PR [#21](https://github.com/CodingWCal/forth/pull/21) | TICKET-022 | TICKET-005, TICKET-010, TICKET-019 | Roger's original commit and authorship are preserved in #21. The reconciled implementation waits for the authenticated Firestore snapshot, distinguishes cloud from demo mode, uses account-aware safe browser storage, adds literal PM translations, and passes open/dismiss/reopen plus 320/375/768/1440px browser checks. Review and merge only through #21 after its manual cloud smoke test. |
| [PR #13 — Surface due-soon & overdue quests on Today](https://github.com/CodingWCal/forth/pull/13) | Closed as superseded by merged PR [#16](https://github.com/CodingWCal/forth/pull/16), which preserves Roger's original commit/authorship and includes the integration QA fixes | TICKET-013 | TICKET-014, TICKET-015, TICKET-019, TICKET-022, TICKET-025 | Continue any future task-first hierarchy refinements under TICKET-013 rather than reopening or duplicating the original contribution. |

PR #13's calm, no-shame due-date philosophy is now represented on `main` through PR #16: shipped work is excluded, overdue work is signaled without streak punishment, and urgency is derived in the domain layer. TICKET-013 still owns the broader information-hierarchy refinement so future work does not stack competing Today modules.

PR #18's themed walkthrough and contextual-help entry point have been reconciled onto current authenticated `main` without asking the contributor to redo the rebase. The original authored commit remains visible in history; maintainer follow-up limits the tour to verified cloud data or explicit demo data and adds accessibility/responsive regression coverage.

## Recommended Delivery Order

1. **Identity and data safety:** TICKET-032, TICKET-010, TICKET-001, TICKET-024, TICKET-011, TICKET-002, then the scoped cohort-entry path in TICKET-031.
2. **Complete the PM contract:** TICKET-028, TICKET-012, TICKET-006, TICKET-005, then discovery epic TICKET-025.
3. **Make daily use obvious and inclusive:** TICKET-030, TICKET-013, TICKET-014, TICKET-022, TICKET-029, TICKET-027, TICKET-004, TICKET-026.
4. **Prove and operate it:** TICKET-003/TICKET-015, TICKET-016, TICKET-017, TICKET-018, TICKET-020, TICKET-021.
5. **Expand engagement safely:** TICKET-023, then TICKET-009 and later notification work.

Active inventory after this audit: **4 P0**, **18 P1**, and **8 P2** tickets, plus **2 implemented invitation tickets awaiting final live/release verification**.

## Priority Guide

- P0 Critical: security, data loss, app-breaking, or launch-blocking.
- P1 High: major UX/correctness gaps or important release quality issues.
- P2 Medium: meaningful improvements, refactors, test gaps, performance work.
- P3 Low: polish, nice-to-have enhancements, cleanup.

## Tickets

### TICKET-001: Prevent last-write-wins data loss during concurrent cloud edits

- Priority: P0 Critical
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

- Priority: P1 High
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
- Evidence: Invitation acceptance now creates authenticated member documents, but `Task.assignee` remains a free-typed string and its datalist is derived from names previously typed into tasks. Nothing ties an assignment to an active member UID.
- Plain English: Real guildmates can join now, but assigning “Maya” still means typing a word, not assigning Maya's authenticated account.
- Learning brief (layman terms):
  - What is happening now: Membership and ticket assignment are two disconnected systems.
  - Why it matters: Misspellings, duplicate names, departed members, and notifications cannot be handled reliably.
  - What changing it means: Select active members by stable account identity while preserving readable names on historical work.
  - Concept to learn: A stable identifier distinguishes the person reliably even when their display name changes.
- Engineering framing: Query authorized workspace member documents, store immutable assignee UID plus a display-name/avatar snapshot, and define unassigned/removed-member behavior without weakening Firestore rules.
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
  > Implement TICKET-006 without weakening the owner-scoped rules. Store task assignment by member UID plus display/avatar snapshots, source choices from active membership, and preserve readable attribution after removal.

### TICKET-007: Show pending guild invitations inside Forth

- Status: Implemented on `main`; live two-account E2E verification remains.
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

- Status: Implemented on `agent/invite-lifecycle`; pending release and live verification.
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

- Priority: P1 High
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
  - Deliver a branded inbox notification with inviter, guild name, expiry, and a safe link into the authenticated pending-invitation screen.
  - Support resend with cooldown, cancellation, expiry, bounce/failure status, and duplicate suppression.
  - Add environment variables to `.env.example` and deployment setup docs without committing secrets.
  - Keep accept/decline functionality working if delivery fails.
  - Add rate limits, abuse protection, and structured non-sensitive logs.
- Out of scope:
  - Marketing campaigns or bulk newsletters.
  - Treating email delivery as proof of workspace membership.
- Acceptance criteria:
  - A valid owner invite creates exactly one pending invite and at most one email per idempotency key.
  - The invited address receives an inbox notification, and the link returns to Forth without granting access by possession of the URL alone.
  - Accept, decline, cancel, resend, expired, bounced, and already-member paths have deterministic UI and tests.
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

### TICKET-010: Add an authenticated landing page with explicit demo entry

- Status: Implemented on `codex/ticket-010-auth-entry`; pending draft-PR review and live OAuth/provider verification.

- Priority: P0 Critical
- Type: Product/Security/UX
- Area: Root route, authentication, first-run routing
- Effort: L
- Confidence: High
- Evidence: `app/page.tsx` immediately renders `ForthApp` with `createSeedWorkspace`; Google sign-in is available only inside Guild Hall. Production shows a “Cloud rune active” badge even when the visitor is not authenticated, making local seed data look like a real shared workspace.
- Plain English: A real cohort member should know whether they are entering their account, exploring a disposable demo, or using saved team data before any tickets appear.
- Learning brief (layman terms):
  - What is happening now: Everyone enters the full sample workspace first and must find sign-in later.
  - Why it matters: People can mistake sample work for team work or unknowingly create tickets that only exist in one browser.
  - What changing it means: Open on a professional welcome page with Google and GitHub sign-in, plus a clearly labeled “Explore demo” choice.
  - Concept to learn: An authentication boundary decides which screens and data are available before a person proves their identity.
- Engineering framing: Introduce explicit unauthenticated, authenticating, authenticated, demo, and auth-error route states. Add Firebase GitHub OAuth alongside Google and document account-linking behavior for matching emails.
- Scope:
  - Build a concise branded landing page that states Forth’s practical value before fantasy flavor.
  - Add Google and GitHub authentication, loading, popup-blocked, cancelled, unauthorized-domain, and retry states.
  - Require an explicit action to enter demo mode; never hydrate demo state into a new cloud workspace without confirmation.
  - Start every newly authenticated account with an empty/onboarding-created real workspace; never present seeded example tickets as the user's work.
  - Keep example campaigns and tickets behind an explicitly labeled, browser-local demo or an intentional onboarding choice, with a separate persistence namespace from authenticated data.
  - Redirect authenticated users into their last active guild or onboarding.
- Out of scope:
  - Password authentication, SSO, billing, or public workspace discovery.
- Acceptance criteria:
  - No workspace ticket data renders before auth resolution or explicit demo selection.
  - The page identifies demo data as disposable/local before entry.
  - A new authenticated user sees onboarding for a clean first campaign with zero pre-completed or fake tickets.
  - Seeded examples load only after an explicit demo/example-data choice, remain identifiable as samples, and can never silently sync into Firestore.
  - Google and GitHub users can sign in, sign out, and recover from cancelled/blocked popup flows.
  - Provider collisions give a safe account-linking explanation without exposing whether another email is registered.
  - Auth mode is keyboard accessible, responsive, and understandable without fantasy vocabulary.
- Suggested files:
  - `app/page.tsx`
  - `components/forth-app.tsx`
  - `lib/firebase/workspace.ts`
  - `app/globals.css`
  - `docs/PHASE2.md`
- Validation:
  - Component/E2E coverage for signed-out, loading, Google, GitHub, demo, popup failure, unauthorized preview domain, returning user, and sign-out flows.
- Subagent prompt:
  > Implement TICKET-010 as Forth’s production entry boundary. Preserve Iron & Parchment, lead with literal product value, support Google and GitHub Firebase Auth, and keep demo data fully separate from authenticated workspaces.

### TICKET-011: Complete membership removal and least-privilege workspace access

- Priority: P0 Critical
- Type: Security/Feature
- Area: Guild roster, Firestore members, authorization rules
- Effort: L
- Confidence: High
- Evidence: Firestore distinguishes owner/member and protects outsider access, but the UI has no complete member roster, member-removal flow, ownership handoff policy, or proof that revoked sessions immediately lose data access.
- Plain English: Before a cohort relies on Forth, a guild owner must be able to remove someone who leaves the team and know that access is truly gone.
- Learning brief (layman terms):
  - What is happening now: Joining is supported, but leaving and removing access are incomplete.
  - Why it matters: Former teammates could retain access longer than intended, and owners cannot manage the real roster confidently.
  - What changing it means: Add a visible roster, safe remove/leave controls, and authorization tests proving access disappears.
  - Concept to learn: Least privilege means each person receives only the access needed for their current role and loses it when that role ends.
- Engineering framing: Model membership lifecycle and immutable member identity, enforce owner/member transition rules in Firestore, terminate listeners on revocation, and define last-owner and ownership-transfer invariants.
- Scope:
  - List authenticated members with role, display name, email, and join time.
  - Add owner-only removal and member self-leave with explicit confirmations.
  - Define whether ownership can transfer; prevent deleting the final owner accidentally.
  - Clear inaccessible cached cloud state after revocation without deleting unrelated local demo data.
- Out of scope:
  - Enterprise SCIM or organization-wide directory sync.
- Acceptance criteria:
  - Removed members fail subsequent reads and writes in emulator and live-session tests.
  - A member can leave without modifying other members.
  - Outsiders cannot enumerate rosters.
  - The last owner cannot orphan the workspace.
  - UI distinguishes pending invites from active members.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/firebase/workspace.ts`
  - `firestore.rules`
  - `tests/firestore.rules.test.ts`
- Validation:
  - Emulator tests for removal, self-leave, last-owner, outsider enumeration, stale listener, and repeated operations; two-browser live test.
- Subagent prompt:
  > Implement TICKET-011 as a secure membership lifecycle. Treat Firestore rules as the authority, prevent orphaned guilds, terminate revoked access, and add owner/member/outsider emulator coverage.

### TICKET-012: Add full project edit, archive, restore, and safe deletion

- Priority: P1 High
- Type: Feature/Correctness
- Area: Project domain, Realm Map, campaign controls
- Effort: M
- Confidence: High
- Evidence: `WorkspaceAction` and `workspaceReducer` implement only `ADD_PROJECT`; there are no update, archive, restore, or delete project transitions. The peer review correctly identified project CRUD as one-third complete.
- Plain English: Teams can create campaigns but cannot correct a name, close an old campaign, or safely remove one.
- Learning brief (layman terms):
  - What is happening now: Projects only move in one direction—creation.
  - Why it matters: The navigation becomes cluttered and mistakes become permanent.
  - What changing it means: Owners can edit campaign details, archive finished work, restore it, and delete only when consequences are explicit.
  - Concept to learn: A lifecycle models the valid stages of a record instead of treating deletion as the only way to stop showing it.
- Engineering framing: Add reducer actions and runtime validation for project metadata and archive state; define referential integrity for tasks before destructive deletion.
- Scope:
  - Edit title, code, outcome, target date, and color.
  - Archive/restore projects while preserving tasks and Chronicle attribution.
  - Offer delete only for empty projects, or require an explicit task migration strategy.
  - Prevent archiving the only active project without a clear destination.
- Out of scope:
  - Cross-workspace project moves or templates marketplace.
- Acceptance criteria:
  - Reducer tests cover edit, archive, restore, invalid IDs, and deletion constraints.
  - Archived projects leave the default navigation but remain discoverable.
  - No task becomes orphaned and historical Proof stays readable.
  - Project operations persist locally and in cloud sync.
- Suggested files:
  - `lib/types.ts`
  - `lib/workspace.ts`
  - `components/forth-app.tsx`
  - `tests/workspace.test.ts`
- Validation:
  - Unit tests plus browser flows for projects with zero, active, paused, and shipped tasks; reload and second-device persistence.
- Subagent prompt:
  > Implement TICKET-012 using explicit reducer transitions and referential-integrity rules. Preserve task and Chronicle history, and make every destructive consequence understandable before confirmation.

### TICKET-013: Rebuild the default Quest Log around fast daily triage

- Priority: P1 High
- Type: UX/Information Architecture
- Area: Quest Log, desktop sidebar, mobile first screen
- Effort: L
- Confidence: High
- Evidence: Production’s first screen includes rank/gold, provisions, focused quests, seven-day expedition, campaign charter, tavern dispatch, and guild oath. The peer review and browser audit both found the functional task path obscured by thematic chrome. Roger's open PR #13 contributes pure due-date selectors, five focused test cases, and a “Nearing the moon” Today panel; the behavior is valuable, but another full panel must be reconciled with this task-first hierarchy rather than simply stacked above existing modules.
- Plain English: Keep the magic, but put “What am I doing today?” and “Add a ticket” ahead of decorative story modules.
- Learning brief (layman terms):
  - What is happening now: Many equally prominent panels compete for attention.
  - Why it matters: Newer and older users can lose the main task workflow before they learn the theme.
  - What changing it means: Show today’s tasks, status, assignee, and add/search controls first; move motivation modules into a collapsible secondary area.
  - Concept to learn: Progressive disclosure shows essential choices first and reveals detail when a person asks for it.
- Engineering framing: Establish a task-first visual hierarchy, reduce above-the-fold competing regions, persist optional panel disclosure, and retain literal semantics alongside themed labels.
- Scope:
  - Make Today’s quests and a prominent Add ticket action the primary region.
  - Integrate overdue, due-today, and due-soon work into that primary task region or one compact disclosure; do not create another equally prominent dashboard module.
  - Reuse or adapt PR #13's storage-agnostic timing selectors and calm rule that completed work is never nagged.
  - Document the default due-soon window and let future notification settings consume the same domain policy instead of duplicating urgency logic.
  - Collapse rank/history/dispatch/oath into one optional “Guild progress” drawer or secondary route.
  - Show current workspace and save mode near the page title.
  - Add a first-use pointer to Realm Map without a blocking product tour.
- Out of scope:
  - Removing the fantasy system, XP/proof model, or Chronicle.
- Acceptance criteria:
  - A first-time tester can locate add, edit, move, and find-ticket actions within five seconds.
  - Active dated tickets clearly expose overdue, due-today, and due-soon timing in urgency order without relying on color or shame-based language; completed tickets never appear as overdue.
  - At 375px, the first focused ticket begins within the initial viewport or one short scroll.
  - Theme modules remain available but never interrupt ticket operations.
  - Usability testing with at least three cohort members, including one less-technical/older participant, records task completion time and confusion points.
- Suggested files:
  - `components/forth-app.tsx`
  - `app/globals.css`
  - `docs/DESIGN.md`
- Validation:
  - Preserve PR #13's calendar-day, custom-window, filtering, ordering, and tie-break unit cases; add DST/time-zone boundary cases plus desktop/mobile browser coverage, keyboard navigation, 200% zoom, and a moderated five-task usability script.
- Subagent prompt:
  > Implement TICKET-013 as a task-first Quest Log redesign. Preserve the fantasy identity through materials, typography, and optional progress modules while making core PM actions unmistakable.

### TICKET-014: Establish an accessibility baseline across disability needs

- Priority: P1 High
- Type: A11y/UI
- Area: Global design tokens, controls, dialogs, navigation
- Effort: L
- Confidence: High
- Evidence: `app/globals.css` uses many 6–11px labels; browser inspection found visible task buttons at 38px tall. The theme relies heavily on uppercase monospace microcopy and fantasy-only context, which can reduce readability for older and low-vision users. PR #13 proposes oxblood, clay, and amber urgency states with text badges; integration must prove contrast and preserve equivalent non-color meaning.
- Plain English: The interface should remain beautiful and independent to use for people with visual, hearing, motor, cognitive, speech, neurological, or age-related access needs.
- Learning brief (layman terms):
  - What is happening now: Important supporting text is physically small and some buttons are below a comfortable touch target.
  - Why it matters: People may misread status, miss actions, or tap the wrong control even when they understand the workflow.
  - What changing it means: Raise readable type sizes, strengthen contrast, enlarge targets, and test with keyboard, zoom, and screen readers.
  - Concept to learn: Accessibility is designing the same task so people with different vision, movement, hearing, or cognition can complete it independently.
- Engineering framing: Define WCAG 2.2 AA-oriented typography, contrast, focus, target-size, reflow, semantics, and reduced-motion acceptance gates; integrate automated and manual checks.
- Scope:
  - Raise functional text to a documented readable minimum; reserve pixel microtype for nonessential decoration.
  - Make interactive targets at least 44×44px where practical.
  - Audit contrast, focus order, dialog focus return, tabs, status announcements, and 200%/400% reflow.
  - Provide text equivalents for visual status, avoid color-only meaning, respect reduced motion, support switch/voice-friendly names, and keep instructions simple and consistent.
  - Ensure due-date urgency is announced in text and assistive technology, with color used only as reinforcement.
  - Ensure sword cursor never replaces text or resize cursors and offer a standard-cursor preference.
- Out of scope:
  - Formal third-party certification in the first pass.
- Acceptance criteria:
  - Core flows meet WCAG 2.2 AA contrast and keyboard expectations.
  - No essential label renders below the documented minimum.
  - Pages remain usable at 200% zoom and 320 CSS px without two-dimensional scrolling.
  - Screen-reader smoke tests announce page, workspace mode, dialog names, ticket status, and errors correctly.
  - Due-today, due-soon, and overdue rows remain distinguishable in grayscale, forced-colors mode, and by screen reader.
- Suggested files:
  - `app/globals.css`
  - `components/forth-app.tsx`
  - `app/layout.tsx`
  - `docs/DESIGN.md`
- Validation:
  - axe/Lighthouse scan plus manual NVDA, keyboard-only, zoom/reflow, reduced motion, high contrast, and touch-target checks.
- Subagent prompt:
  > Implement TICKET-014 as a documented accessibility baseline. Preserve Iron & Parchment but prioritize readable typography, 44px controls, focus visibility, semantic announcements, and zoom/reflow resilience.

### TICKET-015: Add pull-request quality gates and deterministic browser tests

- Priority: P1 High
- Type: Test/CI/DevEx
- Area: GitHub Actions, Playwright, Firebase emulator
- Effort: M
- Confidence: High
- Evidence: Lint, typecheck, unit, rules, build, and audit pass locally, but there is no committed `.github` quality workflow or browser E2E suite. README describes release QA that is currently manual. PR #13 adds five useful domain test cases and reports a green local gate, yet its Vercel preview is blocked pending team authorization and no automated browser result is attached.
- Plain English: Contributors should learn within minutes—not after deployment—if a change broke sign-in, tickets, accessibility, or security rules.
- Learning brief (layman terms):
  - What is happening now: Tests exist, but someone must remember to run them by hand.
  - Why it matters: A rushed or outside contribution can bypass a critical check.
  - What changing it means: Every pull request automatically runs the same release gate and blocks merging when it fails.
  - Concept to learn: Continuous integration is an automated referee that checks every proposed change in a clean environment.
- Engineering framing: Add pinned GitHub Actions for install, lint, strict types, unit tests, Firestore emulator tests, production build, dependency review, and Playwright critical paths with cached toolchains and least-privilege permissions.
- Scope:
  - Implement the existing TICKET-003 Playwright journeys and CI command.
  - Run safe fork/external-contributor checks without exposing production or preview credentials; give maintainers a documented path to authorize an optional Vercel preview.
  - Add branch-required checks and artifact upload only on failure.
  - Use deterministic local/demo fixtures; keep live OAuth as a separate smoke test.
- Out of scope:
  - Visual snapshot approval for every CSS pixel or production-secret exposure in CI.
- Acceptance criteria:
  - A fresh pull request runs all release gates without local machine state.
  - Failing rules, types, unit, build, or critical E2E blocks merge.
  - CI uses read-only/default-deny token permissions and no production Firebase credentials.
  - External PRs receive deterministic unit/build/browser feedback even when Vercel preview authorization is withheld.
  - Maintainers can reproduce each check locally with documented commands.
- Suggested files:
  - `.github/workflows/quality.yml`
  - `playwright.config.ts`
  - `tests/e2e/`
  - `package.json`
  - `CONTRIBUTING.md`
- Validation:
  - Open a test PR, observe all checks, intentionally break one fixture on a temporary branch, then restore it and verify green status.
- Subagent prompt:
  > Implement TICKET-015 with least-privilege GitHub Actions and deterministic Playwright coverage. Do not use production secrets; make each CI failure locally reproducible and documented.

### TICKET-016: Add recoverable backups, export, import, and restore drills

- Priority: P1 High
- Type: Reliability/Data/Ops
- Area: Workspace persistence, data lifecycle, production recovery
- Effort: L
- Confidence: High
- Evidence: The whole workspace is stored in one Firestore snapshot with a local fallback; there is no user export, version history, backup policy, restore console, or tested disaster-recovery procedure.
- Plain English: Real users need a way to recover if a workspace is overwritten, corrupted, or deleted accidentally.
- Learning brief (layman terms):
  - What is happening now: The latest saved copy is effectively the only cloud copy.
  - Why it matters: A bad sync or accidental reset could erase work the cohort depends on.
  - What changing it means: Keep recoverable versions, let owners export data, and regularly prove a restore actually works.
  - Concept to learn: A backup is only trustworthy after a restore test proves it can recreate usable data.
- Engineering framing: Define versioned schema/export format, retention policy, scheduled backups or append-only revisions, owner-authorized import, integrity validation, and a documented restore runbook.
- Scope:
  - Add JSON export with schema version and human-readable metadata.
  - Validate imports before previewing changes; require confirmation before applying.
  - Create periodic cloud recovery points and a non-production restore drill.
  - Document retention, ownership, and deletion behavior.
- Out of scope:
  - Legal e-discovery, enterprise retention, or arbitrary database administration from the client.
- Acceptance criteria:
  - Owners can export and re-import a workspace without losing projects, tasks, membership references, or Chronicle data.
  - Corrupt or incompatible imports fail safely before writes.
  - A documented restore drill recovers a representative workspace into a test project.
  - Destructive reset offers a recent recovery point when available.
- Suggested files:
  - `lib/workspace.ts`
  - `lib/firebase/workspace.ts`
  - `components/forth-app.tsx`
  - `docs/OPERATIONS.md`
- Validation:
  - Round-trip fixture tests, corrupt/old-schema tests, authorization tests, and a timed restore drill with recorded result.
- Subagent prompt:
  > Implement TICKET-016 with versioned export/import and a tested recovery path. Validate before writing, keep destructive operations explicit, and document how a maintainer proves backups are restorable.

### TICKET-017: Add an immutable workspace activity ledger

- Priority: P1 High
- Type: Feature/Security/Operations
- Area: Task/project mutations, membership changes, Chronicle
- Effort: L
- Confidence: High
- Evidence: Forth records completed tasks but does not attribute all edits, project changes, invitations, membership removals, or destructive actions to immutable authenticated identities.
- Plain English: When several fellows share a workspace, they need to know who changed what and be able to recover context without blame or guesswork.
- Learning brief (layman terms):
  - What is happening now: The board shows current state, not the path that produced it.
  - Why it matters: Accidental edits and security questions are difficult to investigate.
  - What changing it means: Record important actions with actor, time, action, and safe before/after context.
  - Concept to learn: An audit log is an append-only history designed for accountability and troubleshooting, not a leaderboard.
- Engineering framing: Emit server-authoritative domain events with actor UID/display snapshot, workspace ID, entity ID, action type, timestamp, and bounded metadata; deny client update/delete of historical events.
- Scope:
  - Log project/task lifecycle, membership, invite, import, reset, and administrative actions.
  - Add owner-visible activity view with filters and human language.
  - Apply privacy and retention limits; do not log ticket secrets unnecessarily.
- Out of scope:
  - Employee surveillance, productivity scoring, or public activity rankings.
- Acceptance criteria:
  - Critical mutations generate immutable events with authenticated actor and server time.
  - Members cannot alter or erase history through the client.
  - Activity copy describes actions neutrally and links to surviving entities.
  - Retention and sensitive-field exclusions are documented.
- Suggested files:
  - `lib/types.ts`
  - `lib/firebase/workspace.ts`
  - `firestore.rules`
  - `components/forth-app.tsx`
- Validation:
  - Rules/integration tests for event creation and immutability; browser verification for filters, deleted entities, and neutral copy.
- Subagent prompt:
  > Implement TICKET-017 as an immutable, privacy-aware activity ledger. Attribute critical mutations by UID and server time without adding public scores, surveillance language, or editable history.

### TICKET-018: Add production monitoring, error reporting, and incident runbooks

- Priority: P2 Medium
- Type: Ops/Reliability/Privacy
- Area: Client errors, Firebase operations, Vercel deployment
- Effort: M
- Confidence: High
- Evidence: Sync errors become a generic UI state and there is no operational error monitoring, release health dashboard, alert ownership, or incident/rollback documentation.
- Plain English: If Forth breaks for the cohort, maintainers should learn about it quickly and know exactly how to respond.
- Learning brief (layman terms):
  - What is happening now: Users may be the first monitoring system and must report failures manually.
  - Why it matters: Data or authentication failures can continue unnoticed.
  - What changing it means: Capture privacy-safe errors, define alerts, and write short response/rollback procedures.
  - Concept to learn: Observability means collecting enough signals to understand a system’s health without reproducing every user’s exact session.
- Engineering framing: Add sanitized client exception reporting, structured sync/auth events, release identifiers, uptime checks, alert thresholds, ownership, and rollback/incident runbooks.
- Scope:
  - Select a privacy-appropriate error provider or Vercel-native telemetry.
  - Redact emails, ticket text, tokens, and Firebase credentials.
  - Monitor availability, auth failures, sync failure rate, and release regressions.
  - Document incident severity, response, rollback, and user communication.
- Out of scope:
  - Behavioral surveillance, session replay containing workspace content, or productivity analytics.
- Acceptance criteria:
  - A synthetic test error appears with release/environment and no sensitive payload.
  - A failed production health check alerts a named maintainer channel.
  - Runbooks cover auth outage, Firestore denial spike, bad deployment, and data-recovery escalation.
  - Monitoring can be disabled or sampled with documented privacy controls.
- Suggested files:
  - `app/`
  - `lib/firebase/`
  - `next.config.ts`
  - `docs/OPERATIONS.md`
- Validation:
  - Staging error injection, PII inspection, alert delivery test, and rollback tabletop exercise.
- Subagent prompt:
  > Implement TICKET-018 with privacy-safe production signals and concise incident runbooks. Never transmit ticket content or credentials; prove alerting and rollback using staging tests.

### TICKET-019: Publish a safe fellow-contributor workflow and ownership policy

- Priority: P1 High
- Type: Docs/Governance/DevEx
- Area: Repository collaboration, reviews, communication, releases
- Effort: M
- Confidence: High
- Implementation status: Repository policy merged through PRs #19 and #20; hosted branch-protection enforcement and a fresh-contributor dry run remain before completion.
- Evidence: Other cohort fellows may contribute soon, but the Forth repository has no dedicated `CONTRIBUTING.md`, `CODEOWNERS`, issue/PR templates, decision log, branch naming policy, or documented communication path. PR #13 is the first organizer contribution and its Vercel bot check is blocked because the external author is not authorized on the maintainer's Vercel team, demonstrating that preview ownership and credential boundaries are undocumented.
- Plain English: Contributors should know what to work on, how to avoid colliding with your roadmap, and how to ask before changing security, data, or design foundations.
- Learning brief (layman terms):
  - What is happening now: The repository explains the product but not the social contract for changing it.
  - Why it matters: Two people can duplicate work, overwrite direction, or merge a risky change without realizing it.
  - What changing it means: Publish contribution rules, ownership boundaries, issue claiming, review expectations, and release gates.
  - Concept to learn: Repository governance turns collaboration expectations into a repeatable system rather than relying on private memory.
- Engineering framing: Add contributor onboarding, CODEOWNERS review boundaries, issue templates, PR checklist, conventional branch/commit policy, ADR/decision log, protected-main requirements, and security reporting guidance.
- Scope:
  - State that the maintainer roadmap/backlog is sequenced before unsolicited feature expansion.
  - Require contributors to claim/link a ticket before implementation and communicate scope changes.
  - Define protected areas: `firestore.rules`, auth/persistence, domain types, deployment, and design tokens.
  - Require tests, screenshots for UI, plain/technical rationale, migration notes, and user action items.
  - Document external-contributor preview behavior: automatic secret-free CI for every PR, maintainer-controlled Vercel authorization when a preview is necessary, and no requirement to add fellows to the production Vercel/Firebase team.
  - Document how maintainers evaluate a valuable contribution that overlaps an existing roadmap ticket, including how its commits/tests can be adopted without duplicating backlog scope.
  - Add a welcoming communication path and response expectations.
- Out of scope:
  - Giving outside contributors production Firebase/Vercel credentials or bypassing review for “small” changes.
- Acceptance criteria:
  - A new fellow can set up locally, claim a ticket, open a compliant PR, and identify the correct reviewer using repository docs alone.
  - Changes to protected paths automatically request maintainer review.
  - PR template includes QA, security/privacy, accessibility, screenshots, migration, rollback, and documentation checks.
  - A fork/external PR receives useful checks without production secrets, and the contributor sees a clear message explaining who can authorize a Vercel preview and when.
  - Main requires passing CI and review before merge; direct pushes are disabled.
- Suggested files:
  - `CONTRIBUTING.md`
  - `.github/CODEOWNERS`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/ISSUE_TEMPLATE/`
  - `docs/DECISIONS.md`
  - `SECURITY.md`
  - `README.md`
- Validation:
  - Dry-run onboarding with another fellow from a fresh clone and a documentation-only test PR.
- Subagent prompt:
  > Implement TICKET-019 as a welcoming but explicit contributor contract. Protect auth, rules, data, deployment, and design decisions; require ticket claiming, CI, review, and clear maintainer communication before merge.

### TICKET-020: Harden browser and Firebase abuse defenses

- Priority: P2 Medium
- Type: Security/Ops
- Area: Next.js headers, Firebase client access, invite abuse
- Effort: M
- Confidence: Medium
- Evidence: `next.config.ts` disables the framework signature but defines no explicit CSP or security headers. Firebase App Check is not documented, and invitation operations have no server-side rate limit or abuse telemetry.
- Plain English: Firestore rules protect who may access data, but production also needs guardrails against malicious scripts, automated abuse, and unsafe browser behavior.
- Learning brief (layman terms):
  - What is happening now: The main authorization lock exists, but several outer doors and alarms are still missing.
  - Why it matters: Attackers may abuse allowed operations, embed the app unexpectedly, or exploit a future script injection more easily.
  - What changing it means: Add browser security policies, App Check, rate limits where needed, and tests that prevent accidental weakening.
  - Concept to learn: Defense in depth uses multiple independent protections so one mistake does not become a full compromise.
- Engineering framing: Deploy report-only then enforced CSP compatible with Firebase Auth, HSTS, frame/referrer/content-type policies, Firebase App Check, rate-limited privileged operations, and automated rule/header verification.
- Scope:
  - Inventory required Firebase/Google/Vercel origins before writing CSP.
  - Add headers progressively with monitoring to avoid breaking auth popups.
  - Enable App Check with documented local/preview strategy.
  - Move abuse-prone operations server-side if client/rules cannot enforce rate limits.
- Out of scope:
  - Claiming App Check replaces authentication or authorization.
- Acceptance criteria:
  - Security headers score appropriately without breaking Google/GitHub auth or Firebase calls.
  - App Check rejects untrusted production requests while emulator/local development remains documented.
  - Invite spam is bounded and observable.
  - Rules/header regressions are covered in CI.
- Suggested files:
  - `next.config.ts`
  - `lib/firebase/config.ts`
  - `lib/firebase/workspace.ts`
  - `firestore.rules`
  - `docs/SECURITY.md`
- Validation:
  - CSP report review, auth smoke tests, App Check staging test, rate-limit tests, and external header scan.
- Subagent prompt:
  > Implement TICKET-020 incrementally. Preserve Firebase authentication, start CSP in report-only mode, add App Check and rate limits without weakening Firestore rules, and document preview/local behavior.

### TICKET-021: Split the application shell into maintainable feature modules

- Priority: P2 Medium
- Type: Refactor/Performance/Maintainability
- Area: `components/forth-app.tsx`, global CSS, feature boundaries
- Effort: L
- Confidence: High
- Evidence: `components/forth-app.tsx` is roughly 1,700 source lines and owns auth, sync, invitations, navigation, four screens, dialogs, drag/drop, and presentation state. `app/globals.css` contains thousands of lines and duplicated breakpoint-era declarations.
- Plain English: The app works, but too much lives in two files, making future fellow contributions more likely to conflict or accidentally break unrelated behavior.
- Learning brief (layman terms):
  - What is happening now: Many independent features share the same large file and styling sheet.
  - Why it matters: Small changes are harder to review, test, and merge safely when everyone edits the same place.
  - What changing it means: Separate screens, dialogs, adapters, and style modules around clear ownership boundaries without changing behavior.
  - Concept to learn: Cohesion means code that changes for the same reason lives together; boundaries reduce accidental coupling.
- Engineering framing: Extract feature modules and testable hooks/state machines after E2E coverage exists; preserve reducer domain rules and avoid premature generic component frameworks.
- Scope:
  - Separate app shell, Quest Log, Realm Map, Chronicle, Guild Hall, dialogs, auth/sync hook, and invitation hook.
  - Consolidate tokens/base styles and colocate feature-specific CSS where practical.
  - Measure client bundle and render behavior before/after.
- Out of scope:
  - Visual redesign, state-library replacement, or sweeping dependency adoption.
- Acceptance criteria:
  - No feature module becomes a new catch-all.
  - Critical behavior and accessibility remain unchanged under E2E tests.
  - Contributors can edit one feature without routinely touching the monolithic shell.
  - Bundle size and render count do not regress beyond documented budget.
- Suggested files:
  - `components/forth-app.tsx`
  - `components/features/`
  - `app/globals.css`
  - `lib/firebase/`
- Validation:
  - Full QA gate, bundle comparison, render profiling, visual regression, and diff review proving behavior-preserving extraction.
- Subagent prompt:
  > Implement TICKET-021 only after browser coverage exists. Extract cohesive Forth feature modules with minimal behavioral diffs, preserve reducer ownership, and report bundle/render measurements.

### TICKET-022: Pair every fantasy label with literal PM language and help

- Priority: P2 Medium
- Type: UX/Content/A11y
- Area: Navigation, status labels, onboarding, contextual help
- Effort: M
- Confidence: High
- Implementation status: First-visit/contextual-help slice integrated on `codex/integrate-pr18-onboarding`; centralized terminology mapping and the persistent plain-language preference remain planned.
- Evidence: Labels such as Quest Log, Realm Map, Chronicle, Guild Hall, provisions, expedition, forge, and camp are memorable but require translation. The peer review found the theme undercut the claim that status labels remain literal. PR #13's “Nearing the moon” heading preserves the world-building but needs a nearby literal “Due soon and overdue” meaning for immediate comprehension.
- Plain English: Keep the world-building, but never make someone decode the game before they can manage work.
- Learning brief (layman terms):
  - What is happening now: The interface sometimes uses the fantasy metaphor as the only label.
  - Why it matters: New users may not know whether “Camped” means blocked, paused, archived, or deleted.
  - What changing it means: Pair fantasy terms with plain PM words, add brief help, and allow a reduced-theme terminology preference.
  - Concept to learn: A metaphor can aid memory only when it maps consistently to a familiar real-world concept.
- Engineering framing: Create a centralized terminology map and accessible label contract; render theme-first plus literal subtitles or literal-first mode without branching domain status values.
- Scope:
  - Define canonical labels: Quest Log/Ready, In Forge/In progress, Camped/Paused or blocked, Shipped/Done, Realm Map/Board, Chronicle/Completed work, Guild Hall/Workspace settings.
  - Define due-date terminology: “Nearing the moon”/Due soon and overdue, while preserving literal row badges such as Due today and 2 days overdue.
  - Add contextual help and a persistent “Plain language” preference.
  - Keep screen-reader names literal even when decorative labels remain.
- Out of scope:
  - Removing fantasy visuals, renaming stored status enum values unnecessarily, or maintaining two separate applications.
- Acceptance criteria:
  - A new user can explain every navigation item and work status without external coaching.
  - Plain-language mode changes terminology without losing functionality or data.
  - Accessible names remain literal and tests cover both preferences.
  - Due-date urgency is understandable without knowing the fantasy metaphor.
- Suggested files:
  - `lib/types.ts`
  - `lib/workspace.ts`
  - `components/forth-app.tsx`
  - `docs/DESIGN.md`
- Validation:
  - Content usability test, screen-reader smoke test, snapshot/unit tests for the terminology map, and preference persistence check.
- Subagent prompt:
  > Implement TICKET-022 with one centralized terminology map and a persistent plain-language preference. Preserve the fantasy theme visually while making every status and navigation concept immediately literal.

### TICKET-023: Make gold, XP, rank, and morale a trustworthy progression ledger

- Priority: P1 High
- Type: Product/Correctness/Motivation
- Area: Completion events, rewards, profile HUD, Chronicle
- Effort: L
- Confidence: High
- Evidence: Gold is currently derived in the UI from completed task effort (`task.weight * 10`), rank is derived from total gold, and a toast announces the reward. There is no immutable reward ledger, reversal policy, award reason, per-user ownership, or test coverage proving edits/reopens cannot double-award or manipulate progression.
- Plain English: Gold should represent real completed work consistently, survive every device, and never mysteriously duplicate or disappear.
- Learning brief (layman terms):
  - What is happening now: The screen calculates a number from whichever completed tasks are currently visible.
  - Why it matters: Reopening, deleting, importing, or concurrently editing work can change totals without leaving an explanation.
  - What changing it means: Record each award once, show why it was earned, and define fair correction rules.
  - Concept to learn: A ledger is an append-only list of credits and corrections whose total can always be explained.
- Engineering framing: Introduce server-authoritative reward events keyed idempotently to task completion events, scoped to member UID, with explicit earn/reverse reasons and derived balances. Separate private motivation from authorization and business-critical currency.
- Scope:
  - Define deterministic gold/XP rules and how team vs individual completions are attributed.
  - Add idempotent award/reversal events and a readable personal progression history.
  - Make rank, avatar unlocks, and morale feedback derive from the ledger.
  - Add product guardrails: no purchases, randomness, public ranking, streak punishment, or pay-to-win pressure.
  - Validate the reward system with cohort interviews and opt-out/reduced-game presentation.
- Out of scope:
  - Cryptocurrency, cash value, marketplace economy, loot boxes, or public leaderboards.
- Acceptance criteria:
  - Completing the same task repeatedly cannot mint duplicate rewards.
  - Reopen/delete/import/conflict paths follow documented correction rules and remain auditable.
  - Every displayed balance is reproducible from immutable events and synchronized across devices.
  - Rewards support morale without hiding workload, penalizing recovery, or becoming a productivity grade.
  - Unit, emulator, concurrency, and usability tests cover reward edge cases.
- Suggested files:
  - `lib/types.ts`
  - `lib/workspace.ts`
  - `lib/firebase/workspace.ts`
  - `components/forth-app.tsx`
  - `firestore.rules`
  - `docs/PRD.md`
- Validation:
  - Property/unit tests for ledger math, emulator authorization, duplicate-event tests, two-client completion race, import/reopen/delete tests, and qualitative motivation review.
- Subagent prompt:
  > Implement TICKET-023 as an idempotent private progression ledger. Make every gold/XP change explainable, preserve intrinsic motivation and recovery, prevent double awards, and keep rewards separate from access control or public ranking.

### TICKET-024: Certify real-time collaboration for 30+ cohort users

- Priority: P0 Critical
- Type: Architecture/Performance/Reliability
- Area: Firestore schema, concurrency, permissions, load testing
- Effort: XL/Epic
- Confidence: High
- Evidence: Forth currently saves one whole-workspace snapshot with last-write-wins behavior. This cannot safely support 30+ people concurrently editing individual and shared projects; one write can overwrite another and the document can approach Firestore’s size/hotspot limits.
- Plain English: Before the whole cohort relies on Forth, thirty people must be able to work at once without losing, leaking, or slowing each other’s tickets.
- Learning brief (layman terms):
  - What is happening now: Everyone in a guild effectively edits one large shared file.
  - Why it matters: More simultaneous users create overwrite races, slower transfers, and a larger failure blast radius.
  - What changing it means: Store tickets, projects, members, comments, and events as separate records and test realistic traffic before launch.
  - Concept to learn: Scalability means a system continues meeting correctness and response-time targets as users and data grow.
- Engineering framing: This is the scale epic downstream of TICKET-001: normalize Firestore collections, use atomic transactions/batches, pagination/indexes, granular listeners, per-entity authorization, presence only where valuable, offline conflict UX, and scripted load/concurrency testing.
- Scope:
  - Support personal projects visible only to their owner and group projects visible to authorized guild members.
  - Define roles and project-level membership without exposing private individual work.
  - Target at least 30 concurrent authenticated users, 10,000 tickets/workspace, and bounded listener/query costs.
  - Establish performance SLOs, Firestore cost budget, contention limits, and degradation behavior.
  - Provide staged migration from snapshot documents with backup and rollback.
- Out of scope:
  - Internet-scale enterprise tenancy or hundreds of thousands of simultaneous users in this phase.
- Acceptance criteria:
  - A scripted 30+ user mixed workload produces no silent lost updates or unauthorized reads.
  - P95 agreed core-action latency and error-rate SLOs are met under the test profile.
  - Personal and group projects enforce separate membership and visibility in emulator tests.
  - Queries are indexed, paginated, bounded, and cost-estimated.
  - Migration/rollback succeeds on a production-shaped test dataset.
- Suggested files:
  - `lib/firebase/`
  - `lib/types.ts`
  - `firestore.rules`
  - `firestore.indexes.json`
  - `tests/load/`
  - `docs/ARCHITECTURE.md`
- Validation:
  - Emulator concurrency suite, staging load test with 30–50 virtual users, multi-device manual test, cost report, security rules matrix, migration and rollback drill.
- Subagent prompt:
  > Execute TICKET-024 as a staged architecture epic. Normalize the Firestore model, separate personal/group authorization, eliminate silent overwrite races, and prove 30+ user behavior with measurable load, cost, and security results.

### TICKET-025: Build a staged Linear/Jira capability-parity roadmap

- Priority: P1 High
- Type: Product/Epic/Research
- Area: Product strategy, PM workflows, integrations
- Effort: XL/Epic
- Confidence: Medium
- Evidence: Forth covers a focused ticket loop but does not yet offer the breadth teams expect from Linear/Jira: issue hierarchy, cycles/sprints, backlogs, labels, comments, attachments, dependencies, saved views, bulk actions, notifications, integrations, reporting, automation, templates, admin controls, imports, and APIs.
- Plain English: Competing professionally does not mean copying every button immediately; it means covering the cohort’s essential workflows first, then closing verified gaps without losing Forth’s simplicity.
- Learning brief (layman terms):
  - What is happening now: Forth is a strong themed core workflow, not yet a complete platform replacement.
  - Why it matters: Teams will return to Linear/Jira when a daily requirement is missing.
  - What changing it means: Compare real workflows, rank gaps by cohort need, and split each capability into testable delivery phases.
  - Concept to learn: Product parity is outcome parity—helping users complete the same important jobs—not cloning every competitor feature.
- Engineering framing: Run a JTBD/capability matrix against Linear and Jira, define table-stakes vs differentiators, create epics with data/API/permission implications, and protect performance/accessibility budgets. Preserve Forth’s pace/proof differentiator.
- Scope:
  - Phase A table stakes: issue hierarchy/subtasks, labels, comments/mentions, attachments, dependencies/blockers, due-date awareness and reminders, cycles/sprints/backlog, notifications, saved filters/views, bulk operations.
  - Phase B team operations: project updates/health, templates, workload/capacity, dashboards, automation rules, import/export, GitHub integration, webhooks/API.
  - Phase C advanced evaluation: roadmaps, custom fields/workflows, service requests, time/estimation reports, enterprise admin only if cohort evidence demands them.
  - Create separate implementation tickets with owner, effort, dependencies, acceptance criteria, and non-goals.
- Out of scope:
  - Claiming full Jira/Linear parity before validated evidence, copying proprietary UI, or sacrificing usability to feature count.
- Acceptance criteria:
  - A documented capability matrix cites current Forth behavior and competitor/user evidence.
  - At least ten representative cohort workflows are tested end to end and mapped to gaps.
  - The capability matrix records PR #13's calm due-date awareness as an existing Forth differentiator/candidate, then separately evaluates configurable reminders, calendar views, and notification delivery.
  - Every accepted gap becomes a bounded ticket/epic with data, auth, accessibility, performance, and migration impact.
  - The roadmap explicitly identifies features Forth will not build and why.
  - Cohort teams can complete agreed daily PM workflows without a second ticketing tool before “replacement-ready” is claimed.
- Suggested files:
  - `docs/PRODUCT-PARITY.md`
  - `docs/PRD.md`
  - `docs/ticket-backlog.md`
- Validation:
  - User interviews, task-based comparison against current Linear/Jira versions, roadmap review with maintainers, and quarterly parity reassessment.
- Subagent prompt:
  > Execute the discovery phase of TICKET-025. Produce an evidence-backed Linear/Jira capability matrix and split accepted gaps into bounded epics. Optimize for cohort workflows and Forth’s clarity, not indiscriminate feature cloning.

### TICKET-026: Add four selectable accessible fantasy avatar profiles

- Priority: P2 Medium
- Type: Feature/UI/A11y
- Area: Member profile, sprite assets, Guild Hall, Chronicle
- Effort: L
- Confidence: High
- Evidence: Forth currently uses one code-squire sprite and task initials/free-typed assignees. New users cannot choose a visual identity, and there is no profile field connecting an authenticated member to an avatar.
- Plain English: Let each fellow choose a recognizable guild character without making identity depend on color, gender, or a tiny image alone.
- Learning brief (layman terms):
  - What is happening now: Everyone shares one decorative hero image.
  - Why it matters: A shared workspace benefits from recognizable, personal—but optional—identity cues.
  - What changing it means: Offer four equally polished 8-bit fantasy characters and store the choice on the authenticated member profile.
  - Concept to learn: Inclusive customization offers meaningful choice while keeping every option equal in capability and avoiding stereotypes.
- Engineering framing: Define an allowlisted avatar ID in the member profile, create four consistent sprite sheets/assets, support reduced motion and alt/accessibility labels, optimize responsive rendering, and prevent arbitrary remote image injection.
- Scope:
  - Design four original avatars in the same palette, scale, silhouette readability, animation cadence, and transparent-background format.
  - Suggested archetypes: Code Squire, Rune Scholar, Forge Warden, Trail Ranger; names remain customizable and non-gendered.
  - Add onboarding/profile selection, preview, change action, fallback initials, and static/reduced-motion variants.
  - Render avatar consistently in Guild Hall, assignment controls, ticket cards where useful, and Chronicle attribution.
- Out of scope:
  - Paid skins, rarity, ability differences, NFT ownership, or user-uploaded images in the first version.
- Acceptance criteria:
  - Four original avatars meet the shared art-direction spec and remain distinct at 24, 32, 48, and 96px.
  - Selection persists by authenticated UID across devices and is validated against an allowlist.
  - Missing assets fall back safely; reduced-motion users receive a static frame.
  - Avatar is never the only identifier and each option has meaningful accessible text.
- Suggested files:
  - `public/sprites/`
  - `lib/types.ts`
  - `lib/firebase/workspace.ts`
  - `components/forth-app.tsx`
  - `app/globals.css`
  - `docs/DESIGN.md`
- Validation:
  - Asset/sprite QA at all supported sizes, profile persistence tests, keyboard/screen-reader selection, reduced-motion test, and responsive visual regression.
- Subagent prompt:
  > Implement TICKET-026 with four original, equal-status 8-bit fantasy avatars. Store only an allowlisted avatar ID, provide accessible names and static fallbacks, and prove responsive rendering across profile and ticket contexts.

### TICKET-027: Certify responsive behavior across the supported device matrix

- Priority: P1 High
- Type: Responsive/UI/Test
- Area: All routes, dialogs, board, avatars, navigation
- Effort: L
- Confidence: High
- Evidence: Current manual checks cover several widths and 375px has no page-level overflow, but there is no automated device matrix. The horizontal Kanban, dialogs, fixed navigation, sword cursor, microcopy, avatar/sprite scaling, zoom, landscape phones, and large monitors need systematic coverage.
- Plain English: Forth should remain understandable and operable on small phones, tablets, laptops, ultrawide screens, zoomed browsers, and touch devices—not merely avoid horizontal overflow.
- Learning brief (layman terms):
  - What is happening now: A few hand-picked screen sizes look acceptable, but many real device combinations are untested.
  - Why it matters: Controls can disappear, overlap, shrink, or become unreachable even when the page technically fits.
  - What changing it means: Define supported layouts and automatically test every critical workflow across them.
  - Concept to learn: Responsive design adapts hierarchy and interaction to available space, input method, and user zoom—not just viewport width.
- Engineering framing: Establish responsive contracts and Playwright projects for compact phone, large phone, landscape, tablet, laptop, desktop, ultrawide, touch/coarse pointer, 200% zoom/reflow, and reduced motion; add visual regression for high-risk components.
- Scope:
  - Test landing/auth, onboarding, Quest Log, Realm Map, Chronicle, Guild Hall, all dialogs, invitation panels, contributor/member controls, and avatar sizes.
  - Ensure Kanban has an understandable touch alternative and preserves column/status context.
  - Define max-width/density behavior for wide screens and no clipped fixed navigation on mobile browser chrome.
  - Cover safe-area insets and orientation changes.
- Out of scope:
  - Native iOS/Android applications.
- Acceptance criteria:
  - Critical actions remain visible, reachable, and at least 44px where practical across the documented matrix.
  - No content overlap, clipped dialog, inaccessible column, unreadable avatar, or two-dimensional page scroll at reflow targets.
  - Automated tests fail on overflow and selected visual regressions.
  - Device/browser support policy is documented with known limitations.
- Suggested files:
  - `app/globals.css`
  - `components/forth-app.tsx`
  - `playwright.config.ts`
  - `tests/e2e/responsive.spec.ts`
  - `docs/DESIGN.md`
- Validation:
  - Playwright device matrix, Chrome/Firefox/WebKit smoke tests, real iOS/Android touch test, orientation change, zoom/reflow, and reduced-motion verification.
- Subagent prompt:
  > Implement TICKET-027 as a documented responsive certification matrix. Test every critical route and dialog, including avatars and touch Kanban alternatives, across phone/tablet/desktop/zoom/input modes.

### TICKET-028: Certify complete CRUD plus archive/restore behavior sitewide

- Priority: P1 High
- Type: Feature/Correctness/Security
- Area: Guilds/workspaces, projects, tasks, members, invitations, profiles, avatars, and future collaborative resources
- Effort: XL/Epic
- Confidence: High
- Evidence: Tasks have several create/read/update/delete paths, but the site has no single tested capability contract. Projects support creation without complete edit/archive/restore/delete behavior. Guild/workspace, membership, invitation, and profile lifecycle actions are uneven across the UI, reducer, Firebase adapter, and Firestore rules. Invitation cancellation and expiry exist on `agent/invite-lifecycle`, but the complete sitewide lifecycle is not yet certified in production.
- Plain English: Anything users create should also be easy and safe to view, change, archive, restore, or remove when their role allows it. Archive must preserve the record and its history so users can recover it later; it is not the same as permanent deletion.
- Learning brief (layman terms):
  - What is happening now: Different parts of Forth offer different pieces of create, view, edit, archive, and delete behavior.
  - Why it matters: Real teams will accumulate renamed projects, finished campaigns, stale invites, changed profiles, and records that must be recoverable.
  - What changing it means: Publish one matrix describing every allowed action, then make the UI, database code, and security rules honor it consistently.
  - Concept to learn: CRUD means create, read, update, and delete. Production systems usually also need lifecycle states such as archive, restore, cancel, expire, deactivate, and remove because permanent deletion is often unsafe.
- Engineering framing: Define a resource capability matrix for CRUD plus lifecycle transitions (`archive`, `restore`, `cancel`, `expire`, `deactivate`, `remove`). Specify authorization, ownership, validation, idempotency, optimistic/error states, referential integrity, audit events, retention, and soft-delete versus hard-delete semantics per resource.
- Scope:
  - Inventory guild/workspace, project, task, member, invitation, profile/avatar, and any added comment, label, attachment, dependency, cycle, or saved-view resources.
  - For every resource, explicitly support or intentionally prohibit create, read/list, update, archive, restore, and permanent delete.
  - Make archive/restore first-class sitewide actions wherever records have ongoing historical value; archived items leave default views but remain searchable and recoverable.
  - Pair every UI control with Firebase persistence and Firestore rule enforcement. Hiding a button is not authorization.
  - Define role permissions for owner, admin, member, guest/pending invite, and unauthenticated users.
  - Add confirmation, loading, success, validation, conflict, retry, not-found, and permission-denied states.
  - Prefer archive/restore for shared records. Allow hard deletion only when retention and dependent-record behavior are explicit.
  - Preserve Chronicle/activity history and prevent orphaned tasks, assignments, memberships, invites, progression events, comments, attachments, or dependencies.
- Out of scope:
  - Treating permanent delete as the default for shared work, or claiming capability coverage from UI buttons without persistence and authorization tests.
- Acceptance criteria:
  - A version-controlled capability matrix lists every resource, lifecycle action, allowed role, UI entry point, persistence method, Firestore rule, retention behavior, and audit event.
  - Every permitted action persists across refresh and a second signed-in device; intentionally unsupported actions explain why.
  - Archive hides a record from normal active views without destroying it; restore returns it with relationships and history intact.
  - Firestore denies every unauthorized mutation even when a caller bypasses the UI.
  - Archive, restore, and delete never orphan dependent records or erase required Chronicle/audit history.
  - Destructive actions require clear confirmation and show downstream impact before execution.
  - Tests cover success, validation failure, not found, conflicting/repeated requests, unauthorized access, archive/restore, and recovery for each resource lifecycle.
  - Two-account browser tests verify collaborative actions and role boundaries for guilds, projects, tasks, assignments, members, and invitations.
- Suggested files:
  - `lib/types.ts`
  - `lib/workspace.ts`
  - `lib/firebase/workspace.ts`
  - `components/forth-app.tsx`
  - `firestore.rules`
  - `tests/workspace.test.ts`
  - `tests/firestore.rules.test.ts`
  - new browser/E2E suites
  - `docs/resource-capability-matrix.md`
- Validation:
  - `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:rules`, and `pnpm build`.
  - Two-account CRUD/lifecycle browser matrix, including refresh, concurrent-edit, archive/restore, and unauthorized-operation scenarios.
- Subagent prompt:
  > Create and implement a sitewide resource capability matrix for Forth. Complete CRUD plus archive/restore/cancel/expire behavior for every applicable resource, enforce every action in Firestore rules, preserve dependent data and audit history, and add reducer, rules, and two-account browser tests for success and failure paths.

### TICKET-029: Turn first-use help into an optional guided product tour

- Priority: P2 Medium
- Type: UX/Feature/A11y/Test
- Area: Entry onboarding, application navigation, contextual help, responsive overlays
- Effort: L
- Confidence: High
- Depends on: Merge PR #21 first; coordinate terminology with TICKET-022 and the task-first hierarchy with TICKET-013.
- Evidence: PR #21 adds an accurate, accessible five-step summary dialog and a Guild Hall reopen control. The maintainer's authenticated preview smoke test passed, but the current `WelcomeDialog` remains a static list: it does not highlight the real pace selector, New Quest action, navigation tabs, board, or Chronicle while teaching the workflow. The user explicitly requested an optional tutorial that moves through and points at live features.
- Plain English: Keep the reliable quick-start summary, then offer a short guided walk that visibly points to each real control so new and older users do not have to translate written instructions into screen locations by themselves.
- Learning brief (layman terms):
  - What is happening now: The guide explains Forth correctly, but the person must close it and locate every feature on their own.
  - Why it matters: Written directions are harder to follow when the interface is unfamiliar, especially when fantasy and standard PM terms appear together.
  - What changing it means: Add a voluntary “Take the 2-minute tour” path that moves through live views, highlights one control at a time, and can be skipped or reopened.
  - Concept to learn: A coach mark is a small contextual explanation attached to the actual control it describes; progressive onboarding teaches one action in its real location instead of presenting every instruction at once.
- Engineering framing: Add a finite-state guided-tour controller with a stable anchor registry (for example, versioned `data-tour` identifiers), explicit view transitions, adaptive step resolution, safe per-account/demo persistence, accessible focus and announcements, collision-aware positioning, and deterministic Playwright coverage. The tour must never create or mutate workspace data merely to demonstrate a feature.
- Scope:
  - Keep the static quick-start content as the accessible fallback and add clear “Take the 2-minute tour” and “Explore on my own” choices.
  - Guide the user through daily capacity, New Quest, Quest Log, Realm Map/Kanban board, Chronicle/completed work, and Guild Hall/help using the actual rendered controls.
  - Highlight the current target, scroll it into view, and move between application views only when the user chooses Next or Back.
  - Adapt to empty authenticated workspaces and populated demos. Explain unavailable data-dependent steps without injecting fake tickets into a real workspace.
  - Provide Step X of Y, Back, Next, Skip tour, Finish, and Restart tour controls with 44px targets and literal accessible names.
  - Announce each step and target meaning to screen readers; support keyboard-only, touch, 200% zoom, reduced motion, and 320px layouts.
  - Persist completion separately for demo mode and each authenticated account through the safe browser-storage adapter; version the key so materially improved tours can be offered again.
  - If an anchor is missing after a UI change, fall back gracefully to a centered explanation and continue or exit without crashing.
- Out of scope:
  - Automatically clicking destructive controls, creating tickets/campaigns for the user, silently changing pace or status, blocking normal app use, or adding behavioral analytics without a separate privacy decision.
- Acceptance criteria:
  - A first-time user can choose the quick summary, start the guided tour, skip it, or reopen it later from Guild Hall.
  - The tour visibly points to each live feature and changes views without creating, editing, moving, or deleting workspace records.
  - Cloud and demo copy remain truthful; an empty real workspace never receives seeded tutorial data.
  - Keyboard focus, Escape/Skip behavior, screen-reader announcements, and focus return are deterministic at every step.
  - Tooltip/coach-mark placement remains fully visible with no horizontal overflow at 320, 375, 768, and 1440px and at 200% zoom.
  - Missing anchors fail safely, and completion/restart persistence is isolated per authenticated account and demo mode.
- Suggested files:
  - `components/forth-app.tsx`
  - a focused `components/guided-tour.tsx`
  - `lib/browser-storage.ts`
  - `app/globals.css`
  - `tests/e2e/auth-entry.spec.ts`
  - `docs/DESIGN.md`
- Validation:
  - Unit-test the tour state machine and missing-anchor fallback.
  - Playwright-test start, Next, Back, Skip, Finish, reopen, persistence, empty-cloud adaptation, keyboard focus, reduced motion, zoom, and 320/375/768/1440px placement.
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.
- Subagent prompt:
  > Implement TICKET-029 after PR #21 merges. Preserve the verified quick-start dialog as a fallback, add an optional accessible coach-mark tour over the real Forth controls, never mutate user data for demonstration, and prove responsive, keyboard, screen-reader, persistence, and missing-anchor behavior with focused tests.

### TICKET-030: Contain the daily energy meter inside its responsive card

- Priority: P1 High
- Type: Bug/UI/Responsive/A11y
- Area: Quest Log provisions panel and capacity meter
- Effort: S
- Confidence: High
- Evidence: The maintainer's desktop preview screenshot shows the capacity bar and “energy remain” note leaving the left provisions card and drawing underneath the right campaign rail. `app/globals.css` defines `.pace-row` as `minmax(420px, 1.3fr) minmax(210px, 0.7fr)`, but its `.capacity-wrap` grid item has no explicit `min-width: 0` or overflow-safe wrapping contract. The current E2E suite checks page-level horizontal overflow, which does not detect overlap between sibling grid regions.
- Plain English: The energy bar should resize or stack inside its own parchment card instead of stretching underneath neighboring content.
- Learning brief (layman terms):
  - What is happening now: The page itself may still fit the browser, but one child section is wider than the space its card gave it.
  - Why it matters: Overlapping panels make the interface look broken and can hide text or controls even when no horizontal scrollbar appears.
  - What changing it means: Let the energy area shrink and wrap, and stack it below the pace buttons before it can cross the card boundary.
  - Concept to learn: A grid item's default minimum width can be based on its content. `min-width: 0` explicitly permits that child to shrink within its assigned CSS Grid column instead of overflowing into a sibling.
- Engineering framing: Correct the `.pace-row`/`.capacity-wrap` intrinsic sizing contract, add a content-aware stacking breakpoint or container rule, and test element-to-container bounds rather than relying only on document `scrollWidth`.
- Scope:
  - Keep `.capacity-wrap`, `.capacity-track`, and `.capacity-note` fully inside `.pace-panel` at all supported widths.
  - Add `min-width: 0`, safe text wrapping, and a breakpoint/container behavior that stacks the meter when the two-column row is too narrow.
  - Preserve the current 8-bit bar styling, progressbar semantics, numeric energy text, and over-capacity warning.
  - Add a stable test selector only if semantic roles and nearby labels cannot identify the elements reliably.
- Out of scope:
  - Redesigning capacity mathematics, changing pace choices, or folding the broader TICKET-013 information-architecture work into this small fix.
- Acceptance criteria:
  - The capacity track and note remain within the provisions card with no overlap at 320, 375, 768, 1024, 1280, and 1440px.
  - The meter stacks below pace choices before either region falls below a readable width.
  - Long localized or warning copy wraps without increasing document-level horizontal overflow.
  - The progressbar retains its accessible name and correct min/max/current values.
  - A Playwright assertion compares the energy region bounds with the provisions-card bounds and fails on the screenshot's current overlap regression.
- Suggested files:
  - `app/globals.css`
  - `components/forth-app.tsx` only if a stable semantic/test hook is required
  - `tests/e2e/auth-entry.spec.ts`
- Validation:
  - Run the focused Playwright responsive matrix, keyboard/accessibility smoke, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
  - Inspect the normal and over-capacity states at desktop, tablet, and phone widths.
- Subagent prompt:
  > Implement TICKET-030 as a small responsive regression fix. Keep the energy meter and note inside the provisions card, preserve the fantasy styling and progressbar semantics, add element-boundary browser assertions across the supported viewports, and do not expand into the TICKET-013 redesign.

### TICKET-031: Add a safe one-click Cursor Boston guild join path

- Priority: P1 High
- Type: Feature/Auth/Membership/Security
- Area: Authenticated onboarding, guild membership, Firestore rules
- Effort: M
- Confidence: Medium
- Depends on: TICKET-007 invitation acceptance, TICKET-011 real member identity, and an explicit maintainer decision about the authoritative Cursor Boston eligibility source.
- Evidence: Current members must receive an email-matched invitation or copy a guild code after sign-in. The maintainer requested a quick button that lets Cursor Boston users join the shared Forth guild directly after authentication.
- Plain English: An eligible fellow should be able to sign in, press one obvious “Join the Cursor Boston guild” button, and enter the right shared workspace—without hunting for a code or asking the maintainer to repeat setup steps.
- Learning brief (layman terms):
  - What is happening now: The app knows who signed in, but it does not have a trusted, automatic way to know whether that person belongs to the cohort.
  - Why it matters: A public join button with only a hidden client check would let outsiders bypass the intended invitation boundary.
  - What changing it means: Choose a trustworthy cohort allowlist or signed invitation source, verify eligibility in the backend/security layer, then expose one clear join action to eligible accounts.
  - Concept to learn: Authentication proves who a user is; authorization decides what that identified user is allowed to join or change.
- Engineering framing: Add an idempotent cohort-membership enrollment transition backed by a server-controlled eligibility record or equivalent verifiable claim. Enforce the transition in Firestore rules or a trusted server endpoint, bind the resulting member record to `request.auth.uid`, and make repeated clicks safe.
- Scope:
  - Show a literal “Join the Cursor Boston guild” action after Google or GitHub authentication when the account is eligible and not already a member.
  - Define the canonical guild/workspace ID in safe configuration rather than hard-coding a temporary preview value in presentation code.
  - Choose and document the eligibility source (for example, a maintainer-managed Firestore allowlist keyed by verified email/UID, or a trusted cohort-platform claim).
  - Create membership once, open the cohort workspace, and show clear already-joined, not-eligible, loading, retry, and permission-denied states.
  - Preserve the existing invitation/code path for other private guilds.
- Out of scope:
  - Letting every authenticated internet user join, trusting a client-side email-domain check, exposing the cohort roster publicly, or silently enrolling someone without an explicit button press.
- Acceptance criteria:
  - An eligible new account can sign in and join the designated cohort guild with one explicit action and no copied guild code.
  - An ineligible authenticated account is denied by the backend/rules even if it manually calls the write operation.
  - Repeated clicks or refreshes do not duplicate membership, overwrite another role, or corrupt the workspace.
  - Existing members see “Open Cursor Boston guild” rather than another join mutation.
  - Google and GitHub accounts follow the same UID-bound authorization contract; account-linking edge cases receive actionable copy.
  - Two-account emulator/browser tests cover eligible, ineligible, already-member, retry, and concurrent-click behavior.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/firebase/workspace.ts`
  - `firestore.rules`
  - `tests/firestore.rules.test.ts`
  - `tests/e2e/auth-entry.spec.ts`
  - `docs/PHASE2.md`
- Validation:
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:rules`, `pnpm test:e2e`, and `pnpm build`.
  - Perform a live staging smoke with one eligible fresh account and one ineligible account without exposing roster data or credentials.
- Subagent prompt:
  > Implement TICKET-031 as a one-click, explicitly confirmed Cursor Boston guild join flow. Use a trusted eligibility source, enforce UID-bound membership server-side or in Firestore rules, keep repeated attempts idempotent, preserve normal private-guild invitations, and prove eligible/ineligible boundaries with rules and two-account browser tests.

### TICKET-032: Patch the newly disclosed sharp/libvips vulnerability

- Priority: P1 High
- Type: Security/Dependency/Release
- Area: Next.js image pipeline, lockfile, Vercel build/runtime
- Effort: S
- Confidence: High
- Evidence: `pnpm audit --prod` on 2026-07-21 reports high-severity [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj). The lockfile resolves Next.js to `sharp@0.34.5`; the official GitHub advisory marks versions below `0.35.0` vulnerable and lists `0.35.0` as the first patched version. Forth currently processes only trusted local sprite assets, which limits present exploitability but does not justify carrying the vulnerable production dependency.
- Plain English: A newly announced flaw affects the image-processing library bundled under Next.js. Forth does not currently accept user image uploads, so immediate exposure is limited, but the dependency should be patched and proven compatible before the next production release.
- Engineering framing: Select a Next.js-supported resolution to `sharp>=0.35.0` (prefer an upstream Next.js patch over a blind override), regenerate the pnpm lockfile, verify platform-specific optional packages, and exercise local/Vercel image optimization without weakening reproducibility.
- Scope:
  - Check for a compatible Next.js patch release or documented dependency update before adding an override.
  - Resolve every production `sharp` path to a non-vulnerable version and keep the lockfile deterministic.
  - Verify the code-squire sprite and all `next/image` render paths locally and on Vercel.
  - Record the advisory, chosen remediation, and rollback in release notes/handoff.
- Out of scope:
  - Suppressing the audit, deleting image optimization without evidence, or bundling unrelated dependency upgrades.
- Acceptance criteria:
  - `pnpm audit --prod` reports no GHSA-f88m-g3jw-g9cj finding.
  - `pnpm install --frozen-lockfile`, lint, typecheck, unit tests, E2E, and production build pass on a fresh install.
  - Vercel preview succeeds and local/static sprite images render sharply at supported sizes.
  - If upstream compatibility blocks the patch, the release is explicitly held or a documented temporary mitigation proves that untrusted images cannot reach sharp.
- Suggested files:
  - `package.json`
  - `pnpm-lock.yaml`
  - `docs/AGENT_HANDOFF.md`
- Validation:
  - Re-run the full release suite, `pnpm audit --prod`, and a Vercel preview image smoke test.
- Subagent prompt:
  > Implement TICKET-032 as an isolated security dependency patch. Prefer a Next.js-supported route to sharp 0.35.0 or newer, keep the lockfile reproducible, prove image rendering and the complete test/build suite, and do not suppress the official GitHub advisory.
