// Offline checks: card blocks, ICS parsing (Google + Outlook style), scheduler firing, card actions.
// Uses a fake Slack client, so no tokens or network. Run: npm test
import assert from 'node:assert/strict'
import { buildCard } from '../src/card.js'
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

// 1. Card for Gabriel
const start = Date.now() + 30 * 60000
let r = await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })
assert.equal(r.posted, true)
const msg = calls[0][1]
const texts = msg.blocks.map((b) => b.text?.text ?? b.elements?.map((e) => e.text?.text ?? e.text).join(' | '))
console.log(texts.join('\n'))
assert.match(texts[1], /YOU OWN\*\n• Forecast update — due Thu \(may already be done\)/)
assert.match(texts[2], /STILL OPEN\*\n• Launch date: Mar 3 or Mar 10\?/)
assert.match(texts[3], /DECIDED\*\n• Pricing page ships with v2  `Edited`/)
assert.equal(msg.blocks[0].accessory.text.text, 'Join · starts in 30 min')
assert.equal(msg.blocks[1].accessory.url, 'https://demo.example/headsup/#ansel/wps-1106/transcript/14:32/a2')
assert.match(texts.at(-1), /Private to you · from meetings you attended · Nov 6/)
assert.equal(msg.channel, 'D_U_GABRIEL')
for (const b of msg.blocks) { if (b.accessory) assert.ok(b.accessory.text.text.length <= 75) }
console.log('ok  card blocks')

// 2. Skips match the prototype
for (const [p, reason] of [['riley', 'No meetings attended in this series'], ['sam', 'Holdout (measured, no card)'], ['alex', 'Slack not connected'], ['leo', 'External guest']]) {
  r = await hu.post({ persona: p, sid: 'wps', slackUser: 'U12345678', startMs: start })
  assert.deepEqual([r.posted, r.result.reason], [false, reason])
}
console.log('ok  skips')

// 3. Mute → muted body → Undo restores; next post for Gabriel is skipped while muted
const body = { channel: { id: 'D_U_GABRIEL' }, message: { ts: '1' }, actions: [msg.blocks.at(-2).elements[1]] }
await hu.setFlag(body, 'muted', true)
assert.match(calls.at(-1)[1].blocks[1].text.text, /^Muted Weekly Product Sync/)
assert.equal((await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'U12345678', startMs: start })).result.reason, 'Series muted')
await hu.setFlag(body, 'muted', false)
assert.match(calls.at(-1)[1].blocks[1].text.text, /YOU OWN/)
console.log('ok  mute / undo')

// 4. Button state survives an app restart (rebuilt from the button value)
const hu2 = createHeadsUp({ client, config, access, log })
await hu2.setFlag(body, 'notUseful', true)
assert.match(calls.at(-1)[1].blocks[1].text.text, /^Thanks/)
console.log('ok  restart-safe actions')

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
  users: { gabriel: 'UGABRIEL01', riley: 'URILEY001' },
  load: (o) => loadOccurrences({ ...o, text: ics }),
})
config.icsUrl = 'fake://ics'
await sched.tick(); await sched.tick()
const events = logs.map(([e, p, d]) => `${e} ${p} ${d}`)
console.log(events.join('\n'))
assert.equal(calls.filter(([k]) => k === 'post').length, 1, 'Gabriel gets exactly one card')
assert.ok(events.some((e) => e.startsWith('card_skipped riley Weekly Product Sync: No meetings attended')))
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

// 7. Regression: an action on a card this process didn't post must not unmute the series
const hu3 = createHeadsUp({ client, config, access, log })
await hu3.setFlag({ channel: { id: 'D1' }, message: { ts: 'a' }, actions: [{ value: JSON.stringify({ sid: 'wps', persona: 'gabriel', startMs: start }) }] }, 'muted', true)
hu3.entryFor({ channel: { id: 'D2' }, message: { ts: 'b' }, actions: [{ value: JSON.stringify({ sid: 'wps', persona: 'gabriel', startMs: start }) }] })
assert.equal(hu3.evaluate('gabriel', 'wps').result.reason, 'Series muted')
console.log('ok  rebuild keeps mutes')
