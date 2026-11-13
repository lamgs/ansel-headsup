// Transcripts. Key lines are verbatim from the PRD.

const toSec = (t) => { const [m, s] = t.split(':').map(Number); return m * 60 + s }

// Nov 6 is written out in full. Lines that a summary item cites are marked key and
// stay verbatim; consecutive lines are never more than 60 seconds apart.
const NOV6 = [
  // Status round-up
  ['00:05', 'alicia', "Okay, let's start. Quick round, then launch planning.", true],
  ['00:45', 'rishabh', 'Payments service is green in staging. Two flaky tests left, nothing blocking.'],
  ['01:25', 'alicia', 'Good. Varun, anything on billing this week?'],
  ['02:05', 'varun', 'The billing service upgrade is done. I sent the release notes to the channel.'],
  ['02:45', 'alicia', 'Design side, the checkout screens are in review. I shared the file this morning.'],
  ['03:25', 'gabriel', 'Dashboard refresh went out Tuesday. Conversion is up a bit week over week.'],
  ['04:05', 'alicia', 'Nice. Can you drop the link in the doc after this?'],
  ['04:45', 'gabriel', 'Sure, I will.'],
  ['05:25', 'rishabh', "One heads-up: the on-call rotation changes next week. I'll post the new schedule.", true],
  // Q1 roadmap review
  ['06:05', 'alicia', 'Noted. Let me share my screen for the roadmap.'],
  ['06:45', 'aryan', 'Can everyone see it? It looks a little small on my end.'],
  ['07:25', 'alicia', 'Zooming in. Better?'],
  ['08:05', 'varun', 'Yes, that works.'],
  ['08:45', 'alicia', 'So this is where we are against the Q1 plan.'],
  ['09:25', 'rishabh', 'The payments line still shows amber. That should be green now.'],
  ['10:05', 'alicia', 'I will update it after the call.'],
  ['10:45', 'varun', 'Is the pricing page on this view too?'],
  ['11:25', 'alicia', 'Second row. We will come back to it.'],
  ['12:05', 'varun', 'Quick question on the infra line, is that still current?'],
  ['12:45', 'alicia', 'It is, as of Monday.'],
  ['13:25', 'rishabh', 'The support docs row is new. I added it yesterday.'],
  // Forecast & conversion
  ['14:05', 'alicia', 'Thanks. The forecast is the big dependency for launch, so let us start there.'],
  ['14:32', 'alicia', "Gabriel, can you update the Q1 forecast with the new conversion numbers? Ideally before next week's sync.", true],
  ['14:51', 'gabriel', "Yep. I'll have it in the shared deck by Thursday.", true],
  ['15:25', 'gabriel', 'The new conversion numbers are about two points higher than what the forecast assumes.'],
  ['16:05', 'varun', 'So the March numbers on the metrics dashboard change too?'],
  ['16:45', 'gabriel', 'It does, mostly in the second half of the quarter.'],
  ['17:25', 'alicia', 'Okay. That matters for the launch date conversation.'],
  ['18:05', 'rishabh', 'Are we including the beta cohort in those numbers?'],
  ['18:45', 'gabriel', 'Not yet. That is a separate tab.'],
  ['19:25', 'varun', 'I would keep them separate until the waitlist closes.'],
  ['20:05', 'alicia', 'Agreed. Let us keep moving.'],
  ['20:45', 'aryan', 'Sorry, my audio dropped for a second. Back now.'],
  ['21:25', 'alicia', 'No problem. We were on the forecast. Gabriel has it.'],
  // QA & launch date
  ['22:05', 'rishabh', 'Can I share the QA board quickly?'],
  ['22:45', 'alicia', 'Go ahead.'],
  ['23:25', 'rishabh', 'Here is the payment flow test plan. About forty cases.'],
  ['24:05', 'varun', 'Do those cover the new pricing tiers?'],
  ['24:45', 'rishabh', 'Most of them. A few are still being written.'],
  ['25:25', 'varun', 'When would those be ready?'],
  ['26:05', 'rishabh', 'Early next week, probably.'],
  ['26:45', 'alicia', 'Then the timeline is the real question.'],
  ['27:05', 'rishabh', 'Launch date. Are we holding March 3 or moving to March 10? QA wants a full week on the payment flow.', true],
  ['27:25', 'gabriel', 'If the conversion lift holds, March 10 costs us less than it looks.'],
  ['27:40', 'alicia', "Let's not lock it without the new forecast. Gabriel, Rishabh, bring a recommendation next week.", true],
  // Launch checklist & legal
  ['28:05', 'alicia', 'Let us talk through the launch checklist.'],
  ['28:30', 'rishabh', "I'll get a QA estimate on the payment flow by Thursday.", true],
  ['28:50', 'aryan', "I'll write up the payment flow test plan so the estimate has something to work from.", true],
  ['29:05', 'alicia', 'Marketing copy is drafted. It needs the final pricing page language.'],
  ['29:25', 'aryan', "I'll set up the staging test accounts for the payment run.", true],
  ['29:45', 'rishabh', 'Support docs are in progress.'],
  ['30:25', 'varun', 'Billing setup in the payments service is done.'],
  ['31:05', 'alicia', 'Good. What about the announcement email?'],
  ['31:45', 'varun', 'Draft is in the shared folder. I added the pricing table.'],
  ['32:25', 'alicia', 'I will take a look this afternoon. We should also check the rollback plan.'],
  ['33:10', 'varun', 'Legal came back. No separate review needed for the new pricing tiers.', true],
  ['33:45', 'alicia', "Great, that closes last week's legal question."],
  ['34:20', 'varun', 'Nothing needed from procurement either.'],
  ['34:30', 'varun', "Now that legal's clear, I'll update the pricing config with the final tiers by Wednesday.", true],
  // Pricing page
  ['34:45', 'alicia', 'Pulling up the pricing page mock now.'],
  ['35:25', 'varun', 'Sure, walk us through it.'],
  ['36:05', 'alicia', 'Three tiers, monthly and annual toggle, FAQ at the bottom.'],
  ['36:45', 'varun', 'The annual discount matches what is in the billing config.'],
  ['37:25', 'rishabh', 'Is the page behind a flag?'],
  ['38:05', 'alicia', 'Yes, same flag as v2.'],
  ['38:45', 'alicia', 'Okay, so the question is whether it goes out early or with v2.'],
  ['39:25', 'rishabh', 'Shipping early means a second QA pass on checkout.'],
  ['40:05', 'varun', 'And billing only needs one migration if pricing ships once.'],
  ['40:45', 'aryan', 'Either works for the test plan, as long as we know this week.'],
  ['41:18', 'alicia', 'Decided, then. The pricing page ships with v2, not before.', true],
  ['41:52', 'alicia', "I'll send Rishabh final copy for the pricing page by Wednesday.", true],
  // Wrap-up & owners
  ['42:30', 'alicia', 'Let us do a quick recap of owners.'],
  ['43:10', 'gabriel', 'Forecast update is mine, in the deck by Thursday.'],
  ['43:50', 'rishabh', 'QA estimate on the payment flow, also Thursday.'],
  ['44:30', 'varun', 'I can share the updated metrics view next week.', true],
  ['45:10', 'alicia', 'Final pricing copy to Rishabh by Wednesday.'],
  ['45:50', 'gabriel', 'I will post the dashboard link in the channel.', true],
  ['46:30', 'alicia', 'Any other business?'],
  ['47:05', 'varun', 'Nothing from me.'],
  ['47:20', 'alicia', "I'll send the updated launch checklist before next week's sync.", true],
  ['47:40', 'alicia', 'Thanks all. Same time next week.', true],
]

const OCT23 = [
  ['00:04', 'alicia', 'Morning, everyone. Let us get started.'],
  ['01:30', 'rishabh', 'Payments API is feature complete in staging.'],
  ['03:15', 'alicia', 'I have early pricing page sketches to share later.'],
  ['04:30', 'alicia', 'Varun, can you set up error alerts on the billing service before launch?'],
  ['04:45', 'varun', 'Yes, I will get them in this week.'],
  ['05:02', 'varun', 'The billing changes for Q1 fit in the current sprint plan.'],
  ['08:10', 'alicia', 'So we lock Q1 launch scope: payments plus the pricing page. Nothing else gets added.'],
  ['09:40', 'gabriel', 'I will set up a dashboard to track conversion for the launch.'],
  ['14:20', 'alicia', 'Here are the sketches. Three tiers for now.'],
  ['14:40', 'alicia', 'I will also collect a few beta customer quotes for the pricing page.'],
  ['21:05', 'rishabh', 'We should plan QA for the payment flow early.'],
  ['29:50', 'alicia', 'Thanks all. See you next week.'],
]

const OCT30 = [
  ['00:06', 'alicia', 'Okay, let us start. Short agenda today.'],
  ['02:10', 'rishabh', 'Payments is in code review.'],
  ['02:30', 'rishabh', 'A few payments tests are flaky. I will fix them before code review closes.'],
  ['05:40', 'alicia', 'Decision on beta: the waitlist closes November 15.'],
  ['09:30', 'alicia', 'Pricing page copy is in first draft.'],
  ['14:45', 'gabriel', 'Conversion dashboard is live. Numbers look stable.'],
  ['19:22', 'alicia', 'Do we need legal review for the new pricing? Varun, can you check with legal?'],
  ['22:15', 'alicia', 'Gabriel, can you pull the conversion data from the dashboard before Tuesday?'],
  ['22:30', 'gabriel', 'Yes, I can do that.'],
  ['24:10', 'alicia', 'And Gabriel, can you draft a short pricing FAQ for the support team?'],
  ['24:25', 'gabriel', 'Sure, I will have a draft next week.'],
  ['26:05', 'rishabh', 'Related question: after launch, who handles support escalations, engineering or the support team?'],
  ['26:30', 'alicia', 'Good question. Gabriel, Rishabh, think about it and we will come back to it.'],
  ['31:40', 'alicia', 'Thanks everyone.'],
]

const mk = (rows) => rows.map(([t, speaker, text, key = false]) => ({ t, sec: toSec(t), speaker, text, key }))

export const TRANSCRIPTS = {
  'wps-1023': mk(OCT23),
  'wps-1030': mk(OCT30),
  'wps-1106': mk(NOV6),
}

export { toSec }
