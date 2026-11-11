// Calendar-driven trigger: polls the ICS feed and posts Heads-Up at (meeting start − reminder minutes)
// for recurring meetings that match a seeded Ansel series.
import { loadOccurrences, seriesMatcher } from './calendar.js'
import { pilotLog } from './headsup.js'

export function createScheduler({ headsUp, config, users, log = pilotLog, load = loadOccurrences }) {
  const match = seriesMatcher(config.seriesMap)
  const fired = new Set()
  let timer = null

  async function upcoming(hours = 24 * 7) {
    if (!config.icsUrl) return []
    const now = Date.now()
    const occ = await load({ url: config.icsUrl, from: new Date(now - 60000), to: new Date(now + hours * 3600000) })
    return occ.map((o) => ({ ...o, sid: match(o.title), fireAtMs: o.startMs - config.reminderMinutes * 60000 }))
  }

  async function tick() {
    try {
      const now = Date.now()
      for (const o of await upcoming(config.reminderMinutes / 60 + 1)) {
        if (now < o.fireAtMs || now >= o.startMs) continue
        for (const [persona, slackUser] of Object.entries(users)) {
          const key = `${o.key}|${persona}`
          if (fired.has(key)) continue
          fired.add(key)
          if (!o.recurring) { log('card_skipped', persona, `${o.title}: not a recurring meeting`); continue }
          if (!o.sid) { log('card_skipped', persona, `${o.title}: no Ansel series matches this title`); continue }
          try {
            await headsUp.post({ persona, sid: o.sid, slackUser, startMs: o.startMs, joinUrl: o.joinUrl })
          } catch (e) {
            fired.delete(key) // retry on the next poll
            console.error(`post failed for ${persona}:`, e.data?.error ?? e.message)
          }
        }
      }
      await headsUp.refreshCountdowns()
    } catch (e) {
      console.error('scheduler tick failed:', e.message)
    }
  }

  return {
    upcoming,
    tick,
    start() { tick(); timer = setInterval(tick, config.pollSeconds * 1000) },
    stop() { clearInterval(timer) },
    reset() { fired.clear() },
  }
}
