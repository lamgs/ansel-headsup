import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'
import { Avatar, Btn, fmtClock, personName } from '../components/ui.jsx'
import HeadsUpSettings from './HeadsUpSettings.jsx'

const STEPS = [
  { g: 'G1', title: 'Setup, unchanged', sub: 'a. Setup email' },
  { g: 'G1', title: 'Setup, unchanged', sub: 'b. Sign in with SSO' },
  { g: 'G1', title: 'Setup, unchanged', sub: 'c. Connect calendar' },
  { g: 'G1', title: 'Setup, unchanged', sub: 'd. Slack' },
  { g: 'G1', title: 'Setup, unchanged', sub: 'e. Done' },
  { g: 'G2', title: 'Settings → Heads-Up' },
  { g: 'G3', title: 'Organizer adds someone to a recurring series' },
  { g: 'G4', title: 'Admin audit log' },
]

const Frame = ({ label, children }) => (
  <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    {label && <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>}
    {children}
  </div>
)
const Check = ({ children }) => <div className="flex items-center gap-2 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">✓</span>{children}</div>

export default function Governance() {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const goG = (g) => setI(STEPS.findIndex((s) => s.g === g))
  return (
    <div className="flex h-full flex-col overflow-y-auto p-8">
      <div className="flex flex-wrap items-center gap-2">
        {['G1', 'G2', 'G3', 'G4'].map((g) => (
          <button key={g} onClick={() => goG(g)} className={`rounded-md px-3 py-1 text-sm ${step.g === g ? 'bg-ansel font-semibold text-white dark:bg-ansel-400 dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-800'}`}>{g}</button>
        ))}
        <h1 className="ml-3 text-lg font-semibold">{step.g}. {step.title}</h1>
        {step.sub && <span className="text-sm text-slate-500">· {step.sub}</span>}
      </div>
      <div className="mt-8 flex-1">
        {i === 0 && (
          <Frame label="Email (mock)">
            <div className="text-xs text-slate-500">From: Ansel · To: Gabriel</div>
            <h2 className="mt-3 text-lg font-semibold">You've been given an Ansel seat. Set up in 2 minutes.</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your workspace admin at Acme added you. Sign in with your company account to get started.</p>
            <Btn variant="primary" className="mt-4" onClick={() => setI(1)}>Set up Ansel</Btn>
          </Frame>
        )}
        {i === 1 && (
          <Frame label="Sign in">
            <h2 className="text-lg font-semibold">Sign in to Ansel</h2>
            <Btn className="mt-4 w-full justify-center" onClick={() => setI(2)}>Continue with Acme SSO</Btn>
            <p className="mt-3 text-xs text-slate-500">gabriel@acme.example</p>
          </Frame>
        )}
        {i === 2 && (
          <Frame label="Connect calendar">
            <h2 className="text-lg font-semibold">Connect your calendar</h2>
            <div className="mt-4 rounded-md border border-slate-200 p-3 dark:border-slate-700"><Check>Outlook (mock) connected · 2 recurring series found</Check></div>
          </Frame>
        )}
        {i === 3 && (
          <Frame label="Slack">
            <h2 className="text-lg font-semibold">Slack</h2>
            <div className="mt-4 rounded-md border border-slate-200 p-3 dark:border-slate-700"><Check>Slack (mock) connected · Acme workspace</Check></div>
          </Frame>
        )}
        {i === 4 && (
          <Frame>
            <Check><span className="font-semibold">You're set.</span></Check>
            <p className="mt-3 text-sm">Heads-Up turns on for your recurring meetings automatically: a private note in Slack 30 minutes before, using only meetings you attended. No new setup.</p>
            <button onClick={() => setI(5)} className="mt-3 text-sm font-medium text-ansel underline dark:text-ansel-300">Settings</button>
          </Frame>
        )}
        {i === 5 && <div className="mx-auto max-w-xl"><HeadsUpSettings /></div>}
        {i === 6 && <G3 />}
        {i === 7 && <G4 />}
      </div>
      <div className="mt-8 flex justify-between">
        <Btn disabled={i === 0} onClick={() => setI(i - 1)}>Back</Btn>
        <Btn variant="primary" disabled={i === STEPS.length - 1} onClick={() => setI(i + 1)}>Next</Btn>
      </div>
    </div>
  )
}

function G3() {
  const { state, dispatch } = useStore()
  const series = SEED.series[0]
  const existing = series.invitees.filter((p) => !['aryan', 'leo'].includes(p))
  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_340px]">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Outlook (mock) · Edit series · signed in as Alicia</div>
        <h2 className="mt-2 text-lg font-semibold">{series.title}</h2>
        <div className="text-sm text-slate-500">{series.cadence} · every occurrence</div>
        <label className="mt-4 block text-xs font-medium text-slate-500">Required attendees</label>
        <div className="mt-1 flex flex-wrap gap-2 rounded-md border border-slate-300 p-2 dark:border-slate-700">
          {existing.map((p) => <span key={p} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-0.5 pr-2 text-xs dark:bg-slate-800"><Avatar id={p} size="xs" />{personName(p)}</span>)}
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 py-0.5 pl-0.5 pr-2 text-xs dark:bg-emerald-500/20"><Avatar id="aryan" size="xs" />Aryan <b className="ml-1 text-[10px] uppercase">new</b></span>
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 py-0.5 pl-0.5 pr-2 text-xs dark:bg-orange-500/20"><Avatar id="leo" size="xs" />Leo Grant · external <b className="ml-1 text-[10px] uppercase">new</b></span>
        </div>
        <div className="mt-4 flex gap-2"><Btn variant="primary">Send update</Btn><Btn variant="ghost">Discard</Btn></div>
      </div>
      <aside className="rounded-xl border border-ansel/30 bg-ansel-50 p-4 text-sm dark:border-ansel-400/30 dark:bg-ansel/15">
        <div className="mb-2 flex items-center gap-2 font-semibold"><span className="flex h-5 w-5 items-center justify-center rounded bg-ansel text-[10px] text-white">A</span>Ansel</div>
        <p>Aryan wasn't in earlier meetings, so Heads-Up starts for Aryan after their first meeting in this series. Sharing defaults are unchanged.</p>
        <label className="mt-3 flex items-start gap-2">
          <input type="checkbox" className="mt-0.5" checked={!!state.share} onChange={(e) => dispatch({ type: 'SET_SHARE', on: e.target.checked })} />
          <span>Also share the Nov 6 notes with Aryan (direct share, allowed by your workspace policy, recorded in the audit log).</span>
        </label>
        <p className="mt-3">Leo is outside Acme. External guests never receive Heads-Up or shared notes.</p>
      </aside>
    </div>
  )
}

function G4() {
  const { state, world } = useStore()
  const rows = [
    { sort: -3, time: 'Nov 6 2:52 PM', text: 'Recording and summary created · Weekly Product Sync · Nov 6 · attendees: 5' },
    { sort: -2, time: 'Nov 7 9:14 AM', text: 'Tracked change by Alicia (organizer) · Decision “Pricing page ships with v2” · Nov 6 record' },
  ]
  for (const e of state.log) {
    if (e.event === 'card_posted') rows.push({ sort: e.sec, time: `Nov 13 ${fmtClock(e.sec)}`, text: `Heads-Up delivered to ${personName(e.persona)} · ${e.detail.split(' · ')[0]} · source: Nov 6 record (attendee access)` })
    if (e.event === 'item_acted_on') rows.push({ sort: e.sec, time: `Nov 13 ${fmtClock(e.sec)}`, text: `Action item updated by ${personName(e.persona)} · ${e.detail}` })
  }
  for (const [id, ed] of Object.entries(state.edits)) rows.push({ sort: ed.atSec, time: `Nov 13 ${fmtClock(ed.atSec)}`, text: `Tracked change by ${personName(ed.by)} · “${ed.text}” (${id}) · Nov 6 record` })
  if (state.share) rows.push({ sort: state.share.sec, time: `Nov 13 ${fmtClock(state.share.sec)}`, text: 'Direct share by Alicia · Nov 6 notes → Aryan · workspace policy: internal direct share allowed' })
  rows.sort((a, b) => b.sort - a.sort)
  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-3 text-sm text-slate-500">Read-only. Admin view for {world.workspace.name}.</p>
      <table className="w-full rounded-lg border border-slate-200 text-sm dark:border-slate-800">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900"><tr><th className="px-3 py-2">Time</th><th className="px-3">Event</th></tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((r, i) => <tr key={i}><td className="whitespace-nowrap px-3 py-2 tabular-nums">{r.time}</td><td className="px-3">{r.text}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}
