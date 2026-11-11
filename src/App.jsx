import React, { useEffect } from 'react'
import { useStore } from './state/store.jsx'
import DemoBar from './components/DemoBar.jsx'
import Drawer from './components/Drawer.jsx'
import Slack from './screens/Slack.jsx'
import Ansel from './screens/Ansel.jsx'
import Governance from './screens/Governance.jsx'
import PilotLog from './screens/PilotLog.jsx'
import JoinFlow from './screens/JoinFlow.jsx'

function Toasts() {
  const { state, dispatch } = useStore()
  useEffect(() => {
    const timers = state.toasts.map((t) => setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: t.id }), 4500))
    return () => timers.forEach(clearTimeout)
  }, [state.toasts])
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {state.toasts.map((t) => (
        <button key={t.id}
          onClick={() => { if (t.action === 'openDM') dispatch({ type: 'SLACK_CHANNEL', id: 'ansel' }); dispatch({ type: 'DISMISS_TOAST', id: t.id }) }}
          className="slidein pointer-events-auto rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl dark:bg-slate-100 dark:text-slate-900">
          {t.text}{t.action === 'openDM' && <span className="ml-2 font-semibold underline">Open</span>}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const { state } = useStore()
  return (
    <div className="flex h-full flex-col">
      <DemoBar />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-hidden">
          {state.tab === 'slack' && <Slack />}
          {state.tab === 'ansel' && <Ansel />}
          {state.tab === 'governance' && <Governance />}
          {state.tab === 'pilot' && <PilotLog />}
        </main>
        {state.drawerOpen && <Drawer />}
      </div>
      <JoinFlow />
      <Toasts />
    </div>
  )
}
