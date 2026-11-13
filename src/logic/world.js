// Merge in-memory demo state (status updates, tracked changes, mutes, settings) over the seed.
import { SEED } from '../data/seed.js'

export function buildWorld(state = {}) {
  const { itemUpdates = {}, edits = {}, itemEdits = {}, muted = {}, reminder = {} } = state

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
      let next = a
      if (u) {
        next = { ...a, update: u, confirmed: true }
        if (u.kind === 'done') next.status = 'done'
        if (u.kind === 'new_date') next.due = u.due
        if (u.kind === 'reassign') next.owner = u.owner
      }
      // Edit from the Heads-Up card or item panel: a tracked change that keeps the original.
      const e = itemEdits[a.id]
      if (e) {
        next = {
          ...next,
          ...(e.text ? { text: e.text, short: e.text } : {}),
          ...(e.owner ? { owner: e.owner } : {}),
          ...(e.due ? { due: e.due } : {}),
          itemEdit: { by: e.by, on: e.on, atSec: e.atSec, original: { text: a.text, owner: a.owner, due: a.due } },
        }
      }
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

/**
 * An item's edit after new changes, as the fields that differ from the original seed item
 * (text, owner, due), or null when every field is back to the original (no longer Edited).
 */
export function mergeItemEdit(prev = {}, changes = {}, original = {}) {
  const { by, on, atSec, ...was } = prev
  const fields = { ...was, ...changes }
  for (const k of Object.keys(fields)) if (fields[k] === original[k]) delete fields[k]
  return Object.keys(fields).length ? fields : null
}
