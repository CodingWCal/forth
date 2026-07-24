# Contributing to Forth

Thanks for wanting to help with Forth. Cohort contributions are welcome, including work created with Codex, Claude Code, Cursor, Copilot, or another coding agent.

Forth has an active, sequenced roadmap. A quick scope check before coding keeps two people from solving the same ticket in incompatible ways and helps useful work reach `main` with less rework.

## The short version

1. Read [`README.md`](README.md), [`AGENTS.md`](AGENTS.md), [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md), and [`docs/ticket-backlog.md`](docs/ticket-backlog.md).
2. Search open issues and pull requests for overlapping work.
3. Open a **Ticket claim** issue, link the backlog ticket, describe your proposed slice, and mention `@CodingWCal`.
4. Wait for an explicit **scope confirmed** reply before implementation. A quiet issue is not approval.
5. Branch from the agreed base, keep the change focused, run the required checks, and open a draft PR early.
6. Do not deploy, alter production services, rotate credentials, or migrate real data.

If you already built something that overlaps active work, that is okay. Open the PR and explain the overlap. The maintainer may adapt or cherry-pick the useful commit while preserving authorship.

## Before claiming work

- Check the **Execution Status**, **External Contribution Intake**, and ticket details in [`docs/ticket-backlog.md`](docs/ticket-backlog.md).
- Check [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md) for the branch currently being implemented.
- Check open GitHub issues and PRs. Draft PRs still count as active work.
- Prefer an existing ticket over inventing a duplicate. If the idea is genuinely new, open a proposal issue before writing code.

Use the **Ticket claim** issue form. A useful claim states:

- the ticket number and acceptance criterion you want to own;
- the files or product area you expect to touch;
- what you will deliberately leave out;
- how you will test it;
- whether another PR or ticket blocks the work.

Small documentation corrections and obvious typo fixes do not need a full claim, but they still need a focused PR.

The backlog and agent handoff are canonical maintainer status files. External contributors and their agents should read them, but should report progress in the claim issue and PR instead of editing those files. Only edit `docs/ticket-backlog.md` or `docs/AGENT_HANDOFF.md` when the maintainer explicitly includes that documentation in the confirmed scope.

## Branch and commit workflow

After scope is confirmed:

```bash
git remote add upstream https://github.com/CodingWCal/forth.git  # once; skip if it already exists
git fetch upstream
git switch staging
git pull --ff-only upstream staging
git switch -c <your-handle>/ticket-###-short-description
```

Open normal feature and fix pull requests into `staging`. The maintainer promotes a tested release from `staging` to `main`; contributors should not target `main` unless the maintainer explicitly requests an emergency production fix. If the maintainer gives you a different base branch, use that exact branch and identify the dependency in your PR.

- Keep one ticket or independently reviewable slice per branch.
- Use focused, imperative commit subjects such as `Add keyboard movement for quest cards`.
- Do not force-push after review begins unless the reviewer asks you to clean up the branch.
- Never merge your own PR. `@CodingWCal` owns final integration and release timing.
- Do not add every temporary Vercel preview hostname to Firebase. Authenticated team testing uses the stable staging hostname documented in [`docs/STAGING.md`](docs/STAGING.md).

## Local setup

Requirements: Node.js 22+, pnpm 11+, and a JDK only when running the Firestore emulator suite.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Firebase credentials are not required to work in the explicit local demo. Never request or copy production Firebase, Vercel, OAuth, or service-account credentials.

## Required validation

Run from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also run the following when relevant:

```bash
pnpm test:rules   # Firestore schema, rules, membership, invitations, or persistence
pnpm test:e2e     # user flows, responsive UI, dialogs, navigation, or accessibility
```

For visual changes, test at 320, 375, 768, and 1440px. Include screenshots or a short recording, verify keyboard operation and visible focus, and confirm the experience does not rely on color alone.

## Protected areas

Discuss these areas with `@CodingWCal` before implementation, even when they appear to be a small change:

- `firestore.rules`, Firebase adapters, authentication, membership, invitations, or persistence;
- `lib/types.ts`, `lib/workspace.ts`, stored data shapes, migrations, or reward calculations;
- dependencies, lockfiles, build configuration, CI, Vercel, or environment variables;
- global design tokens, navigation language, accessibility contracts, or broad visual redesigns;
- destructive operations, resets, archival behavior, imports, exports, or production data.

Client-side hiding is not authorization. Any Firebase access change must be enforced and tested in Firestore Security Rules.

## Pull request expectations

Open a draft PR early and complete the repository template. Every PR should include:

- the linked backlog ticket and claim issue;
- a plain-language outcome and a technical implementation summary;
- the exact validation commands and results;
- screenshots for layout-sensitive work;
- accessibility, security/privacy, data-migration, and rollback notes;
- known limitations and remaining follow-up;
- any manual action the maintainer must take.

Keep unrelated cleanup out of the patch. If you discover another problem, open an issue or add evidence to the existing backlog ticket.

## External previews and credentials

Vercel may show **Authorization required to deploy** for a PR from a fork. That normally means the external author is not a member of the maintainer's Vercel team; it does not automatically mean the code failed.

- Contributors should provide local test evidence and screenshots.
- Only the maintainer decides whether a fork preview is necessary and authorizes it.
- Contributors are not added to production Vercel or Firebase solely to clear a preview check.
- Never paste secrets into an issue, PR, screenshot, test fixture, or agent prompt.

## Working with coding agents

Before an agent edits this repository, give it this startup instruction:

> Read AGENTS.md, CONTRIBUTING.md, docs/AGENT_HANDOFF.md, and docs/ticket-backlog.md completely. Inspect git status and open work before editing. Work only on the confirmed ticket and acceptance criteria. Do not deploy, change external services, expose secrets, duplicate active work, or expand scope without maintainer approval. Run the required checks and report user action items.

Agents must:

- preserve contributor and maintainer changes already in the worktree;
- use the confirmed issue/ticket as the scope boundary;
- report contribution progress in the claim issue and PR rather than changing canonical backlog or handoff status;
- stop and ask when the requested work conflicts with an active branch or protected area;
- keep product rules in the reducer/domain layer and authorization in Firestore rules;
- update tests and relevant documentation with behavioral changes;
- report uncertainty honestly rather than silently weakening a gate.

Agent-generated code receives the same human review, test, accessibility, security, and data-safety requirements as handwritten code.

## Communication norms

- Be friendly and direct. Explain intent, tradeoffs, and blockers early.
- Tag `@CodingWCal` on claim issues and meaningful scope changes.
- Wait for explicit confirmation before beginning a feature. The maintainer may already have unpushed or stacked work.
- If priorities change, pause cleanly and leave a concise branch/PR handoff.
- Feedback or adaptation is not a rejection of the contribution; it is how Forth keeps one coherent architecture and product direction.

Thanks for helping make Forth useful, calm, accessible, and dependable for the cohort.
