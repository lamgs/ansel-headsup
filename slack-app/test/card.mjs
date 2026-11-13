// Offline checks for the Slack Heads-Up card (condensed layout, card/slack-mockups):
//   *30 min · Weekly Product Sync*
//   You own 2 items · <8 more from the team> last week      ("8 more…" links to the Action items tab)
//   Forecast update (<14:32>)                  [▸ Details]  (one row per item; only the timestamp is a link)
//   [Join Zoom] [Open in Ansel] [Mute series] [Not useful]
// With one item of yours: "You own Forecast update (14:32) · 5 more items from last week". Marking done is in Ansel.
// Fake Slack client: no tokens or network. Run: node test/card.mjs
import assert from 'node:assert/strict'
import { buildCard, cardState, fmtStamp, MAX_LISTED } from '../src/card.js'
import { createHeadsUp } from '../src/headsup.js'
import { createAccessControl } from '../src/access.js'
import { SEED } from '../../src/data/seed.js'
import { buildWorld } from '../../src/logic/world.js'
import { buildCardData } from '../../src/logic/buildCardData.js'

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
const ACTIONS = `${P}#ansel/wps-1106/actions/`
const config = { prototypeUrl: P, demoJoinUrl: 'https://zoom.us/j/123', reminderMinutes: 30 }
const logs = []
const log = (...a) => logs.push(a)
const team = ['gabriel', 'alicia', 'rishabh', 'varun', 'aryan', 'riley', 'leo'].map((p) => `${p}@acme.example`)
const access = createAccessControl({ client, allowedUsers: team, log })
const hu = createHeadsUp({ client, config, access, log })
const start = Date.now() + 30 * 60000
const elements = (m) => m.blocks.flatMap((b) => (b.type === 'actions' ? b.elements : b.accessory ? [b.accessory] : []))
const labels = (m) => m.blocks.filter((b) => b.type === 'actions').map((b) => b.elements.map((e) => e.text?.text ?? e.type).join(' | '))
const button = (m, id) => elements(m).find((e) => e.action_id === id)
const lastUpdate = () => calls.filter(([k]) => k === 'update').at(-1)[1]
const at = (msg) => ({ channel: { id: msg.channel }, message: { ts: msg.ts, blocks: msg.m.blocks } })
const press = (msg, id, url, h = hu) => h.handleAction({ ...at(msg), actions: [{ value: button(msg.m, 'hu_mute').value }] }, { action_id: id, url })

// 1. Everyone on the team owns two items: a row per item with its linked timestamp and a Details toggle; no Mark done on the card
const texts = {}
for (const p of ['gabriel', 'alicia', 'rishabh', 'varun', 'aryan']) {
  const r = await hu.post({ persona: p, sid: 'wps', slackUser: `${p}@acme.example`, startMs: start })
  assert.equal(r.posted, true, p)
  const c = calls.filter(([k]) => k === 'post').at(-1)[1]
  texts[p] = c.blocks[0].text.text
  assert.match(texts[p], /\nYou own 2 items · <.*\|8 more from the team> last week$/, p)
  for (const b of c.blocks.slice(1, 3)) { assert.match(b.text.text, /^\*.+\* \(<.*#t\/a\d+\|\d+:\d\d>\)$/, p); assert.equal(b.accessory.text.text, '▸ Details', p) }
  texts[p] += '\n' + c.blocks.slice(1, 3).map((b) => b.text.text).join('\n')
}
console.log(Object.entries(texts).map(([p, t]) => `${p}: ${t.split('\n').slice(2).join(' / ').replace(/<[^|]+\|/g, '<')}`).join('\n'))
const card = calls.find(([k, m]) => k === 'post' && m.channel === 'D_UGABRIEL01')[1]
assert.equal(card.blocks.length, 4)
assert.equal(card.blocks[0].text.text, `*30 min · Weekly Product Sync*\nYou own 2 items · <${ACTIONS}|8 more from the team> last week`)
assert.deepEqual(card.blocks.slice(1, 3).map((b) => [b.text.text, b.accessory.action_id]), [[`*Forecast update* (<${P}#t/a2|14:32>)`, 'hu_expand:a2'], [`*Dashboard link* (<${P}#t/a8|45:50>)`, 'hu_expand:a8']])
assert.equal(labels(card)[0], 'Join Zoom | Open in Ansel | Mute series | Not useful')
assert.ok(!JSON.stringify(card).includes('Mark done') && !JSON.stringify(card).includes('•'))
assert.deepEqual([button(card, 'hu_join').style, button(card, 'hu_join').url], ['primary', 'https://zoom.us/j/123'])
assert.equal(button(card, 'hu_open_last').url, `${P}#ansel/wps-1106/summary/`)
assert.equal(elements(card).filter((e) => e.style === 'primary').length, 1)
console.log('ok  two items each: layout')

const msg = { channel: 'D_UGABRIEL01', ts: String(calls.findIndex(([k, m]) => k === 'post' && m.channel === 'D_UGABRIEL01') + 1), m: card }
let m

// 3. Buttons: Mute, Not useful (each with Undo), Open in Ansel, Join
await press(msg, 'hu_nu'); m = lastUpdate()
assert.equal(m.blocks[3].text.text, 'Thanks. What was off?'); assert.equal(labels(m)[0], 'Already knew this | Wrong meeting | Bad timing | Undo'); assert.ok(!labels(m)[1].includes('Not useful'))
await press(msg, 'hu_nu_reason:bad_timing'); assert.equal(lastUpdate().blocks[3].text.text, 'Thanks for the feedback.')
await press(msg, 'hu_nu_undo'); assert.equal(lastUpdate().blocks.length, 4)
await press(msg, 'hu_mute'); m = lastUpdate()
assert.match(m.blocks[0].text.text, /^\*Muted Weekly Product Sync\*\nYou won't get Heads-Up for this series\. Starts in 30 min$/); assert.equal(labels(m)[0], 'Join Zoom | Undo')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'Series muted')
await press(msg, 'hu_mute_undo'); assert.equal(lastUpdate().blocks.length, 4)
assert.equal(await press(msg, 'hu_open_last', `${P}#x`), null)
assert.match(await press(msg, 'hu_open_last'), /\*Action items\*/, 'without a prototype link, Open in Ansel replies with the summary')
await press(msg, 'hu_join')
const ev = logs.map(([e, , d]) => `${e} ${d}`)
for (const e of ['card_shown', 'not_useful', 'not_useful_reason', 'not_useful_undone', 'mute_series', 'mute_undone', 'open_last_meeting']) assert.ok(ev.some((x) => x.startsWith(e + ' ')), e)
assert.ok(ev.includes('join_tap Zoom'))
console.log('ok  buttons + events')

// 3b. ▸ Details expands one item to show its summary under it; ▾ Hide collapses it; items expand independently
await press(msg, 'hu_expand:a2'); m = lastUpdate()
assert.equal(m.blocks[1].accessory.text.text, '▾ Hide')
assert.equal(m.blocks[2].type, 'context'); assert.match(m.blocks[2].elements[0].text, /^Rerun the Q1 forecast/)
assert.equal(m.blocks[3].accessory.text.text, '▸ Details')
await press(msg, 'hu_expand:a8'); m = lastUpdate()
assert.deepEqual(m.blocks.map((b) => b.type), ['section', 'section', 'context', 'section', 'context', 'actions'])
await press(msg, 'hu_expand:a2'); m = lastUpdate()
assert.deepEqual(m.blocks.map((b) => b.type), ['section', 'section', 'section', 'context', 'actions'])
await press(msg, 'hu_expand:a8'); assert.equal(lastUpdate().blocks.length, 4)
assert.ok(logs.some(([e, , d]) => e === 'item_expanded' && d === 'a2') && logs.some(([e, , d]) => e === 'item_collapsed' && d === 'a2'))
console.log('ok  expand / collapse items')

// 4. Who gets a card: everyone on the invite (Riley owns nothing); external guests and Design Review (no record) get none
let r = await hu.post({ persona: 'riley', sid: 'wps', slackUser: 'riley@acme.example', startMs: start })
const riley = calls.filter(([k]) => k === 'post').at(-1)[1]
assert.equal(riley.blocks[0].text.text, `*30 min · Weekly Product Sync*\n<${ACTIONS}|10 action items> from last week, none assigned to you`)
assert.equal(labels(riley)[0], 'Join Zoom | Open in Ansel | Mute series | Not useful')
assert.equal((await hu.post({ persona: 'leo', sid: 'wps', slackUser: 'leo@acme.example', startMs: start })).result.reason, 'External guest')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'dr', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'No record of last meeting')
const w0 = buildWorld()
const holdout = buildCardData({ ...w0.person('gabriel'), holdout: true }, SEED.series[0], w0, { startMs: start })
assert.deepEqual([holdout.eligible, holdout.reason, holdout.suppressed], [false, 'Holdout (measured, no card)', true])
assert.equal(buildCardData({ ...w0.person('gabriel'), slack: false }, SEED.series[0], w0, { startMs: start }).eligible, false)
console.log('ok  who gets a card')

// 5. One item of yours (stand-in data): the item in the sentence; an item already done in Ansel shows struck through
const base = hu.evaluate('gabriel', 'wps', { startMs: start }).result.data
const entryWith = (items, moreCount = 0) => ({ persona: 'gabriel', sid: 'wps', startMs: start, joinUrl: config.demoJoinUrl, data: { ...base, actionItems: { items, moreCount } }, ui: { muted: false, notUseful: null } })
const others = base.actionItems.items.filter((i) => i.owner.id !== 'gabriel')
let c = buildCard(entryWith([base.actionItems.items[0], ...others], 1), { nowMs: Date.now(), prototypeUrl: P })
assert.equal(c.blocks[0].text.text, `*30 min · Weekly Product Sync*\nYou own *Forecast update* (<${P}#t/a2|14:32>) · <${ACTIONS}|5 more items> from last week`)
assert.equal(labels(c)[0], 'Join Zoom | Open in Ansel | Mute series | Not useful')
c = buildCard(entryWith([{ ...base.actionItems.items[0], done: true }, ...others], 1), { nowMs: Date.now(), prototypeUrl: P })
assert.match(c.blocks[0].text.text, /You own ~Forecast update~ \(<.*\|14:32>\) · _Done_ · </)
console.log('ok  one item')

// 6. More than MAX_LISTED items of yours: rows for the first three, then "+N more of yours in Ansel"
const owned = (id, text, seconds) => ({ id, text, owner: { id: 'gabriel', name: 'Gabriel' }, seconds, t: '' })
c = buildCard(entryWith([owned('a2', 'Forecast update', 872), owned('x1', 'Interview notes', 1335), owned('x2', 'Dashboard link', 2750), owned('x3', 'Pipeline review', 100), ...others]), { nowMs: Date.now(), prototypeUrl: P })
assert.match(c.blocks[0].text.text, /You own 4 items · <.*\|4 more from the team> last week$/)
assert.equal(c.blocks.filter((b) => b.accessory?.action_id?.startsWith('hu_expand:')).length, MAX_LISTED)
assert.match(c.blocks[MAX_LISTED + 1].elements[0].text, /^<.*\|\+1 more of yours in Ansel>$/)
console.log('ok  more than three items')

// 7. Countdown states and links off
const now = Date.now()
assert.deepEqual(['posted', 'starting-soon', 'started', 'ended'], [now + 20 * 60000, now + 4 * 60000, now - 60000, now - 51 * 60000].map((s) => cardState(now, s, 50)))
const at2 = (startMs) => ({ persona: 'gabriel', sid: 'wps', startMs, joinUrl: config.demoJoinUrl, data: hu.evaluate('gabriel', 'wps', { startMs }).result.data, ui: { muted: false, notUseful: null } })
c = buildCard(at2(now + 4 * 60000), { nowMs: now, prototypeUrl: P }); assert.match(c.blocks[0].text.text, /^\*4 min · Weekly Product Sync\*/)
c = buildCard(at2(now - 60000), { nowMs: now, prototypeUrl: P }); assert.match(c.blocks[0].text.text, /^\*Live · Weekly Product Sync\*/); assert.equal(button(c, 'hu_join').text.text, 'Join now')
c = buildCard(at2(now - 51 * 60000), { nowMs: now, prototypeUrl: P }); assert.match(c.blocks[0].text.text, /^\*Ended · Weekly Product Sync\*[\s\S]*_Meeting ended · new summary in about 6 min_$/); assert.equal(button(c, 'hu_join'), undefined)
c = buildCard(at2(now + 20 * 60000), { nowMs: now, prototypeUrl: '' })
assert.equal(c.blocks[0].text.text, '*20 min · Weekly Product Sync*\nYou own 2 items · 8 more from the team last week', 'plain text when links are off')
assert.deepEqual(c.blocks.slice(1, 3).map((b) => b.text.text), ['*Forecast update* (14:32)', '*Dashboard link* (45:50)'])
assert.equal(button(c, 'hu_open_last').url, undefined)
assert.equal(fmtStamp(872), '14:32')
console.log('ok  countdown states + links off')

// 8. Restart safety: a press on a card this process didn't post rebuilds it from its buttons, and mutes persist
const hu3 = createHeadsUp({ client, config, access, log })
await press({ channel: 'D9', ts: '9', m: card }, 'hu_nu', undefined, hu3)
assert.equal(lastUpdate().blocks[3].text.text, 'Thanks. What was off?')
await press({ channel: 'D8', ts: '8', m: card }, 'hu_mute', undefined, hu3)
assert.equal(hu3.evaluate('gabriel', 'wps').result.reason, 'Series muted')
console.log('ok  restart-safe actions')
