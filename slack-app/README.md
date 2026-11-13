# Ansel Heads-Up: Slack app

A real Slack app that posts the Heads-Up card as a DM from "Ansel". It can be triggered two ways:

1. **Calendar trigger:** polls a Google or Outlook calendar ICS feed and posts at *meeting start − 30 min* for **recurring** meetings whose title matches a seeded Ansel series.
2. **Manual demo trigger:** `/headsup demo` in Slack (or `npm run trigger` from a terminal) posts the card right away, for a meeting "starting in 30 min".

Personas (who gets which card and why) are described in [`../profiles.md`](../profiles.md). The Slack card is a condensed Heads-Up (layout and previews in [`../card/slack-mockups/`](../card/slack-mockups/README.md)): the countdown, your action items from last meeting with links to their transcript moments, a link to the rest of the team's items, and Join / Open in Ansel / Mute series / Not useful. Marking items done happens in Ansel. The card data is built from the shared seed by [`../src/logic/buildCardData.js`](../src/logic/buildCardData.js) (contract 2.0, [`../card/CONTRACT.md`](../card/CONTRACT.md)). The calendar supplies the trigger time, the meeting title (matched to a series) and the join link. Socket Mode means no public URL is needed.

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
   At minimum, set the two tokens, `ALLOWED_SLACK_USERS=<your Slack email>`, and `SLACK_USERS=gabriel=<your Slack email>`.
5. Install and run (needs Node 20.12+):
   ```bash
   npm ci
   npm start
   ```
6. In Slack, type `/headsup demo`. The card arrives in your DM with Ansel.

For an existing installation, do not create new tokens per developer. Obtain access to the central runtime or its secret manager. If a token must be replaced, generate/reinstall once, update the central secret, confirm the app connects, and revoke the superseded token.

## Updating the Slack app settings

The About page text, the Home tab and the event subscriptions come from [`manifest.yml`](manifest.yml). After changing it:

1. Open <https://api.slack.com/apps> → **Ansel Heads-Up (demo)** → **App Manifest**.
2. Replace the YAML with the contents of `manifest.yml` and click **Save Changes**.
3. If Slack shows a banner asking to **reinstall** the app, click it and approve. The existing tokens keep working.
4. Restart or update the service so it runs the matching code (`sudo /opt/ansel-headsup/slack-app/deploy/setup-vm.sh` on the VM).

The **Home** tab is drawn by the service each time someone opens it: what Heads-Up is, that person's persona, calendar status and next scheduled Heads-Up, a separate **Demo only** section with the **Ping me** and **Ping everyone** buttons, and the everyday commands. People not on the allowlist see only a notice.

## Local configuration

Minimum `slack-app/.env`:

```dotenv
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
ALLOWED_SLACK_USERS=you@example.com,teammate@example.com
SLACK_USERS=gabriel=you@example.com
```

`.env` is ignored by Git. Before committing, verify that it remains ignored:

```bash
git check-ignore slack-app/.env
```

`ALLOWED_SLACK_USERS` is the security boundary for this pilot. `SLACK_USERS` is narrower: it controls which persona/recipient pairs receive calendar-driven cards. Adding someone to the allowlist lets them use `/headsup`; add a persona mapping only when they should also receive scheduled cards.

## Deploy to a Google Cloud VM (free tier, always-on)

[`deploy/setup-vm.sh`](deploy/setup-vm.sh) installs Node 22, the service's dependencies and a `systemd` service (starts on boot, restarts on crash) on a Debian/Ubuntu VM. Re-run it to update.

1. In Google Cloud, create a VM: **e2-micro**, region `us-central1`, `us-east1` or `us-west1` (free tier), **standard persistent disk** up to 30 GB, **Debian 13 (trixie), x86/64**. No firewall rules or external ports are needed.
2. Set a billing budget alert (e.g. $1) so any charge is noticed immediately.
3. SSH in (the **SSH** button in the console) and run:
   ```bash
   sudo apt-get update && sudo apt-get install -y git   # Debian images don't include Git
   sudo git clone https://github.com/lamgs/ansel-headsup.git /opt/ansel-headsup
   sudo nano /opt/ansel-headsup/slack-app/.env   # paste your slack-app/.env, save
   sudo /opt/ansel-headsup/slack-app/deploy/setup-vm.sh
   ```
4. Stop any other running copy (laptop or Railway), then run the verification checklist below.

Logs: `sudo journalctl -u ansel-headsup -f`. Update after a push to `main`: re-run `setup-vm.sh`. After editing `.env`: `sudo systemctl restart ansel-headsup`.

## Deploy to Railway (always-on)

The repo includes [`../railway.json`](../railway.json) and [`Dockerfile`](Dockerfile). Railway builds from the **repo root** (the service reuses `../src`), installs only `slack-app` dependencies, and runs `node src/index.js`. No public URL, domain or port is needed: Socket Mode connects outward to Slack.

1. **Stop any local `npm start`.** Only one copy may run.
2. At <https://railway.com>, create a project: **New Project → Deploy from GitHub repo →** this repository (authorize the Railway GitHub app if asked). Leave **Root Directory** empty.
3. In the service **Settings**, set the source **branch** (usually `main`) and confirm it builds with the Dockerfile from `railway.json`. Keep **replicas at 1** and leave **App Sleeping / Serverless off**. Don't generate a public domain.
4. In **Variables → Raw Editor**, paste the contents of your `slack-app/.env`: tokens, `ALLOWED_SLACK_USERS`, `SLACK_USERS`, each `CALENDAR_ICS_URL_<PERSONA>`, and `PROTOTYPE_URL` if set. Railway stores them encrypted; the `.env` file itself is never uploaded.
5. Deploy. **Deployments → View logs** should show `Ansel Heads-Up is running (Socket Mode)` with the expected calendar feeds and personas.
6. Run the verification checklist below.

Every push to the chosen branch redeploys. On redeploy the old copy receives SIGTERM and closes its Slack connection, but mutes and sent-card history reset, so avoid deploying within `REMINDER_MINUTES` of a demo meeting. To change config, edit the variable in Railway (it redeploys); there's no need to touch the repo. The Hobby plan (about $5/month) is enough.

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
4. Run `/headsup check gabriel` and confirm the eligibility/item explanation appears only to the requesting user.
5. Ask a non-allowlisted teammate to run `/headsup demo`. They should receive `This private demo is not enabled for your Slack account`, and no card should be posted.
6. If calendar triggering is enabled, have each connected person run `/headsup next` and confirm they see only their own recurring meetings and fire times, then verify exactly one card is posted to the right person by the single running process.
7. Check logs for `card_posted`, expected `card_skipped` events, and unexpected `access_denied` or connection errors. Never log or paste token values.

## Slash command

Access is deny-by-default. Only Slack user IDs or emails listed in `ALLOWED_SLACK_USERS` can run commands, receive scheduled/manual cards, or use card buttons. Add future pilot users as a comma-separated list; for example, `ALLOWED_SLACK_USERS=you@example.com,U0123ABC`. Restart the service after changing the environment.

| Command | What it does |
|---|---|
| `/headsup demo [persona]` | Manual trigger: posts the card to you now (default persona `gabriel`). Try any of `alicia`, `rishabh`, `varun` or `aryan` to see their card. |
| `/headsup check [persona]` | The behind-the-scenes drawer: eligibility, items considered, cost line |
| `/headsup next` | Upcoming recurring meetings from the calendar feed and when Heads-Up fires |
| `/headsup ping` | Shows two demo buttons (visible only to you). **Ping me** sends the demo persona's card to you only, like `/headsup demo`. **Ping everyone** sends every persona in `SLACK_USERS` their own Heads-Up now, for a meeting starting in `REMINDER_MINUTES`. People with no card get nothing; you get a private summary of who was sent a card and who was skipped and why. |
| `/headsup reset` | Clears mutes and fired triggers |

Terminal alternative (no app process needed to post; buttons only respond while `npm start` runs):

```bash
npm run trigger -- --to you@example.com --persona gabriel --in 30
```

## Calendar trigger

Each person can connect their own Outlook (or Google) calendar. Set one variable per persona in `SLACK_USERS`:

```dotenv
SLACK_USERS=gabriel=gabriel@uchicago.edu,alicia=alicia@uchicago.edu
CALENDAR_ICS_URL_GABRIEL=https://outlook.office365.com/owa/calendar/.../calendar.ics
CALENDAR_ICS_URL_ALICIA=https://outlook.office365.com/owa/calendar/.../calendar.ics
```

A persona's feed only triggers that persona's card. `CALENDAR_ICS_URL` (no suffix) is an optional shared fallback for any mapped persona without its own feed; if several personas share it, each of them is triggered by every matching meeting on it. Personas with no feed get no scheduled cards (manual `/headsup demo` still works).

How each person gets their link:

- **Outlook:** Settings → Calendar → Shared calendars → **Publish a calendar** → choose the calendar and **Can view all details** → copy the **ICS** link (not HTML)
- **Google Calendar:** Settings → *your calendar* → Integrate calendar → **Secret address in iCal format**

Each person should send their link to the operator privately (not in a Slack channel or doc). The operator adds it to the central `.env` or host secret store and restarts the service. No per-person `.env` or token is needed.

Create a recurring event titled **Weekly Product Sync**, with a Meet, Teams or Zoom link in the location or description. Every `POLL_SECONDS`, the app downloads each feed once and posts to that feed's personas once the time reaches start − `REMINDER_MINUTES`. It applies the same rules as the prototype: one-off meetings are skipped, as are titles with no matching series, holdout users, and so on. The Join button counts down by editing the message each poll. `/headsup next` shows only the requesting user's own calendar(s), and feed errors are logged with the URL hidden.

**Caveat for the live demo:** Google and Outlook refresh ICS feeds with a delay (minutes for Google, sometimes hours for Outlook). Create the event well ahead of time and confirm it with `/headsup next`. Use `/headsup demo` as the on-stage trigger.

**Privacy:** each published ICS link gives anyone who has it read access to that whole calendar without signing in. Keep links only in `.env` or the host's secret store, and reset a link in Outlook if it leaks. To remove someone, delete their variable, restart, and have them unpublish the calendar. See [`current_status.md`](../current_status.md#data-privacy-call-out-in-the-demo).

## Card actions

The card matches [`../card/heads-up-card.js`](../card/heads-up-card.js) and logs the same event names as [`../card/CONTRACT.md`](../card/CONTRACT.md) §4 (to the console, as `[pilot]` lines; ★ marks value actions). Every change updates the card in place and has an Undo.

Layout (condensed, chosen in [`../card/slack-mockups/`](../card/slack-mockups/README.md): `condensed/B3-minimal.png` and `condensed/M2-checkboxes.png`): one text block and one row of buttons.

```
30 min · Weekly Product Sync
You own 2 items · 8 more from the team last week
  • Forecast update (14:32)
  • Dashboard link (45:50)
Still Open
  • Launch date: Mar 3 or Mar 10? (27:05)
Decided
  • Pricing page ships with v2 (41:18)
[Join Zoom] [Open in Ansel] [Mute series] [Not useful]
```

Only the timestamps are links (each opens that moment in last meeting's transcript, via the prototype's short `#t/<itemId>` link), and "8 more from the team" links to the meeting's Action items tab. With exactly one item of yours, the line reads "You own **Forecast update** (14:32) · 5 more items from last week". Marking items done happens in Ansel, not on the card; items already done there show struck through. Up to 3 of your items are listed, then "+N more of yours in Ansel". Below them, *Still Open* shows one open question (one you're a stakeholder on, else the last meeting's) and *Decided* the last meeting's top decision, picked as in the prototype, each with a linked timestamp; a heading is left out when it has nothing to show. Everything else (other people's items, Not right) is in Ansel.

| Control | Behavior | Event |
|---|---|---|
| Join Zoom / Join now | Opens the meeting link; the green button; removed after the meeting ends | `join_tap` |
| Open in Ansel | Opens the full Heads-Up card in the hosted prototype (`#headsup`; Slack can only show a basic version), which links on to last meeting's summary. Replies privately with the summary if `PROTOTYPE_URL=off` | `open_last_meeting` |
| Mute series / Undo | Collapses the card to one line (Join stays) and stops future cards for the series | `mute_series` / `mute_undone` |
| Not useful → reason / Undo | Asks "What was off?" (Already knew this, Wrong meeting, Bad timing) | `not_useful`, `not_useful_reason`, `not_useful_undone` |
| Timestamp link, e.g. (14:32) | Opens the transcript at that item | not logged (Slack doesn't report link clicks) |

Slack buttons come in three styles only (default, green, red), so Open in Ansel uses the default style.

Also logged: `card_shown`, `card_suppressed` (holdout), `card_skipped` (with the reason) and `state_changed` (posted → starting-soon → started → ended). The countdown in the title updates every poll.

The ▶ and **Open last meeting** buttons link to the hosted prototype at https://lamgs.github.io/ansel-headsup/ by default (published from `main` by GitHub Pages; see the root README). Set `PROTOTYPE_URL` to point somewhere else, or `PROTOTYPE_URL=off` to have the buttons reply in Slack instead. Links look like `…/#ansel/wps-1106/transcript/14:32/a2`.

## Limits

- The service needs one continuously running process: the Google VM, Railway or a local `npm start`, never more than one.
- State lives in memory: restarting clears mutes. Status updates made in the prototype (Mark done) don't sync back to Slack, because there's no shared backend.
- Content is seeded, so there are no real transcripts. For production, swap ICS polling for Google Calendar push notifications or Microsoft Graph change notifications, and use the event's recurring-series ID instead of matching titles.

`npm test` runs offline checks (card blocks, ICS parsing in Google and Outlook styles, the scheduler, and actions) against a fake Slack client.
