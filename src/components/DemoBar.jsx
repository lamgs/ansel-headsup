import React from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'
import { fmtClock } from './ui.jsx'

const TABS = [['slack', 'Slack'], ['ansel', 'Ansel'], ['governance', 'Setup & governance'], ['pilot', 'Pilot log']]

export default function DemoBar() {
  const { state, dispatch } = useStore()
  const b = 'whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium bg-white/10 hover:bg-white/20'
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 overflow-x-auto bg-slate-900 px-3 text-white dark:bg-black">
      <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-400 2xl:inline">Demo</span>
      <select value={state.persona} onChange={(e) => dispatch({ type: 'SET_PERSONA', id: e.target.value })}
        className="max-w-[190px] rounded bg-white/10 px-2 py-0.5 text-xs text-white [&>option]:text-slate-900">
        {SEED.people.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
      </select>
      <span className="ml-1 whitespace-nowrap font-mono text-xs tabular-nums"><span className="hidden 2xl:inline">Fri Nov 13 · </span>{fmtClock(state.clock, true)}</span>
      <button className={b} onClick={() => dispatch({ type: 'SET_CLOCK', sec: 13.5 * 3600 })}>Jump to 1:30 PM</button>
      <button className={b} onClick={() => dispatch({ type: 'ADD_CLOCK', sec: 300 })}>+5 min</button>
      <button className={b} onClick={() => dispatch({ type: 'SET_CLOCK', sec: 14 * 3600 })}>Jump to 2:00 PM</button>
      <button className={b} onClick={() => dispatch({ type: 'RESET' })}>Reset demo</button>
      <div className="mx-auto flex gap-1">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => dispatch({ type: 'SET_TAB', tab: id })}
            className={`whitespace-nowrap rounded px-2.5 py-0.5 text-xs ${state.tab === id ? 'bg-ansel-400 font-semibold text-slate-950' : 'hover:bg-white/10'}`}>{label}</button>
        ))}
      </div>
      <button className={b} onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>{state.theme === 'dark' ? 'Light' : 'Dark'}</button>
      <button className={`${b} ${state.drawerOpen ? 'bg-white/25' : ''}`} onClick={() => dispatch({ type: 'TOGGLE_DRAWER' })}>Behind the scenes</button>
    </div>
  )
}
