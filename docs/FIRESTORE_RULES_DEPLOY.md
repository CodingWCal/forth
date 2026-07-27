# Deploying Firestore rules (microsteps)

Firestore rules are **deploy-time state, not repository state**. A rule committed to
`firestore.rules` and passing `pnpm test:rules` has no effect on production until
someone publishes it. This document is the checklist for doing that safely.

Project: `forth-86e26` (see `.firebaserc`).

## Why this exists

Nothing in this repository publishes or verifies rules, so the only way to learn
what production is enforcing is for a person to open the console and read it. That
came up during the 2026-07-27 cloud-save investigation, where stale rules were a
leading hypothesis and checking it took a manual console visit.

**That investigation cleared the rules.** The active ruleset on `forth-86e26`
contains `isNormalizedTask` and `isOpenCohortGuild` and was published Jul 24 2026,
four minutes after `4e572e5`. The outage was a client-side bug (TICKET-035), not a
rules problem. This document exists for the *next* rules change, not that one.

The drift it guards against is real, though. Anything a ruleset does not mention is
denied by default, so shipping a client that writes a new collection before
publishing the matching rule produces a distinctive signature:

- reads succeed → the workspace loads and renders its tickets normally
- every write is denied → "Cloud save needs attention"

Confirmed in the emulator by replaying the real client save path against the
pre-TICKET-001 ruleset:

| Write | Pre-TICKET-001 rules | Current rules |
|---|---|---|
| `workspaces/{id}/data/current` | allowed | allowed |
| `workspaces/{id}/projects/*` | No matching allow statements | allowed |
| `workspaces/{id}/tasks/*` | No matching allow statements | allowed |
| `workspaces/{id}/recovery/legacy-v2` | No matching allow statements | allowed |

If you ever see that signature again — everything renders, nothing saves — this
table tells you where to look first.

## Before you publish anything

1. Run `pnpm test:rules` on the commit you intend to deploy. It must pass (22/22
   at the time of writing). Never publish rules that have not passed the emulator.
2. Know which commit you are deploying from. `git log --oneline -1 -- firestore.rules`.
3. Read the consequence below.

**Consequence to accept before publishing:** the new rules are more permissive for
the normalized collections but *stricter* for `data/current` — a blind whole-document
write now fails closed. Any browser tab still running a pre-TICKET-001 client will
start failing its saves. Tell active users to reload after you publish. This is the
intended fail-closed behavior, not a regression.

Publishing is effectively instant and global; allow about a minute for propagation.

---

## Path A — Firebase Console (no install; recommended for this first fix)

1. Open <https://console.firebase.google.com/> and sign in as the project owner.
2. Select the project **forth-86e26**.
3. In the left sidebar choose **Build → Firestore Database**.
4. Select the **Rules** tab.
5. **Capture the rollback copy first.** Select all the text currently in the editor,
   copy it, and save it locally as `rules-before-<date>.txt`. Do not skip this.
6. Note the **Last published** timestamp shown above the editor. Write it down — this
   is your evidence of what production was actually enforcing.
7. **Parity check before you change anything.** Search the editor (Ctrl+F) for the
   function names your committed rules introduce — for the current ruleset that is
   `isNormalizedTask` and `isOpenCohortGuild`. If they are already present, the
   rules are current: **discard, publish nothing, and look elsewhere for the cause.**
   Ten seconds here beats a needless publish.
8. In your local checkout, open **`firestore.rules`** — the rules file at the
   repository root, *not* this document — and copy the **entire** file. Pasting the
   wrong file produces `Error saving rules - Line 1: mismatched input ...`, which is
   harmless: the editor refuses to save, so click **Discard** and start again.
9. In the console editor, select all and paste over it. The file must be replaced
   whole — rules are not merged or patched.
10. Click **Publish**.
11. Confirm the **Last published** timestamp updated to now.
12. Record the commit SHA and the publish timestamp in `docs/AGENT_HANDOFF.md`.

### Rolling back (Path A)

The Rules tab keeps a version history. Open the history panel, select the previous
version, and publish it. Your `rules-before-<date>.txt` from step 5 is the backup in
case the history panel is unavailable.

---

## Path B — Firebase CLI

1. `npm install -g firebase-tools` (or use `npx firebase-tools` and skip the install).
2. `firebase login` — opens a browser; sign in as the project owner.
3. `cd` to the repository root (the directory holding `firebase.json`).
4. Confirm you are on the commit you intend to deploy: `git log --oneline -1`.
5. Capture the rollback copy from the console Rules tab as in Path A step 5. The CLI
   has no "download currently deployed rules" command, so this step stays manual.
6. Dry-run the surrounding config: `firebase deploy --only firestore:rules --project forth-86e26 --dry-run`
7. Publish: `firebase deploy --only firestore:rules --project forth-86e26`
8. Confirm the command reports success and re-check the console's **Last published**
   timestamp.
9. Record the commit SHA and publish timestamp in `docs/AGENT_HANDOFF.md`.

`firebase.json` already points `firestore.rules` at the repo file, so no path
arguments are needed.

---

## Verifying the deploy actually fixed saving

Do these in order. Stop at the first failure and roll back.

1. Open the app and sign in with a real account.
2. Open DevTools → **Network**, filter to `firestore`.
3. Edit a ticket — change its title or move its status.
4. Watch the workspace badge. It should pass through a syncing state and settle on
   the connected/synced state. It must not land on "Cloud save needs attention".
5. In the Network panel, confirm no `Write` request returns a permission error. A
   `PERMISSION_DENIED` here means the rules still do not match what the client writes.
6. **Make three more edits in a row without reloading the page.** This is the step
   that exercises TICKET-035; a single successful save does not prove the fix.
7. Reload the page and confirm all edits persisted.
8. If the account's workspace predates TICKET-001, confirm the migration ran: in the
   console, the workspace should now have `projects/` and `tasks/` subcollections and
   exactly one `recovery/legacy-v2` document.

## Keeping this from recurring

Rules and application code are two halves of one release, published by two different
mechanisms. The ordering requirement is: **permission for a new document shape must
exist before, or at the same time as, the code that writes it.**

TICKET-034 tracks adding a CI check that fails when the committed rules differ from
the deployed ruleset, so this drift is caught by a required check rather than by a
user reporting a broken save.
