// Checks buildHeadsUp against the expected per-persona table (PRD Section 5)
// and the transcript spacing rule (Section 6). Run: npm test
import assert from 'node:assert/strict'
import { SEED } from '../src/data/seed.js'
import { TRANSCRIPTS } from '../src/data/transcripts.js'
import { buildHeadsUp } from '../src/logic/buildHeadsUp.js'
import { buildWorld } from '../src/logic/world.js'

const world = buildWorld()
const now = { date: '2026-11-13', sec: 13.5 * 3600 }
const run = (pid, sid) => buildHeadsUp(world.person(pid), SEED.series.find((s) => s.id === sid), now, world)

const expected = {
  wps: { maya: true, jordan: 'Nothing for you from recent meetings', sam: 'Holdout (measured, no card)', dana: 'Nothing for you from recent meetings', alex: 'Slack not connected', riley: 'No meetings attended in this series', leo: 'External guest' },
  dr: { maya: 'No record of last meeting', jordan: 'No record of last meeting' },
}
for (const [sid, rows] of Object.entries(expected)) {
  for (const [pid, exp] of Object.entries(rows)) {
    const r = run(pid, sid)
    if (exp === true) assert.equal(r.eligible, true, `${pid}/${sid} should be eligible`)
    else assert.deepEqual([r.eligible, r.reason], [false, exp], `${pid}/${sid}`)
    console.log(`ok  ${sid.padEnd(3)} ${pid.padEnd(6)} ${r.eligible ? 'card' : r.reason}`)
  }
}

const maya = run('maya', 'wps')
assert.deepEqual(maya.items.map((i) => [i.section, i.id, i.t]), [['own', 'a2', '14:32'], ['open', 'q2', '27:05'], ['decided', 'd3', '41:18']])
assert.equal(maya.items[0].text, 'Forecast update')
assert.equal(maya.items[0].dueLabel, 'due Thu')
assert.equal(maya.items[0].hedge, true)
assert.equal(maya.items[2].edited, true)
assert.equal(maya.recordsRead, 3)
console.log('ok  maya card items + cost:', maya.cost)

// Muted series and done item
const w2 = buildWorld({ muted: { 'maya:wps': true } })
assert.equal(buildHeadsUp(w2.person('maya'), SEED.series[0], now, w2).reason, 'Series muted')
const w3 = buildWorld({ itemUpdates: { a2: { kind: 'done' } } })
const r3 = buildHeadsUp(w3.person('maya'), SEED.series[0], now, w3)
assert.ok(r3.items.length <= 3 && !r3.items.some((i) => i.id === 'a2'))
console.log('ok  mute + done exclusion')

for (const [id, segs] of Object.entries(TRANSCRIPTS)) {
  if (id === 'wps-1106') {
    for (let i = 1; i < segs.length; i++) assert.ok(segs[i].sec - segs[i - 1].sec <= 60, `${id} gap at ${segs[i].t}`)
    assert.ok(segs[0].sec <= 60 && 48 * 60 - segs.at(-1).sec <= 60)
  }
  console.log(`ok  transcript ${id}: ${segs.length} segments`)
}
