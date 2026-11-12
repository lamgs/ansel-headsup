import React from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'
import { Avatar, Btn, Modal, personName, fmtClock } from '../components/ui.jsx'

export default function JoinFlow() {
  const { state, dispatch } = useStore()
  const j = state.join
  if (!j) return null
  const series = SEED.series.find((s) => s.id === j.sid)

  if (j.step === 'notice') {
    return (
      <Modal onClose={() => dispatch({ type: 'JOIN_CLOSE' })}>
        <div className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-rose-500" />{series.title}</div>
          <p className="mt-3 text-sm">Ansel is recording and transcribing this meeting. Attendees can access the notes afterward.</p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => dispatch({ type: 'JOIN_CONFIRM', keptOut: true })}>Keep Ansel out of this meeting</Btn>
            <Btn variant="primary" onClick={() => dispatch({ type: 'JOIN_CONFIRM', keptOut: false })}>Join meeting</Btn>
          </div>
        </div>
      </Modal>
    )
  }

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
