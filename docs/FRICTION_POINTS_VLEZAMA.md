# Forth Platform Exploration — Friction Points

**Explored:** Friday, Jul 24, 2026  
**Local:** http://localhost:3000 (demo mode)  
**Production:** https://forth-bice.vercel.app

## What works well

1. **Explicit demo boundary** — Sample tickets only appear after clicking "Explore local demo." The welcome guide clearly states demo data never syncs to Firebase.
2. **Calm daily workflow** — Pace selector (Scout/Venture/Raid), WIP limit of 3 focused tickets, and shame-free "Paused" state feel intentional.
3. **Fantasy + literal pairing** — Navigation uses Dashboard/Tickets/Activity alongside themed labels, reducing confusion for new users.

## Friction points (motivation for TICKET-005)

1. **Sample vs real data trust gap** — Returning cloud users with legacy engineering seed content have no one-time choice to keep, replace, or start empty. Sample tickets can look like permanent user work.
2. **Assignee free-text** — Assigning "Maya" is typing a name, not selecting an authenticated guild member. Misspellings and departed members cannot be handled reliably.
3. **No sync retry guidance (local repro)** — When cloud save fails, the error state does not always explain whether local edits are safe or what to do next (TICKET-002 addresses this; observed in demo copy referencing sync errors as a sample ticket theme).
4. **Auth unavailable locally without Firebase** — Google/GitHub sign-in disabled without `.env.local`; acceptable for dev but worth noting for first-time local setup.
5. **Keyboard gaps on pace selector** — All three pace radios remain tabbable; Arrow keys do not move selection (TICKET-014 claimed by another contributor).

## PR focus

**TICKET-005** — Add versioned migration choice when cloud workspace contains engineering demo IDs: keep current tickets, replace with demo, or start empty with confirmation before any cloud overwrite.
