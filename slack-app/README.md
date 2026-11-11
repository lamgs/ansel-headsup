# Ansel Heads-Up: Slack app

A real Slack app that posts the Heads-Up card as a DM from "Ansel". It can be triggered two ways:

1. **Calendar trigger:** polls a Google or Outlook calendar ICS feed and posts at *meeting start − 30 min* for **recurring** meetings whose title matches a seeded Ansel series.
2. **Manual demo trigger:** `/headsup demo` in Slack (or `npm run trigger` from a terminal) posts the card right away, for a meeting "starting in 30 min".

Card content comes from the same pure `buildHeadsUp()` and seed data as the prototype (`../src/logic`, `../src/data`), so the copy and the skip rules match. The calendar supplies the trigger time, the meeting title (matched to a series) and the join link. Socket Mode means no public URL is needed: it runs on a laptop.

## Setup (about 10 minutes)

1. Go to <https://api.slack.com/apps> → **Create New App** → **From an app manifest**, pick your workspace, and paste [`manifest.yml`](manifest.yml).
2. **Basic Information → App-Level Tokens → Generate**, with scope `connections:write`. That's `SLACK_APP_TOKEN` (`xapp-…`).
3. **Install App → Install to Workspace**. Copy the **Bot User OAuth Token**. That's `SLACK_BOT_TOKEN` (`xoxb-…`).
4. Copy the example env file and fill it in:
   ```bash
   cp .env.example .env
   ```
   At minimum, set the two tokens and `SLACK_USERS=maya=<your Slack email>`.
5. Install and run (needs Node 20.6+):
   ```bash
   npm install
   npm start
   ```
6. In Slack, type `/headsup demo`. The card arrives in your DM with Ansel.

## Slash command

| Command | What it does |
|---|---|
| `/headsup demo [persona]` | Manual trigger: posts the card to you now (default persona `maya`). Try `riley` or `sam` to see a skip reason. |
| `/headsup check [persona]` | The behind-the-scenes drawer: eligibility, items considered, cost line |
| `/headsup next` | Upcoming recurring meetings from the calendar feed and when Heads-Up fires |
| `/headsup reset` | Clears mutes and fired triggers |

Terminal alternative (no app process needed to post; buttons only respond while `npm start` runs):

```bash
npm run trigger -- --to you@example.com --persona maya --in 30
```

## Calendar trigger

Set `CALENDAR_ICS_URL` to one of these:

- **Google Calendar:** Settings → *your calendar* → Integrate calendar → **Secret address in iCal format**
- **Outlook:** Settings → Calendar → Shared calendars → **Publish a calendar** → ICS link

Create a recurring event titled **Weekly Product Sync**, with a Meet, Teams or Zoom link in the location or description. Every `POLL_SECONDS`, the app posts to each persona in `SLACK_USERS` once the time reaches start − `REMINDER_MINUTES`. It applies the same rules as the prototype: one-off meetings are skipped, as are titles with no matching series, holdout users, and so on. The Join button counts down by editing the message each poll.

**Caveat for the live demo:** Google and Outlook refresh ICS feeds with a delay (minutes for Google, sometimes hours for Outlook). Create the event well ahead of time and confirm it with `/headsup next`. Use `/headsup demo` as the on-stage trigger.

## Card actions

| Button | Behavior | Pilot event (logged to the console) |
|---|---|---|
| Join | Opens the meeting link | `meeting_joined` (before start, on time or late) |
| ▶ mm:ss | Opens the prototype at that transcript line if `PROTOTYPE_URL` is set, otherwise replies with the quoted line | `timestamp_tapped` |
| Open last meeting | Prototype Summary view, or a summary reply | `open_last_meeting` |
| Mute series / Not useful | Replaces the card body, with Undo | `series_muted` / `not_useful` |

To get the deep links, host the prototype: run `npm run build` in the repo root, deploy `dist/` (Netlify drop, Vercel or GitHub Pages), and set `PROTOTYPE_URL`. Links look like `…/#ansel/wps-1106/transcript/14:32/a2`.

## Limits

- State lives in memory: restarting clears mutes. Status updates made in the prototype (Mark done) don't sync back to Slack, because there's no shared backend.
- Content is seeded, so there are no real transcripts. For production, swap ICS polling for Google Calendar push notifications or Microsoft Graph change notifications, and use the event's recurring-series ID instead of matching titles.

`npm test` runs offline checks (card blocks, ICS parsing in Google and Outlook styles, the scheduler, and actions) against a fake Slack client.
