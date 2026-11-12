/*
 * Demo data for the Heads-Up card · contract 2.0
 * A plain script (not JSON) so it loads from a dev server and from a double-clicked local file.
 * Use it like this:  card.data = HeadsUpDemoData.alex;
 *
 * Every action item from last meeting has an owner. The card shows all of them in one table,
 * the viewer's own first (Alex has two: one open, one already done). Each summary is that item's line from Ansel's existing meeting summary.
 * Forecast update ▶14:32 matches the Phase 1 brief. Due dates are left out: they get set in the meeting.
 */
(function () {
  'use strict';

  const alex = {
    contractVersion: '2.0',
    viewer: { id: 'u_alex', name: 'Alex', inHoldout: false },
    meeting: {
      seriesId: 's_weekly_product_sync',
      meetingId: 'm_next',
      title: 'Weekly Product Sync',
      isRecurring: true,
      start: null,               // null: starts reminderMinutes after the data is set
      demoStartTime: '14:00',    // optional: show the meeting at 2:00 PM, card clock opens at 1:30 PM
      durationMinutes: 30,
      reminderMinutes: 30,       // the user's Outlook reminder setting
      platform: 'Zoom',
      joinUrl: 'https://zoom.us/j/0000000000',
    },
    lastMeeting: {
      meetingId: 'm_last',
      recorded: true,
      label: "last week's recording",
      url: 'meeting.html?id=m_last',
      transcriptUrl: 'transcript.html?meeting=m_last',
    },
    actionItems: {
      items: [
        { id: 'i_q3', text: 'Final Q3 numbers', owner: { id: 'u_sam', name: 'Sam' }, seconds: 1120,
          summary: 'Close out Q3 actuals so the forecast can use them.' },
        { id: 'i_forecast', text: 'Forecast update', owner: { id: 'u_alex', name: 'Alex' }, seconds: 872,
          summary: 'Rerun the forecast with the revised pipeline and share it with the team.' },
        { id: 'i_interviews', text: 'Customer interview notes', owner: { id: 'u_alex', name: 'Alex' }, seconds: 1335, done: true,
          summary: 'Share notes from the three customer calls before pricing is set.' },
        { id: 'i_checklist', text: 'Launch checklist draft', owner: { id: 'u_theo', name: 'Theo' }, seconds: 1990,
          summary: 'Draft the launch checklist covering QA, support and comms.' },
        { id: 'i_copy', text: 'Pricing page copy review', owner: { id: 'u_ines', name: 'Ines' }, seconds: 2162,
          summary: 'Check the new pricing page copy against the v2 plan names.' },
      ],
      moreCount: 1,
    },
  };

  // Same meeting, but nothing from last time is assigned to Alex: every row belongs to someone else.
  const alexOwnsNothing = {
    ...alex,
    actionItems: { ...alex.actionItems, items: alex.actionItems.items.filter((it) => it.owner.id !== 'u_alex') },
  };

  // A user in the randomized holdout: the card shows only the demo placeholder.
  const holdout = {
    ...alex,
    viewer: { id: 'u_jordan', name: 'Jordan', inHoldout: true },
  };

  window.HeadsUpDemoData = { alex, alexOwnsNothing, holdout };
})();
