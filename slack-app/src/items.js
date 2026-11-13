// Action item status updates shared by Ansel (the prototype) and the Slack card.
// Pure: validation and signed links only. Storage is state.js; HTTP is api.js.
//
// An update has the same shape the prototype's store uses (src/state/store.jsx UPDATE_ITEM), so
// buildWorld({ itemUpdates }) applies it the same way on both sides:
//   { kind: 'done' | 'on_track' | 'new_date' | 'reassign', due?, owner?, note?, by, at }
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SEED } from '../../src/data/seed.js'

export const KINDS = ['done', 'on_track', 'new_date', 'reassign']

const actionItem = (id) => {
  for (const inst of SEED.instances) {
    const a = inst.actionItems.find((x) => x.id === id)
    if (a) return { item: a, inst }
  }
  return null
}

// --- Signed links -------------------------------------------------------------------------------
// The card's links into Ansel carry ?k=<persona>.<signature>. Ansel sends it back with each update,
// so only someone who received that persona's card can change that persona's items. The prototype
// is a public static site and can't hold a secret, so the link is the credential.

const sig = (secret, persona) => createHmac('sha256', secret).update(`headsup-item-key:${persona}`).digest('base64url').slice(0, 24)

export function signPersona(secret, persona) {
  if (!secret) return ''
  return `${persona}.${sig(secret, persona)}`
}

/** "<persona>.<sig>" → persona, or null if it isn't signed with this secret. */
export function verifyKey(secret, key = '') {
  if (!secret || typeof key !== 'string') return null
  const dot = key.lastIndexOf('.')
  if (dot < 1) return null
  const persona = key.slice(0, dot)
  if (!SEED.people.some((p) => p.id === persona)) return null
  const got = Buffer.from(key.slice(dot + 1))
  const want = Buffer.from(sig(secret, persona))
  return got.length === want.length && timingSafeEqual(got, want) ? persona : null
}

// --- Validation ---------------------------------------------------------------------------------

/**
 * Check an update from `persona` against the same rules as Ansel's item panel (ItemPanel.jsx):
 * only the item's original owner can update it, not once it's done or reassigned.
 * → { ok: true, update } or { ok: false, status, error }
 */
export function validateUpdate(itemUpdates, { id, persona, body = {}, now = new Date() }) {
  const no = (status, error) => ({ ok: false, status, error })
  const found = actionItem(id)
  if (!found) return no(404, 'No such action item')
  const { item, inst } = found
  if (item.owner !== persona) return no(403, 'Only the owner can update this item')
  const current = itemUpdates[id]
  if (item.status === 'done' || current?.kind === 'done') return no(409, 'Already done')
  if (current?.kind === 'reassign') return no(409, 'Already reassigned')

  const kind = body.kind
  if (!KINDS.includes(kind)) return no(400, `kind must be one of ${KINDS.join(', ')}`)
  const update = { kind, by: persona, at: now.toISOString() }
  if (kind === 'new_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.due ?? '') || Number.isNaN(Date.parse(body.due))) return no(400, 'due must be YYYY-MM-DD')
    update.due = body.due
  }
  if (kind === 'reassign') {
    if (!inst.attendees.includes(body.owner) || body.owner === persona) return no(400, 'owner must be another attendee of that meeting')
    update.owner = body.owner
    if (body.note) update.note = String(body.note).slice(0, 280)
  }
  return { ok: true, update }
}

/** Reopen (undo) an item: allowed for its original owner. */
export function validateReopen(itemUpdates, { id, persona }) {
  const found = actionItem(id)
  if (!found) return { ok: false, status: 404, error: 'No such action item' }
  if (found.item.owner !== persona) return { ok: false, status: 403, error: 'Only the owner can update this item' }
  if (!itemUpdates[id]) return { ok: false, status: 409, error: 'Nothing to undo' }
  return { ok: true }
}
