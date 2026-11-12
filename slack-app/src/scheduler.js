// Calendar-driven trigger: polls each person's ICS feed and posts Heads-Up at (meeting start − reminder minutes)
// for recurring meetings that match a seeded Ansel series. A persona uses CALENDAR_ICS_URL_<PERSONA> if set,
// otherwise the shared CALENDAR_ICS_URL. Each feed is downloaded once per tick and only triggers its own people.
import { loadOccurrences, seriesMatcher } from './calendar.js'
import { pilotLog } from './headsup.js'

/** Calendar links are credentials: never let one reach the logs. */
export const redactUrls = (text = '') => String(text).replace(/(?:https?|webcals?):\/\/\S+/gi, '[calendar URL hidden]')

export function createScheduler({ headsUp, config, users, log = pilotLog, load = loadOccurrences }) {
  const match = seriesMatcher(config.seriesMap)
  const fired = new Set()
  let timer = null

  /** url → personas that read it */
  function feeds() {
    const byUrl = new Map()
    for (const persona of Object.keys(users)) {
      const url = config.calendars?.[persona] || config.icsUrl
      if (!url) continue
      if (!byUrl.has(url)) byUrl.set(url, [])
      byUrl.get(url).push(persona)
    }
    return byUrl
  }

  /** Upcoming occurrences, each tagged with the personas whose calendar it is on. */
  async function upcoming(hours = 24 * 7, only = Object.keys(users)) {
    const now = Date.now()
    const out = []
    for (const [url, personas] of feeds()) {
      const mine = personas.filter((p) => only.includes(p))
      if (!mine.length) continue
      let occ
      try {
        occ = await load({ url, from: new Date(now - 60000), to: new Date(now + hours * 3600000) })
      } catch (e) {
        console.error(`calendar feed for ${mine.join(', ')} failed: ${redactUrls(e.message)}`)
        continue
      }
      for (const o of occ) out.push({ ...o, personas: mine, sid: match(o.title), fireAtMs: o.startMs - config.reminderMinutes * 60000 })
    }
    return out.sort((a, b) => a.startMs - b.startMs)
  }

  async function tick() {
    try {
      const now = Date.now()
      for (const o of await upcoming(config.reminderMinutes / 60 + 1)) {
        if (now < o.fireAtMs || now >= o.startMs) continue
        for (const persona of o.personas) {
          const key = `${o.key}|${persona}`
          if (fired.has(key)) continue
          fired.add(key)
          if (!o.recurring) { log('card_skipped', persona, `${o.title}: not a recurring meeting`); continue }
          if (!o.sid) { log('card_skipped', persona, `${o.title}: no Ansel series matches this title`); continue }
          try {
            await headsUp.post({ persona, sid: o.sid, slackUser: users[persona], startMs: o.startMs, joinUrl: o.joinUrl })
          } catch (e) {
            fired.delete(key) // retry on the next poll
            console.error(`post failed for ${persona}:`, redactUrls(e.data?.error ?? e.message))
          }
        }
      }
      await headsUp.refreshCountdowns()
    } catch (e) {
      console.error('scheduler tick failed:', redactUrls(e.message))
    }
  }

  return {
    upcoming,
    tick,
    /** personas that have a calendar feed (own or shared) */
    calendarPersonas: () => [...feeds().values()].flat(),
    feedCount: () => feeds().size,
    start() { tick(); timer = setInterval(tick, config.pollSeconds * 1000) },
    stop() { clearInterval(timer) },
    reset() { fired.clear() },
  }
}
