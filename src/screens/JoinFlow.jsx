import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'
import { Avatar, Btn, Modal, personName, fmtClock } from '../components/ui.jsx'

export default function JoinFlow() {
  const { state, dispatch } = useStore()
  const j = state.join
  if (!j) return null
  const series = SEED.series.find((s) => s.id === j.sid)

  if (j.step === 'notice') return <ConsentDialog series={series} dispatch={dispatch} />

  const people = ['alicia', 'rishabh', 'varun', state.persona === 'gabriel' ? 'gabriel' : state.persona].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between px-5 py-3 text-sm">
        <span className="font-semibold">{series.title} · {fmtClock(state.clock)} <span className="ml-2 text-xs text-slate-400">Video call (mock)</span></span>
        {!j.keptOut
          ? <span className="inline-flex items-center gap-2 rounded-full bg-rose-600/20 px-3 py-1 text-xs font-medium text-rose-300"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />Recording in progress</span>
          : <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Ansel is not in this meeting</span>}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 p-5 lg:grid-cols-3">
        {people.map((p) => (
          <div key={p} className="relative flex items-center justify-center rounded-xl bg-slate-800">
            <Avatar id={p} size="lg" />
            <span className="absolute bottom-2 left-3 text-sm">{personName(p)}{p === state.persona ? ' (you)' : ''}</span>
          </div>
        ))}
        {!j.keptOut && (
          <div className="relative flex items-center justify-center rounded-xl border border-ansel-400/40 bg-ansel/30">
            <Avatar id="ansel" size="lg" />
            <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-rose-500" title="Recording" />
            <span className="absolute bottom-2 left-3 text-sm">Ansel Notetaker</span>
          </div>
        )}
      </div>
      <div className="flex justify-center gap-3 pb-6">
        <Btn variant="secondary">Mute</Btn>
        <Btn variant="secondary">Camera</Btn>
        <Btn variant="danger" onClick={() => dispatch({ type: 'JOIN_CLOSE' })}>Leave</Btn>
      </div>
    </div>
  )
}

// Shown every time Join is pressed, before the call opens.
function ConsentDialog({ series, dispatch }) {
  const [agreed, setAgreed] = useState(false)
  const close = () => dispatch({ type: 'JOIN_CLOSE' })
  return (
    <Modal onClose={close}>
      <div className="p-5" role="dialog" aria-labelledby="join-consent-title">
        <div className="flex items-center gap-3">
          <Avatar id="ansel" size="md" />
          <div>
            <div id="join-consent-title" className="text-sm font-semibold">Ansel will join this meeting</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{series.title}</div>
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>Ansel Notetaker joins as a visible participant.</li>
          <li>The meeting is recorded and transcribed.</li>
          <li>Notes, action items and the next Heads-Up are shared only with attendees and people given access.</li>
        </ul>
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700">
          <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I understand and consent to Ansel recording and transcribing this meeting.</span>
        </label>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Btn variant="ghost" onClick={close}>Cancel</Btn>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => dispatch({ type: 'JOIN_CONFIRM', keptOut: true })}>Join without Ansel</Btn>
            <Btn variant="primary" disabled={!agreed} onClick={() => dispatch({ type: 'JOIN_CONFIRM', keptOut: false })}>Join with Ansel</Btn>
          </div>
        </div>
      </div>
    </Modal>
  )
}
