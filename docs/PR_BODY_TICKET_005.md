## Summary

Implements **TICKET-005**: explicit demo-data onboarding and migration choice for cloud workspaces that still contain engineering seed content.

- Detects canonical seed project/task IDs via `lib/seed-detection.ts`
- Stores versioned device-local migration decisions in `lib/migration.ts`
- Gates cloud entry with keep / replace-demo / start-empty UI in `forth-entry.tsx`
- Shows keep banner + Guild Hall re-review in `forth-app.tsx`
- Adds unit tests in `tests/migration.test.ts`

## Test plan

- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test` (54 passed)
- [x] `pnpm build`
- [ ] Manual cloud smoke: returning user with seed fingerprint sees migration screen
- [ ] Manual: confirmed replace/start-empty persists via existing save path

## Notes

Claim issue body in `docs/CLAIM_TICKET_005.md`. Friction notes in `docs/FRICTION_POINTS_VLEZAMA.md`.

@CodingWCal
