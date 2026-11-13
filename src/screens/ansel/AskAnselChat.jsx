// Ask Ansel as a floating chat window (bottom right), available anywhere in the Ansel app.
// Answers are canned; suggested questions add them to the thread and citations really jump.
import React, { useEffect, useRef } from 'react'
import { ChevronDown, Minus, Sparkles, X } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { longDate, shortDate } from '../../logic/buildHeadsUp.js'
import { Avatar, Ts } from '../../components/ui.jsx'
import { canSee, useNip } from './shared.jsx'

export const NOV6_QA = [
  { id: 'qa-pricing', q: 'What did we decide about the pricing page?', a: 'The pricing page ships with v2, not before. Alicia confirmed it after engineering and QA weighed in.', cites: ['41:18', '39:25'] },
  { id: 'qa-launch', q: 'Who is bringing the launch date recommendation?', a: 'Gabriel and Rishabh, at next week’s sync. Alicia asked not to lock March 3 or March 10 without the new forecast.', cites: ['27:40', '27:05'] },
]

/** "What do I owe?" answered from the viewer's own open Nov 6 items, so it fits any persona. */
function owedAnswer(world, persona) {
  const mine = world.instance('wps-1106').actionItems.filter((a) => a.owner === persona && a.status !== 'done')
  if (!mine.length) return null
  const list = mine.map((a) => `${a.text.replace(/\.$/, '')} (due ${longDate(a.due)})`)
  const a = mine.length === 1 ? `${list[0]}. It may already be done, so check the action item.` : `${mine.length} items: ${list.slice(0, -1).join('; ')} and ${list.at(-1)}.`
  return { id: 'qa-mine', q: 'What do I owe from the last meeting?', a, cites: mine.slice(0, 3).map((x) => x.t) }
}

export default function AskAnselChat() {
  const { state, dispatch, world } = useStore()
  const nip = useNip()
  const { chat, chatThread, view, page, instanceId } = state.ansel
  const set = (nav) => dispatch({ type: 'ANSEL_NAV', nav })
  const bottom = useRef(null)
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }) }, [chatThread.length, chat])

  // Scope: the meeting on screen if it's a recorded one you can open, otherwise meetings you attended.
  const inMeeting = page === 'meetings' && view === 'detail' && instanceId !== 'upcoming'
  const inst = inMeeting ? world.instance(instanceId) : null
  const scopedInst = inst && canSee(state, inst) ? inst : null
  const scope = scopedInst ? `Weekly Product Sync · ${shortDate(scopedInst.date)}` : 'Meetings you attended'
  // Canned answers exist for the Nov 6 meeting; the cross-meeting view uses the same ones.
  const answersFor = !scopedInst || scopedInst.id === 'wps-1106'
  const canAnswer = answersFor && canSee(state, world.instance('wps-1106'))
  // "What do I owe" is Gabriel's item; other people don't get his answer.
  const owed = canAnswer ? owedAnswer(world, state.persona) : null
  const available = canAnswer ? [...NOV6_QA, ...(owed ? [owed] : [])] : []
  const asked = chatThread.map((id) => available.find((x) => x.id === id)).filter(Boolean)
  const suggestions = available.filter((x) => !chatThread.includes(x.id))

  const cite = (t) => dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: 'wps-1106', tab: 'transcript', highlight: { t, n: Date.now() }, chat: 'min' } })
  const ask = (x) => { set({ chatThread: [...chatThread, x.id] }); dispatch({ type: 'LOG', event: 'ask_ansel', detail: x.q }) }

  if (chat === 'closed') {
    return (
      <button onClick={() => set({ chat: 'open' })} aria-label="Ask Ansel"
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-ansel px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-ansel-700 dark:bg-ansel-400 dark:text-slate-950 dark:hover:bg-ansel-300">
        <Sparkles size={16} aria-hidden />Ask Ansel
      </button>
    )
  }

  if (chat === 'min') {
    return (
      <button onClick={() => set({ chat: 'open' })} title="Expand"
        className="fixed bottom-0 right-5 z-30 flex w-80 items-center gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <Sparkles size={15} className="text-ansel dark:text-ansel-300" aria-hidden />Ask Ansel
        <span className="truncate text-xs font-normal text-slate-500">· {scope}</span>
        <ChevronDown size={15} className="ml-auto rotate-180 text-slate-400" aria-hidden />
      </button>
    )
  }

  return (
    <section aria-label="Ask Ansel"
      className="slidein fixed bottom-5 right-5 z-30 flex h-[min(520px,calc(100%-6rem))] w-[360px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-ansel px-4 py-2.5 text-white dark:border-slate-700 dark:bg-ansel-700">
        <Sparkles size={16} aria-hidden />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-semibold">Ask Ansel</div>
          <div className="truncate text-[11px] text-white/80">{scope}</div>
        </div>
        <button onClick={() => set({ chat: 'min' })} title="Minimize" aria-label="Minimize" className="rounded p-1 hover:bg-white/15"><Minus size={16} /></button>
        <button onClick={() => set({ chat: 'closed' })} title="Close" aria-label="Close" className="rounded p-1 hover:bg-white/15"><X size={16} /></button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        <Bot>
          Hi! Ask about {scopedInst ? 'this meeting' : 'meetings you attended'}. Every answer links to the moment it came from.
        </Bot>
        {asked.map((x) => (
          <React.Fragment key={x.id}>
            <div className="flex justify-end">
              <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-tr-sm bg-ansel px-3 py-2 text-white dark:bg-ansel-400 dark:text-slate-950">{x.q}</div>
            </div>
            <Bot>
              {x.a}
              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                {!scopedInst && <span>Weekly Product Sync · Nov 6</span>}
                {x.cites.map((t) => <Ts key={t} t={t} className="border border-ansel-100 dark:border-slate-700" onClick={() => cite(t)} />)}
              </div>
            </Bot>
          </React.Fragment>
        ))}
        {!canAnswer && (
          <p className="text-center text-xs text-slate-400">No sample answers for this meeting in the prototype.</p>
        )}
        <div ref={bottom} />
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 pt-2 dark:border-slate-800">
          {suggestions.map((x) => (
            <button key={x.id} onClick={() => ask(x)}
              className="rounded-full border border-ansel-100 bg-ansel-50 px-2.5 py-1 text-left text-xs text-ansel hover:bg-ansel-100 dark:border-ansel/40 dark:bg-ansel/15 dark:text-ansel-300">
              {x.q}
            </button>
          ))}
        </div>
      )}
      <div className="p-3">
        <input readOnly onClick={nip('Typing questions')} placeholder="Ask a question…"
          className="w-full cursor-pointer rounded-full border border-slate-300 bg-transparent px-3.5 py-2 text-sm dark:border-slate-600" />
        <p className="mt-1.5 text-center text-[10px] text-slate-400">Answers only use meetings you can already open.</p>
      </div>
    </section>
  )
}

function Bot({ children }) {
  return (
    <div className="flex items-start gap-2">
      <Avatar id="ansel" size="xs" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 px-3 py-2 dark:border-slate-700">{children}</div>
    </div>
  )
}

