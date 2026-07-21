# Agent Handoff

This is the durable relay between Codex, Claude Code, and human contributors. Keep it current; do not use it as a second backlog.

## Current checkpoint

- Date: 2026-07-21
- Worktree: `C:\Users\calvi\Documents\Codex\forth-ticket019`
- Branch: `codex/ticket-019-contributor-guide`
- Base checkpoint: `codex/ticket-010-auth-entry` (`90198d7`), represented by draft PR #17
- Active ticket: TICKET-019 - safe fellow-contributor workflow and ownership policy
- Release state: documentation-only stacked work in progress; not merged or deployed

## Implemented in this checkpoint

- Human-facing `CONTRIBUTING.md` with ticket claims, explicit scope confirmation, protected areas, validation, external-preview boundaries, and agent instructions.
- Repository ownership, PR template, ticket-claim and bug-report forms, security reporting, and a durable decision-log format.
- `AGENTS.md` coordination rules that require agents to inspect active work and honor the confirmed ticket slice.
- PR #18 intake mapped to existing tickets without merging its outdated pre-authentication assumptions.

## Validation at handoff

- `git diff --check`: passed.
- Secret-pattern scan: passed; only policy prose mentioning credential categories was found.
- Issue-form YAML received a manual structure review. No local YAML parser is installed, so hosted GitHub rendering remains the final syntax check after push.
- No application runtime code changed; full application suites remain inherited from PR #17.

## Remaining before merge/deploy

1. Review the complete staged documentation diff.
2. Push a stacked draft PR targeting `codex/ticket-010-auth-entry`.
3. After PR #17 lands, retarget this PR to `main`, verify branch protection requires CODEOWNERS review, and dry-run the guide with a fresh contributor.

## Known next risk

CODEOWNERS and templates communicate policy in the repository, but GitHub branch-protection settings must enforce required checks and review externally. TICKET-001 remains the next product P0 after the active authentication and governance stacks land.

## Required end-of-session update

Replace these checkpoint/status sections with the actual branch, commit, checks, uncommitted files, blockers, and safest next command. Keep architecture/product work in `docs/ticket-backlog.md`, not here.
