# Demo personas

Who plays which role in the Heads-Up demo. The team's real names are used, but **roles, meeting attendance and action items are fictional demo data**, not anyone's real work.

To change a role, edit this file first so the intent is clear, then apply it in [`src/data/seed.js`](src/data/seed.js) (people, series invitees, meeting attendees and items). Transcript lines live in [`src/data/transcripts.js`](src/data/transcripts.js). After changing either, run `npm test` in the repo root and in `slack-app/`: `scripts/check-selection.mjs` lists the expected result for every persona and will fail until it is updated to match.

## Summary

| Persona ID | Name | Demo role | Heads-Up for Weekly Product Sync | Why |
|---|---|---|---|---|
| `gabriel` | Gabriel | Data Analyst | **Full card** (default for `/headsup demo`) | Owns an open action item and an open question from the last meeting |
| `alicia` | Alicia | Product Manager, series organizer | Skipped: *Nothing for you from recent meetings* | Ran the meetings but owns no open items |
| `rishabh` | Rishabh | Engineering Lead | Skipped: *Holdout (measured, no card)* | In the measurement holdout group, despite owning open items |
| `varun` | Varun | Finance Partner | Skipped: *Nothing for you from recent meetings* | Their legal question was resolved; nothing open |
| `aryan` | Aryan | QA Engineer, new to the series | Skipped: *No meetings attended in this series* | Newly invited; hasn't attended a recorded meeting yet |
| `alex` | Alex Kim *(synthetic)* | Content Designer | Skipped: *Slack not connected* | Shows the no-Slack case |
| `leo` | Leo Grant *(synthetic)* | Agency partner | Skipped: *External guest* | Shows that external guests never get cards |

Design Review (`dr`) is skipped for everyone (*No record of last meeting*), because its last meeting had "Keep Ansel out" on.

## Details

### Gabriel (`gabriel`): the main demo card
- **Attends:** all three recorded Weekly Product Syncs (Oct 23, Oct 30, Nov 6); invited to Design Review.
- **Card shows:**
  - *You own:* Forecast update, due Thu, flagged "may already be done" (transcript 14:32)
  - *Still open:* Launch date: Mar 3 or Mar 10? (27:05)
  - *Decided:* Pricing page ships with v2, marked `Edited` (41:18)
- **Earlier item:** "Pull conversion data from dashboard" (Oct 30) is done, so it's excluded.

### Alicia (`alicia`): organizer
- **Attends:** all three recorded meetings; organizer of Weekly Product Sync; invited to Design Review.
- **In the story:** assigns the work in the transcript, made the tracked edit to the pricing decision (Nov 7), and is the one who adds Aryan to the series and can share the Nov 6 notes with Aryan (Governance screen).
- **Card:** none. Organizing a meeting doesn't create items for you.

### Rishabh (`rishabh`): holdout
- **Attends:** all three recorded meetings.
- **Owns:** "Estimate QA time for payment flow" (due Nov 12) and shares the open launch-date question.
- **Card:** none: Rishabh is in the holdout group used to measure whether Heads-Up helps. The Pilot Log screen calls this out.

### Varun (`varun`): finance, nothing open
- **Attends:** Oct 23 and Nov 6 (not Oct 30).
- **In the story:** raised "Do we need legal review for new pricing?", answered at the Nov 6 meeting (33:10).
- **Card:** none. Varun's only item is resolved.

### Aryan (`aryan`): new to the series
- **Attends:** no recorded meetings yet; newly invited.
- **Card:** none until after Aryan's first meeting. In the prototype, Alicia can share the Nov 6 notes with Aryan.

### Alex Kim and Leo Grant (synthetic)
Kept as made-up people because their roles (no Slack account; external agency guest) don't fit a team member.

## Real Slack and calendar setup

The persona ID is the key everywhere in config (`slack-app/.env`):

```dotenv
SLACK_USERS=gabriel=<gabriel's Slack email>,alicia=<alicia's Slack email>
CALENDAR_ICS_URL_GABRIEL=<Gabriel's published Outlook ICS link>
CALENDAR_ICS_URL_ALICIA=<Alicia's published Outlook ICS link>
```

Each person still needs to be listed in `ALLOWED_SLACK_USERS`. Mapping someone in `SLACK_USERS` sends them the card for their persona, which for everyone except Gabriel is currently a skip (logged, no DM). Run `/headsup check <persona>` to see why.
