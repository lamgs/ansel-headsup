// Heads-Up selection. Pure functions only: no I/O, no clock reads, no randomness.
// All inputs come from existing Ansel outputs (summaries, action items, tracked changes).

import { RETENTION_DAYS } from '../data/seed.js'

const DAY = 86400000
const dateMs = (d) => Date.parse(`${d}T00:00:00Z`)
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const weekday = (d) => WEEKDAYS[new Date(dateMs(d)).getUTCDay()]
export const shortDate = (d) => { const x = new Date(dateMs(d)); return `${MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}` }
export const longDate = (d) => `${weekday(d)} ${shortDate(d)}`

export const hhmmToSec = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 3600 + m * 60 }

/** Seconds-since-midnight at which the card fires for this user and series. */
export function triggerSec(user, series) {
  return hhmmToSec(series.nextInstance.start) - user.reminderMinutes * 60
}

const isExpired = (inst, now) => dateMs(now.date) - dateMs(inst.date) > RETENTION_DAYS * DAY

/**
 * buildHeadsUp(user, series, now, world) → { eligible, reason, items[], considered[], cost }
 *  - now:   { date: 'YYYY-MM-DD', sec: seconds since midnight }
 *  - world: { workspace, people, instances (with tracked changes / status updates merged), isMuted(userId, seriesId) }
 */
export function buildHeadsUp(user, series, now, world) {
  const considered = []
  const out = (eligible, reason, items = [], recordsRead = 0) => ({
    eligible, reason, items, considered,
    recordsRead,
    cost: `Selection over existing summaries: 1 series, ${recordsRead} records read, 0 transcripts reprocessed, no cross-series search.`,
  })

  if (user.org !== world.workspace.id) return out(false, 'External guest')
  if (user.holdout) return out(false, 'Holdout (measured, no card)')
  if (world.isMuted(user.id, series.id)) return out(false, 'Series muted')
  if (!user.slack) return out(false, 'Slack not connected')

  const past = world.instances
    .filter((i) => i.series === series.id && i.date < series.nextInstance.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  const latest = past[0]
  if (!latest || !latest.recorded || isExpired(latest, now)) return out(false, 'No record of last meeting')

  const pool = past
    .filter((i) => i.recorded && !isExpired(i, now) && i.attendees.includes(user.id))
    .slice(0, 4)
  if (pool.length === 0) return out(false, 'No meetings attended in this series')

  // Recency weight: latest instance highest.
  const rank = new Map(pool.map((i, idx) => [i.id, idx]))
  const isLatest = (inst) => inst.id === pool[0].id

  const owned = []
  const stakeQs = []
  const anyLatestQs = []
  const decisions = []
  for (const inst of pool) {
    for (const a of inst.actionItems) {
      const c = { section: 'You own', id: a.id, text: a.text, instance: inst.date }
      considered.push(c)
      if (a.owner !== user.id) { c.why = 'Not yours. Other people’s items never appear on the card.'; continue }
      if (a.status === 'done') { c.why = 'Already done. Excluded.'; continue }
      owned.push({ a, inst, c })
    }
    for (const q of inst.openQuestions) {
      const c = { section: 'Still open', id: q.id, text: q.text, instance: inst.date }
      considered.push(c)
      if (q.status !== 'open') { c.why = 'Resolved. Excluded.'; continue }
      if (q.stakeholders.includes(user.id)) stakeQs.push({ q, inst, c })
      else if (isLatest(inst)) anyLatestQs.push({ q, inst, c })
      else c.why = 'Not a stakeholder, older meeting.'
    }
    for (const d of inst.decisions) {
      const c = { section: 'Decided', id: d.id, text: d.text, instance: inst.date }
      considered.push(c)
      if (!isLatest(inst)) { c.why = 'Older meeting. Decided uses the latest meeting only.'; continue }
      decisions.push({ d, inst, c })
    }
  }

  if (owned.length === 0 && stakeQs.length === 0) {
    for (const c of considered) if (!c.why) c.why = 'Not considered: nothing for you.'
    return out(false, 'Nothing for you from recent meetings', [], pool.length)
  }

  const items = []

  // You own: latest instance first, then earliest due date.
  owned.sort((x, y) => rank.get(x.inst.id) - rank.get(y.inst.id) || (x.a.due < y.a.due ? -1 : 1))
  owned.forEach((o, i) => {
    if (i === 0) {
      o.c.picked = true
      o.c.why = 'Picked: yours, open, latest meeting, earliest due date.'
      items.push({
        section: 'own', id: o.a.id, instanceId: o.inst.id, t: o.a.t,
        text: o.a.short || o.a.text, fullText: o.a.text,
        due: o.a.due, dueLabel: `due ${weekday(o.a.due)}`,
        hedge: !o.a.confirmed, edited: !!o.a.trackedChange,
      })
    } else o.c.why = 'Not picked: one item per section.'
  })

  // Still open: stakeholder questions latest first; fallback to any open question in the latest meeting.
  const qList = stakeQs.length ? stakeQs : anyLatestQs
  qList.sort((x, y) => rank.get(x.inst.id) - rank.get(y.inst.id))
  qList.forEach((o, i) => {
    if (i === 0) {
      o.c.picked = true
      o.c.why = stakeQs.length ? 'Picked: open, you are a stakeholder, most recent.' : 'Picked: fallback, open question from the latest meeting.'
      items.push({ section: 'open', id: o.q.id, instanceId: o.inst.id, t: o.q.t, text: o.q.text, edited: !!o.q.trackedChange })
    } else o.c.why = 'Not picked: one item per section.'
  })
  if (stakeQs.length) for (const o of anyLatestQs) o.c.why = 'Not a stakeholder.'

  // Decided: highest priority in the latest meeting only.
  decisions.sort((x, y) => y.d.priority - x.d.priority)
  decisions.forEach((o, i) => {
    if (i === 0) {
      o.c.picked = true
      o.c.why = `Picked: highest priority (${o.d.priority}) in the latest meeting.`
      items.push({ section: 'decided', id: o.d.id, instanceId: o.inst.id, t: o.d.t, text: o.d.text, edited: !!o.d.trackedChange })
    } else o.c.why = `Not picked: lower priority (${o.d.priority}).`
  })

  const order = { own: 0, open: 1, decided: 2 }
  items.sort((a, b) => order[a.section] - order[b.section])
  return out(true, 'Eligible: you own an open item or are a stakeholder on an open question.', items.slice(0, 3), pool.length)
}
