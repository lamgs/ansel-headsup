// Checks buildHeadsUp against the expected per-persona table (PRD Section 5)
// and the transcript spacing rule (Section 6). Run: npm test
import assert from 'node:assert/strict'
import { SEED, SEED_COMMENTS } from '../src/data/seed.js'
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

// Themes: start/end are real transcript lines, ranges are in order and don't overlap,
// and every linked item is cited inside its theme's range.
for (const inst of SEED.instances) {
  const segs = TRANSCRIPTS[inst.id]
  const times = new Set(segs.map((s) => s.t))
  const sec = (t) => segs.find((s) => s.t === t).sec
  const items = [...inst.decisions, ...inst.openQuestions, ...inst.actionItems]
  let prevEnd = -1
  for (const th of inst.themes) {
    assert.ok(times.has(th.start) && times.has(th.end), `${inst.id} ${th.id} range must start/end on transcript lines`)
    assert.ok(sec(th.start) > prevEnd && sec(th.end) >= sec(th.start), `${inst.id} ${th.id} out of order`)
    prevEnd = sec(th.end)
    for (const id of th.items) {
      const it = items.find((x) => x.id === id)
      assert.ok(it, `${th.id} links unknown item ${id}`)
      assert.ok(times.has(it.t) && sec(it.t) >= sec(th.start) && sec(it.t) <= sec(th.end), `${id} (${it.t}) outside ${th.id}`)
    }
  }
  for (const it of items) assert.ok(times.has(it.t), `${inst.id} item ${it.id} cites ${it.t}, which has no transcript line`)
  console.log(`ok  themes ${inst.id}: ${inst.themes.length}`)
}
for (const key of Object.keys(SEED_COMMENTS)) {
  const [, instId, ...t] = key.split(':')
  assert.ok(TRANSCRIPTS[instId].some((s) => s.t === t.join(':')), `seed comment ${key} has no line`)
}
const nov6Text = TRANSCRIPTS['wps-1106'].map((s) => s.text)
assert.equal(new Set(nov6Text).size, nov6Text.length, 'wps-1106 transcript repeats a line')
console.log('ok  seed comments + no repeated transcript lines')

for (const [id, segs] of Object.entries(TRANSCRIPTS)) {
  if (id === 'wps-1106') {
    for (let i = 1; i < segs.length; i++) assert.ok(segs[i].sec - segs[i - 1].sec <= 60, `${id} gap at ${segs[i].t}`)
    assert.ok(segs[0].sec <= 60 && 48 * 60 - segs.at(-1).sec <= 60)
  }
  console.log(`ok  transcript ${id}: ${segs.length} segments`)
}
