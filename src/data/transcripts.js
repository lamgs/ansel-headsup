// Transcripts. Key lines are verbatim from the PRD; filler is deterministic and
// generated so consecutive segments are never more than 60 seconds apart.

const toSec = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s }
const toT = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

const NOV6_KEY = [
  ['00:05', 'jordan', "Okay, let's start. Quick round, then launch planning."],
  ['14:32', 'jordan', "Maya, can you update the Q1 forecast with the new conversion numbers? Ideally before next week's sync."],
  ['14:51', 'maya', "Yep. I'll have it in the shared deck by Thursday."],
  ['27:05', 'sam', 'Launch date. Are we holding March 3 or moving to March 10? QA wants a full week on the payment flow.'],
  ['27:40', 'jordan', "Let's not lock it without the new forecast. Maya, Sam, bring a recommendation next week."],
  ['28:30', 'sam', "I'll get a QA estimate on the payment flow by Thursday."],
  ['33:10', 'dana', 'Legal came back. No separate review needed for the new pricing tiers.'],
  ['41:18', 'jordan', 'Decided, then. The pricing page ships with v2, not before.'],
  ['41:52', 'alex', "I'll send Sam final copy for the pricing page by Wednesday."],
  ['47:40', 'jordan', 'Thanks all. Same time next week.'],
]

// Filler by phase of the meeting so it reads plausibly.
const FILLER = {
  round: [
    ['sam', 'Payments service is green in staging. Two flaky tests left, nothing blocking.'],
    ['jordan', 'Good. Dana, anything from finance this week?'],
    ['dana', 'Budget close is on track. I sent the October numbers to the channel.'],
    ['alex', 'Design side, the checkout screens are in review. I shared the file this morning.'],
    ['maya', 'Dashboard refresh went out Tuesday. Conversion is up a bit week over week.'],
    ['jordan', 'Nice. Can you drop the link in the doc after this?'],
    ['maya', 'Sure, I will.'],
    ['sam', 'One heads-up: the on-call rotation changes next week.'],
    ['jordan', 'Noted. Let me share my screen for the roadmap.'],
    ['alex', 'Can everyone see it? It looks a little small on my end.'],
    ['jordan', 'Zooming in. Better?'],
    ['dana', 'Yes, that works.'],
    ['jordan', 'So this is where we are against the Q1 plan.'],
    ['sam', 'The payments line still shows amber. That should be green now.'],
    ['jordan', 'I will update it after the call.'],
    ['alex', 'Is the pricing page on this view too?'],
    ['jordan', 'Second row. We will come back to it.'],
    ['dana', 'Quick question on the headcount line, is that still current?'],
    ['jordan', 'It is, as of Monday.'],
  ],
  forecast: [
    ['maya', 'The new conversion numbers are about two points higher than what the forecast assumes.'],
    ['dana', 'That changes the revenue line for March, right?'],
    ['maya', 'It does, mostly in the second half of the quarter.'],
    ['jordan', 'Okay. That matters for the launch date conversation.'],
    ['sam', 'Are we including the beta cohort in those numbers?'],
    ['maya', 'Not yet. That is a separate tab.'],
    ['dana', 'I would keep them separate until the waitlist closes.'],
    ['jordan', 'Agreed. Let us keep moving.'],
    ['alex', 'Sorry, my audio dropped for a second. Back now.'],
    ['jordan', 'No problem. We were on the forecast.'],
    ['sam', 'Can I share the QA board quickly?'],
    ['jordan', 'Go ahead.'],
    ['sam', 'Here is the payment flow test plan. About forty cases.'],
    ['alex', 'Do those cover the new pricing tiers?'],
    ['sam', 'Most of them. A few are still being written.'],
    ['dana', 'When would those be ready?'],
    ['sam', 'Early next week, probably.'],
  ],
  launch: [
    ['jordan', 'Let us talk through the launch checklist.'],
    ['alex', 'Marketing copy is drafted. It needs the final pricing page language.'],
    ['sam', 'Support docs are in progress.'],
    ['dana', 'Billing setup in the finance system is done.'],
    ['jordan', 'Good. What about the announcement email?'],
    ['alex', 'Draft is in the shared folder.'],
    ['jordan', 'I will take a look this afternoon.'],
    ['sam', 'We should check the rollback plan before launch.'],
    ['jordan', 'Yes, let us add it to the checklist.'],
    ['dana', 'Do we need anything from procurement?'],
    ['jordan', 'Not for this one.'],
    ['alex', 'Pulling up the pricing page mock now.'],
    ['jordan', 'Thanks. Walk us through it.'],
    ['alex', 'Three tiers, monthly and annual toggle, FAQ at the bottom.'],
    ['dana', 'The annual discount matches what finance approved.'],
    ['sam', 'Is the page behind a flag?'],
    ['alex', 'Yes, same flag as v2.'],
    ['jordan', 'Okay, so the question is whether it goes out early or with v2.'],
  ],
  wrap: [
    ['jordan', 'Let us do a quick recap of owners.'],
    ['dana', 'I can share the updated budget view next week.'],
    ['sam', 'I will update the QA board once the estimate is in.'],
    ['alex', 'Anything else on design before we wrap?'],
    ['jordan', 'I think we are good.'],
    ['maya', 'I will post the dashboard link in the channel.'],
    ['jordan', 'Any other business?'],
    ['dana', 'Nothing from me.'],
    ['sam', 'All good here.'],
  ],
}

function phaseFor(sec) {
  if (sec < toSec('14:20')) return 'round'
  if (sec < toSec('27:00')) return 'forecast'
  if (sec < toSec('42:30')) return 'launch'
  return 'wrap'
}

function buildNov6() {
  const keys = NOV6_KEY.map(([t, speaker, text]) => ({ t, sec: toSec(t), speaker, text, key: true }))
  const end = 48 * 60
  const step = 40
  const out = [...keys]
  const counters = { round: 0, forecast: 0, launch: 0, wrap: 0 }
  for (let sec = 45; sec < end; sec += step) {
    if (keys.some((k) => Math.abs(k.sec - sec) < 12)) continue
    const phase = phaseFor(sec)
    const list = FILLER[phase]
    const [speaker, text] = list[counters[phase]++ % list.length]
    out.push({ t: toT(sec), sec, speaker, text, key: false })
  }
  return out.sort((a, b) => a.sec - b.sec)
}

const OCT23 = [
  ['00:04', 'jordan', 'Morning, everyone. Let us get started.'],
  ['01:30', 'sam', 'Payments API is feature complete in staging.'],
  ['03:15', 'alex', 'I have early pricing page sketches to share later.'],
  ['05:02', 'dana', 'Finance is fine with the Q1 budget as proposed.'],
  ['08:10', 'jordan', 'So we lock Q1 launch scope: payments plus the pricing page. Nothing else gets added.'],
  ['09:40', 'maya', 'I will set up a dashboard to track conversion for the launch.'],
  ['14:20', 'alex', 'Here are the sketches. Three tiers for now.'],
  ['21:05', 'sam', 'We should plan QA for the payment flow early.'],
  ['29:50', 'jordan', 'Thanks all. See you next week.'],
]

const OCT30 = [
  ['00:06', 'jordan', 'Okay, let us start. Short agenda today.'],
  ['02:10', 'sam', 'Payments is in code review.'],
  ['05:40', 'jordan', 'Decision on beta: the waitlist closes November 15.'],
  ['09:30', 'alex', 'Pricing page copy is in first draft.'],
  ['14:45', 'maya', 'Conversion dashboard is live. Numbers look stable.'],
  ['19:22', 'jordan', 'Do we need legal review for the new pricing? Dana, can you check with legal?'],
  ['22:15', 'jordan', 'Maya, can you pull the conversion data from the dashboard before Tuesday?'],
  ['22:30', 'maya', 'Yes, I can do that.'],
  ['31:40', 'jordan', 'Thanks everyone.'],
]

const mk = (rows) => rows.map(([t, speaker, text]) => ({ t, sec: toSec(t), speaker, text }))

export const TRANSCRIPTS = {
  'wps-1023': mk(OCT23),
  'wps-1030': mk(OCT30),
  'wps-1106': buildNov6(),
}

export { toSec }
