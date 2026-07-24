### Backlog ticket
TICKET-005

### Proposed user outcome
Returning cloud users who still have engineering demo tickets get a one-time, explicit choice: keep current work, replace with the engineering demo, or start empty. New users are unaffected — onboarding already creates clean workspaces.

### Proposed implementation slice
- Add `lib/seed-detection.ts` with stable ID fingerprinting for the engineering demo
- Add `lib/migration.ts` for versioned device-local migration records (not synced to Firestore)
- Gate cloud workspace entry in `components/forth-entry.tsx` with a migration-choice screen
- Show a keep banner + Guild Hall "Review sample data choice" re-entry in `components/forth-app.tsx`
- Unit tests in `tests/migration.test.ts`

### Deliberately out of scope
- No changes to `firestore.rules`, auth adapters, or `lib/types.ts` workspace shape
- No automatic cloud deletion without user confirmation
- No loading engineering demo into new authenticated accounts (demo remains browser-local)

### Overlap and dependencies
Checked open issues and PRs — no active claim for TICKET-005 as of Jul 24, 2026.

### Validation plan
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all pass locally
- Manual: migration screen appears when cloud workspace matches seed fingerprint and no prior decision exists

### Coordination agreement
- [x] I will wait for explicit scope confirmation before coding.
- [x] I will not deploy, change production services, or request production secrets.
- [x] My coding agent, if used, will read the repository instructions before editing.

@CodingWCal
