// Heads-Up card data, contract 2.1 (card/CONTRACT.md). Pure: no I/O, no clock reads.
// Shapes the seed into what the <heads-up-card> element and the Slack card both render:
// every action item from the last meeting, each with its owner, plus the viewer's own items
// still open from earlier meetings in the series. Every item carries the meeting it came from.

const MAX_ROWS = 6
const LOOKBACK = 4 // recorded meetings read, latest included (same window as buildHeadsUp)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (d) => { const x = new Date(dateMs(d)); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}` }

const dateMs = (d) => Date.parse(`${d}T00:00:00Z`)
export const tToSeconds = (t) => t.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0)

/** "https://teams.microsoft.com/..." → "Teams" */
export function platformFor(url = '') {
  if (/teams\.(microsoft|live)\.com/i.test(url)) return 'Teams'
  if (/zoom\.us/i.test(url)) return 'Zoom'
  if (/meet\.google\.com/i.test(url)) return 'Google Meet'
  return 'meeting'
}

/** Minutes from a cadence like "Weekly, Fri 2:00 PM, 50 min"; 30 if none. */
const durationOf = (series) => Number(series.cadence?.match(/(\d+)\s*min/)?.[1] ?? 30)

/**
 * buildCardData(user, series, world, opts) → { eligible, reason, suppressed?, data? }
 *  opts: { startMs, joinUrl, reminderMinutes, retentionDays, today, maxRows (default 6; Infinity for every item) }
 * Rules (CONTRACT.md §3): everyone on the invite gets a card; holdout users get none (suppressed);
 * no card if the last meeting wasn't recorded. Muted series, no Slack and external guests also get none.
 * Earlier meetings: the viewer's own open items from up to LOOKBACK - 1 earlier recorded meetings they
 * attended, inside retention. Other people's items and done items stay with the latest meeting only.
 */
export function buildCardData(user, series, world, opts = {}) {
  const no = (reason, extra = {}) => ({ eligible: false, reason, ...extra })
  if (!user || !series) return no('Unknown persona or series')
  if (!series.invitees.includes(user.id)) return no('Not invited to this series')
  if (user.org !== world.workspace.id) return no('External guest')
  if (user.holdout) return no('Holdout (measured, no card)', { suppressed: true })
  if (world.isMuted(user.id, series.id)) return no('Series muted')
  if (!user.slack) return no('Slack not connected')

  const today = opts.today ?? series.nextInstance.date
  const inRetention = (i) => opts.retentionDays == null || dateMs(today) - dateMs(i.date) <= opts.retentionDays * 86400000
  const past = world.instances
    .filter((i) => i.series === series.id && i.date < series.nextInstance.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const last = past[0]
  if (!last || !last.recorded || !inRetention(last)) return no('No record of last meeting')
  const earlier = past.slice(1)
    .filter((i) => i.recorded && inRetention(i) && i.attendees?.includes(user.id))
    .slice(0, LOOKBACK - 1)

  const person = (id) => world.person(id)
  const row = (a, inst) => ({
    id: a.id,
    text: a.short || a.text,
    owner: { id: a.owner, name: person(a.owner)?.name ?? a.owner },
    seconds: tToSeconds(a.t),
    t: a.t,
    meetingId: inst.id,
    date: inst.date,
    dateLabel: shortDate(inst.date),
    ...(inst.id !== last.id ? { carriedOver: true } : {}),
    ...(a.summary ? { summary: a.summary } : {}),
    ...(a.owner === user.id && a.status === 'done' ? { done: true } : {}),
  })
  const all = last.actionItems.map((a) => row(a, last))
  // Still open from earlier meetings and yours: newest meeting first, each in meeting order.
  // An item marked done since the card went out (a.update) stays on it as done, so the row
  // doesn't vanish when you tap Mark done and you can still undo it.
  const carried = earlier.flatMap((inst) => inst.actionItems
    .filter((a) => a.owner === user.id && (a.status !== 'done' || a.update?.kind === 'done'))
    .map((a) => row(a, inst)))
  // The viewer's own items first (last meeting, then carried over), then everyone else's from the last meeting.
  const ordered = [...all.filter((i) => i.owner.id === user.id), ...carried, ...all.filter((i) => i.owner.id !== user.id)]

  const joinUrl = opts.joinUrl ?? null
  return {
    eligible: true,
    reason: 'On the invite: shows every action item from the last meeting, plus yours still open from earlier ones.',
    data: {
      contractVersion: '2.1',
      viewer: { id: user.id, name: user.name, inHoldout: false },
      meeting: {
        seriesId: series.id,
        meetingId: `${series.id}-next`,
        title: series.title,
        isRecurring: true,
        start: opts.startMs != null ? new Date(opts.startMs).toISOString() : null,
        durationMinutes: durationOf(series),
        reminderMinutes: opts.reminderMinutes ?? user.reminderMinutes ?? 30,
        platform: platformFor(joinUrl ?? ''),
        joinUrl,
      },
      lastMeeting: { meetingId: last.id, date: last.date, dateLabel: shortDate(last.date), recorded: true, label: "last week's recording" },
      actionItems: { items: ordered.slice(0, opts.maxRows ?? MAX_ROWS), moreCount: Math.max(0, ordered.length - (opts.maxRows ?? MAX_ROWS)) },
    },
  }
}
