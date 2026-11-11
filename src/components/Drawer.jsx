import React from 'react'
import { useStore } from '../state/store.jsx'
import { SEED, DEMO_DATE } from '../data/seed.js'
import { buildHeadsUp, triggerSec } from '../logic/buildHeadsUp.js'
import { fmtClock } from './ui.jsx'
import { EventTable } from '../screens/PilotLog.jsx'

export default function Drawer() {
  const { state, dispatch, world } = useStore()
  const me = world.person(state.persona)
  const mySeries = SEED.series.filter((s) => s.invitees.includes(me.id))
  return (
    <aside className="slidein flex w-[400px] shrink-0 flex-col border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <div className="text-sm font-semibold">Behind the scenes · {me.name}</div>
        <button onClick={() => dispatch({ type: 'TOGGLE_DRAWER' })} className="text-slate-400 hover:text-slate-700">✕</button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <div className="text-xs text-slate-500">{me.role} · org: {me.org} · Slack: {me.slack ? 'yes' : 'no'} · holdout: {me.holdout ? 'yes' : 'no'} · reminder {me.reminderMinutes} min</div>
        {mySeries.map((s) => {
          const snap = state.processed[`${me.id}:${s.id}`]
          const live = buildHeadsUp(me, s, { date: DEMO_DATE, sec: state.clock }, world)
          const at = triggerSec(me, s)
          return (
            <section key={s.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.title}</span>
                {snap
                  ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${snap.eligible ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>{snap.eligible ? `Posted ${fmtClock(snap.atSec)}` : `Skipped ${fmtClock(snap.atSec)}`}</span>
                  : <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Evaluates {fmtClock(at)}</span>}
              </div>
              <div className="mt-1.5">
                <span className="text-xs text-slate-500">{snap ? 'Decision: ' : 'Preview: '}</span>
                <b>{(snap ?? live).eligible ? 'Eligible' : 'Skip'}</b> · {(snap ?? live).reason}
              </div>
              {s.note && <div className="mt-1 text-xs text-slate-500">{s.note}.</div>}
              {live.considered.length > 0 && (
                <div className="mt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Items considered (live)</div>
                  <ul className="mt-1 space-y-1">
                    {live.considered.map((c) => (
                      <li key={c.id} className="flex gap-2 text-xs">
                        <span className={c.picked ? 'text-emerald-600' : 'text-slate-400'}>{c.picked ? '✓' : '–'}</span>
                        <span className="flex-1"><span className="text-slate-500">{c.section} · {c.instance.slice(5)} · </span>{c.text}<div className="text-slate-500">{c.why}</div></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2 rounded bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-400">{live.cost}</div>
            </section>
          )
        })}
        <section>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Live event log</div>
          <EventTable rows={[...state.log].reverse().slice(0, 40)} compact />
        </section>
      </div>
    </aside>
  )
}
