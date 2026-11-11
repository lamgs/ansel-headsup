// Reads a calendar ICS feed (Google "secret address in iCal format" or an Outlook published calendar)
// and returns upcoming occurrences of recurring meetings. Read-only; no OAuth app needed for the demo.
import ical from 'node-ical'

const JOIN_RE = /https:\/\/(?:meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|[\w.-]*zoom\.us)\/[^\s<>"')\]]+/i
const str = (v) => (v == null ? '' : typeof v === 'object' && 'val' in v ? String(v.val) : String(v))

export function findJoinUrl(ev) {
  for (const field of [ev.location, ev.url, ev.description, ev['GOOGLE-CONFERENCE'], ev['X-MICROSOFT-SKYPETEAMSMEETINGURL']]) {
    const m = str(field).match(JOIN_RE)
    if (m) return m[0]
  }
  return null
}

/** Parse ICS text (or fetch url) → occurrences in [from, to]. */
export async function loadOccurrences({ url, text, from, to }) {
  const data = text != null ? ical.sync.parseICS(text) : await ical.async.fromURL(url)
  const out = []
  for (const ev of Object.values(data)) {
    if (ev.type !== 'VEVENT' || ev.status === 'CANCELLED') continue
    const recurring = !!ev.rrule
    const instances = recurring
      ? ical.expandRecurringEvent(ev, { from, to })
      : [{ start: ev.start, summary: ev.summary }]
    for (const inst of instances) {
      const start = new Date(inst.start)
      if (start < from || start > to) continue
      out.push({
        key: `${ev.uid}|${start.toISOString()}`,
        uid: ev.uid,
        title: str(inst.summary ?? ev.summary).trim(),
        startMs: start.getTime(),
        recurring,
        joinUrl: findJoinUrl(ev),
      })
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs)
}

/** "Weekly Product Sync=wps,Design Review=dr" → match a calendar title to a seeded series id. */
export function seriesMatcher(map = '') {
  const pairs = map.split(',').map((p) => p.split('=').map((x) => x.trim())).filter(([a, b]) => a && b)
  return (title) => pairs.find(([name]) => title.toLowerCase().includes(name.toLowerCase()))?.[1] ?? null
}
