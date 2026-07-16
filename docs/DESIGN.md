# Forth Design Direction — Iron & Parchment

## Concept

Forth is the quest ledger of a small software guild. It should feel like a lost 16-bit strategy-RPG menu rebuilt as a serious engineering tool: square pixel construction, iron frames, parchment work surfaces, heraldic status colors, terse system copy, and one quietly animated code-squire avatar.

The fantasy layer is a mnemonic, not a puzzle. Every themed label stays adjacent to a familiar product concept:

| Forth language | Engineering meaning |
| --- | --- |
| Campaign | Project |
| Quest | Ticket/task |
| Quest Log | Ready backlog |
| In Forge | In progress |
| Camped | Paused/blocked |
| Shipped | Done |
| Chronicle | Completion history |
| Energy | Relative effort |
| Party | Today’s maximum-three WIP set |
| Cloud rune | Firebase persistence status |

## Product feeling

1. **A guild tool, not a fantasy landing page.** The board remains dense, fast, and literal.
2. **A game state, not a productivity grade.** Rank and gold reflect completed effort privately; there are no public leaderboards, streak loss, penalties, or random rewards.
3. **A map with boundaries.** Today holds at most three unfinished quests.
4. **A chronicle with evidence.** Shipped work preserves its objective and builder.
5. **A camp is recovery.** Paused work is visible and easy to resume.

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

Surfaces use two-pixel rules, hard corners, stepped shadows, small repeating tile patterns, and double rules. Gradients are reserved for code-native checker/tile texture; never for soft glow or brand spectacle.

## Typography

- Monospace: navigation, status, small data, controls, system feedback.
- Book serif: quest titles, campaign objectives, page hierarchy.
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

- Desktop: dark guild rail, parchment workspace, optional campaign context rail.
- Tablet: compact rail plus the main ledger; context moves into the document flow.
- Mobile: guild masthead, single-column quest log, fixed four-item bottom menu.
- Board columns may scroll horizontally inside the board only.
- Touch targets are at least 44px where practical.
- Focus is a high-contrast amber outline, never color-only.
- Movement lasts under 220ms except the decorative avatar idle; reduced motion disables both.

## Component contract

- Guild rail and mobile menu
- Cloud-rune environment badge
- Code-squire rank HUD
- Expedition/energy selector
- Today’s three-quest party
- Campaign charter
- Seven-day expedition record
- Realm-map board with four provinces
- Engineering quest card
- Release chronicle
- Guild hall/account ward
- Quest inscription dialog
- System toast

## Visual QA checklist

- The screen is recognizable as Forth when grayscale and copy are removed.
- No component resembles a default shadcn/Tailwind SaaS card assembly.
- Every fantasy term retains obvious engineering context.
- Pixel ornament never reduces text contrast or touch size.
- Avatar edges remain crisp at 44px, 54px, and 86px containers.
- Quest Log, In Forge, Camped, and Shipped are distinguishable without color.
- Empty, sync-error, over-capacity, and local-camp states are explicit.
- 375×812, 768×1024, and 1440×1000 have no page-level horizontal overflow.
