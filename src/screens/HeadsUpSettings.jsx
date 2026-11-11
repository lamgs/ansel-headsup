import React from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'

export default function HeadsUpSettings() {
  const { state, dispatch, world } = useStore()
  const me = world.person(state.persona)
  const mySeries = SEED.series.filter((s) => s.invitees.includes(me.id))
  return (
    <div className="max-w-xl rounded-lg border border-slate-200 p-5 dark:border-slate-800">
      <h2 className="font-semibold">Heads-Up</h2>
      <p className="mt-1 text-sm text-slate-500">A private note in Slack before your recurring meetings, from meetings you attended. Settings for {me.name}.</p>
      <label className="mt-4 block text-sm font-medium">Reminder timing</label>
      <select value={me.reminderMinutes} onChange={(e) => dispatch({ type: 'SET_REMINDER', minutes: Number(e.target.value) })}
        className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800">
        {[10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} minutes before{m === 30 ? ' (default)' : ''}</option>)}
      </select>
      <div className="mt-5 text-sm font-medium">Recurring series</div>
      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {mySeries.map((s) => {
          const muted = !!state.muted[`${me.id}:${s.id}`]
          return (
            <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{s.title}<span className="ml-2 text-xs text-slate-500">{s.cadence}</span></span>
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                Mute
                <button role="switch" aria-checked={muted} onClick={() => dispatch({ type: 'MUTE', sid: s.id, title: s.title, on: !muted })}
                  className={`relative h-5 w-9 rounded-full transition ${muted ? 'bg-ansel dark:bg-ansel-400' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${muted ? 'left-4' : 'left-0.5'}`} />
                </button>
              </label>
            </li>
          )
        })}
        {mySeries.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No recurring series.</li>}
      </ul>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Heads-Up never changes who can see meeting notes.</p>
    </div>
  )
}
