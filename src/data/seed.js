// Seed data, used exactly as specified in the PRD (Section 5).
export const SEED = {
  workspace: { id: 'acme', name: 'Acme' },
  people: [
    { id: 'gabriel', name: 'Gabriel', role: 'Intern', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'alicia', name: 'Alicia', role: 'CEO (organizer)', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'rishabh', name: 'Rishabh', role: 'CTO', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'varun', name: 'Varun', role: 'Software Engineer', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'aryan', name: 'Aryan', role: 'Software Engineer', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
  ],
  series: [
    {
      id: 'wps', title: 'Weekly Product Sync', organizer: 'alicia', cadence: 'Weekly, Fri 2:00 PM, 50 min',
      invitees: ['alicia', 'gabriel', 'rishabh', 'varun', 'aryan'],
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
      // Still open two weeks later, so they carry over onto their owners' Heads-Up cards.
      actionItems: [
        { id: 'a12', text: 'Set up error alerts for the billing service', short: 'Billing service alerts', summary: 'Set up error alerts on the billing service before launch.', owner: 'varun', due: '2026-10-30', t: '04:30', status: 'open' },
        { id: 'a13', text: 'Collect beta customer quotes for the pricing page', short: 'Beta customer quotes', summary: 'Collect two or three beta customer quotes to use on the pricing page.', owner: 'alicia', due: '2026-11-06', t: '14:40', status: 'open' },
      ],
      themes: [
        { id: 'th-1023-1', title: 'Status round-up', start: '00:04', end: '05:02', items: ['a12'] },
        { id: 'th-1023-2', title: 'Q1 scope & pricing sketches', start: '08:10', end: '29:50', items: ['d1', 'a13'] },
      ],
    },
    {
      id: 'wps-1030', series: 'wps', date: '2026-10-30', recorded: true, attendees: ['alicia', 'gabriel', 'rishabh'],
      decisions: [{ id: 'd2', text: 'Beta waitlist closes Nov 15', t: '05:40', priority: 2 }],
      openQuestions: [
        { id: 'q1', text: 'Do we need legal review for new pricing?', t: '19:22', stakeholders: ['alicia', 'varun'], status: 'resolved', resolvedIn: 'wps-1106' },
        // Raised and never answered (not picked up on Nov 6), so the Heads-Up card flags it as unresolved.
        { id: 'q3', text: 'Who handles support escalations after launch?', t: '26:05', stakeholders: ['gabriel', 'rishabh'], status: 'open' },
      ],
      actionItems: [
        { id: 'a1', text: 'Pull conversion data from dashboard', owner: 'gabriel', due: '2026-11-03', t: '22:15', status: 'done' },
        // Still open a week later, so they carry over onto their owners' Heads-Up cards.
        { id: 'a14', text: 'Fix the flaky payments tests', short: 'Flaky payments tests', summary: 'Fix the flaky payments tests before code review closes.', owner: 'rishabh', due: '2026-11-05', t: '02:30', status: 'open' },
        { id: 'a15', text: 'Draft a pricing FAQ for the support team', short: 'Pricing FAQ', summary: 'Draft a short pricing FAQ the support team can use at launch.', owner: 'gabriel', due: '2026-11-06', t: '24:10', status: 'open' },
      ],
      themes: [
        { id: 'th-1030-1', title: 'Status & beta waitlist', start: '00:06', end: '09:30', items: ['a14', 'd2'] },
        { id: 'th-1030-2', title: 'Pricing legal & conversion data', start: '14:45', end: '31:40', items: ['q1', 'a1', 'a15', 'q3'] },
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
        { id: 'a6', text: 'Update the pricing config with the final tiers', short: 'Pricing config update', summary: 'Update the pricing config with the final tiers now that legal is clear.', owner: 'varun', due: '2026-11-11', t: '34:30', status: 'open' },
        { id: 'a7', text: 'Write the payment flow test plan', short: 'Payment flow test plan', summary: 'Write the payment flow test plan the QA estimate will build on.', owner: 'aryan', due: '2026-11-12', t: '28:50', status: 'open' },
        { id: 'a8', text: 'Post the dashboard link in the channel', short: 'Dashboard link', summary: 'Post the refreshed conversion dashboard link in the team channel.', owner: 'gabriel', due: '2026-11-13', t: '45:50', status: 'open' },
        { id: 'a9', text: 'Post the new on-call rotation schedule', short: 'On-call rotation', summary: 'Post next week\'s new on-call rotation so the team knows who to page.', owner: 'rishabh', due: '2026-11-13', t: '05:25', status: 'open' },
        { id: 'a10', text: 'Share the updated metrics view', short: 'Metrics view', summary: 'Share the updated metrics view with the team before next week\'s sync.', owner: 'varun', due: '2026-11-13', t: '44:30', status: 'open' },
        { id: 'a11', text: 'Set up the staging test accounts for the payment run', short: 'Staging test accounts', summary: 'Set up the staging test accounts the payment flow test run needs.', owner: 'aryan', due: '2026-11-13', t: '29:25', status: 'open' },
      ],
      // Discussion themes: contiguous transcript ranges, in meeting order.
      themes: [
        { id: 'th-1106-1', title: 'Status round-up', start: '00:05', end: '05:25', items: ['a9'] },
        { id: 'th-1106-2', title: 'Q1 roadmap review', start: '06:05', end: '13:25', items: [] },
        { id: 'th-1106-3', title: 'Forecast & conversion', start: '14:05', end: '21:25', items: ['a2'] },
        { id: 'th-1106-4', title: 'QA & launch date', start: '22:05', end: '27:40', items: ['q2'] },
        { id: 'th-1106-5', title: 'Launch checklist & legal', start: '28:05', end: '34:30', items: ['a4', 'a7', 'a11', 'd4', 'a6'] },
        { id: 'th-1106-6', title: 'Pricing page', start: '34:45', end: '41:52', items: ['d3', 'a3'] },
        { id: 'th-1106-7', title: 'Wrap-up & owners', start: '42:30', end: '47:40', items: ['a10', 'a8', 'a5'] },
      ],
    },
  ],
}

// Comments already on the record when the demo starts. Keyed like state.comments:
// `line:<instanceId>:<t>` for transcript lines, or a summary item id.
export const SEED_COMMENTS = {
  'line:wps-1106:16:05': [{ by: 'varun', text: 'March numbers are updated on the metrics dashboard.', on: '2026-11-07' }],
}

// Demo constants
export const DEMO_DATE = '2026-11-13'
// The team's real Zoom room for the demo: Join in the prototype opens it, and it's the Slack app's
// default join link (DEMO_JOIN_URL on the VM overrides that).
export const DEMO_ZOOM_URL = 'https://uchicago.zoom.us/j/95361409872?pwd=bj7i5RdPqku7zGGrUiRPaSbEaJOzBO.1'
export const CLOCK_START = 13 * 3600 + 25 * 60 // 1:25 PM
export const RETENTION_DAYS = 365 // workspace retention policy; nothing in the seed is expired
