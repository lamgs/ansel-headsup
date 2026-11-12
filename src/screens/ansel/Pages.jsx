// App pages around the meeting record. Visible so Ansel looks complete; mostly inactive.
import React from 'react'
import { BellRing, CalendarDays, Check, EyeOff, Mic, Search } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { longDate } from '../../logic/buildHeadsUp.js'
import { Avatar, firstName } from '../../components/ui.jsx'
import HeadsUpSettings from '../HeadsUpSettings.jsx'
import { NipSwitch, useNip } from './shared.jsx'

const Page = ({ title, sub, children }) => (
  <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      <div className="mt-6">{children}</div>
    </div>
  </div>
)
const Card = ({ children, className = '' }) => <div className={`rounded-lg border border-slate-200 p-4 dark:border-slate-800 ${className}`}>{children}</div>

const openMeeting = (dispatch, instanceId, nav = {}) => dispatch({ type: 'OPEN_ANSEL', nav: { instanceId, tab: 'summary', ...nav } })

export function HomePage() {
  const { state, dispatch } = useStore()
  const sent = state.processed[`${state.persona}:wps`]?.eligible
  return (
    <Page title={`Good afternoon, ${firstName(state.persona)}`} sub="Fri Nov 13">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Coming up today</h2>
      <div className="space-y-2">
        <Card className="flex items-center gap-3">
          <CalendarDays size={18} className="text-ansel dark:text-ansel-300" aria-hidden />
          <div className="flex-1"><div className="font-medium">Weekly Product Sync · 2:00 PM</div><div className="text-xs text-slate-500">Recurring · Ansel will join and record</div></div>
          {sent && <span className="inline-flex items-center gap-1 rounded-full bg-ansel-50 px-2 py-0.5 text-xs font-medium text-ansel dark:bg-ansel/20 dark:text-ansel-300"><BellRing size={12} aria-hidden />Heads-Up sent in Slack</span>}
        </Card>
        <Card className="flex items-center gap-3">
          <CalendarDays size={18} className="text-slate-400" aria-hidden />
          <div className="flex-1"><div className="font-medium">Design Review · 4:00 PM</div><div className="text-xs text-slate-500">Last meeting had Ansel kept out, so there's no record</div></div>
        </Card>
      </div>
      <h2 className="mb-2 mt-8 text-xs font-bold uppercase tracking-wider text-slate-500">Recent meetings</h2>
      <RecentList />
    </Page>
  )
}

function RecentList() {
  const { dispatch } = useStore()
  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {SEED.instances.slice().reverse().map((i) => (
        <button key={i.id} onClick={() => openMeeting(dispatch, i.id)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900">
          <span><span className="font-medium">Weekly Product Sync</span><span className="ml-2 text-sm text-slate-500">{longDate(i.date)}</span></span>
          <span className="flex items-center gap-3">
            <span className="flex -space-x-1">{i.attendees.slice(0, 4).map((p) => <Avatar key={p} id={p} size="xs" />)}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Mic size={12} aria-hidden />Recorded</span>
          </span>
        </button>
      ))}
      <div className="flex items-center justify-between px-4 py-3 text-slate-500">
        <span><span className="font-medium">Design Review</span><span className="ml-2 text-sm">Fri Oct 30</span></span>
        <span className="inline-flex items-center gap-1 text-xs"><EyeOff size={12} aria-hidden />Not recorded (Ansel kept out)</span>
      </div>
    </div>
  )
}

export function MeetingList() {
  return <Page title="Meetings" sub="Meetings you attended. Notes are visible to attendees by default."><RecentList /></Page>
}

export function SearchPage() {
  const nip = useNip()
  return (
    <Page title="Search" sub="Search transcripts and summaries.">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input readOnly onClick={nip('Search')} placeholder="Search your meetings"
          className="w-full cursor-pointer rounded-lg border border-slate-300 bg-transparent py-2.5 pl-10 pr-3 text-sm dark:border-slate-700" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-ansel px-2.5 py-1 font-medium text-white dark:bg-ansel-400 dark:text-slate-950">Meetings you attended</span>
        <button onClick={nip('Shared with me')} className="rounded-full border border-slate-300 px-2.5 py-1 text-slate-600 dark:border-slate-600 dark:text-slate-300">Shared with me</button>
        <button onClick={nip('Date filter')} className="rounded-full border border-slate-300 px-2.5 py-1 text-slate-600 dark:border-slate-600 dark:text-slate-300">Any date</button>
      </div>
      <p className="mt-6 text-sm text-slate-500">Default scope is meetings you attended. Records outside it appear only if they're shared with you directly and workspace policy allows it.</p>
    </Page>
  )
}

export function SettingsPage() {
  const nip = useNip()
  const Toggle = ({ title, sub, on, what }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><div className="text-sm font-medium">{title}</div><div className="text-xs text-slate-500">{sub}</div></div>
      <NipSwitch on={on} what={what} />
    </div>
  )
  const Integration = ({ name, connected }) => (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span>{name}</span>
      {connected
        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><Check size={13} aria-hidden />Connected</span>
        : <button onClick={nip(`Connect ${name}`)} className="rounded-md border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-600">Connect</button>}
    </div>
  )
  return (
    <Page title="Settings">
      <div className="space-y-6">
        <HeadsUpSettings />
        <div className="max-w-xl rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-semibold">Recording &amp; privacy</h2>
          <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
            <Toggle title="Join meetings on my calendar" sub="Ansel joins as a visible participant with the usual recording notice." on what="Auto-join" />
            <Toggle title="Keep Ansel out by default" sub="You can also keep Ansel out of a single meeting." on={false} what="Keep Ansel out" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Retention: 400 days, set by your workspace admin. Sharing default: attendees only.</p>
        </div>
        <div className="max-w-xl rounded-lg border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-semibold">Integrations</h2>
          <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
            <Integration name="Outlook calendar" connected />
            <Integration name="Slack" connected />
            <Integration name="Asana" />
            <Integration name="Jira" />
            <Integration name="Linear" />
          </div>
        </div>
      </div>
    </Page>
  )
}
