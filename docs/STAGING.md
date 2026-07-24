# Staging and release workflow

Forth uses two long-lived branches so feature work can be tested without turning every push into a production release.

| Branch | Purpose | Deployment |
| --- | --- | --- |
| `staging` | Integration and authenticated pre-production QA | `https://forth-git-staging-calvintrinhvan-2763s-projects.vercel.app/` |
| `main` | Maintainer-approved production releases only | `https://forth-bice.vercel.app/` |

## Normal feature flow

1. Claim a backlog ticket and receive scope confirmation.
2. Branch from the current `staging` branch.
3. Open the feature PR into `staging`.
4. Run deterministic checks and review the feature preview. Use the stable staging deployment for authenticated multi-account QA after integration.
5. The maintainer merges approved features into `staging`.
6. When a release batch is ready, the maintainer opens a release PR from `staging` into `main`, repeats release QA, and explicitly approves production promotion.

Emergency production fixes may target `main` only when the maintainer explicitly requests that path. Merge the resulting fix back into `staging` immediately so the branches do not drift.

## Firebase authorized domains

Firebase Authentication matches the exact browser hostname. Add these hostnames once in Firebase Authentication settings:

- `forth-bice.vercel.app`
- `forth-git-staging-calvintrinhvan-2763s-projects.vercel.app`

Do not include `https://` or a trailing slash. Do not authorize every temporary Vercel commit URL. Temporary previews can exercise signed-out/demo behavior; authenticated shared-workspace validation belongs on the stable staging hostname.

## Agent startup rule

Before editing, agents must read `AGENTS.md`, `CONTRIBUTING.md`, `docs/AGENT_HANDOFF.md`, and `docs/ticket-backlog.md`, inspect open claims/PRs, and confirm that their branch starts from current `staging`. Agents report progress in their claim and PR; only the maintainer updates canonical backlog and handoff status unless that documentation is explicitly in scope.
