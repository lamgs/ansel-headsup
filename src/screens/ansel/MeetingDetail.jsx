import React, { useState } from 'react'
import {
  ArrowLeft, BellRing, Check, ChevronDown, Download, FileText, ListChecks, Lock, MessageSquare, Radio, Send, Share2, Sparkles, Users, X,
} from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { longDate, shortDate } from '../../logic/buildHeadsUp.js'
import { Avatar, Btn, Modal, personName } from '../../components/ui.jsx'
import { NipMenu, NipSwitch, canSee, useNip } from './shared.jsx'
import TranscriptTab from './TranscriptTab.jsx'
import SummaryTab from './SummaryTab.jsx'
import ActionItemsTab from './ActionItemsTab.jsx'
import ItemPanel from './ItemPanel.jsx'
import { latestMeetingId } from './SummaryTab.jsx'

const TABS = [
  ['transcript', 'Transcript', FileText],
  ['summary', 'Summary', Sparkles],
  ['actions', 'Action items', ListChecks],
]

export default function MeetingDetail() {
  const { state, dispatch, world } = useStore()
  const series = SEED.series[0]
  const upcoming = state.ansel.instanceId === 'upcoming'
  const inst = upcoming ? null : world.instance(state.ansel.instanceId)
  const nav = (n) => dispatch({ type: 'ANSEL_NAV', nav: n })
  const visible = inst && canSee(state, inst)
  const tab = state.ansel.tab
  const onTranscript = visible && tab === 'transcript'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="@container border-b border-slate-200 px-5 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button onClick={() => nav({ view: 'list' })} title="Back to meetings" aria-label="Back to meetings"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"><ArrowLeft size={16} /></button>
          <h1 className="min-w-0 shrink truncate text-lg font-semibold" title={series.title}>{series.title}</h1>
          <InstanceMenu inst={inst} upcoming={upcoming} />
          {inst?.recorded && <span className="hidden items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 @2xl:inline-flex dark:bg-rose-500/10 dark:text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Recorded</span>}
          {inst && <AccessBadge />}
          <span className="flex-1" />
          <div className="hidden -space-x-1.5 @3xl:flex" title={(inst?.attendees ?? series.invitees).map(personName).join(', ')}>
            {(inst?.attendees ?? series.invitees).map((p) => <Avatar key={p} id={p} size="sm" />)}
          </div>
          {visible && (
            <div className="flex items-center gap-1.5">
              <Btn onClick={() => nav({ shareOpen: true })} title="Share"><Share2 size={15} aria-hidden /><span className="hidden @4xl:inline">Share</span></Btn>
              <NipMenu label="Export" Icon={Download} compact items={[['Export PDF', FileText], ['Export CSV (action items)', ListChecks]]} />
              <NipMenu label="Send to" Icon={Send} compact items={[['Send to Slack thread', MessageSquare], ['Send to Teams', MessageSquare], ['Send to Asana', ListChecks], ['Send to Jira', ListChecks], ['Send to Linear', ListChecks]]} />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-end gap-5">
          {!upcoming && TABS.map(([id, label, Icon]) => (
            <button key={id} onClick={() => nav({ tab: id })}
              className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2 text-sm ${tab === id ? 'border-ansel font-semibold text-ansel dark:border-ansel-300 dark:text-ansel-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
              <Icon size={14} aria-hidden />{label}
            </button>
          ))}
          <span className="ml-auto hidden truncate pb-2 text-xs text-slate-500 @3xl:block">{series.cadence} · organizer {personName(series.organizer)}</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto" id="ansel-scroll">
          {upcoming ? <Upcoming series={series} />
            : !visible ? (
              <div className="p-6 text-sm text-slate-600 dark:text-slate-300">{personName(state.persona)} didn't attend this meeting. Notes are visible to attendees and to people the organizer shares them with directly.</div>
            ) : (
              <>
                {tab === 'transcript' && <TranscriptTab inst={inst} />}
                {tab === 'summary' && <SummaryTab inst={inst} series={series} />}
                {tab === 'actions' && <ActionItemsTab inst={inst} />}
              </>
            )}
        </div>
        {/* No side panel: the item panel (Mark done / On track / New date) opens only for an action item. */}
        {visible && state.ansel.panelItem && <ItemPanel id={state.ansel.panelItem} />}
      </div>
      {state.ansel.shareOpen && inst && <ShareDialog inst={inst} series={series} onClose={() => nav({ shareOpen: false })} />}
    </div>
  )
}

/** "Fri Nov 6 · 48 min ▾": switch between meetings in the series. */
function InstanceMenu({ inst, upcoming }) {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const go = (instanceId) => { setOpen(false); dispatch({ type: 'ANSEL_NAV', nav: { instanceId, panelItem: null, highlight: null, selectedItem: null, themeId: null } }) }
  const label = upcoming ? 'Fri Nov 13 · upcoming' : longDate(inst.date)
  const duration = !upcoming && inst.durationMin ? ` · ${inst.durationMin} min` : ''
  const rows = [{ id: 'upcoming', text: 'Fri Nov 13', sub: 'Upcoming · 2:00 PM' }, ...SEED.instances.slice().reverse().map((i) => ({ id: i.id, text: longDate(i.date), sub: i.recorded ? 'Recorded' : 'Not recorded' }))]
  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        {label}<span className="hidden @4xl:inline">{duration}</span><ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="slidein absolute left-0 z-40 mt-1 w-60 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Weekly Product Sync</div>
            {rows.map((r) => (
              <button key={r.id} onClick={() => go(r.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="flex-1"><span className="block">{r.text}</span><span className="block text-xs text-slate-500">{r.sub}</span></span>
                {r.id === state.ansel.instanceId && <Check size={14} className="text-ansel dark:text-ansel-300" aria-hidden />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function AccessBadge() {
  const { state } = useStore()
  const shared = state.share && state.ansel.instanceId === 'wps-1106'
  return (
    <span title="Who can open this record" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <Lock size={11} aria-hidden />Attendees only{shared && ' + 1 direct share'}
    </span>
  )
}

function Upcoming({ series }) {
  const { dispatch } = useStore()
  return (
    <div className="max-w-3xl space-y-4 p-6 text-sm text-slate-600 dark:text-slate-300">
      <button onClick={() => dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: latestMeetingId(series), tab: 'summary' } })}
        className="flex w-full items-center gap-3 rounded-xl border border-ansel/30 bg-ansel-50/60 p-4 text-left hover:border-ansel/60 dark:border-ansel-300/30 dark:bg-ansel/10">
        <BellRing size={18} className="text-ansel dark:text-ansel-300" aria-hidden />
        <span className="flex-1"><span className="block font-medium text-slate-800 dark:text-slate-100">Your Heads-Up for this meeting</span><span className="text-xs text-slate-500">Built from the last meeting's record. Opens on its Summary.</span></span>
        <span className="text-xs font-medium text-ansel dark:text-ansel-300">Open</span>
      </button>
      <p>Fri Nov 13 · 2:00 PM. Ansel will join as a visible participant, record and transcribe as usual. A short version of the Heads-Up also posts in Slack, with a link to the full card.</p>
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
          <Radio size={15} aria-hidden />Live summary
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">Beta</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">A rolling summary attendees can see during the meeting.</p>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">Keep Ansel out of this meeting</div>
          <p className="mt-0.5 text-xs text-slate-500">Any host or attendee can keep Ansel out. There's no record, so Heads-Up skips the next card.</p>
        </div>
        <NipSwitch on={false} what="Keep Ansel out" />
      </div>
      <p className="text-xs text-slate-500">Series: {series.title} · {series.cadence}</p>
    </div>
  )
}

function ShareDialog({ inst, series, onClose }) {
  const { state } = useStore()
  const nip = useNip()
  const isOrganizer = state.persona === series.organizer
  const direct = state.share && inst.id === 'wps-1106' // Governance G3: shared with a new teammate
  return (
    <Modal onClose={onClose}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <h2 className="font-semibold">Share “{series.title} · {shortDate(inst.date)}”</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close"><X size={16} /></button>
        </div>
        <input readOnly onClick={nip('Direct share')} placeholder="Add people from Acme"
          className="mt-4 w-full cursor-pointer rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600" />
        <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">People with access</div>
        <ul className="mt-2 space-y-1.5 text-sm">
          {inst.attendees.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Avatar id={p} size="xs" /><span className="flex-1">{personName(p)}</span>
              <span className="text-xs text-slate-500">{p === series.organizer ? 'Organizer' : 'Attendee'}</span>
            </li>
          ))}
          {direct && (
            <li className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-[9px] font-semibold text-white dark:bg-slate-600">+</span>
              <span className="flex-1">New teammate</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">Direct share</span>
            </li>
          )}
        </ul>
        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800">
          <Users size={15} className="text-slate-500" aria-hidden />
          <span className="flex-1">General access: <b>Attendees only</b></span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {isOrganizer ? 'You set access as organizer.' : `Only ${personName(series.organizer)} (organizer) can change access.`} Workspace policy allows internal direct shares; external guests can't be added. Every access is recorded in the admin audit log.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={nip('Copy link')}>Copy link</Btn>
          <Btn variant="primary" onClick={onClose}>Done</Btn>
        </div>
      </div>
    </Modal>
  )
}
