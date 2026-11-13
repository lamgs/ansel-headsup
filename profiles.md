# Demo personas

Every team member gets their own Heads-Up card, so **Ping everyone** reaches all five. To change a role, edit this file first, then apply it in [`src/data/seed.js`](src/data/seed.js) (people, invitees, attendees, items) and [`src/data/transcripts.js`](src/data/transcripts.js), and update the expected results in `scripts/check-selection.mjs`. Run `npm test` in the repo root and in `slack-app/`.

Who plays which role in the Heads-Up demo. The team's real names are used, but **roles, meeting attendance and action items are fictional demo data**, not anyone's real work.

## How a card is built (so edits stay realistic)

**Slack card (current, follows the design in [`card/`](card/README.md)):** everyone on the Weekly Product Sync invite gets a card listing **every action item from the last meeting (Nov 6), each with its owner**. Your own items come first, marked YOURS, with Mark done; everyone else's show the owner's name. No card for external guests (Leo); holdout users and people without Slack would get none either, but no one in the cast is either. So the personal part of each card is the YOURS row below, and every card also shows the other items.

**Prototype card (the React app's own Heads-Up screen):** unchanged, built by `src/logic/buildHeadsUp.js` with the rules below.

For Weekly Product Sync, a person gets a card if they attended a recent recorded meeting **and** own an open action item or are a stakeholder on an open question. The card then shows up to one item per section:

- **You own:** their open action item from the most recent meeting (earliest due date wins).
- **Still open:** an open question they're a stakeholder on; otherwise the open question from the latest meeting.
- **Decided:** the highest-priority decision from the latest meeting (the same for everyone).

So with the items below, everyone shares *Still open: Launch date: Mar 3 or Mar 10?* and *Decided: Pricing page ships with v2*, and the **You own** line is what makes each card personal. To make a second line personal too, give that person their own open question.

## Summary

| Persona ID | Name | Pronouns | Demo role | Card: You own | Card: Still open | Card: Decided |
|---|---|---|---|---|---|---|
| `gabriel` | Gabriel | he/him | Data Analyst | Forecast update, due Thu *(14:32)* | Launch date: Mar 3 or Mar 10? (stakeholder) | Pricing page ships with v2 `Edited` |
| `alicia` | Alicia | she/her | Product Manager, series organizer | Pricing page copy, due Wed *(41:52)*; also owns Launch checklist *(47:20)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `rishabh` | Rishabh | he/him | Engineering Lead | QA estimate, due Thu *(28:30)* | Launch date (stakeholder) | Pricing page ships with v2 `Edited` |
| `varun` | Varun | he/him | Finance Partner | Pricing model update, due Wed *(34:30)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `aryan` | Aryan | he/him | QA Engineer | Payment flow test plan, due Thu *(28:50)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `riley` | Riley Park *(synthetic)* | n/a | Support Lead, new to the series | Prototype: no card (*No meetings attended*). Slack: a card with everyone's items and no YOURS row | | |
| `leo` | Leo Grant *(synthetic)* | n/a | Agency partner | No card: *External guest* | | |

Times in *(mm:ss)* are where the item is said in the Nov 6 transcript; the card's ▶ button jumps there. Design Review (`dr`, organized by Alicia) is skipped for everyone (*No record of last meeting*), because its last meeting had "Keep Ansel out" on.

## Changes from the first version

- **Alicia, Varun, Aryan** each get a new open action item from the Nov 6 meeting, with a matching new transcript line.
- **Rishabh** leaves the holdout group, so his existing QA estimate item produces a card.
- **Aryan** is no longer "new to the series": he attended the Nov 6 meeting.
- The **holdout** and **new to the series** demo cases move to two synthetic people, **Sam Ortiz** and **Riley Park**, so the Pilot Log (holdout) and Governance (add a new member, share notes) screens keep working without using a teammate.
- "Ping everyone" sends a card to all five team members.
- **Alex Kim and Sam Ortiz removed** from the demo. Alex's transcript lines go to whoever fits the moment (Alicia presents the pricing page mock and copy, Varun asks the pricing-tier questions, Aryan has the screen and audio lines), Alex's action item "Send final pricing page copy to Rishabh" moves to Alicia, and Alicia organizes Design Review. No one is in the holdout or without Slack now; those rules are still tested with stand-in users.

## Details

### Gabriel (`gabriel`): main demo card, unchanged
- **Attends:** all three recorded Weekly Product Syncs (Oct 23, Oct 30, Nov 6); invited to Design Review.
- **Owns:** "Update Q1 forecast with new conversion numbers" (Forecast update), due Thu Nov 12, flagged "may already be done".
- **Stakeholder on:** "Launch date: Mar 3 or Mar 10?"
- Default persona for `/headsup demo` and **Ping me**.

### Alicia (`alicia`): organizer
- **Attends:** all three recorded meetings; organizer of Weekly Product Sync; invited to Design Review.
- **Owns:** "Send final pricing page copy to Rishabh" (41:52) and "Send the updated launch checklist before next sync" (47:20), both due Wed Nov 11. Her card's You own line shows the pricing page copy; the Slack card lists both.
- **New transcript line (47:20):** *"I'll send the updated launch checklist before next week's sync."* This fits her Slack message in the prototype about the checklist doc being updated.
- **In the story:** she assigns the work in the transcript, presents the pricing page mock, made the tracked edit to the pricing decision (Nov 7), organizes Design Review, and on the Governance screen adds Riley to the series and can share the Nov 6 notes with Riley.

### Rishabh (`rishabh`): engineering lead
- **Attends:** all three recorded meetings.
- **Owns:** "Estimate QA time for payment flow", due Thu Nov 12.
- **Stakeholder on:** the launch-date question.
- **Change:** no longer in the holdout group.

### Varun (`varun`): finance
- **Attends:** Oct 23 and Nov 6 (not Oct 30).
- **In the story:** raised "Do we need legal review for new pricing?", answered at the Nov 6 meeting (33:10).
- **Owns:** "Update the pricing model with the final tiers", due Wed Nov 11.
- **New transcript line (34:30):** *"Now that legal's clear, I'll update the pricing model with the final tiers by Wednesday."*

### Aryan (`aryan`): QA engineer
- **Attends (changed):** Nov 6 only, his first meeting in the series.
- **Owns:** "Write the payment flow test plan", due Thu Nov 12.
- **New transcript line (28:50):** *"I'll write up the payment flow test plan so the estimate has something to work from."* This fits his Slack message in the prototype, "Starting on the payment flow test plan."

### Riley Park (`riley`, synthetic): new to the series
- Newly invited, no recorded meetings attended. In the prototype, no card until after a first meeting (used on the Governance screen, where Alicia adds Riley and can share the Nov 6 notes). In Slack, Riley is on the invite, so gets a card showing everyone else's items with no YOURS row.

### Leo Grant (synthetic)
External agency guest: never gets a card or meeting notes.

## Real Slack and calendar setup

The persona ID is the key everywhere in config (`slack-app/.env`):

```dotenv
SLACK_USERS=gabriel=<gabriel's Slack email>,alicia=<alicia's Slack email>
CALENDAR_ICS_URL_GABRIEL=<Gabriel's published Outlook ICS link>
CALENDAR_ICS_URL_ALICIA=<Alicia's published Outlook ICS link>
```

Each person still needs to be listed in `ALLOWED_SLACK_USERS`. Run `/headsup check <persona>` to see why a persona does or doesn't get a card. Synthetic personas (`riley`, `leo`) shouldn't be mapped to real people.
