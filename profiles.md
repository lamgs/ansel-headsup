# Demo personas

> **Status: PROPOSED, not yet applied to the code.** This version gives every team member their own Heads-Up card. Edit anything below (roles, items, due dates, wording); once it's agreed, the seed data (`src/data/seed.js`), transcript lines (`src/data/transcripts.js`), prototype screens and tests get updated to match. Until then the app still behaves as in the previous version of this file (only Gabriel gets a card).

Who plays which role in the Heads-Up demo. The team's real names are used, but **roles, meeting attendance and action items are fictional demo data**, not anyone's real work.

## How a card is built (so edits stay realistic)

For Weekly Product Sync, a person gets a card if they attended a recent recorded meeting **and** own an open action item or are a stakeholder on an open question. The card then shows up to one item per section:

- **You own:** their open action item from the most recent meeting (earliest due date wins).
- **Still open:** an open question they're a stakeholder on; otherwise the open question from the latest meeting.
- **Decided:** the highest-priority decision from the latest meeting (the same for everyone).

So with the items below, everyone shares *Still open: Launch date: Mar 3 or Mar 10?* and *Decided: Pricing page ships with v2*, and the **You own** line is what makes each card personal. To make a second line personal too, give that person their own open question.

## Summary

| Persona ID | Name | Pronouns | Demo role | Card: You own | Card: Still open | Card: Decided |
|---|---|---|---|---|---|---|
| `gabriel` | Gabriel | he/him | Data Analyst | Forecast update, due Thu *(14:32)* | Launch date: Mar 3 or Mar 10? (stakeholder) | Pricing page ships with v2 `Edited` |
| `alicia` | Alicia | she/her | Product Manager, series organizer | **NEW** Send updated launch checklist, due Wed *(47:20)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `rishabh` | Rishabh | he/him | Engineering Lead | QA estimate for payment flow, due Thu *(28:30)* | Launch date (stakeholder) | Pricing page ships with v2 `Edited` |
| `varun` | Varun | he/him | Finance Partner | **NEW** Update pricing model with final tiers, due Wed *(34:30)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `aryan` | Aryan | he/him | QA Engineer | **NEW** Write payment flow test plan, due Thu *(28:50)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `sam` | Sam Ortiz *(synthetic)* | n/a | Engineer | No card: *Holdout (measured, no card)* | | |
| `riley` | Riley Park *(synthetic)* | n/a | Support Lead, new to the series | No card: *No meetings attended in this series* | | |
| `alex` | Alex Kim *(synthetic)* | n/a | Content Designer | No card: *Slack not connected* | | |
| `leo` | Leo Grant *(synthetic)* | n/a | Agency partner | No card: *External guest* | | |

Times in *(mm:ss)* are where the item is said in the Nov 6 transcript; the card's ▶ button jumps there. Design Review (`dr`) is skipped for everyone (*No record of last meeting*), because its last meeting had "Keep Ansel out" on.

## What changes from the current version

- **Alicia, Varun, Aryan** each get a new open action item from the Nov 6 meeting, with a matching new transcript line.
- **Rishabh** leaves the holdout group, so his existing QA estimate item produces a card.
- **Aryan** is no longer "new to the series": he attended the Nov 6 meeting.
- The **holdout** and **new to the series** demo cases move to two synthetic people, **Sam Ortiz** and **Riley Park**, so the Pilot Log (holdout) and Governance (add a new member, share notes) screens keep working without using a teammate.
- "Ping everyone" would then send a card to all five team members.

## Details

### Gabriel (`gabriel`): main demo card, unchanged
- **Attends:** all three recorded Weekly Product Syncs (Oct 23, Oct 30, Nov 6); invited to Design Review.
- **Owns:** "Update Q1 forecast with new conversion numbers" (Forecast update), due Thu Nov 12, flagged "may already be done".
- **Stakeholder on:** "Launch date: Mar 3 or Mar 10?"
- Default persona for `/headsup demo` and **Ping me**.

### Alicia (`alicia`): organizer
- **Attends:** all three recorded meetings; organizer of Weekly Product Sync; invited to Design Review.
- **Owns (new):** "Send the updated launch checklist before next sync", due Wed Nov 11.
- **New transcript line (47:20):** *"I'll send the updated launch checklist before next week's sync."* This fits her Slack message in the prototype about the checklist doc being updated.
- **In the story:** she assigns the work in the transcript, made the tracked edit to the pricing decision (Nov 7), and on the Governance screen adds Riley to the series and can share the Nov 6 notes with Riley.

### Rishabh (`rishabh`): engineering lead
- **Attends:** all three recorded meetings.
- **Owns:** "Estimate QA time for payment flow", due Thu Nov 12.
- **Stakeholder on:** the launch-date question.
- **Change:** no longer in the holdout group.

### Varun (`varun`): finance
- **Attends:** Oct 23 and Nov 6 (not Oct 30).
- **In the story:** raised "Do we need legal review for new pricing?", answered at the Nov 6 meeting (33:10).
- **Owns (new):** "Update the pricing model with the final tiers", due Wed Nov 11.
- **New transcript line (34:30):** *"Now that legal's clear, I'll update the pricing model with the final tiers by Wednesday."*

### Aryan (`aryan`): QA engineer
- **Attends (changed):** Nov 6 only, his first meeting in the series.
- **Owns (new):** "Write the payment flow test plan", due Thu Nov 12.
- **New transcript line (28:50):** *"I'll write up the payment flow test plan so the estimate has something to work from."* This fits his Slack message in the prototype, "Starting on the payment flow test plan."

### Sam Ortiz (`sam`, synthetic): holdout
- Attends all three meetings but is in the randomized holdout group, so never gets a card. Shown on the Pilot Log screen.

### Riley Park (`riley`, synthetic): new to the series
- Newly invited, no recorded meetings attended, so no card until after a first meeting. Used on the Governance screen, where Alicia adds Riley and can share the Nov 6 notes.

### Alex Kim and Leo Grant (synthetic)
Unchanged: no Slack account, and external agency guest.

## Real Slack and calendar setup

The persona ID is the key everywhere in config (`slack-app/.env`):

```dotenv
SLACK_USERS=gabriel=<gabriel's Slack email>,alicia=<alicia's Slack email>
CALENDAR_ICS_URL_GABRIEL=<Gabriel's published Outlook ICS link>
CALENDAR_ICS_URL_ALICIA=<Alicia's published Outlook ICS link>
```

Each person still needs to be listed in `ALLOWED_SLACK_USERS`. Run `/headsup check <persona>` to see why a persona does or doesn't get a card. Synthetic personas (`sam`, `riley`, `alex`, `leo`) shouldn't be mapped to real people.
