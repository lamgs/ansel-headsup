import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'
import { TRANSCRIPTS } from '../data/transcripts.js'
import { longDate, shortDate } from '../logic/buildHeadsUp.js'
import { findItem } from '../logic/world.js'
import { Avatar, Btn, Ts, NotInPrototype, personName, firstName, fmtClock } from '../components/ui.jsx'
import HeadsUpSettings from './HeadsUpSettings.jsx'

const NAV = ['Home', 'Meetings', 'Search', 'Ask Ansel', 'Settings']

export default function Ansel() {
  const { state, dispatch } = useStore()
  const page = state.ansel.page
  return (
    <div className="flex h-full min-h-0">
      <nav className="flex w-48 shrink-0 flex-col gap-1 border-r border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ansel font-bold text-white">A</span>
          <span className="font-semibold">Ansel</span>
        </div>
        {NAV.map((n) => {
          const id = n.toLowerCase().replace(' ', '-')
          return (
            <button key={n} onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { page: id, view: id === 'meetings' ? 'list' : state.ansel.view } })}
              className={`rounded-md px-2 py-1.5 text-left text-sm ${page === id ? 'bg-ansel-100 font-semibold text-ansel dark:bg-ansel/30 dark:text-ansel-300' : 'hover:bg-slate-200/60 dark:hover:bg-slate-800'}`}>
              {n}
            </button>
          )
        })}
      </nav>
      <div className="min-w-0 flex-1 overflow-hidden">
        {page === 'meetings' ? (state.ansel.view === 'list' ? <MeetingList /> : <MeetingDetail />) : <StaticPage page={page} />}
      </div>
    </div>
  )
}

function StaticPage({ page }) {
  const { state } = useStore()
  const content = {
    home: <><h1 className="text-xl font-semibold">Good afternoon, {firstName(state.persona)}</h1><p className="mt-2 text-sm text-slate-500">Today: Weekly Product Sync at 2:00 PM, Design Review at 4:00 PM.</p></>,
    search: <><h1 className="text-xl font-semibold">Search</h1><input disabled placeholder="Search your meetings" className="mt-3 w-full max-w-lg rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" /></>,
    'ask-ansel': <><h1 className="text-xl font-semibold">Ask Ansel</h1><p className="mt-2 text-sm text-slate-500">Ask questions about a meeting you attended.</p></>,
    settings: <><h1 className="mb-4 text-xl font-semibold">Settings</h1><HeadsUpSettings /></>,
  }[page]
  return <div className="h-full overflow-y-auto p-8">{content}{page !== 'settings' && <NotInPrototype />}</div>
}

function MeetingList() {
  const { dispatch } = useStore()
  return (
    <div className="h-full overflow-y-auto p-8">
      <h1 className="text-xl font-semibold">Meetings</h1>
      <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {SEED.instances.slice().reverse().map((i) => (
          <button key={i.id} onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { view: 'detail', instanceId: i.id, tab: 'summary', panelItem: null } })}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900">
            <span><span className="font-medium">Weekly Product Sync</span><span className="ml-2 text-sm text-slate-500">{longDate(i.date)}</span></span>
            <span className="text-xs text-slate-500">Recorded</span>
          </button>
        ))}
        <div className="flex items-center justify-between px-4 py-3 text-slate-500">
          <span><span className="font-medium">Design Review</span><span className="ml-2 text-sm">Fri Oct 30</span></span>
          <span className="text-xs">Not recorded (Ansel kept out)</span>
        </div>
      </div>
    </div>
  )
}

const canSee = (state, inst) => inst.attendees.includes(state.persona) || (state.persona === 'riley' && state.share && inst.id === 'wps-1106')

function MeetingDetail() {
  const { state, dispatch, world } = useStore()
  const series = SEED.series[0]
  const upcoming = state.ansel.instanceId === 'upcoming'
  const inst = upcoming ? null : world.instance(state.ansel.instanceId)
  const tabs = [['summary', 'Summary'], ['transcript', 'Transcript'], ['actions', 'Action items'], ['ask', 'Ask Ansel']]
  const nav = (n) => dispatch({ type: 'ANSEL_NAV', nav: n })

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 px-6 pt-5 dark:border-slate-800">
          <button onClick={() => nav({ view: 'list' })} className="text-xs text-slate-500 hover:underline">← Meetings</button>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{series.title}{inst && <> · {shortDate(inst.date)}{inst.durationMin ? ` · ${inst.durationMin} min` : ''}</>}</h1>
            {inst?.recorded && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Recorded</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex -space-x-1.5">{(inst?.attendees ?? series.invitees).map((p) => <Avatar key={p} id={p} size="sm" />)}</div>
            <div className="text-xs text-slate-500">{series.cadence} · organizer {personName(series.organizer)}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-sm">
            {SEED.instances.map((i) => (
              <button key={i.id} onClick={() => nav({ instanceId: i.id, panelItem: null, highlight: null })}
                className={`rounded-md px-2.5 py-1 ${i.id === state.ansel.instanceId ? 'bg-ansel font-semibold text-white dark:bg-ansel-400 dark:text-slate-950' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>
                {shortDate(i.date)}
              </button>
            ))}
            <button onClick={() => nav({ instanceId: 'upcoming', panelItem: null })}
              className={`rounded-md border border-dashed px-2.5 py-1 ${upcoming ? 'border-ansel text-ansel dark:text-ansel-300' : 'border-slate-300 text-slate-500 dark:border-slate-600'}`}>Nov 13 · upcoming</button>
          </div>
          {!upcoming && (
            <div className="mt-3 flex gap-5">
              {tabs.map(([id, label]) => (
                <button key={id} onClick={() => nav({ tab: id })}
                  className={`-mb-px border-b-2 pb-2 text-sm ${state.ansel.tab === id ? 'border-ansel font-semibold text-ansel dark:border-ansel-300 dark:text-ansel-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>{label}</button>
              ))}
            </div>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto" id="ansel-scroll">
          {upcoming ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">Fri Nov 13 · 2:00 PM. Ansel will record and transcribe as usual. Heads-Up posts in Slack {world.person(state.persona).reminderMinutes} minutes before for eligible attendees.</div>
          ) : !canSee(state, inst) ? (
            <div className="p-6 text-sm text-slate-600 dark:text-slate-300">{personName(state.persona)} didn't attend this meeting. Notes are visible to attendees and to people the organizer shares them with directly.</div>
          ) : (
            <>
              {state.ansel.tab === 'summary' && <Summary inst={inst} series={series} />}
              {state.ansel.tab === 'transcript' && <Transcript inst={inst} />}
              {state.ansel.tab === 'actions' && <ActionItems inst={inst} />}
              {state.ansel.tab === 'ask' && <AskAnsel />}
            </>
          )}
        </div>
      </div>
      {state.ansel.panelItem && <ItemPanel id={state.ansel.panelItem} />}
    </div>
  )
}

function jumpTo(dispatch, t, panelItem = null) {
  dispatch({ type: 'ANSEL_NAV', nav: { tab: 'transcript', highlight: { t, n: Date.now() }, ...(panelItem ? { panelItem } : {}) } })
}

function Summary({ inst, series }) {
  const { state, dispatch } = useStore()
  const isOrganizer = state.persona === series.organizer
  const ref = useRef(null)
  const [flash, setFlash] = useState(null)
  useEffect(() => {
    if (!state.ansel.focusId) return
    const el = document.getElementById(`sum-${state.ansel.focusId}`)
    el?.scrollIntoView({ block: 'center' })
    setFlash(state.ansel.focusId)
    const t = setTimeout(() => { setFlash(null); dispatch({ type: 'ANSEL_NAV', nav: { focusId: null } }) }, 3000)
    return () => clearTimeout(t)
  }, [state.ansel.focusId])

  const Section = ({ title, items, kind }) => (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-slate-400">None.</p> : (
        <ul className="space-y-2">
          {items.map((it) => <SummaryLine key={it.id} it={it} kind={kind} editable={isOrganizer && kind !== 'action'} flash={flash === it.id} inst={inst} />)}
        </ul>
      )}
    </section>
  )
  return (
    <div ref={ref} className="max-w-3xl p-6">
      <Section title="Decisions" items={inst.decisions} kind="decision" />
      <Section title="Open questions" items={inst.openQuestions} kind="question" />
      <Section title="Action items" items={inst.actionItems} kind="action" />
    </div>
  )
}

function SummaryLine({ it, kind, editable, flash, inst }) {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(it.text)
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState('')
  const comments = state.comments[it.id] || []
  const tc = it.trackedChange
  const canComment = kind !== 'action' && !editable && inst.attendees.includes(state.persona)
  return (
    <li id={`sum-${it.id}`} className={`rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800 ${flash ? 'flash' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-sm">
          {editing ? (
            <div className="flex gap-2">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 rounded border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-600" />
              <Btn variant="primary" onClick={() => { if (draft.trim() && draft !== it.text) dispatch({ type: 'EDIT', id: it.id, text: draft.trim() }); setEditing(false) }}>Save</Btn>
              <Btn variant="ghost" onClick={() => { setDraft(it.text); setEditing(false) }}>Cancel</Btn>
            </div>
          ) : (
            <>
              {tc && <span className="mr-2 text-slate-400 line-through">{tc.original}</span>}
              <span className={tc ? 'rounded bg-emerald-50 px-0.5 dark:bg-emerald-500/10' : ''}>{it.text}</span>
              {kind === 'question' && it.status === 'resolved' && <span className="ml-2 text-xs text-emerald-600">Resolved {it.resolvedIn === 'wps-1106' ? 'Nov 6' : ''}</span>}
              {kind === 'action' && <span className="ml-2 text-xs text-slate-500">· {personName(it.owner)} · due {shortDate(it.due)} · {statusText(it)}</span>}
              {tc && <div className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">Edited · {firstName(tc.by)} · {shortDate(tc.on)}</div>}
            </>
          )}
          {comments.map((c, i) => <div key={i} className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs dark:bg-slate-900"><b>{firstName(c.by)}</b> {c.text} <span className="text-slate-400">· {fmtClock(c.sec)}</span></div>)}
          {commenting && (
            <div className="mt-2 flex gap-2">
              <input autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" className="flex-1 rounded border border-slate-300 bg-transparent px-2 py-1 text-xs dark:border-slate-600" />
              <Btn onClick={() => { if (comment.trim()) dispatch({ type: 'COMMENT', id: it.id, text: comment.trim() }); setComment(''); setCommenting(false) }}>Comment</Btn>
            </div>
          )}
        </div>
        {editable && !editing && <button title="Edit (saved as a tracked change)" onClick={() => setEditing(true)} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">✎</button>}
        {canComment && !commenting && <button title="Comment" onClick={() => setCommenting(true)} className="rounded px-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Comment</button>}
        {kind === 'action' && it.owner === state.persona && <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: it.id } })} className="rounded px-1 text-xs text-ansel hover:bg-slate-100 dark:text-ansel-300 dark:hover:bg-slate-800">Update</button>}
        <Ts t={it.t} onClick={() => jumpTo(dispatch, it.t)} />
      </div>
    </li>
  )
}

function statusText(a) {
  const u = a.update
  if (!u) return a.status === 'done' ? 'Done' : 'Open'
  if (u.kind === 'done') return `Done · ${firstName(u.by)}, ${fmtClock(u.atSec)}`
  if (u.kind === 'on_track') return `Open · on track for today (${firstName(u.by)})`
  if (u.kind === 'new_date') return `Open · moved to ${shortDate(u.due)}`
  if (u.kind === 'reassign') return `Open · reassigned by ${firstName(u.by)}${u.note ? ` · “${u.note}”` : ''}`
  return 'Open'
}

function Transcript({ inst }) {
  const { state } = useStore()
  const segs = TRANSCRIPTS[inst.id] || []
  const [hl, setHl] = useState(null)
  const h = state.ansel.highlight
  useEffect(() => {
    if (!h) return
    const el = document.getElementById(`seg-${h.t}`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setHl({ t: h.t, n: h.n })
    const tm = setTimeout(() => setHl(null), 3000)
    return () => clearTimeout(tm)
  }, [h?.n, inst.id])
  return (
    <div className="max-w-3xl space-y-1 p-6">
      {segs.map((s) => (
        <div key={s.t} id={`seg-${s.t}`} className={`flex gap-3 rounded-md px-2 py-1.5 ${hl?.t === s.t ? 'flash ring-2 ring-amber-400' : ''}`}>
          <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-slate-400">{s.t}</span>
          <Avatar id={s.speaker} size="xs" />
          <div className="text-sm"><span className="mr-2 font-semibold">{firstName(s.speaker)}</span>{s.text}</div>
        </div>
      ))}
    </div>
  )
}

function ActionItems({ inst }) {
  const { state, dispatch } = useStore()
  return (
    <div className="p-6">
      <p className="mb-3 text-xs text-slate-500">All action items from this meeting. Attendees can see these.</p>
      <table className="w-full max-w-4xl text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Item</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {inst.actionItems.length === 0 && <tr><td className="py-3 text-slate-400" colSpan={5}>No action items.</td></tr>}
          {inst.actionItems.map((a) => (
            <tr key={a.id}>
              <td className="py-2 pr-3">{a.text}</td>
              <td className="pr-3">{personName(a.owner)}</td>
              <td className="pr-3">{shortDate(a.due)}</td>
              <td className="pr-3 text-xs">{statusText(a)}</td>
              <td className="whitespace-nowrap text-right">
                {a.owner === state.persona && <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: a.id } })} className="mr-1 text-xs text-ansel dark:text-ansel-300">Update</button>}
                <Ts t={a.t} onClick={() => jumpTo(dispatch, a.t)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AskAnsel() {
  const qa = [
    ['What did we decide about the pricing page?', 'The pricing page ships with v2, not before (41:18).'],
    ['Who is bringing the launch date recommendation?', 'Maya and Sam, at next week’s sync (27:40).'],
  ]
  return (
    <div className="max-w-2xl space-y-4 p-6">
      <input disabled placeholder="Ask about this meeting" className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
      {qa.map(([q, a]) => (
        <div key={q} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="font-medium">{q}</div><div className="mt-1 text-slate-600 dark:text-slate-300">{a}</div>
        </div>
      ))}
      <NotInPrototype />
    </div>
  )
}

function ItemPanel({ id }) {
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
    <aside className="slidein flex w-80 shrink-0 flex-col border-l border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Action item</div>
        <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: null } })} className="text-slate-400 hover:text-slate-700">✕</button>
      </div>
      <h3 className="mt-2 font-semibold">{a.text}</h3>
      <dl className="mt-3 space-y-1 text-sm">
        <div><dt className="inline text-slate-500">Owner: </dt><dd className="inline">{firstName(origOwner)}{a.update?.kind === 'reassign' && ` → ${firstName(a.owner)}`}</dd></div>
        <div><dt className="inline text-slate-500">Due: </dt><dd className="inline">{longDate(a.due)}</dd></div>
        <div><dt className="inline text-slate-500">Said at: </dt><dd className="inline"><Ts t={a.t} onClick={() => jumpTo(dispatch, a.t)} /></dd></div>
        <div><dt className="inline text-slate-500">Status: </dt><dd className="inline font-medium">{status}</dd></div>
      </dl>
      {mine && a.status !== 'done' && !(a.update?.kind === 'reassign') ? (
        <div className="mt-4 space-y-2">
          <Btn variant="primary" className="w-full justify-center" onClick={() => save({ kind: 'done' }, 'Marked done')}>Mark done</Btn>
          <Btn className="w-full justify-center" onClick={() => save({ kind: 'on_track' }, 'On track for today')}>On track for today</Btn>
          <Btn className="w-full justify-center" onClick={() => setMode(mode === 'date' ? null : 'date')}>New date…</Btn>
          {mode === 'date' && (
            <div className="flex gap-2">
              <input type="date" value={due} min="2026-11-13" onChange={(e) => setDue(e.target.value)} className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
              <Btn onClick={() => save({ kind: 'new_date', due }, `New date ${due}`)}>Save</Btn>
            </div>
          )}
          <Btn className="w-full justify-center" onClick={() => setMode(mode === 'reassign' ? null : 'reassign')}>Reassign…</Btn>
          {mode === 'reassign' && (
            <div className="space-y-2">
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800">
                <option value="">Choose an attendee</option>
                {others.map((p) => <option key={p} value={p}>{personName(p)}</option>)}
              </select>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" rows={2} className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
              <Btn disabled={!owner} onClick={() => save({ kind: 'reassign', owner, note }, `Reassigned to ${personName(owner)}`)}>Save</Btn>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500">{mine ? 'Status confirmed. It shows in the meeting record.' : 'Only the owner can update this item.'}</p>
      )}
    </aside>
  )
}
