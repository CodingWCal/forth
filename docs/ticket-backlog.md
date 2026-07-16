# Ticket Backlog

Generated: 2026-07-16  
Repo/app: Forth  
Audit scope: Product docs, design direction, Next.js app shell, workspace domain layer, Firebase boundary, tests, README, and repo instructions.

## Product Intent Snapshot

- Plain English: Forth helps a small team choose a believable daily pace, keep only three meaningful moves in focus, move work through honest states, and remember finished work as proof instead of pressure.
- Engineering framing: A local-first Next.js 16/React 19 MVP with reducer-driven workspace state, derived selectors, localStorage persistence, and a prepared Firebase Auth/Firestore boundary for private beta.
- Brand/design guardrails: Preserve the field-journal/editorial feel: warm paper, deep green ink, moss, clay, slate, serif hierarchy, tactile rules, calm copy, and no generic AI gradients, glow, confetti, streaks, or leaderboard mechanics.
- Assumptions: This backlog treats the current repo as a polished local MVP, not a production collaboration service.

## Verification Summary

- Commands run before backlog creation: `git status --short --branch` -> clean `main...origin/main`; `rg --files` -> repo mapped; targeted reads of `AGENTS.md`, `README.md`, `docs/PRD.md`, `docs/DESIGN.md`, `components/forth-app.tsx`, `lib/workspace.ts`, `tests/workspace.test.ts`, Firebase config, and global styles.
- Commands to run after this backlog edit: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `corepack pnpm audit --audit-level moderate`.
- Visual/app checks: Prior build work established the Today, Work map, Proof, Settings, add-move dialog, and responsive desktop/tablet/mobile paths. This backlog pass inspected source evidence rather than changing UI behavior.
- Not run yet: Firestore emulator rules tests and live Firebase auth flows, because no Firebase project/emulator suite was provisioned in scope.

## Priority Guide

- P0 Critical: security, data loss, app-breaking, or launch-blocking.
- P1 High: major UX/correctness gaps or important release quality issues.
- P2 Medium: meaningful improvements, refactors, test gaps, performance work.
- P3 Low: polish, nice-to-have enhancements, cleanup.

## Tickets

### TICKET-001: Add Firestore emulator rule tests before private beta

- Priority: P1 High
- Type: Security/Test
- Area: `firestore.rules`, `firebase.json`, Firebase private-beta setup
- Effort: M
- Confidence: High
- Evidence: `firestore.rules` defines owner/member access, but the repo has no emulator test suite proving owner, member, outsider, create, update, and nested document cases.
- Plain English: The rules look intentionally cautious, but cloud permissions should be tested like app code before real team data touches them.
- Learning brief (layman terms):
  - What is happening now: The app has a written security policy for Firestore, but no automated rehearsal that proves the policy behaves correctly.
  - Why it matters: A small mistake in database rules can let the wrong person read or change workspace data even if the UI hides the button.
  - What changing it means: Add emulator-based tests that create fake users and check exactly who can read, write, invite, and edit.
  - Concept to learn: Authorization testing means proving permissions at the data layer, not trusting what the screen shows.
- Engineering framing: Add Firebase Emulator Suite tests for Firestore Security Rules using authenticated test contexts and explicit allow/deny assertions across workspace owner, member, and outsider roles.
- Scope:
  - Add emulator test tooling and scripts.
  - Cover workspace create/read/update/delete, membership management, and nested collections.
  - Document how to run the rule suite locally.
- Out of scope:
  - Creating a live Firebase project.
  - Deploying rules to production.
  - Implementing auth screens.
- Acceptance criteria:
  - `pnpm test:rules` or equivalent passes locally against the emulator.
  - Tests prove owners can manage workspaces and members.
  - Tests prove members can read/write allowed nested workspace documents.
  - Tests prove outsiders and signed-out users are denied.
- Suggested files:
  - `firestore.rules`
  - `firebase.json`
  - `tests/firestore-rules.test.ts`
  - `package.json`
- Validation:
  - Run the new rules test script.
  - Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
- Subagent prompt:
  > Use the repository context and implement TICKET-001. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-002: Build the Firebase workspace adapter behind the existing state contract

- Priority: P1 High
- Type: Feature/Architecture
- Area: `lib/workspace.ts`, `lib/firebase/config.ts`, future persistence adapter
- Effort: L
- Confidence: High
- Evidence: The PRD defines Phase 2 as Firebase Auth and Firestore replacing local persistence, while the current app honestly remains localStorage-only with only configuration detection.
- Plain English: The screen already knows how work should behave; the next big step is teaching it to save and sync through Firebase without rewriting the product rules.
- Learning brief (layman terms):
  - What is happening now: The app saves data in one browser. That is perfect for a demo, but it cannot support a team using different devices.
  - Why it matters: Collaboration needs one shared source of truth, otherwise each person sees a different version of the project.
  - What changing it means: Put Firebase behind the same workspace shape so the UI can keep dispatching clear actions while the storage layer changes.
  - Concept to learn: An adapter lets the app swap where data comes from without changing the rest of the code that uses it.
- Engineering framing: Introduce a persistence adapter boundary that maps `WorkspaceState` and reducer actions to Firestore documents while preserving localStorage as the unauthenticated demo implementation.
- Scope:
  - Define a `WorkspaceRepository` or similar interface.
  - Keep reducer/selectors as the domain source of truth.
  - Add loading, error, offline, and sync-state handling.
  - Preserve local demo behavior when Firebase env vars or auth are missing.
- Out of scope:
  - Complex real-time conflict resolution beyond a private-beta baseline.
  - Billing, org administration, or public multi-tenant operations.
- Acceptance criteria:
  - Local demo behavior remains unchanged without Firebase.
  - Authenticated users can load and update a Firestore-backed workspace.
  - UI labels distinguish Local demo, Syncing, Synced, and Sync problem states.
  - Failed writes do not silently look successful.
- Suggested files:
  - `lib/workspace.ts`
  - `lib/firebase/config.ts`
  - `lib/firebase/workspace-repository.ts`
  - `components/forth-app.tsx`
  - `tests/workspace.test.ts`
- Validation:
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
  - Manually test local mode and emulator-backed Firebase mode.
- Subagent prompt:
  > Use the repository context and implement TICKET-002. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-003: Add workspace onboarding for first-run clarity

- Priority: P2 Medium
- Type: UX/Feature
- Area: Today view, Settings, seed/local reset flow
- Effort: M
- Confidence: Medium
- Evidence: The app opens directly into a polished seeded workspace. That is demo-friendly, but a first private-beta user will need to name their workspace, understand local-vs-cloud mode, and set the first pace intentionally.
- Plain English: The product should greet a real user with a short setup path, not drop them into Calvin's sample workspace forever.
- Learning brief (layman terms):
  - What is happening now: The seed data makes the app easy to demo, but it is not yet a personal starting point.
  - Why it matters: Onboarding prevents confusion about whether the data is sample data, private data, or shared team data.
  - What changing it means: Add a short first-run setup that lets the user name the workspace, choose a pace, and optionally keep or replace demo tasks.
  - Concept to learn: Onboarding is a guided first state that helps users form the right mental model before they do real work.
- Engineering framing: Add a first-run state machine and persisted onboarding flag without disrupting the existing reducer ownership of workspace mutations.
- Scope:
  - Add first-run detection for empty or newly seeded workspaces.
  - Let the user set workspace/team name and first pace.
  - Clearly label sample data and offer a clean-start path.
  - Keep the seeded demo available for presentations.
- Out of scope:
  - Full account creation.
  - Team invitations.
  - Product tours or marketing screens.
- Acceptance criteria:
  - New users can tell whether they are using sample data or their own workspace.
  - A clean workspace can be created without manually resetting browser storage.
  - Returning users do not see onboarding repeatedly.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/types.ts`
  - `lib/seed.ts`
  - `lib/workspace.ts`
  - `tests/workspace.test.ts`
- Validation:
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
  - Manually test first visit, returning visit, reset, and corrupt-storage recovery.
- Subagent prompt:
  > Use the repository context and implement TICKET-003. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-004: Add browser-level E2E coverage for the core motivational loop

- Priority: P2 Medium
- Type: Test/QA
- Area: Today, Work map, Proof, Settings, add-move dialog
- Effort: M
- Confidence: High
- Evidence: Current Vitest coverage validates reducer behavior and persistence parsing, but no browser test proves the end-to-end flow: set pace, add move, move status, land work, see Proof, refresh persistence, and reset.
- Plain English: Unit tests prove the rules; a browser test should prove the user can actually complete the loop on the screen.
- Learning brief (layman terms):
  - What is happening now: The app's inner rules have tests, but the full click-through experience is not automatically checked.
  - Why it matters: A button, dialog, storage effect, or navigation bug can break the product even if the reducer still passes.
  - What changing it means: Add a Playwright suite that uses the app like a real person and verifies the main journey.
  - Concept to learn: End-to-end testing checks a complete user path across UI, state, and browser behavior.
- Engineering framing: Add Playwright E2E tests around the App Router page with deterministic localStorage setup/cleanup and viewport coverage for desktop and mobile.
- Scope:
  - Install/configure Playwright only if approved and appropriate for the repo.
  - Cover create task, WIP limit cue, status transition, Proof ledger, persistence after reload, reset confirmation, and mobile nav reachability.
  - Keep tests deterministic and scoped to local mode.
- Out of scope:
  - Cloud Firebase tests.
  - Pixel-perfect screenshot baselines.
- Acceptance criteria:
  - `pnpm test:e2e` runs locally and passes.
  - Tests cover the main Today -> Board -> Proof loop.
  - Tests verify no horizontal page overflow at the smallest supported viewport.
- Suggested files:
  - `package.json`
  - `playwright.config.ts`
  - `tests/e2e/forth-loop.spec.ts`
  - `components/forth-app.tsx`
- Validation:
  - Run `pnpm test:e2e`.
  - Run existing lint, typecheck, unit tests, and build.
- Subagent prompt:
  > Use the repository context and implement TICKET-004. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-005: Make workspace identity and members first-class data

- Priority: P2 Medium
- Type: Feature/Refactor
- Area: `lib/types.ts`, `lib/seed.ts`, rail member display, Firebase model
- Effort: M
- Confidence: Medium
- Evidence: `WorkspaceState` currently contains `pace`, `projects`, and `tasks`; member initials and names are hard-coded in `components/forth-app.tsx`, while the PRD names Workspace and Member as entities.
- Plain English: The app looks like a team workspace, but the team is still mostly painted into the screen instead of represented in data.
- Learning brief (layman terms):
  - What is happening now: Some people shown in the UI are static labels, not real workspace records.
  - Why it matters: Private beta features like invitations, ownership, and activity attribution need actual member data.
  - What changing it means: Add workspace and member objects to the state so UI labels come from real data instead of hard-coded placeholders.
  - Concept to learn: A domain model is the app's shared vocabulary for real things like workspaces, projects, tasks, and members.
- Engineering framing: Extend `WorkspaceState` with workspace metadata and members, then derive avatars, assignee labels, ownership, and future Firestore document mapping from typed state rather than component constants.
- Scope:
  - Add `workspace` metadata and `members` to the type model.
  - Update seed data and runtime validation.
  - Replace hard-coded member display where practical.
  - Add reducer tests for parsing and backwards-compatible fallback if needed.
- Out of scope:
  - Live invitations or auth.
  - Role-based permission UI.
- Acceptance criteria:
  - Member displays come from typed workspace data.
  - Stored state validation handles the new version safely.
  - Existing local demo data migrates or resets predictably.
- Suggested files:
  - `lib/types.ts`
  - `lib/seed.ts`
  - `lib/workspace.ts`
  - `components/forth-app.tsx`
  - `tests/workspace.test.ts`
- Validation:
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
  - Manually verify Settings and rail member display.
- Subagent prompt:
  > Use the repository context and implement TICKET-005. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-006: Add edit and archive flows for tasks

- Priority: P2 Medium
- Type: Feature/UX
- Area: Task cards, reducer actions, add/edit dialog
- Effort: M
- Confidence: Medium
- Evidence: Users can create, move, pause, land, and focus tasks, but cannot correct a typo, change effort, update meaning, or archive a no-longer-relevant unfinished task.
- Plain English: Real work changes shape; the app should let people adjust the plan without needing a browser reset.
- Learning brief (layman terms):
  - What is happening now: Once a move is created, the user can change its status but not its details.
  - Why it matters: A project tool becomes brittle if a small typo or changed scope forces awkward workarounds.
  - What changing it means: Add scoped edit and archive actions while protecting the Proof ledger from accidental rewriting.
  - Concept to learn: CRUD means create, read, update, and delete/archive; most real tools need all four, with extra care around history.
- Engineering framing: Add typed `UPDATE_TASK` and `ARCHIVE_TASK` reducer actions, reuse the dialog as edit mode where possible, and keep completed proof records immutable or carefully audited.
- Scope:
  - Edit title, project, meaning, weight, and focus flag for unfinished tasks.
  - Archive unfinished tasks with confirmation.
  - Keep landed Proof records stable unless a separate restore/edit policy is designed.
  - Add reducer tests.
- Out of scope:
  - Bulk edit.
  - Deleting completed proof history.
  - Undo stack.
- Acceptance criteria:
  - Users can edit unfinished task details from Today or Work map.
  - Users can archive an unfinished task after confirmation.
  - Archived tasks no longer count toward focus, capacity, or project active columns.
  - Tests cover update/archive behavior.
- Suggested files:
  - `components/forth-app.tsx`
  - `lib/types.ts`
  - `lib/workspace.ts`
  - `tests/workspace.test.ts`
- Validation:
  - Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
  - Manually test editing focused, paused, and ready tasks.
- Subagent prompt:
  > Use the repository context and implement TICKET-006. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-007: Improve accessibility semantics for tabs, dialogs, and status messages

- Priority: P2 Medium
- Type: A11y/UX
- Area: Navigation, project tabs, add-move dialog, toast/live region
- Effort: S
- Confidence: Medium
- Evidence: The app uses visible focus, labeled controls, native dialog, and ARIA on several elements. The project tabs use `role="tablist"` and `role="tab"` but do not implement full keyboard tab behavior, and toast/status feedback could use targeted assistive-technology review.
- Plain English: Keyboard and screen-reader users should get the same calm, clear experience as mouse users.
- Learning brief (layman terms):
  - What is happening now: The app has many accessibility basics, but a few widgets need stricter behavior checks.
  - Why it matters: If a component claims to be a tab or status message, assistive tech expects it to behave a certain way.
  - What changing it means: Either implement the expected keyboard patterns or use simpler semantic buttons where that is more honest.
  - Concept to learn: Semantic HTML means choosing markup that matches both what something looks like and how it behaves.
- Engineering framing: Audit ARIA roles against WAI-ARIA expectations, simplify roles where native buttons are sufficient, verify dialog focus return, and improve live-region announcements if needed.
- Scope:
  - Review `role="tablist"`/`role="tab"` implementation.
  - Confirm Escape/backdrop/close focus behavior for the native dialog.
  - Check toast status announcements for task transitions.
  - Add small regression tests if an E2E harness exists by then.
- Out of scope:
  - Full WCAG certification.
  - Screen-reader support matrix documentation.
- Acceptance criteria:
  - Keyboard-only users can navigate project selection predictably.
  - Assistive roles match implemented behavior.
  - Add-move dialog opens, closes, and returns focus reliably.
  - Status updates are announced without trapping focus.
- Suggested files:
  - `components/forth-app.tsx`
  - `app/globals.css`
  - `tests/e2e/forth-loop.spec.ts`
- Validation:
  - Run lint, typecheck, tests, and build.
  - Manually test keyboard-only navigation and reduced-motion mode.
- Subagent prompt:
  > Use the repository context and implement TICKET-007. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.

### TICKET-008: Add lightweight telemetry and error reporting for beta learning

- Priority: P3 Low
- Type: Ops/Analytics
- Area: Settings, app shell, deployment/beta readiness
- Effort: M
- Confidence: Medium
- Evidence: The current MVP has no analytics, logging, or error reporting. The PRD places analytics and operational monitoring in public beta, but private beta will still need basic learning signals.
- Plain English: Once real people try Forth, the team should see where the product helps or gets stuck without spying on sensitive task content.
- Learning brief (layman terms):
  - What is happening now: The app can be tested manually, but it will not report crashes or usage patterns from beta sessions.
  - Why it matters: Without safe feedback signals, it is harder to know whether people actually complete the motivational loop.
  - What changing it means: Add privacy-aware event tracking for broad actions, plus error reporting for crashes.
  - Concept to learn: Telemetry is product instrumentation; it measures behavior patterns while avoiding unnecessary personal data.
- Engineering framing: Define privacy-preserving analytics events and error boundaries before beta, with content redaction and opt-in/consent language appropriate to the deployment context.
- Scope:
  - Add an error boundary or route-level fallback.
  - Define event names for pace set, task created, task landed, proof viewed, reset, and sync failure.
  - Avoid logging task titles, meanings, or private workspace content.
  - Document analytics env/config requirements.
- Out of scope:
  - Choosing an enterprise observability platform without approval.
  - Tracking individual productivity scores.
- Acceptance criteria:
  - Runtime UI failures show a recoverable error state.
  - Analytics events exclude user-entered task content.
  - Settings or docs clearly state what beta telemetry records.
- Suggested files:
  - `app/error.tsx`
  - `components/forth-app.tsx`
  - `docs/PRD.md`
  - `README.md`
- Validation:
  - Run lint, typecheck, tests, and build.
  - Manually trigger a recoverable error in development if practical.
- Subagent prompt:
  > Use the repository context and implement TICKET-008. Preserve the existing design system and product intent. Keep the change scoped to the acceptance criteria, update or add focused tests where appropriate, and summarize validation results.
