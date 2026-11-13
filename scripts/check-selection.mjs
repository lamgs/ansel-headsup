// Checks buildHeadsUp against the expected per-persona table (PRD Section 5)
// and the transcript spacing rule (Section 6). Run: npm test
import assert from 'node:assert/strict'
import { SEED, SEED_COMMENTS } from '../src/data/seed.js'
import { TRANSCRIPTS } from '../src/data/transcripts.js'
import { SUMMARIES } from '../src/data/summaries.js'
import { buildHeadsUp } from '../src/logic/buildHeadsUp.js'
import { buildWorld, mergeItemEdit } from '../src/logic/world.js'
import { buildCardData } from '../src/logic/buildCardData.js'

const world = buildWorld()
const now = { date: '2026-11-13', sec: 13.5 * 3600 }
const run = (pid, sid) => buildHeadsUp(world.person(pid), SEED.series.find((s) => s.id === sid), now, world)

const expected = {
  wps: { gabriel: true, alicia: true, rishabh: true, varun: true, aryan: true },
  dr: { gabriel: 'No record of last meeting', alicia: 'No record of last meeting' },
}
for (const [sid, rows] of Object.entries(expected)) {
  for (const [pid, exp] of Object.entries(rows)) {
    const r = run(pid, sid)
    if (exp === true) assert.equal(r.eligible, true, `${pid}/${sid} should be eligible`)
    else assert.deepEqual([r.eligible, r.reason], [false, exp], `${pid}/${sid}`)
    console.log(`ok  ${sid.padEnd(3)} ${pid.padEnd(6)} ${r.eligible ? 'card' : r.reason}`)
  }
}

const gabriel = run('gabriel', 'wps')
assert.deepEqual(gabriel.items.map((i) => [i.section, i.id, i.t]), [['own', 'a2', '14:32'], ['open', 'q2', '27:05'], ['decided', 'd3', '41:18']])
assert.equal(gabriel.items[0].text, 'Forecast update')
assert.equal(gabriel.items[0].dueLabel, 'due Thu')
assert.equal(gabriel.items[0].hedge, true)
assert.equal(gabriel.items[2].edited, true)
assert.equal(gabriel.recordsRead, 3)
console.log('ok  gabriel card items + cost:', gabriel.cost)

// Every team member's "You own" line is their own item (profiles.md)
for (const [pid, id, text] of [['alicia', 'a3', 'Pricing page copy'], ['rishabh', 'a4', 'QA estimate'], ['varun', 'a6', 'Pricing config update'], ['aryan', 'a7', 'Payment flow test plan']]) {
  const r = run(pid, 'wps')
  assert.deepEqual([r.items[0].section, r.items[0].id, r.items[0].text], ['own', id, text], pid)
  assert.deepEqual(r.items.slice(1).map((i) => i.id), ['q2', 'd3'], pid)
  console.log(`ok  ${pid} card: ${r.items.map((i) => i.text).join(' / ')}`)
}

// No one in the cast is in the holdout or lacks Slack, but those rules still apply.
assert.equal(buildHeadsUp({ ...world.person('gabriel'), holdout: true }, SEED.series[0], now, world).reason, 'Holdout (measured, no card)')
assert.equal(buildHeadsUp({ ...world.person('gabriel'), slack: false }, SEED.series[0], now, world).reason, 'Slack not connected')
assert.equal(buildHeadsUp({ ...world.person('gabriel'), org: 'external' }, SEED.series[0], now, world).reason, 'External guest')
assert.equal(buildHeadsUp({ ...world.person('gabriel'), id: 'newbie' }, SEED.series[0], now, world).reason, 'No meetings attended in this series')
console.log('ok  holdout, no-Slack, external-guest and new-member rules (stand-in users)')

// Muted series and done item
const w2 = buildWorld({ muted: { 'gabriel:wps': true } })
assert.equal(buildHeadsUp(w2.person('gabriel'), SEED.series[0], now, w2).reason, 'Series muted')
const w3 = buildWorld({ itemUpdates: { a2: { kind: 'done' } } })
const r3 = buildHeadsUp(w3.person('gabriel'), SEED.series[0], now, w3)
assert.ok(r3.items.length <= 3 && !r3.items.some((i) => i.id === 'a2'))
console.log('ok  mute + done exclusion')

// Edits from the Heads-Up card / item panel: applied over the seed, original kept for the audit trail
const we = buildWorld({ itemEdits: { a2: { text: 'Forecast with beta cohort', due: '2026-11-16', by: 'gabriel', on: '2026-11-13', atSec: 0 } } })
const a2 = we.instance('wps-1106').actionItems.find((x) => x.id === 'a2')
assert.deepEqual([a2.text, a2.short, a2.due, a2.owner], ['Forecast with beta cohort', 'Forecast with beta cohort', '2026-11-16', 'gabriel'])
assert.deepEqual(a2.itemEdit.original, { text: 'Update Q1 forecast with new conversion numbers', owner: 'gabriel', due: '2026-11-12' })
assert.equal(we.instance('wps-1106').actionItems.find((x) => x.id === 'a3').itemEdit, undefined)
console.log('ok  audited action item edits keep the original')

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
  const linked = new Set(inst.themes.flatMap((th) => th.items))
  for (const it of items) assert.ok(linked.has(it.id), `${inst.id} item ${it.id} isn't linked to any theme`)
  console.log(`ok  themes ${inst.id}: ${inst.themes.length}`)
}
// Summary text: every recorded meeting has an overview, every decision and question has a
// context line, and no context refers to an item that isn't in that meeting.
for (const inst of SEED.instances.filter((i) => i.recorded)) {
  const text = SUMMARIES[inst.id]
  assert.ok(text?.overview?.trim(), `${inst.id} has no summary overview`)
  const ids = [...inst.decisions, ...inst.openQuestions].map((x) => x.id)
  for (const id of ids) assert.ok(text.context?.[id]?.trim(), `${inst.id} ${id} has no context line`)
  for (const id of Object.keys(text.context || {})) assert.ok(ids.includes(id), `${inst.id} context for unknown item ${id}`)
}
console.log('ok  summary overview + context lines')
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

// Heads-Up card: acting on your own item (Mark done, On track, New date, Edit wording/due) never
// removes a row, including items carried over from earlier meetings, and Mark done shows as done.
{
  const wps = SEED.series.find((s) => s.id === 'wps')
  const rows = (st, pid) => { const w = buildWorld(st); return buildCardData(w.person(pid), wps, { ...w, isMuted: () => false }, { maxRows: Infinity, keepMarkedDone: true }).data.actionItems.items }
  for (const pid of wps.invitees) {
    const base = rows({}, pid)
    const order = base.map((i) => i.id).join()
    for (const it of base.filter((i) => i.owner.id === pid)) {
      for (const kind of ['done', 'on_track', 'new_date']) {
        const after = rows({ itemUpdates: { [it.id]: { kind, due: '2026-11-20' } } }, pid)
        assert.equal(after.map((i) => i.id).join(), order, `${pid}: ${kind} on ${it.id} changed the card's rows`)
        if (kind === 'done') assert.ok(after.find((i) => i.id === it.id).done, `${pid}: ${it.id} not shown as done`)
      }
      const edited = rows({ itemEdits: { [it.id]: { text: 'Reworded', due: '2026-11-20' } } }, pid)
      assert.equal(edited.map((i) => i.id).join(), order, `${pid}: editing ${it.id} changed the card's rows`)
    }
  }
  console.log('ok  heads-up card keeps every row when you act on your items')
}

// Editing an item back to its original wording/owner/due clears the Edited tag.
{
  const a12 = SEED.instances.flatMap((i) => i.actionItems).find((a) => a.id === 'a12')
  const e1 = mergeItemEdit(undefined, { text: 'Billing alerts v2' }, a12)
  assert.deepEqual(e1, { text: 'Billing alerts v2' })
  const e2 = mergeItemEdit({ ...e1, by: 'varun', on: '2026-11-13', atSec: 1 }, { due: '2026-11-20' }, a12)
  assert.deepEqual(e2, { text: 'Billing alerts v2', due: '2026-11-20' })
  assert.deepEqual(mergeItemEdit(e2, { text: a12.text }, a12), { due: '2026-11-20' }, 'wording back to original drops out')
  assert.equal(mergeItemEdit({ due: '2026-11-20' }, { due: a12.due }, a12), null, 'all back to original: not Edited')
  const w = buildWorld({ itemEdits: {} })
  assert.ok(!w.instance('wps-1023').actionItems.find((a) => a.id === 'a12').itemEdit)
  console.log('ok  editing back to the original clears Edited')
}

// Open questions on the Heads-Up card (contract 2.3): every unresolved question from the last
// meeting and the earlier meetings you attended; yours first; older ones flagged as carried over.
{
  const wps = SEED.series.find((s) => s.id === 'wps')
  const qs = (pid) => { const w = buildWorld({}); return buildCardData(w.person(pid), wps, { ...w, isMuted: () => false }, {}).data.openQuestions.items }
  const g = qs('gabriel')
  assert.deepEqual(g.map((q) => q.id), ['q2', 'q3'], 'gabriel: Nov 6 then Oct 30, resolved q1 left off')
  assert.ok(g.every((q) => q.mine), 'gabriel is tagged on both')
  assert.equal(g[0].carriedOver, undefined)
  assert.deepEqual([g[1].carriedOver, g[1].dateLabel, g[1].t], [true, 'Oct 30', '26:05'])
  assert.deepEqual(g[1].stakeholders.map((p) => p.name), ['Gabriel', 'Rishabh'])
  assert.deepEqual(qs('alicia').map((q) => [q.id, !!q.mine]), [['q2', false], ['q3', false]], 'alicia sees both, tagged on neither')
  assert.deepEqual(qs('aryan').map((q) => q.id), ['q2'], "aryan missed Oct 30, so only last meeting's question")
  console.log('ok  heads-up card open questions')
}
