// Offline checks for the Slack Heads-Up card in the condensed layout (card/slack-mockups): one text block with your item and
// its linked timestamp, one row of buttons with ✓; several items of yours get checkboxes (within Slack's 75-character limit).
// Fake Slack client: no tokens or network. Run: node test/card.mjs
import assert from 'node:assert/strict'
import { buildCard, cardState, fmtStamp, MAX_CHECKBOXES, OPTION_LIMIT } from '../src/card.js'
import { createHeadsUp } from '../src/headsup.js'
import { createAccessControl } from '../src/access.js'

const calls = []
const client = {
  users: { lookupByEmail: async ({ email }) => ({ user: { id: 'U' + email.split('@')[0].toUpperCase() + '01' } }) },
  conversations: { open: async ({ users }) => ({ channel: { id: 'D_' + users } }) },
  chat: {
    postMessage: async (m) => { calls.push(['post', m]); return { ts: String(calls.length) } },
    update: async (m) => { calls.push(['update', m]); return {} },
  },
}
const P = 'https://proto.example/'
const config = { prototypeUrl: P, demoJoinUrl: 'https://zoom.us/j/123', reminderMinutes: 30 }
const logs = []
const log = (...a) => logs.push(a)
const team = ['gabriel', 'alicia', 'riley', 'sam', 'alex', 'leo'].map((p) => `${p}@acme.example`)
const access = createAccessControl({ client, allowedUsers: team, log })
const hu = createHeadsUp({ client, config, access, log })
const start = Date.now() + 30 * 60000
const elements = (m) => m.blocks.flatMap((b) => (b.type === 'actions' ? b.elements : b.accessory ? [b.accessory] : []))
const labels = (m) => m.blocks.filter((b) => b.type === 'actions').map((b) => b.elements.map((e) => e.text?.text ?? e.type).join(' | '))
const button = (m, id) => elements(m).find((e) => e.action_id === id)
const lastUpdate = () => calls.filter(([k]) => k === 'update').at(-1)[1]
const at = (msg) => ({ channel: { id: msg.channel }, message: { ts: msg.ts, blocks: msg.m.blocks } })
const tick = (msg, values, h = hu) => h.handleAction({ ...at(msg), actions: [{ selected_options: values.map((value) => ({ value })) }] }, { action_id: 'hu_check', selected_options: values.map((value) => ({ value })) })
const withinLimits = (m) => m.blocks.flatMap((b) => b.elements ?? []).filter((e) => e.type === 'checkboxes').flatMap((e) => e.options).every((o) => o.text.text.length <= OPTION_LIMIT && (o.description?.text.length ?? 0) <= OPTION_LIMIT)
const press = (msg, id, url) => hu.handleAction({ ...at(msg), actions: [{ value: button(msg.m, 'hu_mute').value }] }, { action_id: id, url })

// 1. One item of yours: one text block (name, then the linked timestamp) and one row with ✓
let r = await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })
assert.equal(r.posted, true)
const card = calls[0][1]
console.log(card.blocks[0].text.text)
assert.equal(card.blocks.length, 2)
assert.equal(card.blocks[0].text.text, `*30 min · Weekly Product Sync*\nYou own *Forecast update* (<${P}#t/a2|14:32>) · 5 more items from last week`)
assert.equal(labels(card)[0], '✓ | Join Zoom | Open in Ansel | Mute series | Not useful')
assert.deepEqual([button(card, 'hu_join').style, button(card, 'hu_join').url], ['primary', 'https://zoom.us/j/123'])
assert.equal(button(card, 'hu_open_last').url, `${P}#ansel/wps-1106/summary/`)
assert.match(button(card, 'hu_done:a2').accessibility_label, /^Mark done: Forecast update$/)
assert.equal(elements(card).filter((e) => e.style === 'primary').length, 1)
console.log('ok  one item: layout')

// 2. Who gets a card (everyone on the invite; not holdout, no-Slack or external); none of yours
for (const [p, posted, reason] of [['riley', true], ['sam', false, 'Holdout (measured, no card)'], ['alex', false, 'Slack not connected'], ['leo', false, 'External guest']]) {
  r = await hu.post({ persona: p, sid: 'wps', slackUser: `${p}@acme.example`, startMs: start })
  assert.equal(r.posted, posted, p); if (!posted) assert.equal(r.result.reason, reason)
}
const riley = calls.filter(([k]) => k === 'post').at(-1)[1]
assert.equal(riley.blocks[0].text.text, '*30 min · Weekly Product Sync*\n6 action items from last week, none assigned to you')
assert.equal(riley.blocks.length, 2, 'no checkboxes when nothing is yours'); assert.equal(labels(riley)[0], 'Join Zoom | Open in Ansel | Mute series | Not useful')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'dr', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'No record of last meeting')
console.log('ok  who gets a card')

// 3. Buttons: ✓, Mute, Not useful (each with Undo), Open in Ansel, Join
const msg = { channel: 'D_UGABRIEL01', ts: '1', m: card }
let m
await press(msg, 'hu_done:a2'); m = lastUpdate()
assert.equal(m.blocks[0].text.text, `*30 min · Weekly Product Sync*\nYou own ~Forecast update~ (<${P}#t/a2|14:32>) · _Done_ · 5 more items from last week`)
assert.deepEqual([button(m, 'hu_done_undo:a2').text.text, button(m, 'hu_done_undo:a2').style], ['✓', 'primary'])
await press(msg, 'hu_done_undo:a2'); assert.match(lastUpdate().blocks[0].text.text, /You own \*Forecast update\* \(/)
await press(msg, 'hu_nu'); m = lastUpdate()
assert.equal(m.blocks[1].text.text, 'Thanks. What was off?'); assert.equal(labels(m)[0], 'Already knew this | Wrong meeting | Bad timing | Undo'); assert.ok(!labels(m)[1].includes('Not useful'))
await press(msg, 'hu_nu_reason:bad_timing'); assert.equal(lastUpdate().blocks[1].text.text, 'Thanks for the feedback.')
await press(msg, 'hu_nu_undo'); assert.equal(lastUpdate().blocks.length, 2)
await press(msg, 'hu_mute'); m = lastUpdate()
assert.match(m.blocks[0].text.text, /^\*Muted Weekly Product Sync\*\nYou won't get Heads-Up for this series\. Starts in 30 min$/); assert.equal(labels(m)[0], 'Join Zoom | Undo')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'Series muted')
await press(msg, 'hu_mute_undo'); assert.equal(lastUpdate().blocks.length, 2)
assert.equal(await press(msg, 'hu_open_last', `${P}#x`), null)
assert.match(await press(msg, 'hu_open_last'), /\*Action items\*/, 'without a prototype link, Open in Ansel replies with the summary')
await press(msg, 'hu_join')
const ev = logs.map(([e, , d]) => `${e} ${d}`)
for (const e of ['card_shown', 'card_suppressed', 'mark_done', 'mark_done_undone', 'not_useful', 'not_useful_reason', 'not_useful_undone', 'mute_series', 'mute_undone', 'open_last_meeting']) assert.ok(ev.some((x) => x.startsWith(e + ' ')), e)
assert.ok(ev.includes('join_tap Zoom · joinedPrepared=true'), 'joinedPrepared after ✓')
console.log('ok  buttons + events')

// 4. Several items of yours: a checkbox per item (ticked = done), up to MAX_CHECKBOXES, then "+N more of yours"
const base = hu.evaluate('gabriel', 'wps', { startMs: start }).result.data
const owned = (id, text, t, extra = {}) => ({ id, text, owner: { id: 'gabriel', name: 'Gabriel' }, seconds: 0, t, ...extra })
const multi = { ...base, actionItems: { items: [owned('a2', 'Forecast update', '14:32'), owned('x1', 'Customer interview notes', '22:15'), owned('x2', 'Dashboard link', '09:40', { done: true }), owned('x3', 'Pipeline review', '30:00'), ...base.actionItems.items.filter((i) => i.owner.id !== 'gabriel')], moreCount: 0 } }
const entry = { persona: 'gabriel', sid: 'wps', startMs: start, joinUrl: config.demoJoinUrl, data: multi, ui: { muted: false, notUseful: null, done: {} } }
let c = buildCard(entry, { nowMs: Date.now(), prototypeUrl: P })
assert.equal(c.blocks[0].text.text, '*30 min · Weekly Product Sync*\nYou own 4 items · 5 more from the team last week'); assert.ok(withinLimits(c))
const boxes = c.blocks[1].elements[0]
assert.equal(boxes.type, 'checkboxes'); assert.equal(boxes.options.length, MAX_CHECKBOXES)
assert.deepEqual(boxes.options.map((o) => [o.text.text, o.description.text]), [['*Forecast update*', `<${P}#t/a2|0:00 ↗>`], ['*Customer interview notes*', `<${P}#t/x1|0:00 ↗>`], ['~Dashboard link~', `<${P}#t/x2|0:00 ↗>`]])
assert.deepEqual(boxes.initial_options.map((o) => o.value), ['x2'])
assert.equal(c.blocks[2].elements[0].text, `<${P}#ansel/wps-1106/summary/|+1 more of yours in Ansel>`)
assert.equal(labels(c).at(-1), 'Join Zoom | Open in Ansel | Mute series | Not useful')
// Ticking and unticking through the real handler
const hu2 = createHeadsUp({ client, config, access, log })
hu2.live.set('D5:5', { ...entry, channel: 'D5', ts: '5', ui: { muted: false, notUseful: null, done: {}, tapped: false } })
await hu2.handleAction({ channel: { id: 'D5' }, message: { ts: '5' }, actions: [{}] }, { action_id: 'hu_check', selected_options: [{ value: 'x2' }, { value: 'a2' }] })
m = lastUpdate()
assert.deepEqual(m.blocks[1].elements[0].initial_options.map((o) => o.value), ['a2', 'x2'])
assert.equal(m.blocks[1].elements[0].options[0].text.text, '~Forecast update~')
await hu2.handleAction({ channel: { id: 'D5' }, message: { ts: '5' }, actions: [{}] }, { action_id: 'hu_check', selected_options: [{ value: 'a2' }] })
assert.deepEqual(lastUpdate().blocks[1].elements[0].initial_options.map((o) => o.value), ['a2'], 'unticking undoes done')
assert.ok(logs.some(([e, , d]) => e === 'mark_done_undone' && d === 'Dashboard link'))
console.log('ok  several items: checkboxes')

// 5. Countdown states and no-link mode
const now = Date.now()
assert.deepEqual(['posted', 'starting-soon', 'started', 'ended'], [now + 20 * 60000, now + 4 * 60000, now - 60000, now - 51 * 60000].map((s) => cardState(now, s, 50)))
const one = (startMs) => ({ persona: 'gabriel', sid: 'wps', startMs, joinUrl: config.demoJoinUrl, data: hu.evaluate('gabriel', 'wps', { startMs }).result.data, ui: { muted: false, notUseful: null, done: {} } })
c = buildCard(one(now + 4 * 60000), { nowMs: now, prototypeUrl: P }); assert.match(c.blocks[0].text.text, /^\*4 min · Weekly Product Sync\*/)
c = buildCard(one(now - 60000), { nowMs: now, prototypeUrl: P }); assert.match(c.blocks[0].text.text, /^\*Live · Weekly Product Sync\*/); assert.equal(button(c, 'hu_join').text.text, 'Join now')
c = buildCard(one(now - 51 * 60000), { nowMs: now, prototypeUrl: P }); assert.match(c.blocks[0].text.text, /^\*Ended · Weekly Product Sync\*[\s\S]*_Meeting ended · new summary in about 6 min_$/); assert.equal(button(c, 'hu_join'), undefined)
c = buildCard(one(now + 20 * 60000), { nowMs: now, prototypeUrl: '' })
assert.match(c.blocks[0].text.text, /You own \*Forecast update\* \(14:32\) ·/, 'plain timestamp when links are off'); assert.equal(button(c, 'hu_open_last').url, undefined)
assert.equal(fmtStamp(872), '14:32')
const long = { ...multi, actionItems: { items: [owned('a2', 'A very long action item title that goes well past what Slack allows in a checkbox', '14:32')], moreCount: 0 } }
assert.ok(withinLimits(buildCard({ ...entry, data: long }, { nowMs: now, prototypeUrl: 'https://a-much-longer-hosted-prototype-address.example.com/ansel-headsup/' })), 'long names and long prototype addresses still fit')
console.log('ok  countdown states + links off')

// 6. Restart safety: a press on a card this process didn't post rebuilds it from the buttons, and keeps mutes
const hu3 = createHeadsUp({ client, config, access, log })
await hu3.handleAction({ ...at({ channel: 'D9', ts: '9', m: card }), actions: [{ value: button(card, 'hu_mute').value }] }, { action_id: 'hu_done:a2' })
assert.match(lastUpdate().blocks[0].text.text, /_Done_/, 'a press after a restart rebuilds the card from its buttons')
await hu3.handleAction({ channel: { id: 'D8' }, message: { ts: '8', blocks: card.blocks }, actions: [{ selected_options: [] }] }, { action_id: 'hu_mute' })
assert.equal(hu3.evaluate('gabriel', 'wps').result.reason, 'Series muted')
console.log('ok  restart-safe actions')
