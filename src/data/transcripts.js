// Transcripts. Key lines are verbatim from the PRD; filler is deterministic and
// generated so consecutive segments are never more than 60 seconds apart.

const toSec = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s }
const toT = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

const NOV6_KEY = [
  ['00:05', 'alicia', "Okay, let's start. Quick round, then launch planning."],
  ['14:32', 'alicia', "Gabriel, can you update the Q1 forecast with the new conversion numbers? Ideally before next week's sync."],
  ['14:51', 'gabriel', "Yep. I'll have it in the shared deck by Thursday."],
  ['27:05', 'rishabh', 'Launch date. Are we holding March 3 or moving to March 10? QA wants a full week on the payment flow.'],
  ['27:40', 'alicia', "Let's not lock it without the new forecast. Gabriel, Rishabh, bring a recommendation next week."],
  ['28:30', 'rishabh', "I'll get a QA estimate on the payment flow by Thursday."],
  ['33:10', 'varun', 'Legal came back. No separate review needed for the new pricing tiers.'],
  ['41:18', 'alicia', 'Decided, then. The pricing page ships with v2, not before.'],
  ['41:52', 'alex', "I'll send Rishabh final copy for the pricing page by Wednesday."],
  ['47:40', 'alicia', 'Thanks all. Same time next week.'],
]

// Filler by phase of the meeting so it reads plausibly.
const FILLER = {
  round: [
    ['rishabh', 'Payments service is green in staging. Two flaky tests left, nothing blocking.'],
    ['alicia', 'Good. Varun, anything from finance this week?'],
    ['varun', 'Budget close is on track. I sent the October numbers to the channel.'],
    ['alex', 'Design side, the checkout screens are in review. I shared the file this morning.'],
    ['gabriel', 'Dashboard refresh went out Tuesday. Conversion is up a bit week over week.'],
    ['alicia', 'Nice. Can you drop the link in the doc after this?'],
    ['gabriel', 'Sure, I will.'],
    ['rishabh', 'One heads-up: the on-call rotation changes next week.'],
    ['alicia', 'Noted. Let me share my screen for the roadmap.'],
    ['alex', 'Can everyone see it? It looks a little small on my end.'],
    ['alicia', 'Zooming in. Better?'],
    ['varun', 'Yes, that works.'],
    ['alicia', 'So this is where we are against the Q1 plan.'],
    ['rishabh', 'The payments line still shows amber. That should be green now.'],
    ['alicia', 'I will update it after the call.'],
    ['alex', 'Is the pricing page on this view too?'],
    ['alicia', 'Second row. We will come back to it.'],
    ['varun', 'Quick question on the headcount line, is that still current?'],
    ['alicia', 'It is, as of Monday.'],
  ],
  forecast: [
    ['gabriel', 'The new conversion numbers are about two points higher than what the forecast assumes.'],
    ['varun', 'That changes the revenue line for March, right?'],
    ['gabriel', 'It does, mostly in the second half of the quarter.'],
    ['alicia', 'Okay. That matters for the launch date conversation.'],
    ['rishabh', 'Are we including the beta cohort in those numbers?'],
    ['gabriel', 'Not yet. That is a separate tab.'],
    ['varun', 'I would keep them separate until the waitlist closes.'],
    ['alicia', 'Agreed. Let us keep moving.'],
    ['alex', 'Sorry, my audio dropped for a second. Back now.'],
    ['alicia', 'No problem. We were on the forecast.'],
    ['rishabh', 'Can I share the QA board quickly?'],
    ['alicia', 'Go ahead.'],
    ['rishabh', 'Here is the payment flow test plan. About forty cases.'],
    ['alex', 'Do those cover the new pricing tiers?'],
    ['rishabh', 'Most of them. A few are still being written.'],
    ['varun', 'When would those be ready?'],
    ['rishabh', 'Early next week, probably.'],
  ],
  launch: [
    ['alicia', 'Let us talk through the launch checklist.'],
    ['alex', 'Marketing copy is drafted. It needs the final pricing page language.'],
    ['rishabh', 'Support docs are in progress.'],
    ['varun', 'Billing setup in the finance system is done.'],
    ['alicia', 'Good. What about the announcement email?'],
    ['alex', 'Draft is in the shared folder.'],
    ['alicia', 'I will take a look this afternoon.'],
    ['rishabh', 'We should check the rollback plan before launch.'],
    ['alicia', 'Yes, let us add it to the checklist.'],
    ['varun', 'Do we need anything from procurement?'],
    ['alicia', 'Not for this one.'],
    ['alex', 'Pulling up the pricing page mock now.'],
    ['alicia', 'Thanks. Walk us through it.'],
    ['alex', 'Three tiers, monthly and annual toggle, FAQ at the bottom.'],
    ['varun', 'The annual discount matches what finance approved.'],
    ['rishabh', 'Is the page behind a flag?'],
    ['alex', 'Yes, same flag as v2.'],
    ['alicia', 'Okay, so the question is whether it goes out early or with v2.'],
  ],
  wrap: [
    ['alicia', 'Let us do a quick recap of owners.'],
    ['varun', 'I can share the updated budget view next week.'],
    ['rishabh', 'I will update the QA board once the estimate is in.'],
    ['alex', 'Anything else on design before we wrap?'],
    ['alicia', 'I think we are good.'],
    ['gabriel', 'I will post the dashboard link in the channel.'],
    ['alicia', 'Any other business?'],
    ['varun', 'Nothing from me.'],
    ['rishabh', 'All good here.'],
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
  ['00:04', 'alicia', 'Morning, everyone. Let us get started.'],
  ['01:30', 'rishabh', 'Payments API is feature complete in staging.'],
  ['03:15', 'alex', 'I have early pricing page sketches to share later.'],
  ['05:02', 'varun', 'Finance is fine with the Q1 budget as proposed.'],
  ['08:10', 'alicia', 'So we lock Q1 launch scope: payments plus the pricing page. Nothing else gets added.'],
  ['09:40', 'gabriel', 'I will set up a dashboard to track conversion for the launch.'],
  ['14:20', 'alex', 'Here are the sketches. Three tiers for now.'],
  ['21:05', 'rishabh', 'We should plan QA for the payment flow early.'],
  ['29:50', 'alicia', 'Thanks all. See you next week.'],
]

const OCT30 = [
  ['00:06', 'alicia', 'Okay, let us start. Short agenda today.'],
  ['02:10', 'rishabh', 'Payments is in code review.'],
  ['05:40', 'alicia', 'Decision on beta: the waitlist closes November 15.'],
  ['09:30', 'alex', 'Pricing page copy is in first draft.'],
  ['14:45', 'gabriel', 'Conversion dashboard is live. Numbers look stable.'],
  ['19:22', 'alicia', 'Do we need legal review for the new pricing? Varun, can you check with legal?'],
  ['22:15', 'alicia', 'Gabriel, can you pull the conversion data from the dashboard before Tuesday?'],
  ['22:30', 'gabriel', 'Yes, I can do that.'],
  ['31:40', 'alicia', 'Thanks everyone.'],
]

const mk = (rows) => rows.map(([t, speaker, text]) => ({ t, sec: toSec(t), speaker, text }))

export const TRANSCRIPTS = {
  'wps-1023': mk(OCT23),
  'wps-1030': mk(OCT30),
  'wps-1106': buildNov6(),
}

export { toSec }
