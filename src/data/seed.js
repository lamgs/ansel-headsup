// Seed data, used exactly as specified in the PRD (Section 5).
export const SEED = {
  workspace: { id: 'acme', name: 'Acme' },
  people: [
    { id: 'gabriel', name: 'Gabriel', role: 'Data Analyst', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'alicia', name: 'Alicia', role: 'Product Manager (organizer)', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'rishabh', name: 'Rishabh', role: 'Engineering Lead', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'varun', name: 'Varun', role: 'Finance Partner', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'aryan', name: 'Aryan', role: 'QA Engineer', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    // Synthetic personas for the demo's skip cases (see profiles.md)
    { id: 'riley', name: 'Riley Park', role: 'Support Lead (new to series)', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'leo', name: 'Leo Grant', role: 'Agency partner', org: 'external', slack: false, holdout: false, reminderMinutes: 30 },
  ],
  series: [
    {
      id: 'wps', title: 'Weekly Product Sync', organizer: 'alicia', cadence: 'Weekly, Fri 2:00 PM, 50 min',
      invitees: ['alicia', 'gabriel', 'rishabh', 'varun', 'aryan', 'riley', 'leo'],
      nextInstance: { date: '2026-11-13', start: '14:00' },
    },
    {
      id: 'dr', title: 'Design Review', organizer: 'alicia', cadence: 'Biweekly, Fri 4:00 PM',
      invitees: ['alicia', 'gabriel'],
      nextInstance: { date: '2026-11-13', start: '16:00' },
      note: "Last instance (Oct 30) had 'Keep Ansel out' on, so there is no record and Heads-Up skips it",
    },
  ],
  instances: [
    {
      id: 'wps-1023', series: 'wps', date: '2026-10-23', recorded: true, attendees: ['alicia', 'gabriel', 'rishabh', 'varun'],
      decisions: [{ id: 'd1', text: 'Q1 launch scope locked: payments + pricing page', t: '08:10', priority: 2 }],
      openQuestions: [],
      actionItems: [],
      themes: [
        { id: 'th-1023-1', title: 'Status round-up', start: '00:04', end: '05:02', items: [] },
        { id: 'th-1023-2', title: 'Q1 scope & pricing sketches', start: '08:10', end: '29:50', items: ['d1'] },
      ],
    },
    {
      id: 'wps-1030', series: 'wps', date: '2026-10-30', recorded: true, attendees: ['alicia', 'gabriel', 'rishabh'],
      decisions: [{ id: 'd2', text: 'Beta waitlist closes Nov 15', t: '05:40', priority: 2 }],
      openQuestions: [{ id: 'q1', text: 'Do we need legal review for new pricing?', t: '19:22', stakeholders: ['alicia', 'varun'], status: 'resolved', resolvedIn: 'wps-1106' }],
      actionItems: [{ id: 'a1', text: 'Pull conversion data from dashboard', owner: 'gabriel', due: '2026-11-03', t: '22:15', status: 'done' }],
      themes: [
        { id: 'th-1030-1', title: 'Status & beta waitlist', start: '00:06', end: '09:30', items: ['d2'] },
        { id: 'th-1030-2', title: 'Pricing legal & conversion data', start: '14:45', end: '31:40', items: ['q1', 'a1'] },
      ],
    },
    {
      id: 'wps-1106', series: 'wps', date: '2026-11-06', recorded: true, durationMin: 48, attendees: ['alicia', 'gabriel', 'rishabh', 'varun', 'aryan'],
      decisions: [
        {
          id: 'd3', text: 'Pricing page ships with v2', t: '41:18', priority: 3,
          trackedChange: { by: 'alicia', on: '2026-11-07', original: 'Pricing page ships with v2 (tentative)' },
        },
        { id: 'd4', text: 'Legal review not required for new pricing tiers', t: '33:10', priority: 1 },
      ],
      openQuestions: [{ id: 'q2', text: 'Launch date: Mar 3 or Mar 10?', t: '27:05', stakeholders: ['gabriel', 'rishabh'], status: 'open' }],
      actionItems: [
        { id: 'a2', text: 'Update Q1 forecast with new conversion numbers', short: 'Forecast update', summary: 'Rerun the Q1 forecast with the new conversion numbers and add it to the shared deck.', owner: 'gabriel', due: '2026-11-12', t: '14:32', status: 'open' },
        { id: 'a3', text: 'Send final pricing page copy to Rishabh', short: 'Pricing page copy', summary: 'Send Rishabh the final pricing page copy so it ships with v2.', owner: 'alicia', due: '2026-11-11', t: '41:52', status: 'open' },
        { id: 'a4', text: 'Estimate QA time for payment flow', short: 'QA estimate', summary: 'Estimate QA time for the payment flow so the launch date can be set.', owner: 'rishabh', due: '2026-11-12', t: '28:30', status: 'open' },
        { id: 'a5', text: 'Send the updated launch checklist before next sync', short: 'Launch checklist', summary: "Send the updated launch checklist before next week's sync.", owner: 'alicia', due: '2026-11-11', t: '47:20', status: 'open' },
        { id: 'a6', text: 'Update the pricing model with the final tiers', short: 'Pricing model update', summary: 'Update the pricing model with the final tiers now that legal is clear.', owner: 'varun', due: '2026-11-11', t: '34:30', status: 'open' },
        { id: 'a7', text: 'Write the payment flow test plan', short: 'Payment flow test plan', summary: 'Write the payment flow test plan the QA estimate will build on.', owner: 'aryan', due: '2026-11-12', t: '28:50', status: 'open' },
      ],
      // Discussion themes: contiguous transcript ranges, in meeting order.
      themes: [
        { id: 'th-1106-1', title: 'Status round-up', start: '00:05', end: '05:25', items: [] },
        { id: 'th-1106-2', title: 'Q1 roadmap review', start: '06:05', end: '13:25', items: [] },
        { id: 'th-1106-3', title: 'Forecast & conversion', start: '14:05', end: '21:25', items: ['a2'] },
        { id: 'th-1106-4', title: 'QA & launch date', start: '22:05', end: '27:40', items: ['q2'] },
        { id: 'th-1106-5', title: 'Launch checklist & legal', start: '28:05', end: '34:30', items: ['a4', 'a7', 'd4', 'a6'] },
        { id: 'th-1106-6', title: 'Pricing page', start: '34:45', end: '41:52', items: ['d3', 'a3'] },
        { id: 'th-1106-7', title: 'Wrap-up & owners', start: '42:30', end: '47:40', items: ['a5'] },
      ],
    },
  ],
}

// Comments already on the record when the demo starts. Keyed like state.comments:
// `line:<instanceId>:<t>` for transcript lines, or a summary item id.
export const SEED_COMMENTS = {
  'line:wps-1106:16:05': [{ by: 'varun', text: 'March revenue line is updated in the budget view.', on: '2026-11-07' }],
}

// Demo constants
export const DEMO_DATE = '2026-11-13'
export const CLOCK_START = 13 * 3600 + 25 * 60 // 1:25 PM
export const RETENTION_DAYS = 365 // workspace retention policy; nothing in the seed is expired
