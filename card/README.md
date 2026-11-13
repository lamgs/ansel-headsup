# Heads-Up card (standalone)

A standalone version of the pre-meeting Heads-Up card, built as a plain-JavaScript custom element: `<heads-up-card>`. The **Ansel app in the React prototype shows it** on the upcoming meeting's page (`src/screens/ansel/HeadsUpPanel.jsx`, link `#headsup`), fed from `src/logic/buildCardData.js`, because a Slack message can only carry a basic version. The prototype's mocked Slack screen still uses `src/screens/HeadsUpCard.jsx`.

The card switches to its narrow layout when the window **or the card itself** is under 560 px wide (a container query), so it fits beside Ansel's sidebar.

**Embedded mode:** `<heads-up-card embedded>` drops the Slack message frame (avatar, name, APP tag, time, blue rail, hover band) and uses the host page's font, for showing the card inside an app instead of as a Slack message. Its colours are CSS variables the host can set on the element: `--ink`, `--quiet`, `--line`, `--link`, `--ansel` (accent), `--green` (Join), `--soon`, `--live`, `--done-bg`, `--row-hover`, `--surface` (button background), `--on-accent`, `--btn-line`, `--track`, `--rail`. Defaults match the Slack look, so pages that don't set them (`index.html`, `demo.html`) are unchanged. Ansel's values, including dark mode, are in `src/index.css`.

It arrives when the user's Outlook reminder fires and brings back last meeting's action items from Ansel, each with its owner. It counts down to the meeting and has a Join button. This is the **functional build**: every state, button and event works, with plain styling.

## What it adds compared with the current card

- **Countdown design:** a large timer (minutes to start, amber in the last 5, "Live" once started) with **Join Zoom** on the same line, and a time bar.
- **Every action item from last meeting,** each with a one-line summary from Ansel's existing meeting summary. The viewer's own items come first with a YOURS label; a line separates everyone else's, which show the owner's name and no status.
- **Mark done** on the viewer's own items: the row turns green and the button reads "✓ Done" (tap it again to undo).
- **Not right** on every open row, with an optional reason (wrong owner, not a real item, already done) for owner-accuracy tracking.
- **Why am I seeing this?** and a trust footer: only you can see this, built from last week's recording, which everyone on the invite can open, with no new AI processing.
- **Holdout:** a holdout user gets no card, as in Slack; `card_suppressed` fires so it can be logged.
- **Event log:** `<heads-up-log>` shows every event live, marks value actions (▶ or Mark done) and "joined prepared."

## Try it

- **`card/index.html` is the final page:** the card in a direct message from Ansel, with no controls. Taps that open Ansel or Zoom (▶, Open last meeting, +1 more, Join) show a short note saying where they go, until those pages are hosted.
- **`card/demo.html` is for testing:** switch viewers (including the holdout user), jump the clock, reset, and watch every event in the log.

Open either one from the dev server (`npm run dev`, then `/card/`) or by double-clicking it. `npm run build` does not include this folder; it only builds the React prototype.

## Using it from React

The element reads a `data` property and fires one event, `headsup:action`, for every tap. In React, set the property and listen through a ref:

```jsx
const ref = useRef(null)
useEffect(() => {
  const el = ref.current
  el.data = cardData                       // shape: CONTRACT.md, section 3
  const onAction = (e) => { /* e.detail.action, e.detail.payload */ e.preventDefault() }
  el.addEventListener('headsup:action', onAction)
  return () => el.removeEventListener('headsup:action', onAction)
}, [cardData])
return <heads-up-card ref={ref} />
```

Load `card/heads-up-card.js` once (for example with a `<script>` tag in `index.html`). The demo data uses its own personas (Alex, Sam, Theo, Ines, Jordan), not the team's seed in `src/data/seed.js`.

## Files

| File | What it is |
|---|---|
| `heads-up-card.js` | The card: `<heads-up-card>` |
| `heads-up-log.js` | The on-screen event log: `<heads-up-log>` |
| `demo-data.js` | Sample data: `alex`, `alexOwnsNothing`, `holdout` |
| `index.html` | The final page: the card in an Ansel message, no controls |
| `demo.html` | Testing page: viewer switcher, clock jumps, reset, event log |
| `CONTRACT.md` | Every data field the card reads and every event it fires (version 2.1) |
