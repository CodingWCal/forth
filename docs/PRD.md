# Forth — Agentic Product Requirements Document

Status: MVP build contract  
Delivery mode: Phased  
Last updated: 2026-07-16

## 1. Product frame

**One-sentence pitch:** Forth is project management with a pulse: a calm workspace that helps small teams choose a believable pace, make three meaningful moves, and see proof that their work is moving.

**Target users:** Small creative and product teams (2–12 people), fellowship cohorts, indie builders, and team leads who need credible project structure without enterprise-dashboard pressure.

**Primary job to be done:** “When our work feels bigger than our available energy, help us agree on the next meaningful moves and leave the day able to see that we advanced.”

**Problem:** Conventional project tools organize unfinished work well, but large backlogs, red overdue states, and abstract progress percentages can make the product itself feel like another source of pressure. Personal productivity tools can help an individual plan calmly, while gamified tools create stronger feedback, but neither category fully supports dignified team coordination.

**Desired outcome:** A user can open Forth, set today’s capacity, choose or create a task that connects to a project outcome, move it through the work states, and complete it into a visible proof-of-progress ledger in under three minutes.

**Non-goals for the MVP:** Replacing Jira for large engineering organizations; real-time chat; autonomous AI task creation; billing; time tracking; Gantt charts; complex dependency graphs; mobile-native apps.

## 2. Market gap and product thesis

The product deliberately combines patterns that currently live in separate categories:

- Linear uses time-boxed cycles to sustain team momentum and structured project updates to communicate health ([Linear Cycles](https://linear.app/docs/use-cycles), [Linear project updates](https://linear.app/docs/initiative-and-project-updates)).
- Asana connects tasks to measurable goals and recommends recognizing milestones to maintain motivation ([Asana Goals](https://help.asana.com/s/article/setting-and-tracking-progress-towards-goals?language=en_US)).
- Sunsama uses a guided daily ritual and predicted workload to make an achievable plan ([Sunsama Daily Planning](https://help.sunsama.com/docs/usage-guides/daily-planning/)).
- Habitica makes completion immediately rewarding through explicit game mechanics ([Habitica Features](https://habitica.com/static/features)).

**Inference:** There is room for a team-capable tool that combines capacity realism with a restrained fantasy-RPG frame. The game layer should create identity and immediate feedback without punishment, noisy celebration, random rewards, or a dense executive reporting surface.

Forth’s motivation model is intrinsic and social:

1. **Autonomy:** the user declares a light, steady, or full pace.
2. **Meaning:** each move may state why it matters to the project outcome.
3. **Achievability:** today is intentionally limited to three moves.
4. **Evidence:** completion is preserved in a calm “Proof” ledger.
5. **Recovery:** blocked work is a valid visible state, not personal failure.

## 3. Delivery phases

### Phase 1 — Local MVP (this build)

The full motivational loop works with seeded data and browser persistence. It must feel coherent, responsive, keyboard-usable, and demo-ready without cloud credentials.

### Phase 2 — Private beta (active)

Firebase Authentication and Cloud Firestore provide authenticated cloud persistence with a local fallback. Owner-created guild workspaces, email-matched invitations, and emulator-tested rules are connected. Conflict-aware multi-member editing, activity attribution, and recovery UX remain future beta work.

### Phase 3 — Public beta

Onboarding, notifications, analytics, import/export, error reporting, backups, performance budgets, and production accessibility/security review.

### Phase 4 — Production readiness

Role-based authorization, auditability, retention controls, operational runbooks, rate limiting, restore testing, and incident ownership.

## 4. Critical workflows

### W1 — Set today’s pace

- Entry: Today view, “Today’s pace” control.
- Happy path: choose Light (4 stones), Steady (7), or Full (10); capacity meter updates immediately.
- Edge case: planned task weight exceeds capacity; show a neutral “over plan” message, never a shame state.
- Completion signal: selected pace persists across refreshes.

### W2 — Create a meaningful move

- Entry: “Add a move” from Today or Board.
- Happy path: enter a title, project, effort weight, and optional meaning; new move appears in Ready.
- Validation: title and project are required; whitespace-only titles are rejected.
- Completion signal: non-blocking confirmation toast and visible card.

### W3 — Move work forward

- Entry: task actions in Today or Board.
- Happy path: Ready → Moving → Done, or any active task → Paused.
- Recovery: Paused → Ready is always available.
- Completion signal: status updates immediately and persists.

### W4 — See proof of progress

- Entry: Proof navigation item or completing a move.
- Happy path: completed moves appear chronologically with project and meaning.
- Empty state: invite the user to complete one meaningful move; do not show a zero score.

## 5. Functional requirements

- **FR-001 / P0:** Persist pace, projects, tasks, and completion events in browser storage for local MVP use.
- **FR-002 / P0:** Provide Today, Board, Proof, and Settings views without page reloads.
- **FR-003 / P0:** Create, transition, and complete a task with accessible controls.
- **FR-004 / P0:** Limit the Today focus surface to no more than three unfinished moves.
- **FR-005 / P1:** Visualize planned effort against selected capacity using both text and a meter.
- **FR-006 / P1:** Show project progress derived from completed task weight rather than manually entered percentages.
- **FR-007 / P1:** Allow resetting the local demo to a safe seeded state after confirmation.
- **FR-008 / P1:** Prepare Firebase environment configuration and deny-by-default workspace security rules.
- **FR-009 / P1:** Remain usable at 375 px, 768 px, 1024 px, and 1440 px widths.
- **FR-010 / P1:** Respect reduced-motion preferences and visible keyboard focus.

## 6. Design and UX requirements

### First five seconds

The user should understand: “This is today’s believable plan; I can see the project purpose, my three next moves, and evidence that the team is moving.”

### Navigation

Desktop uses a narrow persistent left rail. Mobile uses a compact top bar and fixed bottom navigation. Today is the default. Board is the complete work map. Proof is the motivational history. Settings communicates persistence and integration state honestly.

### Visual direction

- **Aesthetic:** original 16-bit medieval software-guild ledger: parchment, iron frames, tile grids, heraldic status colors, and compact RPG HUDs.
- **Palette:** night green, parchment, oak, moss, oxblood, slate, and amber gold.
- **Typography:** monospace for system/navigation copy, book serif for hierarchy and ticket titles, plain sans for longer descriptions.
- **Surfaces:** square two-pixel rules, stepped shadows, hard corners, double dividers, and code-native tile textures.
- **Motif:** campaign maps, quest inscriptions, save runes, guild chronicles, and one restrained animated code-squire sprite.
- **Clarity:** pair fantasy naming with recognizable ticket concepts; the theme may not obscure status, priority, ownership, due date, or destructive actions.
- **Avoid:** purple/blue AI gradients, glassmorphism, glowing orbs, sparkle icons, chatbot-first layouts, universal pills, glossy mobile-game rewards, confetti, streak pressure, and public rankings.

### Copy system

Use verbs that describe motion without judgment: Move, Ready, Moving, Paused, Landed, Proof. Use “pace” and “capacity,” not “productivity score.” Use concise, warm language without wellness clichés.

## 7. Data and integration requirements

Entities: Workspace, Member, Project, Task, Completion Event, Daily Pace.

The UI consumes a workspace state contract independent of storage. Phase 1 uses localStorage. Phase 2 will implement the same contract with Firebase Auth and Firestore. Firebase client values must come from `NEXT_PUBLIC_FIREBASE_*`; no service credentials or secrets may enter the repo.

Suggested Firestore hierarchy:

```text
workspaces/{workspaceId}
  members/{userId}
  projects/{projectId}
  tasks/{taskId}
  completionEvents/{eventId}
  dailyPaces/{yyyy-mm-dd_userId}
```

## 8. Security, privacy, and reliability

- The local MVP stores only demo/user-entered project text in that browser.
- Never imply cross-device sync in local mode.
- Firestore rules require authentication and workspace membership before nested reads/writes.
- Production must validate resource ownership server-side and test rules with the Firebase emulator.
- Destructive reset requires explicit confirmation.
- Invalid stored data falls back to safe seed data instead of breaking the UI.

## 9. Acceptance criteria

1. Given a first visit, when the app loads, then meaningful seeded content appears with an explicit “Local demo” status.
2. Given any supported viewport, when the Today view renders, then navigation, pace controls, the next-three list, and primary actions remain reachable without horizontal page scrolling.
3. Given a valid task form, when the user submits it, then a new Ready task is persisted and announced.
4. Given a Ready task, when the user starts it, then its state becomes Moving on both Today and Board.
5. Given an unfinished task, when the user completes it, then it leaves the active list, updates project progress, and appears in Proof.
6. Given a Paused task, when the user chooses “Make ready,” then the task returns to Ready.
7. Given stored state, when the page refreshes, then the same state is restored.
8. Given corrupted local state, when the app loads, then it recovers to seeded data without a white screen.
9. Given keyboard-only navigation, when controls receive focus, then focus is visually apparent and all task transitions are operable.
10. Given reduced-motion preference, when state changes, then nonessential motion is removed.

## 10. Verification plan

- Unit: state transitions, capacity math, progress derivation, corrupt-data fallback.
- Static: ESLint and TypeScript strict mode.
- Build: Next.js production build.
- Visual: 375×812, 768×1024, 1440×1000 screenshots; Today, Board, Proof, add-move dialog.
- Accessibility: semantic headings, labeled controls, dialog focus behavior, visible focus, color contrast, reduced motion.
- Security: secret scan, environment review, Firestore rule inspection, dependency audit where available.

## 11. Agent handoff brief

- Build objective: prove the complete motivation loop before cloud integration.
- First slice: Today pace → create move → transition → Proof ledger.
- Commands: `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Approval gates: Firebase project creation, production deployment, auth provider enablement, data migration, destructive production operations.
- Definition of done: acceptance criteria pass, responsive visual QA is complete, no secrets are committed, and remaining production work exists as scoped backlog tickets.
