import React from 'react'
import { Send } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { shortDate } from '../../logic/buildHeadsUp.js'
import { Avatar, Ts, personName } from '../../components/ui.jsx'
import { StatusPill, jumpTo, useNip } from './shared.jsx'

export default function ActionItemsTab({ inst }) {
  const { state, dispatch } = useStore()
  const nip = useNip()
  return (
    <div className="p-6">
      <p className="mb-3 text-xs text-slate-500">Action items Ansel extracted when a task and an owner were both said aloud. Attendees can see these.</p>
      <table className="w-full max-w-4xl text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Item</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {inst.actionItems.length === 0 && <tr><td className="py-3 text-slate-400" colSpan={5}>No action items.</td></tr>}
          {inst.actionItems.map((a) => (
            <tr key={a.id}>
              <td className="py-2.5 pr-3">{a.text}</td>
              <td className="pr-3"><span className="inline-flex items-center gap-1.5"><Avatar id={a.owner} size="xs" />{personName(a.owner)}</span></td>
              <td className="pr-3">{shortDate(a.due)}</td>
              <td className="pr-3"><StatusPill a={a} /></td>
              <td className="whitespace-nowrap text-right">
                {a.owner === state.persona && a.status !== 'done' && <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: a.id } })} className="mr-2 text-xs font-medium text-ansel dark:text-ansel-300">Update</button>}
                <button onClick={nip('Send to Asana')} title="Send to Asana, Jira or Linear" className="mr-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Send size={12} aria-hidden />Send to</button>
                <Ts t={a.t} onClick={() => jumpTo(dispatch, a.t, { item: a.id })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
