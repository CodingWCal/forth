# Forth

**Project work with a pulse.** Forth is a motivational project-management MVP for small creative and product teams. It helps a team choose an honest daily pace, keep only three meaningful moves close, recover gracefully from blockers, and preserve a visible record of what became real.

## Why this is different

Most project tools are excellent inventories of unfinished work. Forth keeps the inventory, but changes the emotional center of the product:

- **Pace before pressure:** choose Light, Steady, or Full capacity before filling the day.
- **Three meaningful moves:** a work-in-progress limit keeps today believable.
- **Paused is a valid state:** blockers are visible without labeling a person as behind.
- **Proof over points:** completed work becomes a purpose-rich ledger, not a score or streak.
- **Local honesty:** the current MVP clearly says when data lives only in this browser.

In engineering terms, Forth combines capacity planning, a WIP limit, deterministic task state transitions, derived project progress, and a completion event surface.

## Stack

- Next.js 16 App Router
- React 19 + strict TypeScript
- Hand-built responsive CSS design system
- Vitest for domain logic
- LocalStorage persistence for the zero-credential MVP
- Firebase Auth + Cloud Firestore integration boundary for private beta
- Vercel-ready production build

## Quick start

Requirements: Node.js 22+ and pnpm 11+.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Product tour

1. **Today:** set capacity, choose three moves, begin, pause, or land work.
2. **Work map:** inspect one project across Ready, Moving, Paused, and Landed.
3. **Proof:** review completed work with its original reason attached.
4. **Settings:** see the real persistence state and reset only local demo data.

Browser state uses the key `forth.workspace.v1`. Invalid or corrupt data falls back to the safe seeded workspace instead of crashing.

## Architecture in two languages

**Plain English:** The rules for changing work live outside the screen. The screen asks for a change, one predictable rule applies it, and calculated values such as progress are rebuilt from the actual tasks.

**Engineering terms:** `lib/workspace.ts` is a reducer/selectors domain layer. Components dispatch typed `WorkspaceAction` events; progress, planned weight, focus work, and momentum are derived selectors. Storage is an adapter around a versioned, runtime-validated `WorkspaceState`.

```text
User action
   ↓
Typed reducer action ──→ Workspace state ──→ Derived selectors ──→ UI
                              ↓
                    localStorage adapter now
                    Firestore adapter in beta
```

## Connect Firebase for private beta

The local MVP does not need Firebase. To prepare a real private-beta environment:

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. Register a Web app and copy its public web configuration.
3. Enable Authentication providers (email link or Google are reasonable first choices).
4. Create a Cloud Firestore database in the correct region for your users.
5. Copy `.env.example` to `.env.local` and fill the six `NEXT_PUBLIC_FIREBASE_*` values.
6. Install the Firebase CLI separately, authenticate, and select the intended project.
7. Review `firestore.rules`, then test owner/member/outsider cases with the Firebase Emulator Suite.
8. Deploy the rules only after the emulator tests pass.
9. Implement the Firestore persistence adapter and auth screens behind the current workspace state contract.

The Firebase web values identify a project but are not server secrets. Authorization must remain in Firestore Security Rules; hiding UI buttons is not security.

Suggested data shape is documented in [the PRD](docs/PRD.md#7-data-and-integration-requirements).

## Deploy with Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected Next.js defaults (`pnpm build` and framework-managed output).
4. If Firebase is enabled, add the six public Firebase variables in Vercel project settings for Preview and Production.
5. Deploy, then test local-demo/Firebase labeling, task creation, task completion, refresh persistence, and mobile layout on the generated URL.
6. Promote to production only after the private-beta auth and Firestore rule checks pass.

Every GitHub commit can then create a Vercel deployment; pull requests can receive separate preview URLs.

## Documentation

- [Product requirements](docs/PRD.md)
- [Design direction](docs/DESIGN.md)
- [Future ticket backlog](docs/ticket-backlog.md)
- [Agent operating instructions](AGENTS.md)

## Current boundary

This repository is a polished local-first MVP, not a production collaboration service yet. Authentication, member invitations, live synchronization, Firestore emulator tests, analytics, and operational monitoring belong to the private/public beta phases and will be tracked in the backlog.
