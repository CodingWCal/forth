# Forth Phase 2: Private Guild Beta

Updated: 2026-07-16

## Product decision

Forth is moving from a browser-only demo into a simple, real ticketing app with a private cloud save. The core work loop stays intact: choose an honest pace, focus on up to three tickets, move tickets through Ready, Moving, Paused, and Landed, then keep a visible record of finished work.

The new visual layer is a restrained 8-bit fantasy guild theme. A ticket can be framed as a quest, but forms, filters, and safety language remain literal enough for normal project work.

## Included in this phase

- Google sign-in through Firebase Authentication.
- Owner-created Firestore guild workspaces with email-matched invitations.
- Invite acceptance after Google sign-in, using a shared guild code and a matching invite email.
- Campaign creation inside the active guild workspace.
- Ticket title, description, project, priority, due date, effort, focus state, and status.
- Search, rename, deletion, and ticket status transitions.
- A guild-rank HUD and gold earned from completed ticket effort.
- Local browser storage as a safe fallback until a user signs in.

## Incentive contract

- A completed ticket earns 10 gold per effort point.
- Guild rank advances every 100 gold.
- The Proof ledger remains the durable record of completed work.
- No leaderboard, streak-loss mechanic, productivity score, random reward, or public comparison is allowed.

Plain English: the game layer should make finishing useful work feel satisfying, never make taking a break feel like failure.

Engineering terms: the reward model uses deterministic completion events and a derived progression view; it does not introduce a variable-ratio reinforcement loop or social ranking system.

## Architecture

The reducer and selectors remain the source of business rules. `localStorage` remains the offline/local adapter. Firebase becomes an optional cloud adapter after configuration exists.

```text
React ticket UI
     -> WorkspaceAction reducer
     -> WorkspaceState version 2
     -> localStorage fallback
     -> authenticated Firestore workspace when signed in
```

The initial Firestore shape is intentionally simple:

```text
workspaces/{ownerUid}
  members/{ownerUid}
  data/current
    state: WorkspaceState
```

This supports a deliberately small shared-team beta. The invitation is matched against the signed-in Google email before that account can create its own member record. The whole-workspace snapshot remains a private-beta tradeoff, so simultaneous edits can still resolve last-write-wins.

## Security boundary

- Google sign-in is enabled.
- Firestore starts deny-by-default until the Forth rules are published.
- The owner creates and owns the first workspace at their Firebase UID.
- Public Firebase configuration belongs in Vercel environment variables, never source control.
- The deployed host `forth-bice.vercel.app` must remain in Firebase Authentication's authorized-domain list.

## Acceptance checks

1. A visitor can still use the app locally without Firebase configuration.
2. A configured visitor can sign in with Google from Settings.
3. A first sign-in provisions the user's owner guild and membership record.
4. Signing out removes cloud access but leaves the browser fallback usable.
5. A ticket with priority, due date, and description survives refresh and cloud sync.
6. Completing a ticket updates Proof and the deterministic guild-progress HUD.
7. An uninvited authenticated user cannot read or write another guild's workspace.
8. An invited account can use the owner-shared guild code to join only the workspace addressed to its Google email.
