// Offline checks: allowlist, ICS parsing (Google + Outlook style), scheduler, per-person calendars, ping, App Home.
// Card layout and buttons: test/card.mjs.
// Uses a fake Slack client, so no tokens or network. Run: npm test
import assert from 'node:assert/strict'
import { loadOccurrences, seriesMatcher } from '../src/calendar.js'
import { createHeadsUp } from '../src/headsup.js'
import { createScheduler, redactUrls } from '../src/scheduler.js'
import { parseCalendarFeeds } from '../src/config.js'
import { createAccessControl } from '../src/access.js'
import { buildHome } from '../src/home.js'

const calls = []
const client = {
  users: { lookupByEmail: async ({ email }) => ({ user: { id: 'U_' + email.split('@')[0].toUpperCase() } }) },
  conversations: { open: async ({ users }) => ({ channel: { id: 'D_' + users } }) },
  chat: {
    postMessage: async (m) => { calls.push(['post', m]); return { ts: String(calls.length) } },
    update: async (m) => { calls.push(['update', m]); return {} },
  },
}
const config = { prototypeUrl: 'https://demo.example/headsup/', demoJoinUrl: 'https://meet.google.com/abc-defg-hij', reminderMinutes: 30, seriesMap: 'Weekly Product Sync=wps,Design Review=dr' }
const logs = []
const log = (...a) => logs.push(a)
const access = createAccessControl({ client, allowedUsers: ['gabriel@acme.example', 'U12345678', 'UGABRIEL01', 'UARYAN001', 'URILEY001'], log })
const hu = createHeadsUp({ client, config, access, log })

assert.equal(await access.isAllowed('gabriel@acme.example'), true)
assert.equal(await access.isAllowed('U_GABRIEL'), true)
assert.equal(await access.isAllowed('intruder@acme.example'), false)
assert.equal((await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'U_INTRUDER', startMs: Date.now() })).result.reason, 'Not authorized for this app')
assert.equal(calls.length, 0)
console.log('ok  user allowlist')

// Card layout and card buttons are covered in test/card.mjs (no calendar library needed).
const start = Date.now() + 30 * 60000

// 5. ICS: Google-style weekly event with TZID + Outlook-style Teams link; one-off ignored by scheduler
const now = Date.now()
const z = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Google Inc//Google Calendar 70.9054//EN
BEGIN:VEVENT
UID:wps-series@google.com
DTSTART:${z(now + 20 * 60000 - 7 * 86400000)}
DTEND:${z(now + 70 * 60000 - 7 * 86400000)}
RRULE:FREQ=WEEKLY
SUMMARY:Weekly Product Sync
LOCATION:https://meet.google.com/abc-defg-hij
END:VEVENT
BEGIN:VEVENT
UID:dr-series@outlook.com
DTSTART;TZID=America/Chicago:20261030T160000
DTEND;TZID=America/Chicago:20261030T170000
RRULE:FREQ=WEEKLY;INTERVAL=2
SUMMARY:Design Review
DESCRIPTION:Join Microsoft Teams Meeting <https://teams.microsoft.com/l/meetup-join/19%3ameeting_x>
END:VEVENT
BEGIN:VEVENT
UID:oneoff@google.com
DTSTART:${z(now + 10 * 60000)}
DTEND:${z(now + 40 * 60000)}
SUMMARY:Weekly Product Sync (extra)
END:VEVENT
END:VCALENDAR`
const occ = await loadOccurrences({ text: ics, from: new Date(now - 60000), to: new Date(now + 30 * 86400000) })
const wps = occ.find((o) => o.uid === 'wps-series@google.com')
assert.ok(wps.recurring && Math.abs(wps.startMs - (now + 20 * 60000)) < 2000)
assert.equal(wps.joinUrl, 'https://meet.google.com/abc-defg-hij')
const dr = occ.find((o) => o.uid === 'dr-series@outlook.com')
assert.equal(dr.joinUrl, 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_x')
assert.equal(new Date(dr.startMs).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric' }), 'Fri 4 PM')
assert.equal(seriesMatcher(config.seriesMap)('Weekly Product Sync'), 'wps')
console.log('ok  ICS parsing:', occ.length, 'occurrences')

// 6. Scheduler fires once per (occurrence, persona) inside the reminder window
calls.length = 0; logs.length = 0
const sched = createScheduler({
  headsUp: createHeadsUp({ client, config, access, log }), config, log,
  users: { gabriel: 'UGABRIEL01', sam: 'U12345678' },
  load: (o) => loadOccurrences({ ...o, text: ics }),
})
config.icsUrl = 'fake://ics'
await sched.tick(); await sched.tick()
const events = logs.map(([e, p, d]) => `${e} ${p} ${d}`)
console.log(events.join('\n'))
assert.equal(calls.filter(([k]) => k === 'post').length, 1, 'Gabriel gets exactly one card')
assert.ok(events.some((e) => e.startsWith('card_suppressed sam Weekly Product Sync: Holdout')))
assert.ok(events.some((e) => e.includes('not a recurring meeting')))
console.log('ok  scheduler')

// 6b. Per-person calendars: each feed only triggers its owner; a broken feed is logged without its URL
assert.deepEqual(parseCalendarFeeds({ CALENDAR_ICS_URL_GABRIEL: ' https://a.example/m.ics ', CALENDAR_ICS_URL_: 'x', CALENDAR_ICS_URL_ARYAN: '', OTHER: 'y' }), { gabriel: 'https://a.example/m.ics' })
assert.equal(redactUrls('GET https://outlook.office365.com/owa/calendar/abc/secret/calendar.ics 404'), 'GET [calendar URL hidden] 404')
calls.length = 0; logs.length = 0
const empty = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'
const loaded = []
const errors = []
const origError = console.error
console.error = (...a) => errors.push(a.join(' '))
const perPerson = createScheduler({
  headsUp: createHeadsUp({ client, config, access, log }),
  config: { ...config, icsUrl: '', calendars: { gabriel: 'fake://gabriel', aryan: 'fake://aryan', rishabh: 'https://secret.example/rishabh.ics' } },
  log,
  users: { gabriel: 'UGABRIEL01', aryan: 'UARYAN001', rishabh: 'U12345678' },
  load: async (o) => {
    loaded.push(o.url)
    if (o.url.includes('rishabh')) throw new Error(`fetch failed for ${o.url}`)
    return loadOccurrences({ ...o, text: o.url === 'fake://gabriel' ? ics : empty })
  },
})
await perPerson.tick()
console.error = origError
assert.deepEqual(loaded.sort(), ['fake://aryan', 'fake://gabriel', 'https://secret.example/rishabh.ics'])
assert.equal(calls.filter(([k]) => k === 'post').length, 1, 'only Gabriel (whose calendar has the meeting) gets a card')
assert.ok(!logs.some(([, p]) => p === 'aryan'), 'Aryan is not evaluated for a meeting on Gabriel\'s calendar')
assert.ok(errors.some((e) => e.includes('calendar feed for rishabh failed') && e.includes('[calendar URL hidden]')))
assert.ok(!errors.some((e) => e.includes('secret.example')), 'calendar URL never logged')
assert.deepEqual((await perPerson.upcoming(24, ['aryan'])).length, 0, 'upcoming() can be limited to one person')
assert.deepEqual(perPerson.calendarPersonas().sort(), ['aryan', 'gabriel', 'rishabh'])
console.log('ok  per-person calendars')

// 6c. Ping everyone: every team member gets their own card; anyone not allowlisted gets nothing
calls.length = 0; logs.length = 0
const ping = await createHeadsUp({ client, config, access, log }).pingAll({ gabriel: 'UGABRIEL01', aryan: 'UARYAN001', rishabh: 'U12345678', alicia: 'intruder@acme.example' }, { startMs: start })
assert.deepEqual(ping.sent.map((r) => r.persona), ['gabriel', 'aryan', 'rishabh'])
assert.deepEqual(ping.skipped.map((r) => [r.persona, r.reason]), [['alicia', 'Not authorized for this app']])
assert.deepEqual(calls.filter(([k]) => k === 'post').map(([, m]) => m.channel), ['D_UGABRIEL01', 'D_UARYAN001', 'D_U12345678'], 'one DM per team member')
console.log('ok  ping everyone')

// 6d. App Home: allowlisted users see their setup and both ping buttons; others see only the notice
const home = buildHome({ allowed: true, personaName: 'Alicia', calendar: true, next: { title: 'Weekly Product Sync', fireAt: 'Fri 1:30 PM' }, demoName: 'Gabriel', mappedNames: ['Gabriel', 'Alicia'], reminderMinutes: 30, status: 'Sent.' })
const homeText = JSON.stringify(home)
assert.equal(home.type, 'home')
assert.deepEqual(home.blocks.find((b) => b.type === 'actions').elements.map((e) => e.action_id), ['ping_me', 'ping_everyone'])
for (const t of ['Alicia', 'Connected (Outlook)', 'Fri 1:30 PM', 'Sent.', '/headsup ping']) assert.ok(homeText.includes(t), t)
const denied = buildHome({ allowed: false, demoName: 'Gabriel', mappedNames: [], reminderMinutes: 30 })
assert.ok(!JSON.stringify(denied).includes('ping_me') && JSON.stringify(denied).includes('not enabled'))
assert.ok(home.blocks.length <= 100)
console.log('ok  app home')
