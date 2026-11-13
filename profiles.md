# Demo personas

Every team member gets their own Heads-Up card, so **Ping everyone** reaches all five. To change a role, edit this file first, then apply it in [`src/data/seed.js`](src/data/seed.js) (people, invitees, attendees, items) and [`src/data/transcripts.js`](src/data/transcripts.js), and update the expected results in `scripts/check-selection.mjs`. Run `npm test` in the repo root and in `slack-app/`.

Who plays which role in the Heads-Up demo. The team's real names are used, but **roles, meeting attendance and action items are fictional demo data**, not anyone's real work.

## How a card is built (so edits stay realistic)

**Slack card (current, condensed):** everyone on the Weekly Product Sync invite gets a card. **Each team member owns two items** from the last meeting (Nov 6), listed on the card with their timestamps, e.g. "You own 2 items · 8 more from the team last week · • Forecast update (14:32) · • Dashboard link (45:50)". Only the timestamp is a link (to that moment in the transcript); "8 more from the team" links to the meeting's Action items tab in Ansel. Marking items done happens in Ansel, not on the Slack card. External guests would get no card, but the cast is just the five team members.

**Prototype card (the React app's own Heads-Up screen):** unchanged, built by `src/logic/buildHeadsUp.js` with the rules below.

For Weekly Product Sync, a person gets a card if they attended a recent recorded meeting **and** own an open action item or are a stakeholder on an open question. The card then shows up to one item per section:

- **You own:** their open action item from the most recent meeting (earliest due date wins).
- **Still open:** an open question they're a stakeholder on; otherwise the open question from the latest meeting.
- **Decided:** the highest-priority decision from the latest meeting (the same for everyone).

So with the items below, everyone shares *Still open: Launch date: Mar 3 or Mar 10?* and *Decided: Pricing page ships with v2*, and the **You own** line is what makes each card personal. To make a second line personal too, give that person their own open question.

## Summary

| Persona ID | Name | Pronouns | Demo role | Card: You own | Card: Still open | Card: Decided |
|---|---|---|---|---|---|---|
| `gabriel` | Gabriel | he/him | Intern | Forecast update, due Thu *(14:32)*; also owns Dashboard link, due Fri *(45:50)* | Launch date: Mar 3 or Mar 10? (stakeholder) | Pricing page ships with v2 `Edited` |
| `alicia` | Alicia | she/her | CEO, series organizer | Pricing page copy, due Wed *(41:52)*; also owns Launch checklist *(47:20)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `rishabh` | Rishabh | he/him | CTO | QA estimate, due Thu *(28:30)*; also owns On-call rotation, due Fri *(5:25)* | Launch date (stakeholder) | Pricing page ships with v2 `Edited` |
| `varun` | Varun | he/him | Software Engineer | Pricing config update, due Wed *(34:30)*; also owns Metrics view, due Fri *(44:30)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |
| `aryan` | Aryan | he/him | Software Engineer | Payment flow test plan, due Thu *(28:50)*; also owns Staging test accounts, due Fri *(29:25)* | Launch date (latest meeting) | Pricing page ships with v2 `Edited` |

Times in *(mm:ss)* are where the item is said in the Nov 6 transcript; the card's ▶ button jumps there. Design Review (`dr`, organized by Alicia) is skipped for everyone (*No record of last meeting*), because its last meeting had "Keep Ansel out" on.

## Changes from the first version

- **Alicia, Varun, Aryan** each get a new open action item from the Nov 6 meeting, with a matching new transcript line.
- **Rishabh** leaves the holdout group, so his existing QA estimate item produces a card.
- **Aryan** is no longer "new to the series": he attended the Nov 6 meeting.
- The **holdout** and **new to the series** demo cases move to two synthetic people, **Sam Ortiz** and **Riley Park**, so the Pilot Log (holdout) and Governance (add a new member, share notes) screens keep working without using a teammate.
- "Ping everyone" sends a card to all five team members.
- **Everyone owns two items:** Gabriel (+ Dashboard link, 45:50), Rishabh (+ On-call rotation, 5:25; his line now ends "I'll post the new schedule."), Varun (+ Budget view, 44:30) and Aryan (+ Staging test accounts, new line at 29:25: *"I'll set up the staging test accounts for the payment run."*); Alicia already had two. The new items are due Fri Nov 13, so each person's first item still leads the prototype's own Heads-Up screen.
- **Alex Kim and Sam Ortiz removed** from the demo. Alex's transcript lines go to whoever fits the moment (Alicia presents the pricing page mock and copy, Varun asks the pricing-tier questions, Aryan has the screen and audio lines), Alex's action item "Send final pricing page copy to Rishabh" moves to Alicia, and Alicia organizes Design Review. No one is in the holdout or without Slack now; those rules are still tested with stand-in users.
- **Riley Park and Leo Grant removed**, so the cast is the five team members. The Governance screen's examples become unnamed placeholders (`new.teammate@acme.com` with the direct share, `guest@agency.com` as the external guest); the new-member and external-guest rules are tested with stand-in users.
- **New roles:** Gabriel (Intern), Alicia (CEO), Rishabh (CTO), Varun and Aryan (Software Engineers). Varun's finance lines are rewritten as engineering work (billing service, billing config, metrics dashboard) with the same timestamps, and his items become "Update the pricing config with the final tiers" and "Share the updated metrics view".

## Details

### Gabriel (`gabriel`): intern, main demo card
- **Attends:** all three recorded Weekly Product Syncs (Oct 23, Oct 30, Nov 6); invited to Design Review.
- **Owns:** "Update Q1 forecast with new conversion numbers" (Forecast update), due Thu Nov 12, flagged "may already be done"; and "Post the dashboard link in the channel" (Dashboard link, 45:50), due Fri Nov 13.
- **Stakeholder on:** "Launch date: Mar 3 or Mar 10?"
- Default persona for `/headsup demo` and **Ping me**.

### Alicia (`alicia`): CEO, organizer
- **Attends:** all three recorded meetings; organizer of Weekly Product Sync; invited to Design Review.
- **Owns:** "Send final pricing page copy to Rishabh" (41:52) and "Send the updated launch checklist before next sync" (47:20), both due Wed Nov 11. Her card's You own line shows the pricing page copy; the Slack card lists both.
- **New transcript line (47:20):** *"I'll send the updated launch checklist before next week's sync."* This fits her Slack message in the prototype about the checklist doc being updated.
- **In the story:** she assigns the work in the transcript, presents the pricing page mock, made the tracked edit to the pricing decision (Nov 7), organizes Design Review, and on the Governance screen adds a new teammate to the series and can share the Nov 6 notes with them.

### Rishabh (`rishabh`): CTO
- **Attends:** all three recorded meetings.
- **Owns:** "Estimate QA time for payment flow", due Thu Nov 12; and "Post the new on-call rotation schedule" (5:25), due Fri Nov 13.
- **Stakeholder on:** the launch-date question.
- **Change:** no longer in the holdout group.

### Varun (`varun`): software engineer
- **Attends:** Oct 23 and Nov 6 (not Oct 30).
- **In the story:** owns billing and the pricing config; raised "Do we need legal review for new pricing?", answered at the Nov 6 meeting (33:10).
- **Owns:** "Update the pricing config with the final tiers", due Wed Nov 11; and "Share the updated metrics view" (44:30), due Fri Nov 13.
- **Transcript line (34:30):** *"Now that legal's clear, I'll update the pricing config with the final tiers by Wednesday."*

### Aryan (`aryan`): software engineer
- **Attends (changed):** Nov 6 only, his first meeting in the series.
- **Owns:** "Write the payment flow test plan", due Thu Nov 12; and "Set up the staging test accounts for the payment run" (29:25), due Fri Nov 13.
- **New transcript line (28:50):** *"I'll write up the payment flow test plan so the estimate has something to work from."* This fits his Slack message in the prototype, "Starting on the payment flow test plan."

## Real Slack and calendar setup

The persona ID is the key everywhere in config (`slack-app/.env`):

```dotenv
SLACK_USERS=gabriel=<gabriel's Slack email>,alicia=<alicia's Slack email>
CALENDAR_ICS_URL_GABRIEL=<Gabriel's published Outlook ICS link>
CALENDAR_ICS_URL_ALICIA=<Alicia's published Outlook ICS link>
```

Each person still needs to be listed in `ALLOWED_SLACK_USERS`. Run `/headsup check <persona>` to see why a persona does or doesn't get a card. Every persona is a team member; there are no synthetic personas left to keep unmapped.
