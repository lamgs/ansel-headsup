// Offline checks for Ansel → Slack status sync: signed keys, validation, the HTTP API, card redraws and
// durable state. Fake Slack client; the API listens on a random local port. Run: node test/sync.mjs
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHeadsUp } from '../src/headsup.js'
import { createAccessControl } from '../src/access.js'
import { createStateStore } from '../src/state.js'
import { createApi } from '../src/api.js'
import { signPersona, verifyKey, validateUpdate } from '../src/items.js'
import { parseOrigins, DEFAULT_ORIGINS, loadConfig } from '../src/config.js'

const calls = []
const client = {
  users: { lookupByEmail: async ({ email }) => ({ user: { id: 'U' + email.split('@')[0].toUpperCase() + '01' } }) },
  conversations: { open: async ({ users }) => ({ channel: { id: 'D_' + users } }) },
  chat: {
    postMessage: async (m) => { calls.push(['post', m]); return { ts: String(calls.length) } },
    update: async (m) => { calls.push(['update', m]); return {} },
  },
}
const SECRET = 'test-secret'
const P = 'https://proto.example/'
const ORIGIN = 'https://proto.example'
const config = { prototypeUrl: P, demoJoinUrl: 'https://zoom.us/j/123', reminderMinutes: 30, syncSecret: SECRET, apiAllowedOrigins: [ORIGIN] }
const log = () => {}
const access = createAccessControl({ client, allowedUsers: ['gabriel@acme.example', 'alicia@acme.example'], log })
const dir = mkdtempSync(join(tmpdir(), 'headsup-'))
const file = join(dir, 'state.json')
const start = Date.now() + 30 * 60000
const text = (m) => m.blocks[0].text.text

// 1. Signed keys
const gk = signPersona(SECRET, 'gabriel')
assert.match(gk, /^gabriel\.[A-Za-z0-9_-]{24}$/)
assert.equal(verifyKey(SECRET, gk), 'gabriel')
assert.equal(verifyKey('other-secret', gk), null)
assert.equal(verifyKey(SECRET, gk.replace(/^gabriel/, 'alicia')), null, 'a key is bound to its persona')
assert.equal(verifyKey(SECRET, 'gabriel.'), null)
assert.equal(verifyKey(SECRET, ''), null)
assert.equal(verifyKey('', gk), null, 'no secret, no sync')
assert.equal(signPersona('', 'gabriel'), '')
console.log('ok  signed keys')

// 2. Validation mirrors Ansel's item panel
const v = (id, persona, body, u = {}) => validateUpdate(u, { id, persona, body })
assert.equal(v('a2', 'gabriel', { kind: 'done' }).ok, true)
assert.equal(v('a2', 'alicia', { kind: 'done' }).status, 403, 'only the owner')
assert.equal(v('a1', 'gabriel', { kind: 'done' }).status, 409, 'a1 is already done in the seed')
assert.equal(v('zz', 'gabriel', { kind: 'done' }).status, 404)
assert.equal(v('a2', 'gabriel', { kind: 'nope' }).status, 400)
assert.equal(v('a2', 'gabriel', { kind: 'new_date', due: 'soon' }).status, 400)
assert.equal(v('a2', 'gabriel', { kind: 'new_date', due: '2026-11-20' }).update.due, '2026-11-20')
assert.equal(v('a2', 'gabriel', { kind: 'reassign', owner: 'leo' }).status, 400, 'must be an attendee')
assert.equal(v('a2', 'gabriel', { kind: 'reassign', owner: 'alicia' }).update.owner, 'alicia')
assert.equal(v('a2', 'gabriel', { kind: 'on_track' }, { a2: { kind: 'done' } }).status, 409)
console.log('ok  validation')

// 3. Card links carry the signed key
const hu = createHeadsUp({ client, config, access, log, store: createStateStore(file) })
await hu.post({ persona: 'gabriel', sid: 'wps', slackUser: 'gabriel@acme.example', startMs: start })
const card = calls.at(-1)[1]
const K = `?k=${encodeURIComponent(gk)}`
assert.ok(text(card).includes(`<${P}${K}#t/a2|14:32>`), text(card))
assert.ok(text(card).includes(`<${P}${K}#ansel/wps-1106/actions/|8 more from the team>`))
assert.equal(card.blocks.at(-1).elements.find((e) => e.action_id === 'hu_open_last').url, `${P}${K}#ansel/wps-1106/summary/`)
await hu.post({ persona: 'alicia', sid: 'wps', slackUser: 'alicia@acme.example', startMs: start })
assert.ok(text(calls.at(-1)[1]).includes(`?k=${encodeURIComponent(signPersona(SECRET, 'alicia'))}#t/`), 'each card has its own persona key')
console.log('ok  card links carry the key')

// 4. HTTP API: Mark done in Ansel redraws the Slack card
const api = createApi({ headsUp: hu, config, log })
const port = await api.listen(0, '127.0.0.1')
const url = `http://127.0.0.1:${port}`
const req = (path, { method = 'GET', key, body, origin = ORIGIN } = {}) => fetch(url + path, {
  method,
  headers: { ...(origin ? { origin } : {}), ...(key ? { authorization: `Bearer ${key}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
  body: body ? JSON.stringify(body) : undefined,
})

let res = await req('/api/health')
assert.equal(res.status, 200)
assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN)
res = await req('/api/items', { method: 'OPTIONS' })
assert.equal(res.status, 204)
assert.match(res.headers.get('access-control-allow-headers'), /authorization/)
assert.equal((await req('/api/items', { origin: 'https://evil.example' })).status, 403)
assert.deepEqual(await (await req('/api/items')).json(), { itemUpdates: {} })

assert.equal((await req('/api/items/a2', { method: 'POST', body: { kind: 'done' } })).status, 401, 'no key')
assert.equal((await req('/api/items/a2', { method: 'POST', key: 'gabriel.forged', body: { kind: 'done' } })).status, 401)
assert.equal((await req('/api/items/a2', { method: 'POST', key: signPersona(SECRET, 'alicia'), body: { kind: 'done' } })).status, 403, "can't mark someone else's item")
const updatesBefore = calls.filter(([k]) => k === 'update').length
res = await req('/api/items/a2', { method: 'POST', key: gk, body: { kind: 'done' } })
assert.equal(res.status, 200)
let json = await res.json()
assert.equal(json.itemUpdates.a2.kind, 'done')
assert.equal(json.itemUpdates.a2.by, 'gabriel')
assert.equal(json.cardsUpdated, 2, 'every live card is redrawn')
assert.equal(calls.filter(([k]) => k === 'update').length, updatesBefore + 2)
const gabrielCard = calls.filter(([k, m]) => k === 'update' && m.channel === 'D_UGABRIEL01').at(-1)[1]
assert.match(text(gabrielCard), /• ~Forecast update~ \(<[^>]+\|14:32>\) · _Done_\n• \*Dashboard link\*/, text(gabrielCard))
assert.equal((await req('/api/items/a2', { method: 'POST', key: gk, body: { kind: 'done' } })).status, 409, 'already done')
assert.equal((await (await req('/api/items')).json()).itemUpdates.a2.kind, 'done')
console.log('ok  Mark done in Ansel → card struck through in Slack')

// Undo
res = await req('/api/items/a2', { method: 'DELETE', key: gk })
assert.equal(res.status, 200)
assert.deepEqual((await res.json()).itemUpdates, {})
const reopened = text(calls.filter(([k, m]) => k === 'update' && m.channel === 'D_UGABRIEL01').at(-1)[1])
assert.match(reopened, /• \*Forecast update\* \(/)
assert.ok(!reopened.includes('~'))
assert.equal((await req('/api/items/a2', { method: 'DELETE', key: gk })).status, 409)
assert.equal((await req('/api/items/a2', { method: 'POST', key: gk, body: '{' })).status, 400)
assert.equal((await req('/api/nothing')).status, 404)
console.log('ok  undo + errors')

// 5. Reassign moves the item off the owner's card
await req('/api/items/a8', { method: 'POST', key: gk, body: { kind: 'reassign', owner: 'alicia', note: 'yours now' } })
assert.match(text(calls.filter(([k, m]) => k === 'update' && m.channel === 'D_UGABRIEL01').at(-1)[1]), /You own \*Forecast update\*/)
console.log('ok  reassign')

// 6. Durable: a restarted service keeps the statuses and keeps updating the cards it posted
await req('/api/items/a2', { method: 'POST', key: gk, body: { kind: 'done' } })
await api.close()
const hu2 = createHeadsUp({ client, config, access, log, store: createStateStore(file) })
assert.equal(hu2.itemUpdates().a2.kind, 'done')
assert.equal(hu2.live.size, 2, 'live cards restored')
assert.equal(hu2.evaluate('gabriel', 'wps', { startMs: start }).result.data.actionItems.items.find((i) => i.id === 'a2').done, true)
await hu2.updateItem('a2', 'alicia', { kind: 'done' }) // rejected, no change
const r = await hu2.reopenItem('a2', 'gabriel')
assert.equal(r.cardsUpdated, 2)
hu2.reset()
assert.deepEqual(createStateStore(file).get(), { itemUpdates: {}, muted: {}, cards: [] }, '/headsup reset clears saved state')
console.log('ok  restart keeps statuses + cards; reset clears them')

// 7. Config
assert.deepEqual(parseOrigins(''), DEFAULT_ORIGINS)
assert.deepEqual(parseOrigins('https://a.example/, http://b.example'), ['https://a.example', 'http://b.example'])
const cfg = loadConfig({ STATE_DIRECTORY: '/var/lib/ansel-headsup', SYNC_SECRET: 'x' })
assert.deepEqual([cfg.stateFile, cfg.apiPort, cfg.apiHost, cfg.syncSecret], ['/var/lib/ansel-headsup/state.json', 8787, '127.0.0.1', 'x'])
assert.equal(loadConfig({}).stateFile, '')
assert.equal(loadConfig({ PORT: '3000' }).apiPort, 3000)
console.log('ok  config')

rmSync(dir, { recursive: true, force: true })
