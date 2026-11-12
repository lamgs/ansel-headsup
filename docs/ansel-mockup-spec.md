# Ansel mockup spec (Phase 2)

_Owner: Rishabh · Draft for review · 2026-11-12_

## 1. Purpose

When someone clicks **▶ mm:ss** on the Heads-Up Slack card, Ansel opens on that line of the meeting transcript. That is the payoff of the core flow: the card's claim and the moment it was said, one click apart. **Open last meeting** opens the meeting's Summary, which links into the transcript.

The mockup should look like the complete Ansel product from the Phase 1 case, so judges see Heads-Up inside a real product. Only the meeting record (transcript, summary panel, item actions, comments) needs to work. Everything else is visible but inactive.

**Core flow it supports** (Brief §4, Phase 2): Maya taps **▶ 14:32** → reads Jordan's line → confirms the deadline (On track / New date / Mark done) → joins ready to report.

## 2. Decisions so far

| Topic | Decision |
|---|---|
| Base | Extend the existing `src/screens/Ansel.jsx`. Keep seed data, state and the Slack deep links. |
| Landing | ▶ opens the **Transcript** at that line. **Open last meeting** opens the **Summary** tab (unchanged). No card files change. |
| Active on the transcript | Summary ↔ transcript links, and comments on lines. |
| Existing features | Summary tab, Action items (Mark done / On track / New date / Reassign), organizer edits with `Edited` flag all keep working. |
| Themes | Added to the meeting summary (not to the Slack card). |
| Inactive features | Look real. Clicking shows a small "Not in this prototype" toast. |
| Transcript filler | Rewrite repeated filler lines; key lines stay verbatim. |

## 3. Entry points

| From | Lands on | Behavior |
|---|---|---|
| Card **▶ 14:32** (own item) | `#ansel/wps-1106/transcript/14:32/a2` | Scrolls to 14:32, highlights it 3 s, opens the item panel for a2 |
| Card **▶ 27:05 / 41:18** (open / decided) | `#ansel/wps-1106/transcript/<t>` | Scrolls and highlights; summary panel shows the item selected |
| Card **Open last meeting** | `#ansel/wps-1106/summary` | Summary tab, top (unchanged) |
| Card **`Edited`** badge | Summary tab, item focused | Unchanged; the summary line shows the original |
| Ansel left nav → Meetings → a meeting | Summary tab | Unchanged |
| Summary ▶ / theme / **View full transcript** | Transcript tab | Jumps to that line (or the top) with the summary panel open |

**No changes outside Ansel.** Both cards (`src/screens/HeadsUpCard.jsx`, `slack-app/src/card.js`) already link this way, so Varun's and Gabe's files stay as they are.

## 4. Screen layout

Layout sketch (the player is audio only):

```
┌──────────┬──────────────────────────────────────────────────────┬───────────────────────┐
│ Ansel    │ ← Meetings                                           │ SUMMARY PANEL         │
│          │ Weekly Product Sync · Nov 6 · 48 min  ● Recorded     │ (or item panel)       │
│ Home     │ 👥 avatars · Weekly, Fri 2:00 PM · organizer Jordan  │                       │
│ Meetings │ 🔒 Visible to attendees only    [Share] [Export ▾]   │ Decisions             │
│ Search   │                                 [Send to ▾]          │ Open questions        │
│ Ask Ansel│ Oct 23 · Oct 30 · [Nov 6] · Nov 13 upcoming          │ Action items          │
│ Settings │ Transcript | Summary | Action items | Ask Ansel      │ Themes                │
│ ──────── │ ┌──────────────────────────────────────────────────┐ │                       │
│ Admin    │ │ ▶ ━━━━━━━━○──────── 14:32 / 48:00  (player)      │ │ each row: text, owner,│
│ console  │ │ 🔍 Search this transcript                         │ │ ▶ time, status        │
│          │ └──────────────────────────────────────────────────┘ │                       │
│          │ 14:32  (J) Jordan  Maya, can you update the Q1 …     │                       │
│          │                    [Action item · a2]  💬 1           │                       │
│          │ 14:51  (M) Maya    Yep. I'll have it in the …         │                       │
└──────────┴──────────────────────────────────────────────────────┴───────────────────────┘
```

## 4a. UI direction

**Otter for the transcript, Granola for the summary.** Otter is built around the transcript (player, speaker blocks, highlights, comments, side panel), which matches the active Transcript tab. Granola reads like a clean document, which suits the Summary tab that Open last meeting lands on (summaries get about 22 seconds of reading, Ex 5). Ansel itself is closer to Otter: a visible bot that records, with comments and tracked changes.

**Transcript tab (Otter-style)**
- Audio player bar (inactive): play, scrubber, 1x speed, current time; small markers on the scrubber at cited items.
- Speaker blocks: avatar, name, timestamp; consecutive lines from the same speaker merge into one block.
- Cited lines: soft background tint plus a margin chip (Decision / Open question / Action item). The ▶ target flashes for 3 s.
- Theme dividers between sections, e.g. "Forecast & conversion · 14:32–21:25".
- Comments: icon on line hover; threads in the right margin with avatar, text and time.
- Right panel with tabs: Summary · Action items · Comments. Collapsible; every row has ▶.
- Search box in the toolbar (inactive).

**Summary tab (Granola-style)**
- Single readable column (~680 px), generous spacing, section headings: Decisions, Open questions, Action items, Themes.
- Short bullets with a quiet ▶ timestamp on the right; `Edited` shown inline with the original struck through.
- Action items as checklist rows: owner, due date, status pill (Open / On track / Done). Update opens the existing item panel.
- **View full transcript** button at top right.

**Shared shell**
- Left sidebar: workspace name, Home, Meetings, Search, Ask Ansel, Settings, Admin console.
- Meeting header: title, date and duration, "● Recorded" pill, attendee avatars, 🔒 "Attendees only" badge, Share / Export / Send to buttons.
- Ask Ansel: chat panel whose answers carry ▶ citation chips.
- Small toast for inactive features.

**Guardrails**
- Inspiration only: no logos, names, exact colors or copied screens. Keep Ansel's indigo brand from the existing Tailwind theme.
- Granola and Otter are the case's "Tempo" (prosumer) examples. If judges notice, the answer is: familiar patterns, plus enterprise governance on top.
- Stack stays React + Tailwind, plus `lucide-react` icons for the toolbar and buttons.

## 5. Transcript tab (active)

**Lines**
- Each line shows the timestamp, avatar, speaker first name and text (existing).
- Deep-link target line scrolls to center and highlights for 3 s (existing).
- **Theme bands:** a thin label above the first line of each theme ("Forecast & conversion · 14:32–21:25") with the range lightly shaded while that theme is selected.

**Summary ↔ transcript links (new)**
- Lines that a summary item cites get a chip: `Decision`, `Open question` or `Action item`, colored by type.
- Clicking a chip selects that item in the summary panel.
- Clicking an item in the summary panel scrolls to and highlights its line.
- Clicking a theme in the panel scrolls to its first line and shades its range.

**Comments on lines (new)**
- Hovering a line shows a **Comment** button. Comments show inline under the line with author, time and a count badge.
- Who can comment: attendees of that meeting, and Riley only when the G3 direct share is on (matches the case: people the organizer grants access can comment). Non-attendees see the existing "didn't attend" message instead of the transcript.
- One seeded comment so the feature is visible on first load, e.g. Dana on 16:05: "March revenue line updated in the budget view."

**Visible but inactive on this tab**
- Audio player strip (play button, scrubber at the current line, speed). No video. Clicking it → toast.
- "Search this transcript" box. Typing or clicking → toast.

## 6. Summary panel (active, right side)

- Opens by default on the Transcript tab; collapsible.
- Sections in this order, per the case: **Decisions**, **Open questions**, **Action items**, **Themes**.
- Each row: text, ▶ timestamp, and type-specific details:
  - Decisions: tracked change shown as strikethrough original + `Edited · Jordan · Nov 7` (existing). Organizer can ✎ edit (existing).
  - Open questions: status (Open / Resolved Nov 6). Organizer can ✎ edit.
  - Action items: owner, due date, status. The owner sees **Update**, which swaps the panel to the existing item panel (Mark done / On track for today / New date / Reassign).
  - Themes: title, range, linked items.
- **Summary tab (landing page for Open last meeting):** full-width view of the same content, plus Themes. Every item and theme has a clear ▶ link that opens the Transcript at that line, and the header has a **View full transcript** button.

## 7. Themes (data)

Nov 6 (`wps-1106`):

| Theme | Range | Items |
|---|---|---|
| Status round-up | 00:05–05:25 | — |
| Q1 roadmap review | 06:05–13:25 | — |
| Forecast & conversion | 14:32–21:25 | a2 |
| QA & launch date | 22:05–27:40 | q2, a4 |
| Launch checklist & legal | 28:05–33:25 | d4 |
| Pricing page | 34:45–41:52 | d3, a3 |
| Wrap-up & owners | 42:45–47:40 | — |

Oct 23 and Oct 30 get two themes each, drafted from their transcripts.

## 8. Transcript cleanup

The Nov 6 filler repeats lines word for word (13:25 = 00:45, 14:05 = 01:25, 26:45 = 15:25, 39:25–42:05 repeats 27:25–29:25, and others). Rewrite repeated filler so every line is unique and fits its theme.

Constraints:
- Key lines stay verbatim with the same timestamps: 14:32, 14:51, 27:05, 27:40, 28:30, 33:10, 41:18, 41:52 (and any other line an item cites).
- Gaps stay ≤ 60 s; first line ≤ 60 s from start; last line ≤ 60 s from 48:00 (checked by `npm test`).

## 9. Visible but inactive features

All look real. Clicking shows a toast: "Not in this prototype." Grouped by where they appear:

| Feature (Phase 1 case) | Where |
|---|---|
| Search across meetings you attended (default scope) | Left nav **Search** page with a scope note "Meetings you attended" |
| Ask Ansel with cited moments | Left nav and meeting tab. Canned Q&A whose citations look like ▶ links |
| Share and permissions | Meeting header: 🔒 "Visible to attendees only" badge, **Share** opens a mock dialog (organizer sets access, direct share if policy allows, "Access is audit-logged") |
| Task-tool push (Asana, Jira, Linear) | **Send to ▾** menu on the header and action items |
| Slack / Teams thread delivery | **Send to ▾** menu |
| CSV / PDF export | **Export ▾** menu |
| Rolling in-meeting summary (beta) | "Live summary · Beta" chip on the Nov 13 upcoming tab |
| Keep Ansel out, retention policy | Settings page (next to existing Heads-Up settings) and the upcoming-meeting view |
| Admin console (sharing scope, audit log) | Left nav entry, links to the existing Setup & governance tab |
| Mobile app | Out of scope (not shown) |

## 10. Permissions (unchanged rules, shown in the UI)

- Notes are visible to attendees only (case default, 78% of meetings). Non-attendees see an explanation, not the transcript.
- Riley sees Nov 6 only if Jordan's G3 direct share is ticked; it's recorded in the G4 audit log (existing).
- External guests (Leo) never see notes.
- Only the organizer edits decisions and questions; only the owner updates an action item.

## 11. Out of scope

- Real search, Ask Ansel answers, media playback, export, integrations.
- Editing transcript text.
- Any change to the Slack card's three sections or selection logic.
- Saving state across reloads.

## 12. Done when

- ▶ 14:32 on either card (prototype or real Slack) lands on the highlighted line with the a2 panel open; Open last meeting lands on the Summary tab, and every summary item, theme and View full transcript opens the transcript.
- Clicking any summary item or theme jumps to its line; chips on lines select their item.
- An attendee can add a comment; a non-attendee can't.
- Every inactive control shows the toast and nothing looks broken.
- `npm test` and `npm run build` pass, including the transcript spacing check after the cleanup.

## 13. Open questions

None.

## 14. Resolved

- Open last meeting: stays on the Summary tab. Summary answers "what happened last time"; ▶ answers "where was it said". No card files change.
- Video: left out for now; audio-only player strip.
- Icons: `lucide-react` added to the root `package.json`.
- Personas: start simple. Build and rehearse with Maya only; the existing persona switcher keeps working, and other persona flows can be polished later.
