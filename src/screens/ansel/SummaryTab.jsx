// Summary tab: "Open last meeting" lands here. Reads top-down: overview, what's yours,
// decisions and open questions, then every action item and a themes timeline.
// Every item and theme links into the transcript.
import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, CircleCheck, FileText, MessageSquare, Pencil, User } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { DEMO_DATE, SEED } from '../../data/seed.js'
import { SUMMARIES } from '../../data/summaries.js'
import { shortDate, longDate } from '../../logic/buildHeadsUp.js'
import { Avatar, Btn, Ts, firstName, fmtClock, personName } from '../../components/ui.jsx'
import { StatusPill, jumpTo, toSec } from './shared.jsx'
import HeadsUpPanel from './HeadsUpPanel.jsx'

const DAY = 86400000
const days = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY)

/** "Due yesterday" / "Due Nov 11" (overdue) / "Due today" / "Due Fri Nov 14". */
export function dueLabel(a, today = DEMO_DATE) {
  if (a.status === 'done') return { text: 'Done', overdue: false }
  const d = days(a.due, today)
  if (d === 0) return { text: 'Due today', overdue: false }
  if (d === -1) return { text: 'Due yesterday', overdue: true }
  if (d < 0) return { text: `Due ${shortDate(a.due)}`, overdue: true }
  return { text: `Due ${longDate(a.due)}`, overdue: false }
}

/** The most recent recorded meeting in the series: the one the Heads-Up card is built from. */
export function latestMeetingId(series) {
  return SEED.instances
    .filter((i) => i.series === series.id && i.recorded && i.date < series.nextInstance.date)
    .sort((x, y) => (x.date < y.date ? 1 : -1))[0]?.id
}

// The latest meeting's Summary is the Heads-Up card. The full summary (decisions, open questions,
// action items, themes, edit history) stays below it, collapsed, and opens when something links
// to one of its items or the card's Open last meeting is tapped. Older meetings keep the summary.
export default function SummaryTab({ inst, series }) {
  if (inst.id !== latestMeetingId(series)) return <FullSummary inst={inst} series={series} />
  return <HeadsUpSummary inst={inst} series={series} />
}

function HeadsUpSummary({ inst, series }) {
  const { state, dispatch } = useStore()
  const { focusId, showFullSummary } = state.ansel
  const [open, setOpen] = useState(!!focusId || !!showFullSummary)
  const fullRef = useRef(null)
  useEffect(() => { if (focusId) setOpen(true) }, [focusId])
  useEffect(() => {
    if (!showFullSummary) return
    setOpen(true)
    requestAnimationFrame(() => fullRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }, [showFullSummary])
  return (
    <div className="max-w-5xl px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">Your Heads-Up for the next {series.title}, from this meeting's record</p>
        <Btn onClick={() => jumpTo(dispatch, null)}><FileText size={15} aria-hidden />View full transcript</Btn>
      </div>
      <div className="mt-4 max-w-[780px]"><HeadsUpPanel series={series} /></div>
      <div ref={fullRef} className="mt-8 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button onClick={() => setOpen(!open)} aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
          <ChevronDown size={16} className={`transition ${open ? '' : '-rotate-90'}`} aria-hidden />
          {open ? 'Hide' : 'Show'} full meeting summary
          <span className="font-normal text-slate-400">· decisions, open questions, action items, themes</span>
        </button>
        {open && <FullSummary inst={inst} series={series} embedded />}
      </div>
    </div>
  )
}

function FullSummary({ inst, series, embedded = false }) {
  const { state, dispatch } = useStore()
  const me = state.persona
  const isOrganizer = me === series.organizer
  const text = SUMMARIES[inst.id] ?? { overview: '', context: {} }
  const [flash, setFlash] = useState(null)

  // The card's "Edited" badge focuses an item here.
  useEffect(() => {
    if (!state.ansel.focusId) return
    document.getElementById(`sum-${state.ansel.focusId}`)?.scrollIntoView({ block: 'center' })
    setFlash(state.ansel.focusId)
    const t = setTimeout(() => { setFlash(null); dispatch({ type: 'ANSEL_NAV', nav: { focusId: null } }) }, 3000)
    return () => clearTimeout(t)
  }, [state.ansel.focusId])

  const openQs = inst.openQuestions
  const counts = [
    [inst.decisions.length, 'decision'],
    [openQs.filter((q) => q.status === 'open').length, 'open question'],
    [inst.actionItems.length, 'action item'],
    ...(inst.durationMin ? [[inst.durationMin, 'min', true]] : []),
  ]

  return (
    <article className={`@container max-w-5xl ${embedded ? 'pt-4' : 'px-6 py-6'}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-500">Summary by Ansel · 6 min after the meeting · {inst.attendees.length} attendees</p>
        {!embedded && <Btn onClick={() => jumpTo(dispatch, null)}><FileText size={15} aria-hidden />View full transcript</Btn>}
      </div>

      <div className="mt-4 grid gap-5 @3xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] @3xl:grid-rows-[auto_1fr]">
        <Card className="@3xl:col-start-1 @3xl:row-start-1">
          <Label>Overview</Label>
          {text.overview && <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">{text.overview}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {counts.map(([n, word, unit]) => (
              <span key={word}><b className="font-semibold text-slate-800 dark:text-slate-100">{n}</b> {unit || n === 1 ? word : `${word}s`}</span>
            ))}
          </div>
        </Card>

        <div className="space-y-4 @3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1">
          <ForYou inst={inst} me={me} />
          <Card className="hidden @3xl:block">
            <Label>Attendees</Label>
            <ul className="space-y-1.5 text-sm">
              {inst.attendees.map((p) => (
                <li key={p} className="flex items-center gap-2"><Avatar id={p} size="xs" />{personName(p)}{p === series.organizer && <span className="text-xs text-slate-500">· organizer</span>}</li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6 @3xl:col-start-1 @3xl:row-start-2">
          <section>
            <Label>{inst.decisions.length === 1 ? 'Decision' : 'Decisions'}</Label>
            {inst.decisions.length === 0 ? <None /> : (
              <div className="space-y-2.5">
                {inst.decisions.map((d) => <ItemCard key={d.id} it={d} context={text.context[d.id]} editable={isOrganizer} flash={flash === d.id} inst={inst} />)}
              </div>
            )}
          </section>
          <section>
            <Label>{openQs.length === 1 ? 'Open question' : 'Open questions'}</Label>
            {openQs.length === 0 ? <None /> : (
              <div className="space-y-2.5">
                {openQs.map((q) => <ItemCard key={q.id} it={q} question context={text.context[q.id]} editable={isOrganizer} flash={flash === q.id} inst={inst} />)}
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="mt-8">
        <Label>Action items</Label>
        <ActionTable inst={inst} me={me} flash={flash} />
      </section>

      {(inst.themes || []).length > 0 && (
        <section className="mt-8">
          <Label>Themes <span className="font-normal text-slate-400">· click a section to jump to it</span></Label>
          <ThemeTimeline inst={inst} me={me} />
        </section>
      )}
    </article>
  )
}

const Card = ({ className = '', children, ...p }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60 ${className}`} {...p}>{children}</div>
)
const Label = ({ children }) => <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{children}</h2>
const None = () => <p className="text-sm text-slate-400">None.</p>

/** What the viewer owns and is tagged on, like the Heads-Up card. */
function ForYou({ inst, me }) {
  const { dispatch } = useStore()
  const mine = inst.actionItems.filter((a) => a.owner === me)
  const tagged = inst.openQuestions.filter((q) => q.status === 'open' && q.stakeholders?.includes(me))
  return (
    <div className="rounded-xl border-2 border-ansel/50 bg-ansel-50/50 p-4 dark:border-ansel-300/40 dark:bg-ansel/10">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-ansel dark:text-ansel-300"><User size={15} aria-hidden />For you, {firstName(me)}</h2>
      {mine.length === 0 && tagged.length === 0 && <p className="text-sm text-slate-500">Nothing assigned to you in this meeting.</p>}
      {mine.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-slate-500">You own</div>
          {mine.map((a) => {
            const due = dueLabel(a)
            return (
              <div key={a.id} className="mt-1">
                <div className={`font-medium ${a.status === 'done' ? 'text-slate-500 line-through' : ''}`}>{a.short || a.text}</div>
                <div className={`text-xs ${due.overdue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}>{due.text}{due.overdue && due.text !== 'Due yesterday' && ' · overdue'}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Ts t={a.t} onClick={() => jumpTo(dispatch, a.t, { item: a.id })} />
                  {a.status !== 'done' && <Btn className="px-2! py-0.5! text-xs" onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: a.id } })}>Update</Btn>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tagged.length > 0 && (
        <div>
          <div className="text-xs text-slate-500">You're tagged on</div>
          {tagged.map((q) => (
            <div key={q.id} className="mt-1">
              <div className="font-medium">{q.text}</div>
              <Ts t={q.t} className="mt-1" onClick={() => jumpTo(dispatch, q.t, { item: q.id })} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** A decision or open question as a card: statement, context, source link, edit history. */
function ItemCard({ it, question, context, editable, flash, inst }) {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(it.text)
  const [showOriginal, setShowOriginal] = useState(false)
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState('')
  const comments = state.comments[it.id] || []
  const tc = it.trackedChange
  const canComment = !editable && inst.attendees.includes(state.persona)
  const open = question && it.status === 'open'
  return (
    <div id={`sum-${it.id}`}
      className={`group rounded-xl border bg-white p-4 dark:bg-slate-900/60 ${open ? 'border-amber-300 dark:border-amber-500/50' : 'border-slate-200 dark:border-slate-800'} ${flash ? 'flash' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex gap-2">
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1 rounded border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600" />
              <Btn variant="primary" onClick={() => { if (draft.trim() && draft !== it.text) dispatch({ type: 'EDIT', id: it.id, text: draft.trim() }); setEditing(false) }}>Save</Btn>
              <Btn variant="ghost" onClick={() => { setDraft(it.text); setEditing(false) }}>Cancel</Btn>
            </div>
          ) : (
            <div className="text-[15px] font-semibold leading-snug">{it.text}</div>
          )}
          {context && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{context}</p>}
        </div>
        {it.status === 'resolved' && <span className="inline-flex shrink-0 items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"><CircleCheck size={11} aria-hidden />Resolved{it.resolvedIn === 'wps-1106' ? ' Nov 6' : ''}</span>}
        {editable && !editing && <button title="Edit (saved as a tracked change)" aria-label="Edit" onClick={() => setEditing(true)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><Pencil size={14} /></button>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Ts t={it.t} className="bg-ansel-50 dark:bg-ansel/15" onClick={() => jumpTo(dispatch, it.t, { item: it.id })} />
        {tc && (
          <span className="text-amber-700 dark:text-amber-400">
            <Pencil size={11} className="mr-1 inline" aria-hidden />Edited by {firstName(tc.by)} · {shortDate(tc.on)} ·{' '}
            <button onClick={() => setShowOriginal(!showOriginal)} className="underline underline-offset-2">{showOriginal ? 'Hide original' : 'View original'}</button>
          </span>
        )}
        {canComment && !commenting && (
          <button onClick={() => setCommenting(true)} className="inline-flex items-center gap-1 text-slate-500 opacity-0 hover:text-slate-800 group-hover:opacity-100 focus:opacity-100 dark:hover:text-slate-200"><MessageSquare size={12} aria-hidden />Comment</button>
        )}
      </div>
      {tc && showOriginal && <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800">Original: <span className="line-through">{tc.original}</span></p>}
      {comments.map((c, i) => <div key={i} className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs dark:bg-slate-800"><b>{firstName(c.by)}</b> {c.text} <span className="text-slate-400">· {fmtClock(c.sec)}</span></div>)}
      {commenting && (
        <div className="mt-2 flex gap-2">
          <input autoFocus value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" className="flex-1 rounded border border-slate-300 bg-transparent px-2 py-1 text-xs dark:border-slate-600" />
          <Btn onClick={() => { if (comment.trim()) dispatch({ type: 'COMMENT', id: it.id, text: comment.trim() }); setComment(''); setCommenting(false) }}>Comment</Btn>
        </div>
      )}
    </div>
  )
}

/** Every action item: the viewer's first, then by due date. Overdue dates in amber. */
function ActionTable({ inst, me, flash }) {
  const { dispatch } = useStore()
  if (!inst.actionItems.length) return <None />
  const rows = [...inst.actionItems].sort((x, y) => (y.owner === me) - (x.owner === me) || (x.due < y.due ? -1 : x.due > y.due ? 1 : 0))
  const cols = 'grid grid-cols-[7.5rem_minmax(0,1fr)_7.5rem_7rem] items-center gap-3'
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className={`${cols} border-b border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800`}><span>Owner</span><span>Item</span><span>Due</span><span /></div>
      {rows.map((a) => {
        const mine = a.owner === me
        const done = a.status === 'done'
        const due = dueLabel(a)
        return (
          <div key={a.id} id={`sum-${a.id}`}
            className={`${cols} border-b border-slate-100 px-4 py-2.5 text-sm last:border-b-0 dark:border-slate-800/70 ${mine ? 'bg-ansel-50/60 dark:bg-ansel/10' : ''} ${flash === a.id ? 'flash' : ''}`}>
            <span className="flex min-w-0 items-center gap-2"><Avatar id={a.owner} size="xs" /><span className="truncate">{mine ? 'You' : firstName(a.owner)}</span></span>
            <span className={`min-w-0 ${mine ? 'font-medium' : ''} ${done ? 'text-slate-500 line-through' : ''}`}>{a.text}</span>
            <span className={due.overdue ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}>{done ? `Due ${shortDate(a.due)}` : due.text}</span>
            <span className="flex items-center justify-end gap-2">
              {(done || a.update) && <StatusPill a={a} />}
              {mine && !done && <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: a.id } })} className="text-xs font-medium text-ansel dark:text-ansel-300">Update</button>}
              <Ts t={a.t} onClick={() => jumpTo(dispatch, a.t, { item: a.id })} />
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** One bar split into themes, sized by how long each ran. The viewer's themes are outlined. */
function ThemeTimeline({ inst, me }) {
  const { dispatch } = useStore()
  const mineIds = new Set([...inst.actionItems.filter((a) => a.owner === me), ...inst.openQuestions.filter((q) => q.stakeholders?.includes(me))].map((x) => x.id))
  const segs = inst.themes.map((th) => ({ ...th, span: Math.max(60, toSec(th.end) - toSec(th.start)), mine: th.items.some((id) => mineIds.has(id)) }))
  return (
    <div>
      <div className="flex h-8 gap-0.5 overflow-hidden rounded-md">
        {segs.map((th, i) => (
          <button key={th.id} onClick={() => jumpTo(dispatch, th.start, { theme: th.id })} title={`${th.title} · ${th.start}–${th.end}`}
            style={{ flex: th.span }}
            className={`transition hover:brightness-95 dark:hover:brightness-125 ${i % 2 ? 'bg-ansel-100 dark:bg-ansel/30' : 'bg-slate-100 dark:bg-slate-800'} ${th.mine ? 'ring-2 ring-inset ring-ansel dark:ring-ansel-300' : ''}`} />
        ))}
      </div>
      <div className="mt-1.5 flex gap-0.5 text-[11px] leading-tight text-slate-500">
        {segs.map((th) => (
          <button key={th.id} onClick={() => jumpTo(dispatch, th.start, { theme: th.id })} style={{ flex: th.span }}
            className={`min-w-0 truncate text-left hover:text-slate-800 dark:hover:text-slate-200 ${th.mine ? 'font-medium text-ansel dark:text-ansel-300' : ''}`}>
            {th.title}
          </button>
        ))}
      </div>
    </div>
  )
}
