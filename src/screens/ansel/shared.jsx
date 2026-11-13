// Helpers shared by the Ansel mockup screens.
import React, { useState } from 'react'
import { ChevronDown, CircleHelp, Gavel, ListChecks } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { firstName, fmtClock } from '../../components/ui.jsx'
import { shortDate } from '../../logic/buildHeadsUp.js'
import { toSec } from '../../data/transcripts.js'

export { toSec }

/** Click handler factory for controls that look real but aren't built. */
export function useNip() {
  const { dispatch } = useStore()
  return (what) => () => dispatch({ type: 'NOT_IN_PROTOTYPE', what })
}

/** Open the transcript at a line. Optionally select a summary item or theme. */
export function jumpTo(dispatch, t, { item = null, theme = null } = {}) {
  dispatch({
    type: 'ANSEL_NAV',
    nav: {
      tab: 'transcript', highlight: t ? { t, n: Date.now() } : null,
      // The transcript has no item panel (it repeated the Heads-Up card), so close it.
      selectedItem: item, themeId: theme, panelItem: null,
    },
  })
}

export const KIND = {
  decision: { label: 'Decision', Icon: Gavel, chip: 'bg-ansel-50 text-ansel border-ansel-100 dark:bg-ansel/20 dark:text-ansel-300 dark:border-ansel/40', dot: 'bg-ansel dark:bg-ansel-300', tint: 'bg-ansel-50/70 dark:bg-ansel/10' },
  question: { label: 'Open question', Icon: CircleHelp, chip: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30', dot: 'bg-amber-500', tint: 'bg-amber-50/70 dark:bg-amber-500/5' },
  action: { label: 'Action item', Icon: ListChecks, chip: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30', dot: 'bg-emerald-500', tint: 'bg-emerald-50/70 dark:bg-emerald-500/5' },
}

/** All summary items of a meeting, in summary order, tagged with their kind. */
export function itemsOf(inst) {
  return [
    ...inst.decisions.map((item) => ({ item, kind: 'decision' })),
    ...inst.openQuestions.map((item) => ({ item, kind: 'question' })),
    ...inst.actionItems.map((item) => ({ item, kind: 'action' })),
  ]
}

/** Map transcript time → summary items that cite that line. */
export function citedByTime(inst) {
  const m = new Map()
  for (const x of itemsOf(inst)) m.set(x.item.t, [...(m.get(x.item.t) || []), x])
  return m
}

export const canSee = (state, inst) =>
  inst.attendees.includes(state.persona)

export const lineKey = (instId, t) => `line:${instId}:${t}`

export function statusText(a) {
  const u = a.update
  if (!u) return a.status === 'done' ? 'Done' : 'Open'
  if (u.kind === 'done') return `Done · ${firstName(u.by)}, ${fmtClock(u.atSec)}`
  if (u.kind === 'on_track') return `On track for today (${firstName(u.by)})`
  if (u.kind === 'new_date') return `Moved to ${shortDate(u.due)}`
  if (u.kind === 'reassign') return `Reassigned by ${firstName(u.by)}${u.note ? ` · “${u.note}”` : ''}`
  return 'Open'
}

export function StatusPill({ a }) {
  const done = a.status === 'done'
  const onTrack = a.update?.kind === 'on_track'
  const cls = done
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
    : onTrack
      ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[13px] font-medium ${cls}`}>{done ? 'Done' : onTrack ? 'On track' : a.update ? statusText(a) : 'Open'}</span>
}

export function KindChip({ kind, onClick, active }) {
  const k = KIND[kind]
  return (
    <button onClick={onClick} title={`${k.label} in the summary`}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[13px] font-medium ${k.chip} ${active ? 'ring-2 ring-offset-1 ring-ansel/40 dark:ring-offset-slate-950' : ''}`}>
      <k.Icon size={11} aria-hidden />{k.label}
    </button>
  )
}

/** Dropdown whose entries are all inactive (Export, Send to). */
export function NipMenu({ label, Icon, items, compact = false }) {
  const [open, setOpen] = useState(false)
  const nip = useNip()
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} title={label}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[15px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
        {Icon && <Icon size={15} aria-hidden />}<span className={compact ? 'hidden @4xl:inline' : ''}>{label}</span><ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="slidein absolute right-0 z-40 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {items.map(([text, ItemIcon]) => (
              <button key={text} onClick={() => { setOpen(false); nip(text)() }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[15px] hover:bg-slate-100 dark:hover:bg-slate-800">
                {ItemIcon && <ItemIcon size={14} className="text-slate-500" aria-hidden />}{text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** A switch that looks real; clicking shows the not-in-prototype toast. */
export function NipSwitch({ on, what }) {
  const nip = useNip()
  return (
    <button role="switch" aria-checked={on} onClick={nip(what)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? 'bg-ansel dark:bg-ansel-400' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? 'left-4' : 'left-0.5'}`} />
    </button>
  )
}

export const commentWhen = (c) => (c.on ? shortDate(c.on) : `Today ${fmtClock(c.sec)}`)
