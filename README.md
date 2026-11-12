# ansel-headsup
BoothHacks Entry: Repository for the Kilts Center Case Competition for Chicago Booth

This repository contains two parts:

- A clickable, front-end-only **Heads-Up** prototype for Ansel (React + Vite). It has no backend, network calls, or AI calls; all state lives in memory.
- A real Slack app in [`slack-app/`](slack-app/README.md) that runs over Socket Mode and posts private Heads-Up DMs.

See [`current_status.md`](current_status.md) for the current pilot stage and remaining work.

## Run

```bash
npm ci
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

The Slack app uses **central service credentials**, not one token per teammate:

- One workspace bot token (`SLACK_BOT_TOKEN`) identifies the installed app.
- One app-level token (`SLACK_APP_TOKEN`) opens the Socket Mode connection.
- One centrally managed process should run at a time. Teammates use `/headsup`; they do not create or store tokens.
- `ALLOWED_SLACK_USERS` is a deny-by-default list of the pilot users who may invoke commands, receive cards, or use card actions.

For installation, secret handling, and the live verification checklist, see the [Slack app runbook](slack-app/README.md).
