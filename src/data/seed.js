// Seed data, used exactly as specified in the PRD (Section 5).
export const SEED = {
  workspace: { id: 'acme', name: 'Acme' },
  people: [
    { id: 'gabriel', name: 'Gabriel', role: 'Data Analyst', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'alicia', name: 'Alicia', role: 'Product Manager (organizer)', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'rishabh', name: 'Rishabh', role: 'Engineering Lead', org: 'acme', slack: true, holdout: true, reminderMinutes: 30 },
    { id: 'varun', name: 'Varun', role: 'Finance Partner', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'alex', name: 'Alex Kim', role: 'Content Designer', org: 'acme', slack: false, holdout: false, reminderMinutes: 30 },
    { id: 'aryan', name: 'Aryan', role: 'QA Engineer (new to series)', org: 'acme', slack: true, holdout: false, reminderMinutes: 30 },
    { id: 'leo', name: 'Leo Grant', role: 'Agency partner', org: 'external', slack: false, holdout: false, reminderMinutes: 30 },
  ],
  series: [
    {
      id: 'wps', title: 'Weekly Product Sync', organizer: 'alicia', cadence: 'Weekly, Fri 2:00 PM, 50 min',
      invitees: ['alicia', 'gabriel', 'rishabh', 'varun', 'alex', 'aryan', 'leo'],
      nextInstance: { date: '2026-11-13', start: '14:00' },
    },
    {
      id: 'dr', title: 'Design Review', organizer: 'alex', cadence: 'Biweekly, Fri 4:00 PM',
      invitees: ['alex', 'gabriel', 'alicia'],
      nextInstance: { date: '2026-11-13', start: '16:00' },
      note: "Last instance (Oct 30) had 'Keep Ansel out' on, so there is no record and Heads-Up skips it",
    },
  ],
  instances: [
    {
      id: 'wps-1023', series: 'wps', date: '2026-10-23', recorded: true, attendees: ['alicia', 'gabriel', 'rishabh', 'varun', 'alex'],
      decisions: [{ id: 'd1', text: 'Q1 launch scope locked: payments + pricing page', t: '08:10', priority: 2 }],
      openQuestions: [],
      actionItems: [],
    },
    {
      id: 'wps-1030', series: 'wps', date: '2026-10-30', recorded: true, attendees: ['alicia', 'gabriel', 'rishabh', 'alex'],
      decisions: [{ id: 'd2', text: 'Beta waitlist closes Nov 15', t: '05:40', priority: 2 }],
      openQuestions: [{ id: 'q1', text: 'Do we need legal review for new pricing?', t: '19:22', stakeholders: ['alicia', 'varun'], status: 'resolved', resolvedIn: 'wps-1106' }],
      actionItems: [{ id: 'a1', text: 'Pull conversion data from dashboard', owner: 'gabriel', due: '2026-11-03', t: '22:15', status: 'done' }],
    },
    {
      id: 'wps-1106', series: 'wps', date: '2026-11-06', recorded: true, durationMin: 48, attendees: ['alicia', 'gabriel', 'rishabh', 'varun', 'alex'],
      decisions: [
        {
          id: 'd3', text: 'Pricing page ships with v2', t: '41:18', priority: 3,
          trackedChange: { by: 'alicia', on: '2026-11-07', original: 'Pricing page ships with v2 (tentative)' },
        },
        { id: 'd4', text: 'Legal review not required for new pricing tiers', t: '33:10', priority: 1 },
      ],
      openQuestions: [{ id: 'q2', text: 'Launch date: Mar 3 or Mar 10?', t: '27:05', stakeholders: ['gabriel', 'rishabh'], status: 'open' }],
      actionItems: [
        { id: 'a2', text: 'Update Q1 forecast with new conversion numbers', short: 'Forecast update', owner: 'gabriel', due: '2026-11-12', t: '14:32', status: 'open' },
        { id: 'a3', text: 'Send final pricing page copy to Rishabh', owner: 'alex', due: '2026-11-11', t: '41:52', status: 'open' },
        { id: 'a4', text: 'Estimate QA time for payment flow', owner: 'rishabh', due: '2026-11-12', t: '28:30', status: 'open' },
      ],
    },
  ],
}

// Demo constants
export const DEMO_DATE = '2026-11-13'
export const CLOCK_START = 13 * 3600 + 25 * 60 // 1:25 PM
export const RETENTION_DAYS = 365 // workspace retention policy; nothing in the seed is expired
