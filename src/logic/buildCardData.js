// Heads-Up card data, contract 2.0 (card/CONTRACT.md). Pure: no I/O, no clock reads.
// Shapes the seed into what the <heads-up-card> element and the Slack card both render:
// every action item from the last meeting, each with its owner.

const MAX_ROWS = 6

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
 *  opts: { startMs, joinUrl, reminderMinutes, retentionDays, today }
 * Rules (CONTRACT.md §3): everyone on the invite gets a card; holdout users get none (suppressed);
 * no card if the last meeting wasn't recorded. Muted series, no Slack and external guests also get none.
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
  const last = world.instances
    .filter((i) => i.series === series.id && i.date < series.nextInstance.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
  const expired = last && opts.retentionDays != null && dateMs(today) - dateMs(last.date) > opts.retentionDays * 86400000
  if (!last || !last.recorded || expired) return no('No record of last meeting')

  const person = (id) => world.person(id)
  const all = last.actionItems.map((a) => ({
    id: a.id,
    text: a.short || a.text,
    owner: { id: a.owner, name: person(a.owner)?.name ?? a.owner },
    seconds: tToSeconds(a.t),
    t: a.t,
    ...(a.summary ? { summary: a.summary } : {}),
    ...(a.owner === user.id && a.status === 'done' ? { done: true } : {}),
  }))
  // The viewer's own items first, then everyone else's, each in meeting order.
  const ordered = [...all.filter((i) => i.owner.id === user.id), ...all.filter((i) => i.owner.id !== user.id)]

  const joinUrl = opts.joinUrl ?? null
  return {
    eligible: true,
    reason: 'On the invite: shows every action item from the last meeting.',
    data: {
      contractVersion: '2.0',
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
      lastMeeting: { meetingId: last.id, date: last.date, recorded: true, label: "last week's recording" },
      actionItems: { items: ordered.slice(0, MAX_ROWS), moreCount: Math.max(0, ordered.length - MAX_ROWS) },
    },
  }
}
