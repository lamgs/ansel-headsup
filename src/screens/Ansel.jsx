// Ansel web app mockup. The meeting record (Summary, Transcript, Action items) works;
// the rest of the app is visible so the product looks complete, but inactive.
import React from 'react'
import { CalendarDays, House, MessageSquare, Search, Settings, ShieldCheck, ExternalLink } from 'lucide-react'
import { useStore } from '../state/store.jsx'
import { Avatar, personName } from '../components/ui.jsx'
import MeetingDetail from './ansel/MeetingDetail.jsx'
import { HomePage, SearchPage, SettingsPage } from './ansel/Pages.jsx'
import { MeetingList } from './ansel/MeetingsPage.jsx'
import AskAnselChat from './ansel/AskAnselChat.jsx'
import EditItemDialog from './ansel/EditItemDialog.jsx'

const NAV = [
  ['home', 'Home', House],
  ['meetings', 'Meetings', CalendarDays],
  ['search', 'Search', Search],
  ['settings', 'Settings', Settings],
]

export default function Ansel() {
  const { state, dispatch } = useStore()
  const page = state.ansel.page
  const go = (id) => dispatch({ type: 'ANSEL_NAV', nav: { page: id, ...(id === 'meetings' ? { view: 'list' } : {}) } })
  return (
    <div className="flex h-full min-h-0">
      <nav className="flex w-52 shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2 px-2 pt-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ansel font-bold text-white">A</span>
          <div className="leading-tight">
            <div className="font-semibold">Ansel</div>
            <div className="text-[11px] text-slate-500">Acme workspace</div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} onClick={() => go(id)}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm ${page === id ? 'bg-ansel-100 font-semibold text-ansel dark:bg-ansel/30 dark:text-ansel-300' : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              <Icon size={16} aria-hidden />{label}
            </button>
          ))}
          <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { chat: 'open' } })}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800">
            <MessageSquare size={16} aria-hidden />Ask Ansel
          </button>
        </div>
        <div className="mt-auto space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'governance' })} title="Opens Setup & governance"
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800">
            <ShieldCheck size={16} aria-hidden />Admin console<ExternalLink size={12} className="ml-auto text-slate-400" aria-hidden />
          </button>
          <div className="flex items-center gap-2 px-2 py-1 text-sm">
            <Avatar id={state.persona} size="xs" /><span className="truncate">{personName(state.persona)}</span>
          </div>
        </div>
      </nav>
      <div className="min-w-0 flex-1 overflow-hidden">
        {page === 'meetings' && (state.ansel.view === 'list' ? <MeetingList /> : <MeetingDetail />)}
        {page === 'home' && <HomePage />}
        {page === 'search' && <SearchPage />}
        {page === 'settings' && <SettingsPage />}
      </div>
      <AskAnselChat />
      {state.ansel.editItem && <EditItemDialog key={state.ansel.editItem} id={state.ansel.editItem} />}
    </div>
  )
}
