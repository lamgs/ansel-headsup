import React from 'react'
import { useStore } from '../state/store.jsx'
import { fmtClock, personName } from '../components/ui.jsx'

const METRICS = [
  ['Light attendees active each week', '20%', '26%'],
  ['12-month seat retention, light attendees', '34%', '39%'],
  ['Action items acted on (done or reassigned)', '6%', '20%'],
  ['New seats active at day 90', '23%', '30%'],
  ['Admin privacy escalations / workspace opt-outs', 'current', 'no increase'],
]

export function EventTable({ rows, compact }) {
  return (
    <table className={`w-full ${compact ? 'text-xs' : 'text-sm'}`}>
      <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
        <tr><th className="py-1.5 pr-2">Time</th><th className="pr-2">Persona</th><th className="pr-2">Event</th><th>Detail</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
        {rows.length === 0 && <tr><td colSpan={4} className="py-3 text-slate-400">No events yet. Advance the clock to 1:30 PM.</td></tr>}
        {rows.map((e) => (
          <tr key={e.id} className="align-top">
            <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">{fmtClock(e.sec, true)}</td>
            <td className="whitespace-nowrap pr-2">{compact ? personName(e.persona).split(' ')[0] : personName(e.persona)}</td>
            <td className="pr-2 font-mono text-[11px] text-ansel dark:text-ansel-300">{e.event}</td>
            <td className="text-slate-600 dark:text-slate-300">{e.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function PilotLog() {
  const { state } = useStore()
  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-xl font-semibold">Pilot log</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Events</h2>
          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><EventTable rows={[...state.log].reverse()} /></div>
        </section>
        <div className="space-y-6">
          <section className="rounded-lg border border-ansel/30 bg-ansel-50 p-4 dark:border-ansel-400/30 dark:bg-ansel/15">
            <h2 className="text-sm font-semibold">Holdout</h2>
            <p className="mt-1 text-sm">Randomized holdout: 10% of eligible users get no card. Their activity is tracked for comparison so we can measure causal lift.</p>
            <p className="mt-2 text-sm"><b>Rishabh</b> is in the holdout for this demo.</p>
          </section>
          <section>
            <h2 className="text-sm font-semibold">Metrics <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">Targets, not results</span></h2>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-1.5">Metric</th><th>Today</th><th>Target</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {METRICS.map(([m, a, b]) => <tr key={m}><td className="py-1.5 pr-2">{m}</td><td className="pr-2">{a}</td><td>{b}</td></tr>)}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  )
}
