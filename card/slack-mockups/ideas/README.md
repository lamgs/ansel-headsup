# Slack card ideas (previews, not built)

Ideation round for making the Slack card richer. These are pictures drawn outside Slack (stand-in font) to choose a direction; no Block Kit JSON yet.

**Why not just put the web card in Slack?** Slack doesn't run an app's own HTML or JavaScript inside a message. An app sends a description of the layout (Block Kit), and Slack draws it with its own pieces. When someone taps a button, Slack tells the app, and the app can redraw the message, open a pop-up, post a reply or update the Home tab. Modifying the Slack desktop app itself to run our code would break Slack's terms of service and only work on our own laptops, so it isn't an option.

| # | Idea | What it is | Image |
|---|---|---|---|
| 1 | Tidier card | Today's card with a status tag per item, a ⋯ menu per item (Mark done back), Join as the only big button, feedback in the footer | `1-tidier-card.png` |
| 2 | Expand in place | "What was said" redraws the message with the transcript lines inside it; Hide folds it back | `2-expand-in-place.png` |
| 3 | Living card | The same message changes: brief before, "Live · Join now" during, a recap with new items after | `3-living-card.png` |
| 4 | Pop-up mini app | A Slack pop-up (modal): the transcript with ◀ ▶, then Done / new date / reassign / note | `4-pop-up-mini-app.png` |
| 5 | Home tab dashboard | Ansel's Home tab lists everything you owe across meetings, what's coming up and your settings | `5-home-dashboard.png` |
| 6 | Post my update | A pre-filled status you post to the team channel before the meeting | `6-post-my-update.png` |
| 7 | Ask in the thread | Reply to the card with a question; Ansel answers with the quote and a short audio clip | `7-ask-in-thread.png` |
| 8 | Picture of the full card | The web card drawn as an image in the message, redrawn every minute, real buttons underneath | `8-picture-of-full-card.png` |

Notes:

- **8** shows the whole design but the picture can't be tapped, and it isn't sharp text (no search, screen readers only get its alt text). Slack shrinks tall images, so a real version would likely show just the top of the card. It uses the web card's own demo data (`card/demo-data.js`), not the Slack personas.
- The recap items in **3** are made up for the preview.
- **7** needs Slack's `files:write` scope (audio clip) and the `message.im` event; **6** needs `chat:write` in the team channel; the rest work with today's scopes.
- Ideas combine: 1 + 2 + 4 are one card; 3, 5 and 6 sit around it.
