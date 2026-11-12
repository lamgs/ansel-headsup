// Offline checks for the Slack Heads-Up card (contract 2.0, matching card/heads-up-card.js):
// layout, who gets a card, every card button, countdown states and restart safety.
// Fake Slack client: no tokens or network. Run: node test/card.mjs
import assert from 'node:assert/strict'
import { buildCard, cardState, timeBar, fmtStamp } from '../src/card.js'
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
const lastUpdate = () => calls.filter(([k]) => k === 'update').at(-1)[1]

// 1. Gabriel's card: countdown + Join, his item first with YOURS, then everyone else's with owners
let r = await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })
assert.equal(r.posted, true)
const card = calls[0][1]
const t = texts(card)
console.log(t.join('\n'))
assert.equal(card.blocks[0].type, 'header'); assert.equal(card.blocks[0].text.text, 'Weekly Product Sync')
assert.match(t[1], /^\*30 min\*\nStarts at <!date.* on Teams · 6 action items from last week$/)
assert.deepEqual([card.blocks[1].accessory.text.text, card.blocks[1].accessory.style, card.blocks[1].accessory.url], ['Join Teams', 'primary', config.demoJoinUrl])
assert.match(t[3], /^\*Forecast update\*   `YOURS`\nRerun the Q1 forecast/)
assert.equal(t[4], '▶ 14:32 | Mark done | Not right')
assert.equal(card.blocks[5].type, 'divider')
assert.match(t[6], /^\*Pricing page copy\*  ·  Alex Kim\n/)
assert.equal(t[7], '▶ 41:52 | Not right', 'no Mark done or status on other people\'s rows')
for (const name of ['Rishabh', 'Alicia', 'Varun', 'Aryan']) assert.ok(t.some((x) => x.includes(`·  ${name}`)), name)
assert.equal(t.at(-3), 'Open last meeting | Mute series | Not useful')
assert.match(t.at(-2), /Only you can see this\. Built from last week's recording, which everyone on the invite can open, with no new AI processing\./)
assert.equal(t.at(-1), 'Why am I seeing this?')
assert.equal(buttons(card).filter((b) => b.style === 'primary').length, 1, 'Join is the one green button')
assert.ok(card.blocks.length <= 50 && buttons(card).every((b) => b.value.length < 2000))
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
assert.ok(!riley.blocks.some((b) => b.type === 'divider'))
console.log('ok  who gets a card')

// 3. Card buttons, each with Undo
const msg = { channel: 'D_UGABRIEL01', ts: '1', m: card }
let m
await press(msg, 'hu_done:a2'); m = lastUpdate()
assert.match(texts(m)[3], /^✓ \*Forecast update\*   `YOURS`[\s\S]*_Done_$/); assert.equal(texts(m)[4], '▶ 14:32 | ✓ Done')
await press(msg, 'hu_done_undo:a2'); assert.equal(texts(lastUpdate())[4], '▶ 14:32 | Mark done | Not right')
await press(msg, 'hu_flag:a3'); m = lastUpdate()
assert.ok(texts(m).includes("What's wrong with *Pricing page copy*?") && texts(m).includes('Wrong owner | Not a real item | Already done'))
await press(msg, 'hu_flag_reason:a3:wrong_owner'); m = lastUpdate()
assert.ok(texts(m).some((x) => x.endsWith('_Flagged: Wrong owner_')) && texts(m).includes('▶ 41:52 | Flagged') && !texts(m).includes('Wrong owner | Not a real item | Already done'))
await press(msg, 'hu_flag_undo:a3'); assert.ok(texts(lastUpdate()).includes('▶ 41:52 | Not right'))
await press(msg, 'hu_nu'); m = lastUpdate()
assert.ok(texts(m).includes('Thanks. What was off?') && texts(m).includes('Already knew this | Wrong meeting | Bad timing | Undo') && texts(m).includes('Open last meeting | Mute series'))
await press(msg, 'hu_nu_reason:bad_timing'); assert.ok(texts(lastUpdate()).includes('Thanks for the feedback.'))
await press(msg, 'hu_nu_undo'); assert.ok(texts(lastUpdate()).includes('Open last meeting | Mute series | Not useful'))
await press(msg, 'hu_why'); assert.match(lastUpdate().blocks.at(-1).text.text, /^>You're on the invite for Weekly Product Sync\./)
await press(msg, 'hu_why'); assert.equal(texts(lastUpdate()).at(-1), 'Why am I seeing this?')
await press(msg, 'hu_mute'); m = lastUpdate()
assert.match(texts(m)[0], /^\*Muted Weekly Product Sync\*\nYou won't get Heads-Up for this series\. Starts in 30 min$/); assert.equal(texts(m)[1], 'Join Teams | Undo')
assert.equal((await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })).result.reason, 'Series muted')
await press(msg, 'hu_mute_undo'); assert.equal(lastUpdate().blocks[0].type, 'header')
const quote = await press(msg, 'hu_play:a2')
assert.match(quote, /`14:32` \*Alicia\*  Gabriel, can you update the Q1 forecast/)
assert.equal(await press(msg, 'hu_play:a2', 'https://proto.example/#x'), null, 'with a prototype link, ▶ just opens it')
assert.match(await press(msg, 'hu_open_last'), /\*Action items\*/)
await press(msg, 'hu_join')
const ev = logs.map(([e, , d]) => `${e} ${d}`)
for (const e of ['mark_done', 'mark_done_undone', 'item_flagged', 'item_flag_reason', 'item_flag_undone', 'not_useful', 'not_useful_reason', 'not_useful_undone', 'why_opened', 'mute_series', 'mute_undone', 'timestamp_tap', 'open_last_meeting', 'card_shown']) assert.ok(ev.some((x) => x.startsWith(e + ' ')), e)
assert.ok(ev.includes('join_tap Teams · joinedPrepared=true'), 'joinedPrepared after ▶ or Mark done')
console.log('ok  card buttons + events')

// 4. Countdown states: posted → starting soon → started → ended
const entry = (startMs) => ({ persona: 'gabriel', sid: 'wps', startMs, joinUrl: config.demoJoinUrl, postMs: startMs - 30 * 60000, data: hu.evaluate('gabriel', 'wps', { startMs }).result.data, ui: { muted: false, notUseful: null, done: {}, flags: {}, whyOpen: false } })
const now = Date.now()
assert.deepEqual(['posted', 'starting-soon', 'started', 'ended'], [now + 20 * 60000, now + 4 * 60000, now - 60000, now - 51 * 60000].map((s) => cardState(now, s, 50)))
let c = buildCard(entry(now + 4 * 60000), { nowMs: now })
assert.match(c.blocks[1].text.text, /^\*4 min\*  ·  starting soon/); assert.equal(c.blocks[1].accessory.text.text, 'Join Teams')
c = buildCard(entry(now - 60000), { nowMs: now })
assert.match(c.blocks[1].text.text, /^\*Live\*\nStarted at/); assert.equal(c.blocks[1].accessory.text.text, 'Join now')
c = buildCard(entry(now - 51 * 60000), { nowMs: now })
assert.match(c.blocks[1].text.text, /^\*Ended\*\nNew summary in about 6 min/); assert.equal(c.blocks[1].accessory, undefined, 'Join is off after the meeting')
assert.equal(timeBar(now, now - 15 * 60000, now + 15 * 60000), '▰▰▰▰▰▱▱▱▱▱'); assert.equal(fmtStamp(872), '14:32')
c = buildCard(entry(now + 20 * 60000), { nowMs: now, prototypeUrl: 'https://proto.example/' })
assert.equal(button(c, 'hu_play:a2').url, 'https://proto.example/#ansel/wps-1106/transcript/14:32/a2')
console.log('ok  countdown states + deep links')

// 5. Restart safety: a press on a card this process didn't post rebuilds it, and keeps mutes
const hu2 = createHeadsUp({ client, config, access, log })
const value = button(card, 'hu_mute').value
await hu2.handleAction({ channel: { id: 'D9' }, message: { ts: '9' }, actions: [{ value }] }, { action_id: 'hu_done:a2' })
assert.equal(texts(lastUpdate())[4], '▶ 14:32 | ✓ Done')
await hu2.handleAction({ channel: { id: 'D9' }, message: { ts: '9' }, actions: [{ value }] }, { action_id: 'hu_mute' })
hu2.entryFor({ channel: { id: 'D8' }, message: { ts: '8' }, actions: [{ value }] })
assert.equal(hu2.evaluate('gabriel', 'wps').result.reason, 'Series muted')
console.log('ok  restart-safe actions')
