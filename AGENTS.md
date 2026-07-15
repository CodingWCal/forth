# AGENTS.md

## Project Overview

- Build **Forth**, “project work with a pulse”: a motivational project-management app for small creative and product teams.
- Preserve the central product loop: declare an honest pace → choose at most three meaningful moves → move work through Ready/Moving/Paused/Landed → keep completion in the Proof ledger.
- Use TypeScript, React 19, Next.js 16 App Router, localStorage for the local MVP, and an optional Firebase Auth/Firestore boundary for private beta.
- Read `docs/PRD.md` and `docs/DESIGN.md` before changing product scope, copy, navigation, or visual direction.

## Repository Layout

- `app/`: Next.js routes, metadata, and the global visual system.
- `components/`: interactive product UI; `forth-app.tsx` currently owns the MVP screens and user flows.
- `lib/`: domain types, seed data, reducer/selectors, persistence parsing, and Firebase initialization boundary.
- `tests/`: Vitest domain/state tests.
- `docs/`: product requirements, design contract, environment setup, and future ticket backlog.
- `firestore.rules`: private-beta authorization policy; treat changes as security-sensitive.

## Build And Test Commands

Run from the repository root:

- Install: `pnpm install`
- Develop: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit tests: `pnpm test`
- Production build: `pnpm build`
- Production server after build: `pnpm start`

In a non-interactive Codex runtime where the `pnpm` wrapper attempts to reinstall dependencies, invoke the repo-local commands under `node_modules/.bin` instead. Do not modify global npm/pnpm configuration to fix a repo-local run.

## Product And Design Guardrails

- Explain meaningful code/design decisions twice when handing off: first in plain language, then with the matching engineering term.
- Keep motivation intrinsic: autonomy, meaning, achievable scope, proof of progress, and recovery-aware states. Do not add points, leaderboards, punishment, confetti, streak anxiety, or productivity grades.
- Preserve the field-journal/editorial direction: warm paper, deep green ink, moss, clay, serif hierarchy, code-native contour linework, flat tactile surfaces, and restrained motion.
- Avoid generic AI visual tells: purple/blue gradients, glassmorphism, glowing orbs, sparkle icons, chatbot-first layouts, universal pill cards, and empty marketing claims.
- Keep labels humane and literal: Ready, Moving, Paused, Landed, Proof, pace, capacity, and moves.
- Maintain the WIP limit: Today may contain no more than three unfinished focus tasks.
- Ensure mobile controls are at least 44 px where practical, keyboard focus remains visible, and reduced motion is respected.

## Code Style And Architecture

- Keep TypeScript strict. Do not use `any` to bypass a domain-model decision.
- Model state changes as `WorkspaceAction` reducer transitions in `lib/workspace.ts`; do not mutate task objects in components.
- Keep derived values (capacity, progress, focus tasks, momentum) in selector/helper functions so they can be tested independently.
- Treat localStorage as an adapter, not the source of domain rules. Parse untrusted stored JSON and retain safe fallback behavior.
- Prefer small named components and plain CSS tokens over adding a generic UI framework.
- Keep client-only APIs (`window`, `localStorage`, native dialog methods) behind client components and effects/event handlers.
- Avoid new dependencies when a small code-native implementation fits the established design system.

## Testing Instructions

- Add or update Vitest coverage for reducer actions, persistence parsing, capacity math, WIP limits, or progress derivation.
- For UI changes, run lint, typecheck, unit tests, and a production build, then exercise affected flows in a real browser.
- Visually check 375×812, 768×1024, and 1440×1000. Test Today, Work map, Proof, Settings, and the add-move dialog when relevant.
- Verify empty, paused, completed, over-capacity, corrupt-storage, keyboard, and reduced-motion states when the touched code affects them.
- Do not hide a failing check. Classify whether it comes from the change, existing code, dependencies, or the environment.

## Security Considerations

- Never commit `.env.local`, Firebase credentials beyond public web configuration, tokens, service-account JSON, or private keys.
- Treat `NEXT_PUBLIC_*` values as public browser configuration, never as secrets.
- Keep the app explicitly labeled “Local demo” until authentication, workspace provisioning, and live persistence are truly connected.
- Workspace creation must bind `ownerId` to `request.auth.uid`; only owners may manage membership in the current rules.
- Test Firestore rules with the emulator before private beta. Client-side UI checks are never authorization.
- Ask before creating Firebase projects, enabling providers, deploying, migrating data, or performing destructive cloud operations.

## Git And Delivery

- Keep commits focused and use imperative subjects (for example, `Add recovery-aware task transitions`).
- Preserve user-owned changes and inspect `git status`/diffs before committing.
- Vercel should import the GitHub repository and use the default Next.js build. Add Firebase values in Vercel project settings; do not commit them.
- Update `docs/ticket-backlog.md` after broad audits instead of silently expanding current scope.
- Summarize changed files, validation commands, remaining risks, and the plain-English/engineering rationale in the final handoff.
