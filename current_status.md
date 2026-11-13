# Current status: Ansel Heads-Up

_Last updated: 2026-11-13_

Personas now use the team's names (Gabriel, Alicia, Rishabh, Varun, Aryan); see [`profiles.md`](profiles.md) for each role.

## Stage

**Update 2026-11-12: always-on.** The Slack service now runs on a free-tier Google Cloud e2-micro VM (Debian 13) as the `ansel-headsup` systemd service, installed with `slack-app/deploy/setup-vm.sh` from `main`. Startup confirmed Socket Mode, 5 mapped personas, 10 allowlisted users and 2 per-person calendar feeds (Gabriel, Aryan); `/headsup demo` delivered a card from the VM. The `.env` lives only on the VM at `/opt/ansel-headsup/slack-app/.env`. No laptop should run `npm start` any more.

**Working local pilot / manual Slack demo.** The prototype builds, the Slack app is installed in the Chicago Booth workspace, Socket Mode connects successfully, and an authorized end-to-end demo card has been posted as a private Slack DM.

This is not yet an always-on or production deployment. The current process runs from a developer machine/session and stops when that process stops.

## Completed

- **Countdown follows the Slack ping (2026-11-13)**: every link in the Slack card now carries the meeting's real start (`&start=<epoch seconds>`). Opening it sets the prototype's clock so the Heads-Up countdown matches the Slack card, and reopening the link later continues the countdown instead of restarting at 1:25 PM. The prototype's clock now runs on real time, so it also keeps time in a background tab. Links without `start` behave as before. Needs the VM update (`setup-vm.sh`) after merge.
- **Open questions on the Heads-Up card in Ansel (2026-11-13)**: the card now lists every open question still unresolved from the last meeting and the earlier ones you attended, under the action items. Questions you're tagged on come first ("You're tagged"); ones raised before last meeting are flagged "Still unresolved". Every row on the card, action items and questions, now has a small tag with its meeting's date ("Nov 6"). Each has its summary context line, its stakeholders and ▶ to the transcript moment. New seed question q3 (Oct 30, Gabriel and Rishabh): "Who handles support escalations after launch?", not picked up on Nov 6. Slack card unchanged. Contract 2.3.
- **Earlier meetings on the Slack card (2026-11-13)**: your action items still open from earlier meetings (up to 3 earlier recorded meetings you attended) now appear after last meeting's, and every timestamp names its meeting's date ("Pricing FAQ (Oct 30 · 24:10)"). Seed: one still-open item each for Gabriel and Rishabh (Oct 30) and Alicia and Varun (Oct 23), with transcript lines. Contract 2.1.
- **Condensed Slack card live and confirmed in Slack (2026-11-13)**: one text block and one row of buttons (✓, Join Zoom, Open in Ansel, Mute Series, then a small "Open in Ansel to make changes." note; "You own N items" is bold; Still Open, Decided and Not Useful are off the Slack card); your item links to its transcript moment; several items of yours get checkboxes. Other people's items, Not right and the transcript are in Ansel. Previews and the real output: `card/slack-mockups/`. Zoom is the default demo join link.
- **Slack card redesigned to match `card/` (contract 2.0)**: countdown with Join, every action item from last meeting with owners (yours first, `YOURS`), Mark done, Not right with reasons, Not useful with reasons, Mute with Undo, "Why am I seeing this?" and the trust footer; the same event names as `card/CONTRACT.md`. Card tests: `slack-app/test/card.mjs`.

- The React prototype builds and its selection tests pass.
- The Slack app manifest is applied to the workspace with `/headsup`, interactivity, Socket Mode, and the required bot scopes.
- The app has one active bot token and one active app-level Socket Mode token; the superseded app-level token was revoked.
- Tokens are stored only in the Git-ignored `slack-app/.env` file on the current machine.
- The service starts successfully over Socket Mode with no connection errors.
- A live manual trigger posted Gabriel's Heads-Up card to an authorized user's Slack DM.
- Access is deny-by-default. Commands, scheduled/manual DMs, and card actions are restricted by `ALLOWED_SLACK_USERS`.
- The current local allowlist contains 10 approved email aliases. All five team personas are mapped in `SLACK_USERS`, and each has their own card (see `profiles.md`), so **Ping everyone** reaches all five.
- Offline Slack tests cover the allowlist, card blocks, skip rules, mute/undo, restart-safe actions, ICS parsing, and scheduler behavior.

## Credential and runtime model

The team uses **one central app installation**, not separate Slack tokens for every person.

- `SLACK_BOT_TOKEN` (`xoxb-…`) belongs to the workspace installation.
- `SLACK_APP_TOKEN` (`xapp-…`) belongs to the service and has only `connections:write`.
- Both secrets should live in one operator's local `.env` or, preferably, the secret store of the always-on host.
- Teammates do not need tokens. They only need to be added to `ALLOWED_SLACK_USERS`.
- Run one scheduler/service process at a time. Multiple processes sharing the credentials can handle events unpredictably and can independently fire duplicate calendar cards.

## Calendar trigger decision

- **Chosen trigger:** a published Outlook calendar ICS feed (`CALENDAR_ICS_URL`). Teams meetings are Outlook events, so this covers Teams; Teams join links are detected automatically.
- **Out of scope:** Microsoft Graph. No Entra app registration or IT admin consent is needed.
- **Per-person calendars:** each pilot user publishes their own Outlook calendar; the operator stores it as `CALENDAR_ICS_URL_<PERSONA>` in the central `.env`. A feed only triggers its owner's card. `CALENDAR_ICS_URL` remains as an optional shared fallback. No per-person `.env` or tokens.
- **Freshness:** the app downloads the feed every `POLL_SECONDS` (60 s), but Outlook regenerates the published feed on its own schedule (sometimes hours). Create demo meetings well in advance; keep `/headsup demo` as the on-stage trigger.

## Data privacy (call out in the demo)

This pilot is acceptable for a demo, not for real user data. Say so explicitly when presenting.

- Each published ICS link is an unauthenticated credential: anyone with it can read every event on that calendar (titles, attendees, descriptions). With per-person feeds there is one per pilot user. Treat them like the Slack tokens: keep it only in `slack-app/.env` or the host's secret store, never in Slack or docs. If it leaks, use **Reset links** in Outlook's publish settings.
- "Can view all details" publishes the whole calendar, so the operator's host holds read access to every pilot user's real calendar. Get each user's consent, and have them unpublish when they leave the pilot.
- Feed errors are logged with the URL hidden, and `/headsup next` only shows the requester's own meetings.
- `.env` is a plaintext file on one machine; move secrets to the host's encrypted environment variables when deploying.
- Card content is seeded demo data, not real transcripts.
- A production version would need per-user authorization, scoped calendar access, and a review with UChicago IT before handling real calendars or meeting content.

## Not configured yet

- Per-person calendar links (`CALENDAR_ICS_URL_<PERSONA>`); the live app is currently manual-trigger only.
- A hosted `PROTOTYPE_URL` for transcript deep links.
- Durable state. Mutes and fired-trigger history reset when the process restarts.
- Real Ansel meeting/transcript data; card content is still seeded for the demo.

## Next stage

1. ~~Deploy to an always-on host.~~ Done: Google Cloud VM (see Stage). Railway config is kept as a paid alternative.
2. Run the team verification checklist in [`slack-app/README.md`](slack-app/README.md), including an allowlisted and a non-allowlisted user.
3. Add and validate the recurring calendar feed.
4. Host the prototype and set `PROTOTYPE_URL` if transcript deep links are needed for the demo.
5. Add persistence and real data integrations before treating the app as production-ready.
