# Forth → Cohort Comms integration handoff

## Current status

Forth owns the sender-side implementation in `CodingWCal/forth`. It adds a server-only `POST /api/integrations/cohort-comms` relay, canonical Firestore ticket verification, stable event IDs, bounded one-attempt delivery after a successful cloud save, explicit retry UI, and hash navigation for iframe links. This branch is not deployed and the full integration is not live until both applications have matching environment variables and a coordinated end-to-end test passes.

Ownership split: Calvin maintains Forth and its sender behavior. Priyansh maintains `priyanshshahh/cohort-comms` and its receiver behavior. Neither maintainer needs to directly maintain the other repository.

## Flow

Ticket shipped in Forth  
→ Firestore save succeeds  
→ Forth verifies the canonical ticket  
→ Forth sends the event  
→ Cohort Comms receives it  
→ Forth bot posts in chat

Forth is the ticket source of truth. Cohort Comms is the communication source of truth. The iframe and webhook are separate integration features. They do not share authentication, sessions, databases, or technical SSO.

## Production contract

- Forth: <https://forth-bice.vercel.app>
- Cohort Comms: <https://cohort-comms-phi.vercel.app>
- Receiver: `POST https://cohort-comms-phi.vercel.app/api/webhooks/forth`
- Headers: `content-type: application/json`, `x-forth-secret: <shared-secret>`
- Cohort Comms accepts `200` duplicate and `201` created as success; `400` is invalid input, `401` is a secret mismatch, and `503` means it is not configured.

### Version 1 payload

```json
{
  "version": 1,
  "id": "forth-ticket-shipped-<sha256-prefix>",
  "event": "ticket.shipped",
  "sentAt": "2026-07-29T12:00:00.000Z",
  "channel": "general",
  "workspace": { "id": "workspace-id" },
  "ticket": {
    "id": "task-id",
    "title": "Ship the release",
    "status": "Shipped",
    "statusCode": "done",
    "assignee": "Calvin",
    "projectId": "project-id",
    "completedAt": "2026-07-29T12:00:00.000Z",
    "url": "https://forth-bice.vercel.app/#proof"
  }
}
```

The event ID hashes event type, workspace ID, task ID, canonical `done` status, and canonical completion time. Retries and rerenders reuse the same ID. Reopening and shipping later creates a new ID because `completedAt` changes. Forth sends only `ticket.shipped`; demo activity never sends. A failed delivery never rolls back a successful Forth save. Forth makes at most one automatic attempt, permits one explicit retry path, and allows only one request in flight per event. Reopening, deletion, workspace switching, sign-out, and leaving cloud mode invalidate pending work.

## Configuration

Set these in Forth’s server environment only; no real values belong in git or this file:

```text
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
COHORT_COMMS_WEBHOOK_URL=https://cohort-comms-phi.vercel.app/api/webhooks/forth
COHORT_COMMS_WEBHOOK_SECRET=
COHORT_COMMS_CHANNEL=general
FORTH_CANONICAL_URL=https://forth-bice.vercel.app
```

The private key must convert escaped `\\n` sequences to newlines. The webhook URL must be HTTPS outside local development. The browser cannot override the URL, channel, or secret. No service-account JSON, public secret, or actual shared secret is included here.

## Security boundaries

The browser sends only `workspaceId` and `taskId` plus a Firebase ID token to Forth’s route. The Node route verifies the token, checks owner/member access, reads the canonical task from Firestore, requires `done` plus a valid `completedAt`, clamps strings, and attaches `x-forth-secret` server-side. Missing configuration fails closed for the integration without breaking normal ticket persistence. Cohort Comms webhook delivery remains independent of its GitHub/Google interactive login and cohort admission.

## Receiver follow-up notes

Do not recreate, rename, delete, or replace the existing `webhook_events` table or data. The current receiver appears to reserve `payload.id` before inserting the bot message; a database, channel, or insertion failure can therefore consume an ID without creating a message. Make reservation and message creation atomic or safely release/recover the reservation. There is no receiver rate limit, so Forth deliberately does not create automatic retry loops.

The current URL normalizer may reduce an existing `/#proof` hash to the root. Preserve allowlisted Forth hashes while continuing to strip unrelated external URLs.

## Manual end-to-end QA

1. Configure matching secrets and URLs in both deployed applications.
2. Sign into Forth and use a real cloud workspace; confirm demo mode never sends.
3. Ship a ticket and confirm Firestore reports saved before the request is made.
4. Confirm one Cohort Comms bot message appears in the configured channel.
5. Repeat the same event and confirm no duplicate message.
6. Force a receiver failure, confirm Forth still says the ticket is saved, then use the explicit retry once.
7. Reopen and ship again; confirm a new event/message.
8. Test `/#proof` and `/#board` directly and inside the iframe at desktop/mobile widths and with keyboard navigation.

Placeholder request (never paste a real secret into source control):

```bash
curl -X POST https://cohort-comms-phi.vercel.app/api/webhooks/forth \
  -H 'content-type: application/json' \
  -H 'x-forth-secret: REPLACE_LOCALLY' \
  -d '{"version":1,"id":"forth-ticket-shipped-example","event":"ticket.shipped","channel":"general","workspace":{"id":"workspace-id"},"ticket":{"id":"task-id","title":"Example","status":"Shipped","statusCode":"done","assignee":"Calvin","projectId":"project-id","completedAt":"2026-07-29T12:00:00.000Z","url":"https://forth-bice.vercel.app/#proof"}}'
```

## Disable and rollback

Remove or blank `COHORT_COMMS_WEBHOOK_SECRET` or `COHORT_COMMS_WEBHOOK_URL` in Forth’s server environment to disable delivery; normal Forth cloud saves continue. Roll back the sender route/client change to the prior Forth release if necessary. Receiver rollback must preserve `webhook_events` data and existing bot behavior.

## Agent Prompt for Cohort Comms

Work only in the latest `priyanshshahh/cohort-comms` repository state. Read that repository’s own instructions first. Preserve existing authentication, admission, chat, iframe, bot, link cards, and webhook behavior. Keep webhook delivery independent of GitHub or Google interactive authentication. Accept Forth’s version 1 `ticket.shipped` payload backward-compatibly and keep the `x-forth-secret` contract. Validate the event, channel, and bounded strings. Preserve hostile external URL stripping while preserving allowlisted Forth hashes such as `#proof` and `#board`. Preserve the existing Forth bot. Preserve the existing `webhook_events` table and data; do not recreate, rename, delete, or replace it. Make event deduplication and message creation atomic or safely recoverable so a failed message insert does not permanently consume an event ID and concurrent duplicates create at most one message. Do not add shared databases or technical SSO. Avoid unrelated redesigns. Add focused tests and run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Do not modify Forth, deploy, or expose secrets. Return a concise PR-ready handoff.
