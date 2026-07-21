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

The initial Firestore shape is intentionally simple:

```text
workspaces/{ownerUid}
  members/{ownerUid}
  data/current
    state: WorkspaceState
```

This supports a deliberately small shared-team beta. The invitation is matched against the signed-in account email before that account can create its own member record. The whole-workspace snapshot remains a private-beta tradeoff, so simultaneous edits can still resolve last-write-wins.

## Security boundary

- Google and GitHub providers must be enabled for the sign-in buttons intended for that environment.
- Firestore starts deny-by-default until the Forth rules are published.
- A new user explicitly creates a first workspace and real campaign; Forth never provisions cloud data from demo state.
- Public Firebase configuration belongs in Vercel environment variables, never source control.
- The deployed host `forth-bice.vercel.app` must remain in Firebase Authentication's authorized-domain list.

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
