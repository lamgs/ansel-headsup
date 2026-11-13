// Action item panel: the owner confirms status (the Heads-Up "confirm the deadline" step).
import React, { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { longDate } from '../../logic/buildHeadsUp.js'
import { findItem } from '../../logic/world.js'
import { Btn, Ts, firstName, personName } from '../../components/ui.jsx'
import { jumpTo, statusText } from './shared.jsx'
import { canEditItem, editNote } from './EditItemDialog.jsx'

export default function ItemPanel({ id }) {
  const { state, dispatch, world } = useStore()
  const found = findItem(world, id)
  const [mode, setMode] = useState(null)
  const [due, setDue] = useState('2026-11-16')
  const [owner, setOwner] = useState('')
  const [note, setNote] = useState('')
  if (!found) return null
  const { item: a, inst } = found
  const origOwner = SEED.instances.flatMap((i) => i.actionItems).find((x) => x.id === id).owner
  const mine = origOwner === state.persona
  const save = (update, label) => { dispatch({ type: 'UPDATE_ITEM', id, update, label }); setMode(null) }
  const others = inst.attendees.filter((p) => p !== state.persona)
  const status = a.update ? statusText(a) : a.status === 'done' ? 'Done' : 'Open (may already be done)'

  return (
    <aside className="slidein flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 pb-20 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Action item</div>
        <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: null } })} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
      </div>
      <h3 className="mt-2 font-semibold">{a.text}</h3>
      <dl className="mt-3 space-y-1 text-[15px]">
        <div><dt className="inline text-slate-500">Owner: </dt><dd className="inline">{firstName(origOwner)}{a.update?.kind === 'reassign' && ` → ${firstName(a.owner)}`}</dd></div>
        <div><dt className="inline text-slate-500">Due: </dt><dd className="inline">{longDate(a.due)}</dd></div>
        <div><dt className="inline text-slate-500">Said at: </dt><dd className="inline"><Ts t={a.t} onClick={() => jumpTo(dispatch, a.t, { item: a.id })} /></dd></div>
        <div><dt className="inline text-slate-500">Status: </dt><dd className="inline font-medium">{status}</dd></div>
      </dl>
      {a.itemEdit && <p className="mt-2 text-[13px] text-amber-700 dark:text-amber-400">{editNote(a)}</p>}
      {canEditItem(state.persona, a, inst) && (
        <Btn className="mt-3 w-full justify-center" onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { editItem: id } })}>Edit details…</Btn>
      )}
      {mine && a.status !== 'done' && !(a.update?.kind === 'reassign') ? (
        <div className="mt-4 space-y-2">
          <Btn variant="primary" className="w-full justify-center" onClick={() => save({ kind: 'done' }, 'Marked done')}>Mark done</Btn>
          <Btn className="w-full justify-center" onClick={() => save({ kind: 'on_track' }, 'On track for today')}>On track for today</Btn>
          <Btn className="w-full justify-center" onClick={() => setMode(mode === 'date' ? null : 'date')}>New date…</Btn>
          {mode === 'date' && (
            <div className="flex gap-2">
              <input type="date" value={due} min="2026-11-13" onChange={(e) => setDue(e.target.value)} className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-[15px] dark:border-slate-600 dark:bg-slate-800" />
              <Btn onClick={() => save({ kind: 'new_date', due }, `New date ${due}`)}>Save</Btn>
            </div>
          )}
          <Btn className="w-full justify-center" onClick={() => setMode(mode === 'reassign' ? null : 'reassign')}>Reassign…</Btn>
          {mode === 'reassign' && (
            <div className="space-y-2">
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[15px] dark:border-slate-600 dark:bg-slate-800">
                <option value="">Choose an attendee</option>
                {others.map((p) => <option key={p} value={p}>{personName(p)}</option>)}
              </select>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2} className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[15px] dark:border-slate-600 dark:bg-slate-800" />
              <Btn disabled={!owner} onClick={() => save({ kind: 'reassign', owner, note }, `Reassigned to ${personName(owner)}`)}>Save</Btn>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-slate-500">{mine ? 'Status confirmed. It shows in the meeting record.' : 'Only the owner can update this item.'}</p>
      )}
    </aside>
  )
}
