# Forth Design Direction

## Concept

Forth should feel like opening a beautifully maintained field notebook, not entering a control room. The interface treats work as movement through terrain: finite energy, a few visible waypoints, honest pauses, and a durable trail showing where the team has already been.

The metaphor stays mostly visual. Labels remain understandable project-management language, so a user never has to decode a game.

## Experience principles

1. **Show the next ledge, not the whole mountain.** Today exposes at most three active moves.
2. **Capacity is information, not a grade.** Going over plan triggers a neutral adjustment cue.
3. **Completion should leave evidence.** The Proof ledger is permanent and specific.
4. **A blocker is a state of work, not a trait of a person.** “Paused” uses calm language and an easy recovery action.
5. **Purpose stays near action.** A project’s intended outcome and a task’s “why it matters” sit near the work.

## Token direction

| Token | Value | Purpose |
| --- | --- | --- |
| Paper | `#f3efe4` | Primary background |
| Canvas | `#e8e1d2` | Secondary surface |
| Ink | `#203128` | Primary text and strong controls |
| Moss | `#66745a` | Progress and positive state |
| Clay | `#d65f43` | Primary action and human warmth |
| Slate | `#71807b` | Secondary information |
| Rule | `#c9c1b1` | Structural borders |

Typography uses a system serif stack for display hierarchy, a system sans stack for interface copy, and monospace for short project/status labels. This avoids runtime font downloads and keeps first render reliable.

## Layout map

```text
Desktop
┌──────────┬─────────────────────────────────────┬─────────────┐
│ Brand    │ Date / page title                   │ Local demo  │
│          ├─────────────────────────────────────┼─────────────┤
│ Today    │ Pace + capacity                     │ Project     │
│ Board    ├─────────────────────────────────────┤ signal      │
│ Proof    │ Next three meaningful moves         ├─────────────┤
│ Settings ├─────────────────────────────────────┤ Team note   │
│          │ Seven-day momentum trail            │             │
└──────────┴─────────────────────────────────────┴─────────────┘

Mobile
┌─────────────────────────┐
│ Brand        Local demo │
├─────────────────────────┤
│ Page content            │
│ Single column           │
├─────────────────────────┤
│ Today Board Proof More  │
└─────────────────────────┘
```

## Component inventory

- App rail / mobile tab bar
- Local-demo environment badge
- Pace selector and capacity meter
- Project outcome signal
- Next-three move row
- Board column and move card
- Progress trail figure
- Proof ledger row
- Add-move dialog
- Toast live region
- Empty state

## Interaction details

- Checkbox-like completion controls use a visible square “landing mark,” not a celebratory animation.
- Task state changes use 160–220 ms opacity/transform transitions.
- Progress bars are flat inked tracks with numeric text; color is never the only status cue.
- The dialog closes on Escape and returns focus through native dialog behavior.
- Touch targets are at least 44 px on mobile.
- Hover states are additive; no required information is hover-only.

## Responsive rules

- `> 1180 px`: rail + main + context column.
- `760–1180 px`: rail + main; context cards join the main grid.
- `< 760 px`: top brand bar, single column, fixed bottom nav, full-width dialog.
- Data-dense board columns scroll horizontally only inside the board region; the page itself must not overflow.

## Visual QA checklist

- No component resembles a default Tailwind/shadcn dashboard assembly.
- Clay is used as an accent, not flooded across the interface.
- Serif type creates hierarchy without harming control readability.
- At least one tactile asymmetry or editorial rule is visible per major surface.
- Empty, paused, complete, over-capacity, and local-demo states are visually distinct and clearly named.
- Keyboard focus is always visible against paper and ink surfaces.
