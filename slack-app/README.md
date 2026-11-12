# Ansel Heads-Up: Slack app

A real Slack app that posts the Heads-Up card as a DM from "Ansel". It can be triggered two ways:

1. **Calendar trigger:** polls a Google or Outlook calendar ICS feed and posts at *meeting start − 30 min* for **recurring** meetings whose title matches a seeded Ansel series.
2. **Manual demo trigger:** `/headsup demo` in Slack (or `npm run trigger` from a terminal) posts the card right away, for a meeting "starting in 30 min".

Card content comes from the same pure `buildHeadsUp()` and seed data as the prototype (`../src/logic`, `../src/data`), so the copy and the skip rules match. The calendar supplies the trigger time, the meeting title (matched to a series) and the join link. Socket Mode means no public URL is needed: it runs on a laptop.

## Token and ownership model

Use one centrally operated Slack app for the whole team. Individual teammates do **not** need their own bot or app-level tokens.

| Secret/config | Purpose | Who needs it |
|---|---|---|
| `SLACK_BOT_TOKEN` (`xoxb-…`) | Calls Slack APIs as the installed Ansel bot | The single running service |
| `SLACK_APP_TOKEN` (`xapp-…`) | Opens the Socket Mode WebSocket; scope is only `connections:write` | The single running service |
| `ALLOWED_SLACK_USERS` | Comma-separated emails or Slack IDs permitted to use the pilot | The service configuration |
| `SLACK_USERS` | Maps seeded personas to recipients for calendar-driven cards | The service configuration |

Store the two tokens in one central secret store (or a Git-ignored local `.env` during development). Do not send tokens to every teammate, put them in documentation, or commit them. Run only one active scheduler/service process: multiple processes sharing the same credentials may split interactive events and can independently post duplicate scheduled cards.

## Fresh workspace installation

1. Go to <https://api.slack.com/apps> → **Create New App** → **From an app manifest**, pick your workspace, and paste [`manifest.yml`](manifest.yml).
2. **Install App → Install to Workspace** and approve the manifest's bot scopes. Copy the **Bot User OAuth Token** as `SLACK_BOT_TOKEN` (`xoxb-…`). Reinstall after any later scope change.
3. **Basic Information → App-Level Tokens → Generate Token and Scopes**. Give it an operator-friendly name and add only `connections:write`. Copy the one-time value as `SLACK_APP_TOKEN` (`xapp-…`).
4. Copy the example env file and fill it in:
   ```bash
   cp .env.example .env
   ```
   At minimum, set the two tokens, `ALLOWED_SLACK_USERS=<your Slack email>`, and `SLACK_USERS=maya=<your Slack email>`.
5. Install and run (needs Node 20.12+):
   ```bash
   npm ci
   npm start
   ```
6. In Slack, type `/headsup demo`. The card arrives in your DM with Ansel.

For an existing installation, do not create new tokens per developer. Obtain access to the central runtime or its secret manager. If a token must be replaced, generate/reinstall once, update the central secret, confirm the app connects, and revoke the superseded token.

## Local configuration

Minimum `slack-app/.env`:

```dotenv
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
ALLOWED_SLACK_USERS=you@example.com,teammate@example.com
SLACK_USERS=maya=you@example.com
```

`.env` is ignored by Git. Before committing, verify that it remains ignored:

```bash
git check-ignore slack-app/.env
```

`ALLOWED_SLACK_USERS` is the security boundary for this pilot. `SLACK_USERS` is narrower: it controls which persona/recipient pairs receive calendar-driven cards. Adding someone to the allowlist lets them use `/headsup`; add a persona mapping only when they should also receive scheduled cards.

## Verification checklist

Run these checks after a fresh install, token rotation, scope change, allowlist change, or deployment:

1. Verify the code offline:
   ```bash
   # Repository root
   npm ci
   npm test
   npm run build

   # Slack service
   cd slack-app
   npm ci
   npm test
   ```
2. Start the single service process with `npm start`. It should print `Ansel Heads-Up is running (Socket Mode)` without repeated HTTP or WebSocket errors.
3. As an allowlisted user, run `/headsup demo`. Confirm a private Ansel DM arrives and its buttons respond while the process is running.
4. Run `/headsup check maya` and confirm the eligibility/item explanation appears only to the requesting user.
5. Ask a non-allowlisted teammate to run `/headsup demo`. They should receive `This private demo is not enabled for your Slack account`, and no card should be posted.
6. If calendar triggering is enabled, run `/headsup next`, confirm the recurring event and fire time, then verify exactly one card is posted by the single running process.
7. Check logs for `card_posted`, expected `card_skipped` events, and unexpected `access_denied` or connection errors. Never log or paste token values.

## Slash command

Access is deny-by-default. Only Slack user IDs or emails listed in `ALLOWED_SLACK_USERS` can run commands, receive scheduled/manual cards, or use card buttons. Add future pilot users as a comma-separated list; for example, `ALLOWED_SLACK_USERS=you@example.com,U0123ABC`. Restart the service after changing the environment.

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

- The service currently needs one continuously running process; there is no always-on host configured in this repository.
- State lives in memory: restarting clears mutes. Status updates made in the prototype (Mark done) don't sync back to Slack, because there's no shared backend.
- Content is seeded, so there are no real transcripts. For production, swap ICS polling for Google Calendar push notifications or Microsoft Graph change notifications, and use the event's recurring-series ID instead of matching titles.

`npm test` runs offline checks (card blocks, ICS parsing in Google and Outlook styles, the scheduler, and actions) against a fake Slack client.
