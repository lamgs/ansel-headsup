// Ansel web app mockup. The meeting record (Summary, Transcript) and the Meetings page with the
// Heads-Up card work; the rest of the app is visible so the product looks complete, but inactive.
import React from 'react'
import { CalendarDays, House, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, ExternalLink } from 'lucide-react'
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
  const slim = !!state.ansel.navCollapsed
  const go = (id) => dispatch({ type: 'ANSEL_NAV', nav: { page: id, ...(id === 'meetings' ? { view: 'list' } : {}) } })
  const item = (active) => `flex items-center gap-2.5 rounded-md py-2 text-left text-[15px] ${slim ? 'justify-center px-0' : 'px-2'} ${active ? 'bg-ansel-100 font-semibold text-ansel dark:bg-ansel/30 dark:text-ansel-300' : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800'}`
  return (
    <div className="flex h-full min-h-0">
      {/* Left menu: collapses to an icon rail */}
      <nav aria-label="Ansel" className={`flex shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3 transition-[width] dark:border-slate-800 dark:bg-slate-900 ${slim ? 'w-16' : 'w-56'}`}>
        <div className={`mb-4 flex items-center gap-2 pt-1 ${slim ? 'flex-col' : 'px-2'}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ansel font-bold text-white">A</span>
          {!slim && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-semibold">Ansel</div>
              <div className="text-[13px] text-slate-500">Acme workspace</div>
            </div>
          )}
          <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { navCollapsed: !slim } })} title={slim ? 'Expand menu' : 'Collapse menu'} aria-label={slim ? 'Expand menu' : 'Collapse menu'}
            className="rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800">
            {slim ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} onClick={() => go(id)} title={slim ? label : undefined} aria-label={label} className={item(page === id)}>
              <Icon size={18} aria-hidden />{!slim && label}
            </button>
          ))}
          <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { chat: 'open' } })} title={slim ? 'Ask Ansel' : undefined} aria-label="Ask Ansel" className={item(false)}>
            <MessageSquare size={18} aria-hidden />{!slim && 'Ask Ansel'}
          </button>
        </div>
        <div className="mt-auto space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <button onClick={() => dispatch({ type: 'SET_TAB', tab: 'governance' })} title="Opens Setup & governance" aria-label="Admin console" className={`w-full ${item(false)}`}>
            <ShieldCheck size={18} aria-hidden />{!slim && <>Admin console<ExternalLink size={13} className="ml-auto text-slate-400" aria-hidden /></>}
          </button>
          <div className={`flex items-center gap-2 py-1 text-[15px] ${slim ? 'justify-center' : 'px-2'}`} title={personName(state.persona)}>
            <Avatar id={state.persona} size="sm" />{!slim && <span className="truncate">{personName(state.persona)}</span>}
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
