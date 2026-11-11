# ansel-headsup
BoothHacks Entry: Repository for the Kilts Center Case Competition for Chicago Booth

Clickable, front-end-only prototype of **Heads-Up** for Ansel. React + Tailwind (Vite). No backend, no network calls, no AI calls. All state lives in memory.

## Run

```bash
npm install
npm run dev      # local dev server
npm run build    # static build in dist/ (relative paths, can be hosted anywhere)
npm test         # checks buildHeadsUp against the per-persona table + transcript spacing
```

## Demo script

1. Persona **Maya** (default). Clock starts at 1:25 PM, Fri Nov 13. Click **Jump to 1:30 PM**. A toast appears and the **Ansel** DM gets an unread badge.
2. Open the Ansel DM and scan the card. Tap **▶ 14:32**: the Ansel transcript opens on Jordan's line (highlighted for 3 s) with the item panel.
3. **Mark done** (or On track / New date / Reassign). Back in Slack, the line reads "✓ Forecast update — marked done".
4. **Join** shows the unchanged recording notice, then the call with the Ansel Notetaker tile.
5. Open **Behind the scenes** and switch personas (Jordan, Sam, Dana, Alex, Riley, Leo) to see each skip reason, the items considered and the cost line.
6. As **Jordan**, edit a Decision or Open question in Ansel → Summary (✎). It becomes a tracked change, and Maya's card shows **Edited** on that line.
7. **Setup & governance**: G1–G4. Ticking the G3 share checkbox adds a direct-share row to the G4 audit log.
8. End on the **Pilot log**.

## Code map

| Path | What |
|---|---|
| `src/data/seed.js` | Seed data from the PRD, as specified |
| `src/data/transcripts.js` | Transcripts. Nov 6 key lines verbatim, filler spaced ≤ 60 s apart |
| `src/logic/buildHeadsUp.js` | `buildHeadsUp(user, series, now, world)`: the pure selection function |
| `src/logic/world.js` | Merges in-memory edits, status updates, mutes and settings over the seed |
| `src/state/store.jsx` | Reducer, simulated clock, trigger processing, event log |
| `src/screens/*` | Slack (mock), Heads-Up card, Ansel app, join flow, Setup & governance, Pilot log |
| `src/components/*` | Demo bar, behind-the-scenes drawer, UI primitives |

## Slack app (real integration)

[`slack-app/`](slack-app/README.md) is a working Slack app (Socket Mode) that posts the same card from a Google or Outlook calendar ICS feed (30 minutes before a recurring meeting) or from a manual `/headsup demo` trigger. Its ▶ buttons deep-link into the hosted prototype (`#ansel/<instance>/<tab>/<mm:ss>/<item>`).
