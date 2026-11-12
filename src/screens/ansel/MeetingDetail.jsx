import React from 'react'
import {
  ArrowLeft, Download, FileText, ListChecks, Lock, MessageSquare, Radio, Send, Share2, Sparkles, Users, X,
} from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { shortDate } from '../../logic/buildHeadsUp.js'
import { Avatar, Btn, Modal, personName } from '../../components/ui.jsx'
import { NipMenu, NipSwitch, canSee, useNip } from './shared.jsx'
import TranscriptTab from './TranscriptTab.jsx'
import SummaryTab from './SummaryTab.jsx'
import ActionItemsTab from './ActionItemsTab.jsx'
import AskTab from './AskTab.jsx'
import SidePanel from './SidePanel.jsx'
import ItemPanel from './ItemPanel.jsx'

const TABS = [
  ['transcript', 'Transcript', FileText],
  ['summary', 'Summary', Sparkles],
  ['actions', 'Action items', ListChecks],
  ['ask', 'Ask Ansel', MessageSquare],
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
      <header className="border-b border-slate-200 px-6 pt-4 dark:border-slate-800">
        <button onClick={() => nav({ view: 'list' })} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline">
          <ArrowLeft size={12} aria-hidden />Meetings
        </button>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{series.title}{inst && <> · {shortDate(inst.date)}{inst.durationMin ? ` · ${inst.durationMin} min` : ''}</>}{upcoming && ' · Nov 13'}</h1>
              {inst?.recorded && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Recorded</span>}
              {inst && <AccessBadge />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex -space-x-1.5">{(inst?.attendees ?? series.invitees).map((p) => <Avatar key={p} id={p} size="sm" />)}</div>
              <div className="text-xs text-slate-500">{series.cadence} · organizer {personName(series.organizer)}</div>
            </div>
          </div>
          {visible && (
            <div className="flex items-center gap-2">
              <Btn onClick={() => nav({ shareOpen: true })}><Share2 size={15} aria-hidden />Share</Btn>
              <NipMenu label="Export" Icon={Download} items={[['Export PDF', FileText], ['Export CSV (action items)', ListChecks]]} />
              <NipMenu label="Send to" Icon={Send} items={[['Send to Slack thread', MessageSquare], ['Send to Teams', MessageSquare], ['Send to Asana', ListChecks], ['Send to Jira', ListChecks], ['Send to Linear', ListChecks]]} />
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1 text-sm">
          {SEED.instances.map((i) => (
            <button key={i.id} onClick={() => nav({ instanceId: i.id, panelItem: null, highlight: null, selectedItem: null, themeId: null })}
              className={`rounded-md px-2.5 py-1 ${i.id === state.ansel.instanceId ? 'bg-ansel font-semibold text-white dark:bg-ansel-400 dark:text-slate-950' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>
              {shortDate(i.date)}
            </button>
          ))}
          <button onClick={() => nav({ instanceId: 'upcoming', panelItem: null })}
            className={`rounded-md border border-dashed px-2.5 py-1 ${upcoming ? 'border-ansel text-ansel dark:text-ansel-300' : 'border-slate-300 text-slate-500 dark:border-slate-600'}`}>Nov 13 · upcoming</button>
        </div>
        {!upcoming && (
          <div className="mt-3 flex gap-5">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} onClick={() => nav({ tab: id })}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2 text-sm ${tab === id ? 'border-ansel font-semibold text-ansel dark:border-ansel-300 dark:text-ansel-300' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                <Icon size={14} aria-hidden />{label}
              </button>
            ))}
          </div>
        )}
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
                {tab === 'ask' && <AskTab inst={inst} />}
              </>
            )}
        </div>
        {onTranscript && state.ansel.sideOpen && <SidePanel inst={inst} />}
        {visible && !onTranscript && state.ansel.panelItem && <ItemPanel id={state.ansel.panelItem} />}
      </div>
      {state.ansel.shareOpen && inst && <ShareDialog inst={inst} series={series} onClose={() => nav({ shareOpen: false })} />}
    </div>
  )
}

function AccessBadge() {
  const { state } = useStore()
  const shared = state.share && state.ansel.instanceId === 'wps-1106'
  return (
    <span title="Who can open this record" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <Lock size={11} aria-hidden />Attendees only{shared && ' + 1 direct share'}
    </span>
  )
}

function Upcoming({ series }) {
  const { state, world } = useStore()
  return (
    <div className="max-w-2xl space-y-4 p-6 text-sm text-slate-600 dark:text-slate-300">
      <p>Fri Nov 13 · 2:00 PM. Ansel will join as a visible participant, record and transcribe as usual. Heads-Up posts in Slack {world.person(state.persona).reminderMinutes} minutes before for eligible attendees.</p>
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
  const direct = state.share && inst.id === 'wps-1106' ? ['aryan'] : []
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
          {direct.map((p) => (
            <li key={p} className="flex items-center gap-2">
              <Avatar id={p} size="xs" /><span className="flex-1">{personName(p)}</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">Direct share</span>
            </li>
          ))}
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
