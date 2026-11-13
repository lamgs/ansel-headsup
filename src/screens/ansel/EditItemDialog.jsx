// Edit an action item (wording, owner, due date) as an audited, tracked change. Opened from the
// Heads-Up card's Edit button or the item panel. Only the item's owner or the meeting organizer can
// edit; everyone else can flag it with Not right instead.
import React, { useState } from 'react'
import { History, X } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { shortDate } from '../../logic/buildHeadsUp.js'
import { findItem } from '../../logic/world.js'
import { Btn, Modal, firstName, personName } from '../../components/ui.jsx'

/** Owner of the item (after any reassign) or the series organizer. */
export function canEditItem(persona, item, inst) {
  const series = SEED.series.find((s) => s.id === inst.series)
  return item.owner === persona || series?.organizer === persona
}

/** "Edited by Gabriel · Nov 13 · was: Update Q1 forecast …, due Nov 12" */
export function editNote(item) {
  const e = item.itemEdit
  if (!e) return null
  const was = []
  if (e.original.text !== item.text) was.push(`“${e.original.text}”`)
  if (e.original.owner !== item.owner) was.push(`owner ${firstName(e.original.owner)}`)
  if (e.original.due !== item.due) was.push(`due ${shortDate(e.original.due)}`)
  return `Edited by ${firstName(e.by)} · ${shortDate(e.on)}${was.length ? ` · was ${was.join(', ')}` : ''}`
}

export default function EditItemDialog({ id }) {
  const { state, dispatch, world } = useStore()
  const found = findItem(world, id)
  const close = () => dispatch({ type: 'ANSEL_NAV', nav: { editItem: null } })
  const [text, setText] = useState(found?.item.text ?? '')
  const [owner, setOwner] = useState(found?.item.owner ?? '')
  const [due, setDue] = useState(found?.item.due ?? '')
  if (!found || found.kind !== 'action') return null
  const { item, inst } = found
  const allowed = canEditItem(state.persona, item, inst)

  const changes = {}
  if (text.trim() && text.trim() !== item.text) changes.text = text.trim()
  if (owner && owner !== item.owner) changes.owner = owner
  if (due && due !== item.due) changes.due = due
  const label = [
    changes.text && `wording → “${changes.text}”`,
    changes.owner && `owner ${firstName(item.owner)} → ${firstName(changes.owner)}`,
    changes.due && `due ${shortDate(item.due)} → ${shortDate(changes.due)}`,
  ].filter(Boolean).join(', ')
  const save = () => { if (label) dispatch({ type: 'EDIT_ITEM', id, changes, label }); close() }
  const field = 'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[15px] dark:border-slate-600 dark:bg-slate-800'

  return (
    <Modal onClose={close}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold">Edit action item</h2>
            <p className="text-[13px] text-slate-500">{SEED.series.find((s) => s.id === inst.series)?.title} · {shortDate(inst.date)}</p>
          </div>
          <button onClick={close} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        {!allowed ? (
          <p className="mt-4 text-[15px] text-slate-600 dark:text-slate-300">Only {personName(item.owner)} (owner) or the organizer can edit this item. Use Not right on the Heads-Up card to flag it.</p>
        ) : (
          <>
            <label className="mt-4 block text-[13px] font-medium text-slate-500" htmlFor="edit-text">Action item</label>
            <input id="edit-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} className={`mt-1 ${field}`} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-slate-500" htmlFor="edit-owner">Owner</label>
                <select id="edit-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={`mt-1 ${field}`}>
                  {inst.attendees.map((p) => <option key={p} value={p}>{personName(p)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-500" htmlFor="edit-due">Due</label>
                <input id="edit-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`mt-1 ${field}`} />
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-slate-50 p-2.5 text-[13px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <History size={14} className="mt-0.5 shrink-0" aria-hidden />
              Saved as a tracked change: attendees see who edited it and the original, and it's recorded in the admin audit log.
            </p>
            {item.itemEdit && <p className="mt-2 text-[13px] text-amber-700 dark:text-amber-400">{editNote(item)}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Btn variant="ghost" onClick={close}>Cancel</Btn>
              <Btn variant="primary" disabled={!label} onClick={save}>Save changes</Btn>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
