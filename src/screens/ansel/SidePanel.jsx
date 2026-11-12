// Right panel on the Transcript tab: Summary / Action items / Comments, all linked to lines.
import React from 'react'
import { PanelRightClose, Send } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { shortDate } from '../../logic/buildHeadsUp.js'
import { Avatar, firstName, personName } from '../../components/ui.jsx'
import { KIND, StatusPill, commentWhen, jumpTo, useNip } from './shared.jsx'
import ItemPanel from './ItemPanel.jsx'

const TABS = [['summary', 'Summary'], ['actions', 'Action items'], ['comments', 'Comments']]

export default function SidePanel({ inst }) {
  const { state, dispatch } = useStore()
  if (state.ansel.panelItem) return <ItemPanel id={state.ansel.panelItem} />
  const tab = state.ansel.sideTab
  const nav = (n) => dispatch({ type: 'ANSEL_NAV', nav: n })
  const commentCount = Object.entries(state.comments)
    .filter(([k]) => k.startsWith(`line:${inst.id}:`)).reduce((n, [, v]) => n + v.length, 0)

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 pt-3 dark:border-slate-800">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => nav({ sideTab: id })}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2 text-sm ${tab === id ? 'border-ansel font-semibold text-ansel dark:border-ansel-300 dark:text-ansel-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
            {label}{id === 'comments' && commentCount > 0 && <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] dark:bg-slate-700">{commentCount}</span>}
          </button>
        ))}
        <button onClick={() => nav({ sideOpen: false })} title="Hide panel" className="mb-2 ml-auto rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800">
          <PanelRightClose size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-20">
        {tab === 'summary' && <SummaryList inst={inst} />}
        {tab === 'actions' && <ActionList inst={inst} />}
        {tab === 'comments' && <CommentList inst={inst} />}
      </div>
    </aside>
  )
}

function Row({ id, t, kind, selected, onClick, children }) {
  const k = kind && KIND[kind]
  return (
    <button onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm ${selected ? 'bg-white shadow-sm ring-1 ring-ansel/30 dark:bg-slate-800 dark:ring-ansel-300/30' : 'hover:bg-white dark:hover:bg-slate-800'}`}>
      {k && <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${k.dot}`} />}
      <span className="min-w-0 flex-1">{children}</span>
      <span className="shrink-0 pt-0.5 font-mono text-[11px] text-ansel dark:text-ansel-300">▶ {t}</span>
    </button>
  )
}

function Section({ title, children, empty }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {empty ? <p className="px-2 text-xs text-slate-400">None.</p> : children}
    </section>
  )
}

function SummaryList({ inst }) {
  const { state, dispatch } = useStore()
  const sel = state.ansel.selectedItem
  const go = (x) => jumpTo(dispatch, x.t, { item: x.id })
  return (
    <>
      <Section title="Decisions" empty={!inst.decisions.length}>
        {inst.decisions.map((d) => (
          <Row key={d.id} t={d.t} kind="decision" selected={sel === d.id} onClick={() => go(d)}>
            {d.text}
            {d.trackedChange && <span className="ml-1 rounded border border-amber-400 px-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">Edited</span>}
          </Row>
        ))}
      </Section>
      <Section title="Open questions" empty={!inst.openQuestions.length}>
        {inst.openQuestions.map((q) => (
          <Row key={q.id} t={q.t} kind="question" selected={sel === q.id} onClick={() => go(q)}>
            {q.text}{q.status === 'resolved' && <span className="ml-1 text-xs text-emerald-600">Resolved</span>}
          </Row>
        ))}
      </Section>
      <Section title="Action items" empty={!inst.actionItems.length}>
        {inst.actionItems.map((a) => (
          <Row key={a.id} t={a.t} kind="action" selected={sel === a.id} onClick={() => go(a)}>
            {a.text}
            <span className="mt-0.5 block text-xs text-slate-500">{firstName(a.owner)} · due {shortDate(a.due)}</span>
          </Row>
        ))}
      </Section>
      <Section title="Themes" empty={!(inst.themes || []).length}>
        {(inst.themes || []).map((th) => (
          <Row key={th.id} t={th.start} selected={state.ansel.themeId === th.id} onClick={() => jumpTo(dispatch, th.start, { theme: th.id })}>
            {th.title}<span className="block text-xs text-slate-500">{th.start}–{th.end}</span>
          </Row>
        ))}
      </Section>
    </>
  )
}

function ActionList({ inst }) {
  const { state, dispatch } = useStore()
  const nip = useNip()
  if (!inst.actionItems.length) return <p className="px-2 text-sm text-slate-400">No action items.</p>
  return (
    <ul className="space-y-2">
      {inst.actionItems.map((a) => (
        <li key={a.id} className="rounded-md border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start gap-2">
            <span className="flex-1">{a.text}</span>
            <button onClick={() => jumpTo(dispatch, a.t, { item: a.id })} className="font-mono text-[11px] text-ansel dark:text-ansel-300">▶ {a.t}</button>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
            <Avatar id={a.owner} size="xs" />{personName(a.owner)} · due {shortDate(a.due)}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill a={a} />
            <span className="flex-1" />
            {a.owner === state.persona && a.status !== 'done' && (
              <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { panelItem: a.id } })} className="text-xs font-medium text-ansel dark:text-ansel-300">Update</button>
            )}
            <button onClick={nip('Send to Asana')} title="Send to Asana, Jira or Linear" className="text-slate-400 hover:text-slate-700"><Send size={13} /></button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CommentList({ inst }) {
  const { state, dispatch } = useStore()
  const prefix = `line:${inst.id}:`
  const rows = Object.entries(state.comments)
    .filter(([k]) => k.startsWith(prefix))
    .flatMap(([k, list]) => list.map((c) => ({ t: k.slice(prefix.length), c })))
    .sort((a, b) => (a.t < b.t ? -1 : 1))
  if (!rows.length) return <p className="px-2 text-sm text-slate-400">No comments yet. Hover a line to add one.</p>
  return (
    <ul className="space-y-1">
      {rows.map(({ t, c }, i) => (
        <li key={`${t}-${i}`}>
          <Row t={t} onClick={() => jumpTo(dispatch, t)}>
            <span className="flex items-center gap-1.5"><Avatar id={c.by} size="xs" /><b className="font-semibold">{firstName(c.by)}</b><span className="text-xs text-slate-400">{commentWhen(c)}</span></span>
            <span className="mt-0.5 block">{c.text}</span>
          </Row>
        </li>
      ))}
    </ul>
  )
}

