# Ansel mockup spec (Phase 2)

_Owner: Rishabh · Draft for review · 2026-11-12_

## 1. Purpose

When someone clicks **▶ mm:ss** on the Heads-Up Slack card, Ansel opens on that line of the meeting transcript. That is the payoff of the core flow: the card's claim and the moment it was said, one click apart. **Open last meeting** opens the meeting's Summary, which links into the transcript.

The mockup should look like the complete Ansel product from the Phase 1 case, so judges see Heads-Up inside a real product. Only the meeting record (transcript, summary panel, item actions, comments) needs to work. Everything else is visible but inactive.

**Core flow it supports** (Brief §4, Phase 2): Gabriel taps **▶ 14:32** → reads Alicia's line → confirms the deadline (On track / New date / Mark done) → joins ready to report.

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
│ Home     │ 👥 avatars · Weekly, Fri 2:00 PM · organizer Alicia  │                       │
│ Meetings │ 🔒 Visible to attendees only    [Share] [Export ▾]   │ Decisions             │
│ Search   │                                 [Send to ▾]          │ Open questions        │
│ Ask Ansel│ Oct 23 · Oct 30 · [Nov 6] · Nov 13 upcoming          │ Action items          │
│ Settings │ Transcript | Summary | Action items                  │ Themes                │
│ ──────── │ ┌──────────────────────────────────────────────────┐ │                       │
│ Admin    │ │ ▶ ━━━━━━━━○──────── 14:32 / 48:00  (player)      │ │ each row: text, owner,│
│ console  │ │ 🔍 Search this transcript                         │ │ ▶ time, status        │
│          │ └──────────────────────────────────────────────────┘ │                       │
│          │ 14:32  (A) Alicia  Gabriel, can you update the Q1 …  │                       │
│          │                    [Action item · a2]  💬 1           │                       │
│          │ 14:51  (G) Gabriel Yep. I'll have it in the …         │                       │
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
- ~~Right panel with tabs: Summary · Action items · Comments.~~ Removed (see the cast and panel pass below).
- Search box in the toolbar (inactive).

**Polish pass (branch `rishabh/ansel-polish`)**
- Two-row meeting header: back, title, "Fri Nov 6 ▾" meeting menu (switches meetings), Recorded, access badge, attendees, Share / Export / Send to; tabs and cadence on the second row. Labels collapse to icons when narrow.
- Player: static waveform with playhead and item markers, plus a speaker strip; clicking the waveform jumps to the line said at that point. Skip, speed and total time hide when narrow.
- Line hover toolbar: **Copy link to this moment** (copies the same `#ansel/…/transcript/<t>` link the Slack card uses), Comment, Highlight (inactive).
- Jumps place the line a third of the way down below the player, so its speaker and theme label stay visible.
- Transcript labels and status tags use the same small rectangle as the card's `Edited` badge.

**Chat and transcript pass (branch `rishabh/ansel-chat`)**
- Ask Ansel is a floating chat window at the bottom right instead of a meeting tab or page: a launcher button, an open window (360 px) and a minimized bar. The sidebar's Ask Ansel entry opens it.
- Scope follows the screen: the open meeting if you can see it, otherwise "Meetings you attended". Suggested questions add canned answers with ▶ citations; clicking one opens the transcript at that line and minimizes the chat.
- Answers only appear where the person can open the Nov 6 record (Aryan without the direct share sees none). "What do I owe" is offered to Gabriel only. The thread resets when the persona changes.
- Transcript: the speaker's avatar and name sit on the same line as their first line of dialogue, in a fixed column; consecutive lines from the same speaker leave it blank.

**Edit on the card (branch `rishabh/ansel-polish-8`)**
- **Slack message:** unchanged here; #22 keeps Not Useful on it as a greyed-out card.
- **Ansel card rows:** your items show ▶ · Mark done · **Edit** (Edit replaces Not right there); other people's show ▶ · Not right, and the organizer also gets Edit. **Not useful** stays as a footer button beside Open last meeting and Mute series.
- **Edit** opens a dialog for the wording, owner and due date (also reachable from the item panel's "Edit details…"). Saving is a tracked change: an `Edited` tag with "Edited by … · was …" on the card, Summary and item panel, a Pilot log `item_edited` event, and a G4 audit row. Only the item's owner or the organizer can edit.
- Card contract 2.2 adds optional `item.editable`, `item.edited` and the `edit_tap` event.

**Heads-Up lives on the Meetings page, per series (branch `rishabh/ansel-polish-6`)**
- The card belongs to a recurring series, not one meeting (it carries over open items from earlier meetings), so it moves off the Nov 6 Summary.
- **Meetings page:** one row per series (Weekly Product Sync, Design Review) with cadence, next meeting and a "Heads-Up · N yours" or "No Heads-Up" tag. Selecting a row shows that series' card on the right (stacked below on narrow screens); expanding it lists its meetings (upcoming first, then past), and clicking one opens the existing meeting screen. Design Review shows why it has no card (last meeting had Ansel kept out).
- **Summary tab** is the full summary again on every meeting (supersedes the "Summary is the Heads-Up card" pass below).
- **Links:** `#headsup` (Slack's Open in Ansel) opens the Meetings page with Weekly Product Sync selected; `#headsup/dr` selects Design Review. The card's Open last meeting opens the latest meeting's Summary. Home's coming-up rows and the upcoming meeting page open the Meetings page.

**Card looks native in Ansel (branch `rishabh/ansel-polish-5`)**
- Ansel shows `<heads-up-card embedded>`: no Slack frame (avatar, APP tag, time, rail), Ansel's font, inside a standard Ansel card. Colours come from CSS variables set in `src/index.css` (indigo accent and Join, slate text and buttons), with dark-mode values. The standalone card pages keep the Slack look.

**The Summary is the Heads-Up card (branch `rishabh/summary-card`)**
- The latest meeting's (Nov 6) **Summary tab shows the full Heads-Up card** in place of the summary. Every link to that Summary (old Slack messages, `#headsup`, Home's upcoming meeting, the upcoming page) lands on the card; no VM update needed.
- The full summary (overview, For you, decisions, open questions, action items, themes, edit history) stays below the card under **Show full meeting summary**, collapsed. It opens when the card's **Open last meeting** is tapped or something links to one of its items (e.g. the mock card's `Edited` badge).
- Card taps: ▶ opens the transcript; **+N more** opens the Action items tab. Older meetings (Oct 23, Oct 30) keep the regular Summary. The upcoming page links to the card instead of showing a second copy.

**Slack's Open in Ansel opens the card (branch `rishabh/open-in-ansel-card`)**
- The real Slack message's **Open in Ansel** button now links to `#headsup` (the full Heads-Up card) instead of the Summary. From the card, **Open last meeting** goes on to the Summary; ▶ timestamps still open the transcript. This supersedes the "Open last meeting stays on the Summary" decision below for the Slack button.

**Cast and roles (branch `rishabh/cast-roles`)**
- Cast is the five team members: Gabriel (Intern), Alicia (CEO, organizer), Rishabh (CTO), Varun and Aryan (Software Engineers). Riley Park and Leo Grant are removed; Governance G3 uses unnamed placeholders for the new teammate (direct share) and the external guest.
- Without Riley as a persona, only attendees can open a record in the prototype; the direct share shows in the Share dialog, the access badge and the G4 audit log.

**Heads-Up card in Ansel (branch `rishabh/ansel-polish-4`)**
- Slack can only show a basic Heads-Up, so the full card lives in Ansel on the upcoming meeting's page (Nov 13 · upcoming). Links: `#headsup` or `#ansel/upcoming`; Home's "Weekly Product Sync · 2:00 PM" also opens it.
- It is Varun's `<heads-up-card>` from `card/`, loaded unchanged apart from a container query for its narrow layout. Data comes from `buildCardData` (the same as the Slack app), built as if nothing were muted so the card can show its own muted view.
- The card's clock follows the prototype clock: before the reminder (1:30 PM) the page says when it arrives; at 2:00 it goes Live.
- Taps: ▶ opens the transcript at that line with the item panel; Open last meeting and "+N more" open the Summary; Mark done / Undo update the item everywhere in Ansel (and items marked done in Ansel show on the card); Join opens the join flow; Mute and Not useful use the existing state; other events go to the Pilot log.
- The Summary stays the meeting record (decisions, questions, themes); the card covers action items only.

**Cast and panel pass (branch `rishabh/ansel-polish-2`)**
- Alex Kim and Sam Ortiz are removed from the cast. Alex's transcript lines are reassigned by context (Alicia presents the pricing page, Varun asks about pricing tiers, Aryan has the screen and audio lines), his action item a3 moves to Alicia, and Alicia organizes Design Review. See `profiles.md`.
- The transcript's right-hand panel (Summary / Action items / Comments tabs) is removed; the transcript uses the full width. The item panel (Mark done / On track / New date / Reassign) still opens for an action item, e.g. from the card's ▶ 14:32.
- Line labels: an Action item label opens its item panel; a Decision or Open question label opens the Summary on that item.

**Summary redesign (branch `rishabh/ansel-work`)**
- Order: overview card (2 sentences plus live counts) → "For you, <name>" (items you own with due status and Update, questions you're tagged on) → decision and open-question cards → action item table → themes timeline. Attendees list sits under "For you" on wide screens.
- Two columns when the Summary is at least 768 px wide; one column below that (overview, For you, decisions; attendees hidden).
- Decision and question cards: bold statement, one context line, ▶ link under the text. Edit history is "Edited by <name> · View original" instead of inline strikethrough. Open questions have an amber outline; resolved ones show a "Resolved" tag. Organizer edit and attendee comments are kept.
- Action items: Owner · Item · Due · status/▶, the viewer's row first and tinted, then by due date. Dates are relative to the demo day (Nov 13): "Due yesterday", or the date in amber when overdue. Only Done / On track / changed items get a tag.
- Themes: one bar split by duration; clicking a section opens the transcript on that theme. Themes holding the viewer's items are outlined.
- Overview and context text live in `src/data/summaries.js`; `npm test` checks every recorded meeting has an overview and every decision and question has a context line.

**Summary tab (Granola-style)**
- Single readable column (~680 px), generous spacing, section headings: Decisions, Open questions, Action items, Themes.
- Short bullets with a quiet ▶ timestamp on the right; `Edited` shown inline with the original struck through.
- Action items as checklist rows: owner, due date, status pill (Open / On track / Done). Update opens the existing item panel.
- **View full transcript** button at top right.

**Shared shell**
- Left sidebar: workspace name, Home, Meetings, Search, Ask Ansel, Settings, Admin console.
- Meeting header: title, date and duration, "● Recorded" pill, attendee avatars, 🔒 "Attendees only" badge, Share / Export / Send to buttons.
- Ask Ansel: floating chat window, bottom right (see below).
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
- Who can comment: attendees of that meeting, and Aryan only when the G3 direct share is on (matches the case: people the organizer grants access can comment). Non-attendees see the existing "didn't attend" message instead of the transcript.
- One seeded comment so the feature is visible on first load, e.g. Varun on 16:05: "March numbers are updated on the metrics dashboard."

**Visible but inactive on this tab**
- Audio player strip (play button, scrubber at the current line, speed). No video. Clicking it → toast.
- "Search this transcript" box. Typing or clicking → toast.

## 6. Summary panel (removed)

_Removed in the cast and panel pass: the transcript has no side panel. The notes below are kept for history._

- Opens by default on the Transcript tab; collapsible.
- Sections in this order, per the case: **Decisions**, **Open questions**, **Action items**, **Themes**.
- Each row: text, ▶ timestamp, and type-specific details:
  - Decisions: tracked change shown as strikethrough original + `Edited · Alicia · Nov 7` (existing). Organizer can ✎ edit (existing).
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
| Ask Ansel with cited moments | Floating chat (bottom right) and the sidebar entry that opens it. Suggested questions give canned answers whose ▶ citations jump to the line; typing is inactive |
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
- Aryan sees Nov 6 only if Alicia's G3 direct share is ticked; it's recorded in the G4 audit log (existing).
- External guests never see notes (shown on Governance G3 with a placeholder guest).
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
- Personas: start simple. Build and rehearse with Gabriel only; the existing persona switcher keeps working, and other persona flows can be polished later.
