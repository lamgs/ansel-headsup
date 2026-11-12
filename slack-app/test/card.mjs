// Offline checks for the Slack Heads-Up card (contract 2.0, matching card/heads-up-card.js):
// layout (card/slack-mockups direction 2a), who gets a card, every card button, countdown states and restart safety.
// Fake Slack client: no tokens or network. Run: node test/card.mjs
import assert from 'node:assert/strict'
import { buildCard, cardState, fmtStamp } from '../src/card.js'
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
const config = { prototypeUrl: '', demoJoinUrl: 'https://teams.microsoft.com/l/meetup-join/x', reminderMinutes: 30 }
const logs = []
const log = (...a) => logs.push(a)
const team = ['gabriel@acme.example', 'alicia@acme.example', 'riley@acme.example', 'sam@acme.example', 'alex@acme.example', 'leo@acme.example']
const access = createAccessControl({ client, allowedUsers: team, log })
const hu = createHeadsUp({ client, config, access, log })
const start = Date.now() + 30 * 60000
const texts = (m) => m.blocks.map((b) => b.text?.text ?? b.elements?.map((e) => e.text?.text ?? e.text).join(' | ') ?? '')
const buttons = (m) => m.blocks.flatMap((b) => (b.type === 'actions' ? b.elements : b.accessory ? [b.accessory] : []))
const button = (m, id) => buttons(m).find((e) => e.action_id === id)
const press = (msg, id, url) => hu.handleAction({ channel: { id: msg.channel }, message: { ts: msg.ts }, actions: [{ value: buttons(msg.m)[0].value }] }, { action_id: id, url })
const pick = (msg, item, value, url) => hu.handleAction({ channel: { id: msg.channel }, message: { ts: msg.ts, blocks: msg.m.blocks }, actions: [{ selected_option: { value } }] }, { action_id: `hu_menu:${item}`, selected_option: { value, ...(url ? { url } : {}) } })
const lastUpdate = () => calls.filter(([k]) => k === 'update').at(-1)[1]

// 1. Gabriel's card (direction 2a): countdown + Join, his item with a timestamp button and ✓ / ✎, then a ⋮ menu per other item
let r = await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })
assert.equal(r.posted, true)
const card = calls[0][1]
const t = texts(card)
console.log(t.join('\n'))
assert.equal(t[0], '*30 min · Weekly Product Sync*'); assert.match(t[1], /^Starts at <!date.* on Teams · 6 action items from last week$/)
assert.deepEqual([card.blocks[0].accessory.text.text, card.blocks[0].accessory.style, card.blocks[0].accessory.url], ['Join Teams', 'primary', config.demoJoinUrl])
assert.equal(card.blocks[2].type, 'divider')
assert.equal(t[3], '*Forecast update*'); assert.match(t[4], /^You · Rerun the Q1 forecast/); assert.equal(card.blocks[4].type, 'context')
assert.equal(card.blocks[3].accessory.text.text, '14:32', 'no ▶ arrow on the timestamp button')
assert.equal(t[5], '✓ | ✎')
assert.ok(buttons(card).filter((b) => ['✓', '✎'].includes(b.text?.text)).every((b) => b.accessibility_label?.length <= 75 && /Mark done|Not right/.test(b.accessibility_label)))
assert.equal(card.blocks[6].type, 'divider')
assert.equal(t[7], '*Pricing page copy*'); assert.match(t[8], /^Alex Kim · Send Rishabh/)
assert.deepEqual(card.blocks[7].accessory.options.map((o) => [o.text.text, o.value]), [['Play at 41:52', 'play'], ['Not right', 'flag']])
for (const name of ['Rishabh', 'Alicia', 'Varun', 'Aryan']) assert.ok(t.some((x) => x.startsWith(`${name} · `)), name)
assert.equal(card.blocks.at(-4).type, 'divider')
assert.equal(t.at(-3), 'Open last meeting | Mute series | Not useful')
assert.match(t.at(-2), /^:lock: _Only you can see this\. Built from last week's recording, which everyone on the invite can open, with no new AI processing\._$/)
assert.match(t.at(-1), /^\*Why am I seeing this\?\* You're on the invite for Weekly Product Sync\./)
assert.equal(buttons(card).filter((b) => b.style === 'primary').length, 1, 'Join is the one green button until something is done')
assert.ok(!JSON.stringify(card).includes('▶'), 'no ▶ anywhere')
assert.ok(card.blocks.length <= 50 && buttons(card).every((b) => (b.value ?? '').length < 2000))
assert.ok(card.blocks.flatMap((b) => b.accessory?.options ?? []).every((o) => o.value.length <= 150), 'menu values within Slack\'s 150-char limit')
console.log('ok  card layout')

// 2. Who gets a card: everyone on the invite (including someone new to the series); not holdout, no-Slack or external
for (const [p, posted, reason] of [['riley', true], ['sam', false, 'Holdout (measured, no card)'], ['alex', false, 'Slack not connected'], ['leo', false, 'External guest']]) {
  r = await hu.post({ persona: p, sid: 'wps', slackUser: `${p}@acme.example`, startMs: start })
  assert.equal(r.posted, posted, p); if (!posted) assert.equal(r.result.reason, reason)
}
assert.ok(logs.some(([e, p]) => e === 'card_suppressed' && p === 'sam'), 'holdout logs card_suppressed')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'dr', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'No record of last meeting')
const riley = calls.filter(([k]) => k === 'post').at(-1)[1]
assert.ok(!texts(riley).some((x) => x.includes('YOURS')), 'someone with no items sees only other people\'s rows')
assert.equal(riley.blocks.filter((b) => b.type === 'divider').length, 2, 'no yours/others divider when nothing is yours')
console.log('ok  who gets a card')

// 3. Card buttons, each with Undo
const msg = { channel: 'D_UGABRIEL01', ts: '1', m: card }
let m
await press(msg, 'hu_done:a2'); m = lastUpdate()
assert.equal(texts(m)[3], '*Forecast update* · _Done_'); assert.equal(texts(m)[5], '✓'); assert.equal(m.blocks[5].elements[0].style, 'primary')
await press(msg, 'hu_done_undo:a2'); assert.equal(texts(lastUpdate())[5], '✓ | ✎')
await press(msg, 'hu_flag:a2'); m = lastUpdate()
assert.equal(texts(m)[5], '✓ | ✎ Flagged'); assert.ok(texts(m).includes("What's wrong with *Forecast update*?"))
await press(msg, 'hu_flag_reason:a2:already_done'); m = lastUpdate()
assert.equal(texts(m)[3], '*Forecast update* · _Flagged: Already done_'); assert.ok(!texts(m).includes('Wrong owner | Not a real item | Already done'))
await press(msg, 'hu_flag_undo:a2'); assert.equal(texts(lastUpdate())[5], '✓ | ✎')
await pick(msg, 'a3', 'flag'); m = lastUpdate()
assert.ok(texts(m).includes("What's wrong with *Pricing page copy*?") && texts(m).includes('Wrong owner | Not a real item | Already done'))
const rowA3 = m.blocks.find((x) => x.accessory?.action_id === 'hu_menu:a3')
assert.equal(rowA3.accessory.options[1].text.text, 'Undo Not right')
await press(msg, 'hu_flag_reason:a3:wrong_owner'); assert.ok(texts(lastUpdate()).includes('*Pricing page copy* · _Flagged: Wrong owner_'))
await pick(msg, 'a3', 'flag_undo'); assert.ok(texts(lastUpdate()).includes('*Pricing page copy*'))
assert.match(await pick(msg, 'a3', 'play'), /`41:52` \*Alex Kim\*/, '⋮ Play without a prototype link quotes the line')
assert.equal(await pick(msg, 'a3', 'play', 'https://proto.example/#x'), null)
await press(msg, 'hu_nu'); m = lastUpdate()
assert.ok(texts(m).includes('Thanks. What was off?') && texts(m).includes('Already knew this | Wrong meeting | Bad timing | Undo') && texts(m).includes('Open last meeting | Mute series'))
await press(msg, 'hu_nu_reason:bad_timing'); assert.ok(texts(lastUpdate()).includes('Thanks for the feedback.'))
await press(msg, 'hu_nu_undo'); assert.ok(texts(lastUpdate()).includes('Open last meeting | Mute series | Not useful'))
await press(msg, 'hu_mute'); m = lastUpdate()
assert.match(texts(m)[0], /^\*Muted Weekly Product Sync\*\nYou won't get Heads-Up for this series\. Starts in 30 min$/); assert.equal(texts(m)[1], 'Join Teams | Undo')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'Series muted')
await press(msg, 'hu_mute_undo'); assert.equal(texts(lastUpdate())[0], '*30 min · Weekly Product Sync*')
const quote = await press(msg, 'hu_play:a2')
assert.match(quote, /`14:32` \*Alicia\*  Gabriel, can you update the Q1 forecast/)
assert.equal(await press(msg, 'hu_play:a2', 'https://proto.example/#x'), null, 'with a prototype link, the timestamp just opens it')
assert.match(await press(msg, 'hu_open_last'), /\*Action items\*/)
await press(msg, 'hu_join')
const ev = logs.map(([e, , d]) => `${e} ${d}`)
for (const e of ['mark_done', 'mark_done_undone', 'item_flagged', 'item_flag_reason', 'item_flag_undone', 'not_useful', 'not_useful_reason', 'not_useful_undone', 'mute_series', 'mute_undone', 'timestamp_tap', 'open_last_meeting', 'card_shown']) assert.ok(ev.some((x) => x.startsWith(e + ' ')), e)
assert.ok(ev.includes('join_tap Teams · joinedPrepared=true'), 'joinedPrepared after a timestamp tap or Mark done')
console.log('ok  card buttons + events')

// 4. Countdown states: posted → starting soon → started → ended
const entry = (startMs) => ({ persona: 'gabriel', sid: 'wps', startMs, joinUrl: config.demoJoinUrl, postMs: startMs - 30 * 60000, data: hu.evaluate('gabriel', 'wps', { startMs }).result.data, ui: { muted: false, notUseful: null, done: {}, flags: {}, whyOpen: false } })
const now = Date.now()
assert.deepEqual(['posted', 'starting-soon', 'started', 'ended'], [now + 20 * 60000, now + 4 * 60000, now - 60000, now - 51 * 60000].map((s) => cardState(now, s, 50)))
let c = buildCard(entry(now + 4 * 60000), { nowMs: now })
assert.match(c.blocks[0].text.text, /^\*4 min · Weekly Product Sync\*/); assert.equal(c.blocks[0].accessory.text.text, 'Join Teams')
c = buildCard(entry(now - 60000), { nowMs: now })
assert.equal(c.blocks[0].text.text, '*Live · Weekly Product Sync*'); assert.match(c.blocks[1].elements[0].text, /^Started at/); assert.equal(c.blocks[0].accessory.text.text, 'Join now')
c = buildCard(entry(now - 51 * 60000), { nowMs: now })
assert.equal(c.blocks[0].text.text, '*Ended · Weekly Product Sync*'); assert.match(c.blocks[1].elements[0].text, /^New summary in about 6 min/); assert.equal(c.blocks[0].accessory, undefined, 'Join is off after the meeting')
assert.equal(fmtStamp(872), '14:32')
c = buildCard(entry(now + 20 * 60000), { nowMs: now, prototypeUrl: 'https://proto.example/' })
assert.equal(button(c, 'hu_play:a2').url, 'https://proto.example/#ansel/wps-1106/transcript/14:32/a2')
assert.equal(c.blocks.find((x) => x.accessory?.action_id === 'hu_menu:a3').accessory.options[0].url, 'https://proto.example/#ansel/wps-1106/transcript/41:52/a3')
console.log('ok  countdown states + deep links')

// 5. Restart safety: a press on a card this process didn't post rebuilds it, and keeps mutes
const hu2 = createHeadsUp({ client, config, access, log })
const value = button(card, 'hu_mute').value
await hu2.handleAction({ channel: { id: 'D9' }, message: { ts: '9' }, actions: [{ value }] }, { action_id: 'hu_done:a2' })
assert.equal(texts(lastUpdate())[5], '✓')
await hu2.handleAction({ channel: { id: 'D9' }, message: { ts: '9' }, actions: [{ value }] }, { action_id: 'hu_mute' })
hu2.entryFor({ channel: { id: 'D8' }, message: { ts: '8' }, actions: [{ value }] })
const hu4 = createHeadsUp({ client, config, access, log })
await hu4.handleAction({ channel: { id: 'D7' }, message: { ts: '7', blocks: card.blocks }, actions: [{ selected_option: { value: 'flag' } }] }, { action_id: 'hu_menu:a4', selected_option: { value: 'flag' } })
assert.ok(texts(lastUpdate()).includes("What's wrong with *QA estimate*?"), 'a ⋮ menu press after a restart rebuilds the card from its buttons')
assert.equal(hu2.evaluate('gabriel', 'wps').result.reason, 'Series muted')
console.log('ok  restart-safe actions')
