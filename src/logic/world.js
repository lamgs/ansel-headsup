// Merge in-memory demo state (status updates, tracked changes, mutes, settings) over the seed.
import { SEED } from '../data/seed.js'

export function buildWorld(state = {}) {
  const { itemUpdates = {}, edits = {}, muted = {}, reminder = {} } = state

  const applyEdit = (x) => {
    const e = edits[x.id]
    if (!e) return x
    const original = x.trackedChange?.original ?? x.text
    return { ...x, text: e.text, trackedChange: { by: e.by, on: e.on, original, previous: x.text } }
  }

  const instances = SEED.instances.map((inst) => ({
    ...inst,
    decisions: inst.decisions.map(applyEdit),
    openQuestions: inst.openQuestions.map(applyEdit),
    actionItems: inst.actionItems.map((a) => {
      const u = itemUpdates[a.id]
      if (!u) return a
      const next = { ...a, update: u, confirmed: true }
      if (u.kind === 'done') next.status = 'done'
      if (u.kind === 'new_date') next.due = u.due
      if (u.kind === 'reassign') next.owner = u.owner
      return next
    }),
  }))

  const people = SEED.people.map((p) => (reminder[p.id] ? { ...p, reminderMinutes: reminder[p.id] } : p))

  return {
    workspace: SEED.workspace,
    people,
    series: SEED.series,
    instances,
    person: (id) => people.find((p) => p.id === id),
    instance: (id) => instances.find((i) => i.id === id),
    isMuted: (uid, sid) => !!muted[`${uid}:${sid}`],
  }
}

export function findItem(world, id) {
  for (const inst of world.instances) {
    for (const [kind, list] of [['decision', inst.decisions], ['question', inst.openQuestions], ['action', inst.actionItems]]) {
      const it = list.find((x) => x.id === id)
      if (it) return { item: it, kind, inst }
    }
  }
  return null
}
