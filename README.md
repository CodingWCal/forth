# Forth

**Project work with a pulse.** Forth is an authenticated team ticketing and productivity app that helps software teams choose an honest pace, keep at most three meaningful quests close, move work visibly, and preserve shipped work as proof. A separate, explicit local demo is available without an account.

Built for the **Curious Boston × Hult International School AI Engineering Cohort — Week 1 Project**.

- Production: [https://forth-bice.vercel.app](https://forth-bice.vercel.app)
- Source: [CodingWCal/forth](https://github.com/CodingWCal/forth)

## Product idea

Most project tools are excellent inventories of unfinished work. Forth keeps the useful structure of a ticket board while changing its emotional center:

- **Pace before pressure:** choose Scout, Venture, or Raid capacity before filling the day.
- **Three meaningful quests:** a strict work-in-progress limit keeps Today believable.
- **Camped is a valid state:** blocked work remains visible without labeling a person as behind.
- **Proof over points:** completed tickets enter a permanent Chronicle with their purpose attached.
- **Private progression:** shipped effort advances a small fantasy guild identity without leaderboards, streak loss, penalties, or public comparison.

In engineering terms, Forth combines capacity planning, a WIP limit, deterministic state transitions, derived progress, versioned browser persistence, Firebase authentication, and owner-scoped Firestore storage.

## Current features

### Quest Log — Today

- Set daily capacity and see planned effort against it.
- Keep no more than three unfinished tickets in the active party.
- Begin, pause, resume, or ship focused work.
- See private guild rank, earned gold, and a seven-day completion history.

### Realm Map — Kanban board

- Filter tickets by project and search title, description, or purpose.
- Move work through Quest Log, In Forge, Camped, and Shipped.
- Drag tickets between columns with a pixel-sword cursor on desktop.
- Use explicit move buttons on keyboard and touch devices.
- Create, fully edit, assign, prioritize, focus, move, and delete tickets.

### Chronicle — Proof ledger

- Review shipped tickets newest-first.
- Preserve the project, purpose, builder, effort, and completion date.
- Derive project progress from completed ticket weight rather than manually entered percentages.

### Guild Hall — Account and persistence

- Enter through a literal account boundary before any workspace tickets render.
- Sign in with Google or GitHub to access authorized Firebase workspaces.
- Start a first real workspace with a user-named campaign and zero sample tickets.
- Explore sample content only through an explicitly labeled, disposable browser-local demo.
- Synchronize the current workspace through Cloud Firestore.
- Found additional guild workspaces and create new campaigns inside them.
- Invite a teammate by their account email; pending invitations appear inside Forth after sign-in.
- Sign out by immediately unmounting cloud workspace data and returning to the entry page.
- Reset sample content only inside demo mode; seeded data is never silently copied into Firestore.

## Motivation and engagement design

Forth uses a restrained 16-bit medieval software-guild theme to make state memorable without turning productivity into a casino. The game layer rewards meaningful completion, not compulsive return behavior.

The motivation model is:

1. **Autonomy:** the user declares a realistic pace.
2. **Meaning:** each ticket can explain why it matters.
3. **Achievability:** Today is limited to three active quests.
4. **Evidence:** completion becomes durable proof in the Chronicle.
5. **Recovery:** paused work can camp and return without punishment.

There are no public rankings, random rewards, broken-streak warnings, shame states, or productivity grades.

## Architecture summary

**Plain English:** Forth checks the account before loading team data. Real work is read from the selected authorized cloud workspace; sample work exists only in the separate demo chosen by the visitor.

**Engineering terms:** Forth is a Next.js App Router application with an explicit auth/entry state machine, reducer/selectors domain layer, runtime-validated `WorkspaceState`, isolated demo-storage adapter, Firebase Auth boundary, debounced Firestore persistence adapter, and Firestore Security Rules authorization boundary.

```text
Entry boundary (`components/forth-entry.tsx`)
        ├── Google / GitHub Firebase Auth
        ├── explicit browser-local demo
        └── authorized workspace loading
                    │
                    ▼
React UI (`components/forth-app.tsx`)
        │ typed WorkspaceAction
        ▼
Reducer + selectors (`lib/workspace.ts`)
        │
        ├── demo-only localStorage namespace
        └── Firebase workspace boundary
              ├── workspaces/{workspaceId}/data/current
              └── owner/member Firestore Security Rules
```

Core domain rules stay independent of storage so the local and cloud adapters use the same state contract.

## Technology

- Next.js 16 App Router
- React 19
- Strict TypeScript
- Hand-built responsive CSS design system
- Firebase Authentication and Cloud Firestore
- Vitest and Firebase Rules Unit Testing
- Vercel production deployment
- pnpm 11 package management

## Fresh-clone setup

Requirements:

- Node.js 22+
- pnpm 11+ through Corepack
- Java/JDK for the optional Firestore emulator test suite

```bash
git clone https://github.com/CodingWCal/forth.git
cd forth
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Firebase is optional for local development; without environment values, account buttons are disabled and the clearly labeled local demo remains available.

### Optional Firebase configuration

Copy `.env.example` to `.env.local` and provide the public Firebase Web App configuration:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

`NEXT_PUBLIC_*` values are public browser configuration, not secrets. Actual authorization is enforced by `firestore.rules`. Never add a service-account JSON file, private key, or Firebase Admin credential to this repository.

For account entry, enable the Google provider and the GitHub provider in Firebase Authentication. GitHub also requires a GitHub OAuth App whose callback URL is the Firebase handler shown in the Firebase console. Add every production or preview hostname used for sign-in to Firebase Authentication's authorized domains.

## Quality and verification

```bash
pnpm lint          # ESLint
pnpm typecheck     # strict TypeScript
pnpm test          # reducer, selector, parser, and persistence-domain tests
pnpm test:rules    # emulator-backed Firestore authorization tests
pnpm build         # production Next.js build
```

The rules command uses the Firebase Emulator Suite and may download `firebase-tools` through `npx` on its first run.

Release QA also exercises Today, Realm Map, Chronicle, Guild Hall, ticket creation/editing/deletion, every status transition, WIP enforcement, refresh persistence, authentication/sync states, empty/error states, keyboard operation, reduced motion, and 375px/768px/1440px responsive layouts.

## Deployment

Vercel imports the GitHub repository and deploys the `main` branch with the standard Next.js build. The six Firebase browser variables are configured in Vercel for Production and Preview. Firebase Authentication authorizes `forth-bice.vercel.app`, and Firestore rules are deployed separately through Firebase tooling.

## Security model

- Signed-out visitors cannot see workspace ticket data.
- Anonymous visitors enter sample content only after explicitly choosing the browser-local demo.
- Firebase reads and writes require authentication.
- Workspace creation is bound to its authenticated owner, while invited accounts may create only their own member record after a matching email invitation exists.
- Workspace ownership cannot be reassigned through a client update.
- Outsiders cannot read or write another workspace.
- Client-side visibility is never treated as authorization.
- Stored local or cloud state is runtime-validated before the UI accepts it.
- Demo storage uses a separate key and is never passed to cloud workspace creation.

## Known limitations

- Firestore synchronization uses whole-workspace, last-write-wins documents; simultaneous multi-device editing has no conflict-resolution interface yet.
- Invitations are delivered by the owner sharing the displayed guild code out of band; Forth does not send transactional email.
- GitHub sign-in requires the external OAuth provider configuration documented above; code alone cannot enable it in Firebase.
- Desktop supports native drag and drop; touch and keyboard users use the explicit ticket movement buttons.
- There is no notification system, analytics dashboard, audit log, backup/restore console, or operational error monitoring yet.
- Unit and Firestore-rule suites are automated; UI flow verification is currently a release QA procedure rather than a committed Playwright suite.

These are intentionally scoped private-beta boundaries, not hidden production claims. Future work is tracked in [`docs/ticket-backlog.md`](docs/ticket-backlog.md).

## Agent usage summary

Codex and custom agent skills supported product planning, PRD generation, visual-direction work, backlog creation, implementation, Firebase integration, security review, browser QA, and release documentation. Agents generated and revised code, but the repository uses deterministic application logic—there is no LLM or AI API dependency at runtime.

The workflow used explicit validation gates: source review, typed domain rules, unit tests, Firestore emulator tests, linting, production builds, browser exercises, and human approval before external or destructive operations.

## Cohort submission reference

The cohort checklist requires:

- Submission branch: `participants/summer26/phase-1-project-1/CodingWCal`
- PR target: `projects/summer26/phase-1-project-1`
- PR title: `[Project 1] Submission — CodingWCal`
- PR description: production URL, fresh-clone setup verification, architecture summary, motivation/engagement notes, known limitations, and agent usage summary
- Merge deadline shown in the supplied requirements: Sunday, July 19 at 5:00 PM ET

This README contains each required description section. Creating the cohort-repository branch and pull request is a separate submission action.

## Project documentation

- [Product requirements](docs/PRD.md)
- [Design direction](docs/DESIGN.md)
- [Phase 2 private-beta contract](docs/PHASE2.md)
- [Future ticket backlog](docs/ticket-backlog.md)
- [Agent operating instructions](AGENTS.md)
