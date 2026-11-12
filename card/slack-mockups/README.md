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

**Chosen: 2a**, with the ▶ arrow removed. `live-card.png` and `live-card.blocks.json` are the real output of `slack-app/src/card.js` (Alicia's card); paste the JSON into Block Kit Builder to see it in Slack's own styling.
