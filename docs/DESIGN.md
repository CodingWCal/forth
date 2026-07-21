# Forth Design Direction — Iron & Parchment

## Concept

Forth is the quest ledger of a small software guild. It should feel like a lost 16-bit strategy-RPG menu rebuilt as a serious engineering tool: square pixel construction, iron frames, parchment work surfaces, heraldic status colors, terse system copy, and one quietly animated code-squire avatar.

The fantasy layer is visual flavor, not required vocabulary. Primary navigation, buttons, fields, and status labels use familiar project-management language; fantasy terms may appear only as secondary copy:

| Primary UI label | Optional fantasy flavor | Meaning |
| --- | --- | --- |
| Dashboard | Daily ledger | Today’s selected work and capacity |
| Tickets | Quest log | Kanban board and complete ticket list |
| Activity | Chronicle | Completion history and private progress |
| Workspace & team | Guild hall | Account, membership, invites, and projects |
| Ready | Quest log | Work not started |
| In progress | In forge | Active work |
| Paused | Camped | Blocked or intentionally paused work |
| Done | Shipped | Completed work |
| Energy | Effort | Relative daily capacity cost |

## Product feeling

1. **A guild tool, not a fantasy landing page.** The board remains dense, fast, and literal.
2. **A game state, not a productivity grade.** Rank and gold reflect completed effort privately; there are no public leaderboards, streak loss, penalties, or random rewards.
3. **A plan with boundaries.** Today holds at most three unfinished tickets.
4. **Activity with evidence.** Completed work preserves its objective and assignee.
5. **Pause is recovery.** Paused work is visible and easy to resume.

## Visual references

The direction draws from the material and information design of 16-bit console RPG interfaces: tile grids, compact status HUDs, square dialogue frames, limited palettes, bitmap-like ornament, and map/ledger metaphors. It does not reproduce any franchise character, logo, named location, UI layout, or proprietary sprite.

Avoid modern “AI SaaS” visual shorthand:

- no purple/blue gradients, glowing orbs, glass cards, floating sparkle marks, or chatbot framing;
- no universal pill components, soft 24px rounding, ornamental dashboard metrics, or vague motivational copy;
- no generated fantasy scenery behind functional UI;
- no glossy mobile-game reward chest, confetti, streak anxiety, or public rank.

## Palette and materials

| Token | Value | Role |
| --- | --- | --- |
| Night | `#121814` | Guild rail and backdrop |
| Iron | `#202a20` | Dark panels and HUD |
| Parchment | `#e9d9b7` | Primary work surface |
| Light parchment | `#f5e8c9` | Ticket and form surfaces |
| Oak | `#665034` | Structural rule and pixel shadow |
| Moss | `#5b6f3a` | Shipped/safe state |
| Oxblood | `#a84732` | Paused/danger emphasis |
| Amber | `#c58b2b` | Active selection, reward, focus |
| Slate | `#596b69` | Secondary engineering metadata |

Surfaces use two-pixel rules, hard corners, stepped shadows, small repeating tile patterns, and double rules. Dashboard and Tickets cards use restrained rolled-papyrus edges, warm fiber lines, and oak shadows; the ornament must remain outside the text column and controls. Gradients are reserved for code-native checker/tile texture; never for soft glow or brand spectacle.

## Typography

- Monospace: navigation, status, small data, controls, system feedback.
- Book serif: ticket titles, project objectives, page hierarchy.
- Plain sans: descriptions and longer instructional copy.
- No runtime font download. Reliability and readable fallback behavior matter more than font novelty.

## Character asset

`public/sprites/code-squire.png` is an original pixel-art guild engineer generated for Forth. It is shown as a small UI avatar, not a hero illustration. Motion is code-driven with a two-step idle/breathing loop and disabled by `prefers-reduced-motion`.

Rules:

- render with `image-rendering: pixelated`;
- keep the character subordinate to ticket content;
- never use the avatar as proof of user identity;
- provide empty alt text when decorative;
- do not add randomized motion or audio.

## Layout and interaction

- Dashboard hierarchy: today’s selected tickets come first, a single global New ticket action handles creation, and compact capacity follows. No campaign cards, fake dispatches, deadlines, rank, gold, or history compete with daily work.
- Tickets owns search, deadlines, the Kanban board, and ticket movement. Activity owns completed work, the avatar, private rank/gold, and seven-day history. Workspace & team owns account state, invites, projects, and demo controls.
- Demo mode always exposes one literal Exit demo control in the page header; users never need to find Workspace & team merely to leave.
- Desktop: dark guild rail and a task-first parchment workspace with literal navigation labels.
- Tablet: compact rail plus the main ledger; context moves into the document flow.
- Mobile: guild masthead, single-column dashboard, fixed four-item bottom menu, and a full-text New ticket action.
- Board columns may scroll horizontally inside the board only.
- On desktop, ticket cards drag between Tickets status columns with a pixel-sword cursor and a clear drop target. The card arrows remain the keyboard, touch, and reduced-dexterity fallback.
- The sword cursor keeps a tip-aligned hotspot and a readable blade, crossguard, grip, and pommel at its native 32px size.
- Every ticket exposes a complete edit path for project, status, priority, due date, purpose, effort, Today focus, and named assignee; themed labels never hide the underlying field.
- Text fields retain the familiar text cursor; the sword cursor is reserved for the workspace and interactive controls so theme never obscures editing behavior.
- Touch targets are at least 44px where practical.
- Focus is a high-contrast amber outline, never color-only.
- Movement lasts under 220ms except the decorative avatar idle; reduced motion disables both.

## Component contract

- Guild rail and mobile menu
- Cloud-rune environment badge
- Task-first Dashboard with today’s maximum-three ticket plan
- One global New ticket action
- Responsive daily capacity selector and energy meter
- Tickets board with search, due-today/due-soon/overdue disclosure, and four literal status columns
- Engineering ticket card
- Activity ledger with completed tickets, avatar, private rank/gold, and seven-day history
- Workspace & team account and membership controls
- Literal create/edit ticket dialogs with secondary fantasy flavor
- Persistent demo exit
- System toast

## Visual QA checklist

- The screen is recognizable as Forth when grayscale and copy are removed.
- No component resembles a default shadcn/Tailwind SaaS card assembly.
- Every fantasy term retains obvious engineering context.
- Pixel ornament never reduces text contrast or touch size.
- Avatar edges remain crisp at 44px, 54px, and 86px containers.
- Ready, In progress, Paused, and Done are distinguishable without color.
- Empty, sync-error, over-capacity, and local-camp states are explicit.
- 375×812, 768×1024, and 1440×1000 have no page-level horizontal overflow.
