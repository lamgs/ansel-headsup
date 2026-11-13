# Slack mockups of the Heads-Up card

Three Slack-native (Block Kit) directions for the card in `card/`, using its demo data (`card/demo-data.js`, viewer Alex), for choosing a layout. `comparison.png` puts Varun's design next to directions 1–3; `comparison-2.png` next to the refined 2a and 2b.

| Direction | Image | Block Kit |
|---|---|---|
| 1 · Stacked: every row shows its buttons underneath | `1-stacked.png` | `1-stacked.blocks.json` |
| 2 · Yours first: ▶ beside your rows with Mark done / Not right under them; other rows use a ⋮ menu | `2-yours-first.png` | `2-yours-first.blocks.json` |
| 2a · Yours first, refined: no time bar, small grey context text for the meeting line, owners and summaries; ✓ / ✎ icon buttons | `2a-refined-icons.png` | `2a-refined-icons.blocks.json` |
| 2b · Same as 2a with icon + word buttons (✓ Done, ✎ Fix) | `2b-refined-icon-words.png` | `2b-refined-icon-words.blocks.json` |
| 3 · Minimal list: one row per item, every action in a ⋮ menu | `3-minimal.png` | `3-minimal.blocks.json` |

The images are approximations drawn outside Slack (stand-in font; spacing and button shapes may differ slightly). To see exact Slack rendering, paste a `.blocks.json` file into Slack's Block Kit Builder: <https://app.slack.com/block-kit-builder>. 

**Earlier choice: 2a**, with the ▶ arrow removed (replaced by the condensed card below). `live-card.png` and `live-card.blocks.json` are the real output of `slack-app/src/card.js` (Alicia's card); paste the JSON into Block Kit Builder to see it in Slack's own styling.

## Condensed previews (not built)

`condensed/` has three shorter directions, previews only: **A · Condensed** (your item + a one-line team list; ✓ and ⋮, then Open in Ansel on its own row), **B · Minimal** (two lines; ✓ and ⋮, then Open in Ansel), **C · Glance** (two lines and a link; only Join and Open in Ansel are buttons). All use Zoom. Each has a `.blocks.json` for Block Kit Builder.

**Built: B · Minimal, one row** (`condensed/B3-minimal.*`, with `condensed/M2-checkboxes.*` when you own several items; this is what `slack-app/src/card.js` now sends): one text block (title, and your item as a link to its transcript moment) and one row of buttons: ✓ Mark done, Join Zoom, Open in Ansel, Mute series, Not useful. (`B2-minimal.*` was the earlier stacked-buttons version.)

**Several items of your own** (previews): `condensed/M1-dropdown.*` lists each of your items as a link and puts a "Mark done" dropdown in the button row; `condensed/M2-checkboxes.*` gives each item a checkbox (ticked = done). With one item, the card keeps the single ✓ button.

## Transcript note previews (not built)

`transcript/` shows the item's transcript moment as text instead of a button, so it adds no padding: **A** `T1-timestamp` ("14:32 in transcript" as the link in the sentence), **B** `T2-quote` (the quoted line inside the same block, with 14:32 as the link), **C** `T3-several` (with several items, a small grey "14:32 · quoted line" under each checkbox).

**Chosen: C** (checkboxes with a grey note). Link-style previews in `links/`: `L1-timestamp` (the time is the link), `L2-quote-link` (the quote is the link), `L3-transcript-link` ("Transcript 14:32 ↗" at the end), `L4-buttons` (the time as a button, which needs one row per item plus a separate checkbox list), `L5-checkbox-and-button` (one row per item: a one-option checkbox, then the time button; exact placement is up to Slack, check in Block Kit Builder).

**Slack's 75-character limit on checkbox labels and notes** (which includes a link's address) means a transcript link can't go inside a checkbox. `links/L6-fits-limits.*` and `links/L6-one-item.*` show option 3 within the limit: the quote under each checkbox, and the "Transcript 14:32 ↗" links on one small line below.

**Built: option 3 without the quote.** A checkbox per item of yours, with a timestamp link (`#t/<itemId>`) as its note; `live-card.png` and `live-card-several.png` are the real output.

**Two boxes per item** (previews, not built): `flags/F1-side-by-side.*` (the item's Done box, then a Not right box beside it, one row per item) and `flags/F2-boxes-on-right.*` (item name and timestamp link on the left, Done and Not right boxes on the right).

**Current: back to the ✓ button**, with the timestamp after your item and only the timestamp linked: "You own **Forecast update** (14:32) · 5 more items from last week". Several items still get checkboxes with a timestamp link as the note. `live-card.png` is the real output.
