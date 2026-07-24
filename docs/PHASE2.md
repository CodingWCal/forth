# Forth Phase 2: Private Guild Beta

Updated: 2026-07-20

## Product decision

Forth is moving from a browser-only demo into a simple, real ticketing app with a private cloud save. The core work loop stays intact: choose an honest pace, focus on up to three tickets, move tickets through Ready, Moving, Paused, and Landed, then keep a visible record of finished work.

The new visual layer is a restrained 8-bit fantasy guild theme. A ticket can be framed as a quest, but forms, filters, and safety language remain literal enough for normal project work.

## Included in this phase

- Authenticated landing and first-run routing before any ticket data renders.
- Google and GitHub sign-in through Firebase Authentication.
- Explicit disposable demo mode under its own browser-storage namespace.
- Clean first-workspace onboarding with one user-defined campaign and zero tickets.
- Owner-created Firestore guild workspaces with email-matched invitations.
- Invite acceptance after Google sign-in, using a shared guild code and a matching invite email.
- Campaign creation inside the active guild workspace.
- Ticket title, description, project, priority, due date, effort, focus state, and status.
- Search, rename, deletion, and ticket status transitions.
- A guild-rank HUD and gold earned from completed ticket effort.
- Browser storage only for the explicitly chosen demo; authenticated work comes from the selected Firestore workspace.

## Incentive contract

- A completed ticket earns 10 gold per effort point.
- Guild rank advances every 100 gold.
- The Proof ledger remains the durable record of completed work.
- No leaderboard, streak-loss mechanic, productivity score, random reward, or public comparison is allowed.

Plain English: the game layer should make finishing useful work feel satisfying, never make taking a break feel like failure.

Engineering terms: the reward model uses deterministic completion events and a derived progression view; it does not introduce a variable-ratio reinforcement loop or social ranking system.

## Architecture

The reducer and selectors remain the source of business rules. `ForthEntry` owns the authentication boundary and does not mount the ticket application until an explicit demo choice or a fully loaded authorized workspace exists. `localStorage` is the demo-only adapter; Firebase is the authenticated cloud adapter.

```text
Auth/entry state machine
     -> signed-out landing | onboarding | explicit demo | authorized workspace
     -> React ticket UI
     -> WorkspaceAction reducer
     -> WorkspaceState version 2
     -> demo-only localStorage OR authenticated Firestore workspace
```

The private-beta Firestore shape keeps the reducer contract intact while
storing collaborative records separately:

```text
workspaces/{workspaceId}
  members/{userUid}
  data/current
    storageVersion: 1
    schemaVersion: 2
    revision: integer
    pace: light | steady | full
  projects/{projectId}
  tasks/{taskId}
  recovery/legacy-v2   # immutable, created only during old-snapshot migration
```

The invitation is matched against the signed-in account email before that
account can create its own member record. Each cloud save runs in a Firestore
transaction, checks the revision it originally loaded, changes only the affected
project/ticket records, and advances the revision once. If another client saved
first, the stale write is rejected and the user chooses when to load the latest
cloud version; Forth does not silently overwrite either tab. Existing
whole-workspace documents remain readable and migrate on their first successful
write. That migration keeps one immutable recovery snapshot while all future
Proof entries grow as separate task documents.

This is optimistic concurrency control: users may edit without holding a lock,
but the commit succeeds only when its expected revision is still current.
TICKET-024 remains responsible for granular listeners, pagination, load testing,
and proving the complete 30+ user scale target.

## Security boundary

- Google and GitHub providers must be enabled for the sign-in buttons intended for that environment.
- Firestore starts deny-by-default until the Forth rules are published.
- A new user explicitly creates a first workspace and real campaign; Forth never provisions cloud data from demo state.
- Public Firebase configuration belongs in Vercel environment variables, never source control.
- The deployed host `forth-bice.vercel.app` must remain in Firebase Authentication's authorized-domain list.
- Normalized persistence and its Firestore rules must be released together. Deploy rules first, promote the matching app immediately afterward, and require old open tabs to refresh before further edits.

## Migration and rollback

This change crosses a persistence boundary, so it is not an ordinary frontend-only release.

1. Export or otherwise back up the production `workspaces` collection before promotion.
2. Publish the matching revision-aware rules to a staging Firebase project, then deploy the matching app build.
3. Exercise one legacy workspace with two authenticated browser sessions. Confirm the first edit creates `projects`, `tasks`, and `recovery/legacy-v2`; confirm a stale second edit is stopped.
4. Publish the rules and application as one coordinated production release, then ask users with an already-open tab to refresh before editing.
5. Verify the normalized metadata revision, member access, ticket persistence, and immutable recovery record before declaring the release healthy.

If rollback is required after a workspace has migrated, stop writes first. Restore the immutable `recovery/legacy-v2.state` value to the old `data/current` shape, then restore the old application and old rules together. Do not roll back only the application: an old client cannot safely write through the new normalized rules, and a new client cannot safely assume old rules enforce revision checks.

Plain English: the first safe save converts one big board file into smaller project and ticket records and keeps a sealed copy of the old board. App code and database rules are two halves of that safety mechanism.

Engineering terms: this is a lazy, transactional schema migration with an immutable recovery snapshot and a coordinated compatibility window; it is not backward-compatible with blind legacy writers after rules promotion.

## Acceptance checks

1. Before authentication resolves, no ticket, navigation, or sample workspace data renders.
2. A visitor can explicitly enter a clearly labeled local demo without Firebase configuration.
3. A configured visitor can sign in with Google or GitHub from the landing page.
4. A first sign-in leads to clean onboarding and creates no sample or pre-completed tickets.
5. Signing out immediately removes cloud workspace data from the UI and returns to the landing page.
6. A ticket with priority, due date, and description survives refresh and cloud sync.
7. Completing a ticket updates Proof and the deterministic guild-progress HUD.
8. An uninvited authenticated user cannot read or write another guild's workspace.
9. An invited account can join only a workspace addressed to its authenticated account email.
10. Demo data remains under its demo key and never becomes an authenticated provisioning payload.
11. Two clients starting from the same revision cannot both commit; the stale client retains its visible edits and receives an explicit recovery choice.
