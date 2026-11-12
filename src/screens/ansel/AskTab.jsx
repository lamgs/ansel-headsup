// Ask Ansel about one meeting. Canned answers; the citation chips really jump to the line.
import React from 'react'
import { Sparkles } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { Avatar, Ts } from '../../components/ui.jsx'
import { jumpTo, useNip } from './shared.jsx'

export const NOV6_QA = [
  { q: 'What did we decide about the pricing page?', a: 'The pricing page ships with v2, not before. Alicia confirmed it after finance and QA weighed in.', cites: ['41:18', '39:25'] },
  { q: 'Who is bringing the launch date recommendation?', a: 'Gabriel and Rishabh, at next week’s sync. Alicia asked not to lock March 3 or March 10 without the new forecast.', cites: ['27:40', '27:05'] },
]

export default function AskTab({ inst }) {
  const { state, dispatch } = useStore()
  const nip = useNip()
  const qa = inst.id === 'wps-1106' ? NOV6_QA : []
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      {qa.length === 0 && <p className="text-sm text-slate-500">Ask anything about this meeting. Answers cite the moment they came from.</p>}
      {qa.map(({ q, a, cites }) => (
        <div key={q} className="space-y-2">
          <div className="flex justify-end"><div className="flex items-start gap-2 rounded-2xl rounded-tr-sm bg-ansel px-3 py-2 text-sm text-white dark:bg-ansel-400 dark:text-slate-950">{q}<Avatar id={state.persona} size="xs" /></div></div>
          <div className="flex items-start gap-2">
            <Avatar id="ansel" size="xs" />
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
              {a}
              <div className="mt-1.5 flex flex-wrap gap-1">{cites.map((t) => <Ts key={t} t={t} className="border border-ansel-100 dark:border-slate-700" onClick={() => jumpTo(dispatch, t)} />)}</div>
            </div>
          </div>
        </div>
      ))}
      <div className="relative">
        <Sparkles size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ansel dark:text-ansel-300" aria-hidden />
        <input readOnly onClick={nip('Ask Ansel')} placeholder="Ask about this meeting"
          className="w-full cursor-pointer rounded-full border border-slate-300 bg-transparent py-2 pl-9 pr-3 text-sm dark:border-slate-700" />
      </div>
      <p className="text-center text-[11px] text-slate-400">Answers use this meeting only. No search beyond what you can already open.</p>
    </div>
  )
}
