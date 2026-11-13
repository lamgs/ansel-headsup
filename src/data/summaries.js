// Written summary text for each recorded meeting: a short overview and one line of
// context per decision or open question. Kept apart from seed.js so the card data and
// this display text can change independently. Counts on the Summary page are computed
// from the seed, so they stay right when items are marked done.
export const SUMMARIES = {
  'wps-1106': {
    overview: 'The pricing page ships with v2, not before. The launch date is still open between Mar 3 and Mar 10, pending the new forecast and the QA estimate.',
    context: {
      d3: 'Shipping early meant a second QA pass and announcing pricing twice.',
      d4: 'Closes the Oct 30 question about legal review.',
      q2: 'Gabriel and Rishabh bring a recommendation to the next sync.',
    },
  },
  'wps-1030': {
    overview: 'The beta waitlist closes Nov 15. Varun is checking whether the new pricing needs legal review. Gabriel will draft a pricing FAQ for support, and Rishabh will fix the flaky payments tests. Who handles support escalations after launch is still open.',
    context: {
      d2: 'Announced at the start of the meeting.',
      q1: 'Answered on Nov 6: no separate review needed.',
      q3: 'Not picked up on Nov 6. Gabriel and Rishabh to propose an owner.',
    },
  },
  'wps-1023': {
    overview: 'Q1 launch scope is locked to payments and the pricing page. Nothing else gets added. Varun will set up error alerts on the billing service, and Alicia will collect beta customer quotes for the pricing page.',
    context: {
      d1: 'QA planning for the payment flow should start early.',
    },
  },
}
