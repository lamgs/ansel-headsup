# Heads-Up Card · Integration Contract

**Contract version:** 2.0 (2.0 replaced the sections with one Action items table; Following, sharing and the Decided section are gone.)

**Files in `/card`:** `heads-up-card.js` (the card), `heads-up-log.js` (the event log), `demo-data.js` (sample data), `index.html` (the final page: the card in an Ansel message, no controls), `demo.html` (testing page with controls and the event log), `CONTRACT.md` (this file), `README.md`.

The card renders only what the app gives it and reports every tap back as an event. If something here changes, the version number changes.

---

## 1. Add the card to a page

The card is plain JavaScript, so there is nothing to install or build. From a plain HTML page at the repo's top level (for React, see README.md):

```html
<script src="card/heads-up-card.js"></script>
<script src="card/heads-up-log.js"></script>
<script src="card/demo-data.js"></script>

<heads-up-card id="card"></heads-up-card>
<heads-up-log for="card"></heads-up-log>

<script>
  const card = document.getElementById('card');
  card.data = HeadsUpDemoData.alex;            // 1. give the card its data

  card.addEventListener('headsup:action', (e) => {   // 2. listen for taps
    const { action, payload } = e.detail;
    if (action === 'timestamp_tap') {
      openTranscript(payload.meetingId, payload.seconds); // your code
      e.preventDefault(); // "I handled it": the card will not follow its backup link
    }
  });
</script>
```

`e.preventDefault()` must be called inside the listener, before it returns. `<heads-up-log for="card">` shows one card's events; leave out `for` to show events from every card on the page.

---

## 2. Controlling the clock (for the demo)

By default, the meeting starts `reminderMinutes` after the data is set (30 in the demo), and the card counts down in real time.

| Call | What it does |
|---|---|
| `card.now = new Date(...)` | Sets the card's current time; the clock keeps running from there |
| `card.now = null` | Returns to the real clock |
| `card.jumpTo('posted')` | Jumps to the moment the Outlook reminder fires (30 min before start in the demo) |
| `card.jumpTo('starting-soon')` | Jumps to 4 min before start (the timer turns amber) |
| `card.jumpTo('started')` | Jumps to 1 min after start |
| `card.jumpTo('ended')` | Jumps to 1 min after end |
| `card.reset()` | Clears all taps (done, flagged, muted, not useful) and re-renders from `card.data` |

Setting `card.data` again re-renders from the new data. If it is the same viewer and the same meeting, the card keeps its clock and its own changes (done, flagged, muted, not useful). Call `card.reset()` to clear them.

---

## 3. Data the app passes in

```json
{
  "contractVersion": "2.0",
  "viewer": { "id": "u_alex", "name": "Alex", "inHoldout": false },
  "meeting": {
    "seriesId": "s_weekly_product_sync",
    "meetingId": "m_next",
    "title": "Weekly Product Sync",
    "isRecurring": true,
    "start": null,
    "demoStartTime": "14:00",
    "durationMinutes": 30,
    "reminderMinutes": 30,
    "platform": "Zoom",
    "joinUrl": "https://zoom.us/j/0000000000"
  },
  "lastMeeting": {
    "meetingId": "m_last",
    "recorded": true,
    "label": "last week's recording",
    "url": "meeting.html?id=m_last",
    "transcriptUrl": "transcript.html?meeting=m_last"
  },
  "actionItems": {
    "items": [
      { "id": "i_forecast", "text": "Forecast update", "owner": { "id": "u_alex", "name": "Alex" }, "seconds": 872,
        "summary": "Rerun the forecast with the revised pipeline and share it with the team." },
      { "id": "i_q3", "text": "Final Q3 numbers", "owner": { "id": "u_sam", "name": "Sam" }, "seconds": 1120,
        "summary": "Close out Q3 actuals so the forecast can use them." }
    ],
    "moreCount": 1
  }
}
```

| Field | Rules |
|---|---|
| `viewer.inHoldout` | `true` renders nothing (as in Slack) and fires `card_suppressed`, so the app can log it |
| `meeting.isRecurring`, `lastMeeting.recorded` | If either is `false`, the card renders nothing (no card) |
| `meeting.start` | ISO time, or `null` to start `reminderMinutes` after the data is set |
| `meeting.demoStartTime` | Optional, `"HH:MM"`. Used only when `start` is `null`: shows the meeting at that time today and sets the card's clock to the reminder moment. Remove it to use real clock times |
| `meeting.reminderMinutes` | The user's Outlook reminder setting; the card posts at that moment and renders nothing before it |
| `actionItems.items` | Every action item from last meeting, each with an `owner`. The viewer's own come first, labeled YOURS; a line separates everyone else's. Send up to 6; put the rest in `moreCount` |
| `item.owner` | Required: `{ id, name }`. Only the owner gets Mark done; everyone gets ▶ and Not right |
| (status) | Status shows only on the viewer's own items: YOURS, Mark done or "✓ Done", and the green row. Other people's rows never show open or done |
| `item.seconds` | Position in last meeting's transcript; shown as mm:ss on the ▶ button |
| `item.summary` | Optional, one short line under the task. Take it from Ansel's existing meeting summary, so the card adds no new AI processing. No due dates: those get set in the meeting |
| `item.done` | Optional, viewer's items only; `true` shows the row as done (green background, "✓ Done"). Ignored on other people's items |
| `actionItems.moreCount` | Shows "+N more in Ansel" under the table when above 0 |

Everyone on the invite gets a card and sees every action item, because invitees can already open last meeting's summary. The card adds no access.

---

## 4. Events the card fires

Every event is `headsup:action`, cancelable, with this `e.detail`:

```json
{
  "action": "timestamp_tap",
  "contractVersion": "2.0",
  "at": "2026-11-13T19:31:04.000Z",
  "viewerId": "u_alex",
  "seriesId": "s_weekly_product_sync",
  "meetingId": "m_next",
  "inHoldout": false,
  "valueAction": true,
  "payload": { "itemId": "i_forecast", "section": "actionItems", "seconds": 872, "meetingId": "m_last" },
  "href": "transcript.html?meeting=m_last&t=872"
}
```

`href` is `null` when an action has no backup link. The card always updates itself first (with Undo where listed), then fires the event.

| Action | Fired when | Payload | ★ Value | Backup link (`href`) |
|---|---|---|---|---|
| `card_shown` | Card first renders | `state` | | — |
| `card_suppressed` | A holdout user's card is withheld | `reason: "holdout"` | | — |
| `state_changed` | Posted → starting soon → started → ended | `from`, `to` | | — |
| `timestamp_tap` | ▶ on any action item | `itemId`, `section` (`actionItems`), `seconds`, `meetingId` | ★ | `transcriptUrl&t=seconds` |
| `mark_done` | Mark done on one of the viewer's own items (the row turns green, the button shows "✓ Done") | `itemId` | ★ | — |
| `mark_done_undone` | "✓ Done" tapped again | `itemId` | | — |
| `item_flagged` | Not right on any action item | `itemId`, `section`, `ownerId` | | — |
| `item_flag_reason` | Reason picked after Not right | `itemId`, `reason`: `wrong_owner` / `not_real` / `already_done` | | — |
| `item_flag_undone` | "Flagged" tapped again | `itemId` | | — |
| `more_tap` | "+N more in Ansel" | `section`, `moreCount` | | `lastMeeting.url&section=…` |
| `join_tap` | Join Zoom / Join now | `platform`, `joinedPrepared` (true if ▶ or Mark done came first) | | `joinUrl` (new tab) |
| `open_last_meeting` | Open last meeting | `meetingId` | | `lastMeeting.url` |
| `mute_series` | Mute series | `seriesId` | | — |
| `mute_undone` | Undo on Mute | `seriesId` | | — |
| `not_useful` | Not useful | — | | — |
| `not_useful_reason` | Reason picked after Not useful | `reason`: `already_knew` / `wrong_meeting` / `bad_timing` | | — |
| `not_useful_undone` | Undo on Not useful | — | | — |
| `why_opened` | "Why am I seeing this?" | — | | — |

---

## 5. What the card handles on its own

The large countdown timer (amber in the last 5 minutes, "Live" once started, "Ended" after), the time bar and the four timeline states; Join as the one green button, off after the meeting ends; the muted one-line view (Join stays); Undo on every action; the reason rows for Not right and Not useful; the "Why am I seeing this?" panel; ordering the viewer's items first; status only on the viewer's own rows; Mark done only on the viewer's own rows; the `joinedPrepared` flag; the phone layout; keyboard and screen-reader support.

---

## 6. What the app needs to build

| Piece | Required behavior |
|---|---|
| Card data | Pass an object per the schema above. `demo-data.js` has ready-made users: `alex`, `alexOwnsNothing`, `holdout`. |
| Transcript view | Open last meeting's transcript at `seconds`, either by handling `timestamp_tap` or by serving `transcript.html?meeting=…&t=…` |
| Last meeting view | Handle `open_last_meeting` and `more_tap`, or serve `meeting.html?id=…` |
| Mute | After `mute_series`, stop future cards for that series (mocked); restore on `mute_undone` |
| Demo controls (optional) | Buttons calling `card.jumpTo(...)`, a user switcher, and `card.reset()`. `demo.html` has all three |

---

## 7. In real Slack

The content and buttons map to Block Kit: the title and countdown become a header block and a context line ("Starts in 30 min · 2:00 PM on Zoom"); Join is the one green primary button; each action item is a row of a data table block (▶, Mark done and Not right as button cells) or a section with its buttons; the footer is a context block. The large timer, the time bar, the colored row stripes, the YOURS label and the green row background are demo-page styling that a Slack message can't draw; the Slack app would carry them as text (for example "✓ Done" and "Yours").

## 8. Versioning

`contractVersion` follows `major.minor`. New optional fields or events bump the minor number. Renamed or removed fields bump the major number, and the card logs a console warning if the data's major version doesn't match its own.
