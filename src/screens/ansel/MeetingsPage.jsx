// Meetings page: one row per recurring series (selectable, expandable) on the left, and the selected
// series' Heads-Up card on the right. The card belongs to the series, not one meeting: it lists
// items from the latest meeting plus open ones carried over from earlier meetings.
// Expanding a series lists its meetings; clicking one opens the existing meeting screen.
import React, { useState } from 'react'
import { BellRing, CalendarDays, ChevronRight, EyeOff, Mic } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { longDate } from '../../logic/buildHeadsUp.js'
import { buildCardData } from '../../logic/buildCardData.js'
import { Avatar, fmtClock } from '../../components/ui.jsx'
import HeadsUpPanel from './HeadsUpPanel.jsx'

const hhmm = (s) => { const [h, m] = s.split(':').map(Number); return h * 3600 + m * 60 }

/** Meetings of a series, upcoming first, then past ones newest first. */
export function seriesMeetings(series) {
  const past = SEED.instances.filter((i) => i.series === series.id).sort((a, b) => (a.date < b.date ? 1 : -1))
  const rows = [{ key: `${series.id}-next`, upcoming: true, date: series.nextInstance.date, time: series.nextInstance.start }]
  for (const i of past) rows.push({ key: i.id, inst: i, date: i.date, recorded: i.recorded })
  // Design Review's last meeting had Ansel kept out, so it has no record in the seed.
  if (series.id === 'dr' && !past.length) rows.push({ key: 'dr-1030', date: '2026-10-30', recorded: false })
  return rows
}

export function MeetingList() {
  const { state, dispatch, world } = useStore()
  const mine = SEED.series.filter((s) => s.invitees.includes(state.persona))
  const selected = mine.find((s) => s.id === state.ansel.seriesId) ?? mine[0]
  const [expanded, setExpanded] = useState(() => new Set([selected?.id]))
  const toggle = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const select = (id) => dispatch({ type: 'ANSEL_NAV', nav: { seriesId: id } })
  const open = (row, series) => {
    if (row.upcoming) dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: 'upcoming', seriesId: series.id } })
    else if (row.inst) dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: row.inst.id, tab: 'summary', seriesId: series.id } })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="@container px-6 py-6">
        <h1 className="text-xl font-semibold">Meetings</h1>
        <p className="mt-1 text-sm text-slate-500">Your recurring meetings. Select one to see its Heads-Up; expand it to open a meeting.</p>
        <div className="mt-5 grid items-start gap-6 @4xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <ul className="space-y-2" aria-label="Recurring meetings">
            {mine.map((s) => {
              const isSel = s.id === selected?.id
              const isOpen = expanded.has(s.id)
              const card = buildCardData(world.person(state.persona), s, { ...world, isMuted: () => false })
              const yours = card.eligible ? card.data.actionItems.items.filter((i) => i.owner.id === state.persona).length : 0
              return (
                <li key={s.id} className={`rounded-xl border bg-white dark:bg-slate-900/60 ${isSel ? 'border-ansel/50 ring-1 ring-ansel/30 dark:border-ansel-300/50 dark:ring-ansel-300/20' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-start gap-2 p-3">
                    <button onClick={() => toggle(s.id)} aria-expanded={isOpen} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${s.title}`}
                      className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                      <ChevronRight size={16} className={`transition ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
                    </button>
                    <button onClick={() => select(s.id)} aria-pressed={isSel} className="min-w-0 flex-1 text-left">
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-slate-500">{s.cadence}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500">Next: {longDate(s.nextInstance.date)} · {fmtClock(hhmm(s.nextInstance.start))}</span>
                        {card.eligible
                          ? <span className="inline-flex items-center gap-1 rounded bg-ansel-50 px-1.5 py-0.5 font-medium text-ansel dark:bg-ansel/20 dark:text-ansel-300"><BellRing size={11} aria-hidden />Heads-Up{yours ? ` · ${yours} yours` : ''}</span>
                          : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800">No Heads-Up</span>}
                      </div>
                    </button>
                    <span className="hidden -space-x-1 @md:flex">{s.invitees.slice(0, 4).map((p) => <Avatar key={p} id={p} size="xs" />)}</span>
                  </div>
                  {isOpen && (
                    <ul className="border-t border-slate-100 py-1 dark:border-slate-800">
                      {seriesMeetings(s).map((row) => {
                        const clickable = row.upcoming ? s.id === 'wps' : !!row.inst
                        const label = <>
                          <span className="flex-1">{longDate(row.date)}{row.upcoming ? ` · ${fmtClock(hhmm(row.time))}` : ''}</span>
                          {row.upcoming && <span className="inline-flex items-center gap-1 text-xs text-ansel dark:text-ansel-300"><CalendarDays size={12} aria-hidden />Upcoming</span>}
                          {!row.upcoming && row.recorded && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Mic size={12} aria-hidden />Recorded</span>}
                          {!row.upcoming && !row.recorded && <span className="inline-flex items-center gap-1 text-xs text-slate-400"><EyeOff size={12} aria-hidden />Not recorded (Ansel kept out)</span>}
                        </>
                        return (
                          <li key={row.key}>
                            {clickable
                              ? <button onClick={() => open(row, s)} className="flex w-full items-center gap-3 py-1.5 pl-10 pr-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">{label}</button>
                              : <div className="flex items-center gap-3 py-1.5 pl-10 pr-3 text-sm text-slate-500">{label}</div>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
          {selected && (
            <section aria-label={`Heads-Up for ${selected.title}`}>
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Heads-Up · {selected.title}</h2>
              <p className="mb-3 mt-0.5 text-xs text-slate-500">For your next meeting in this series: items from the latest meeting, plus your open ones carried over from earlier meetings. Only you can see this.</p>
              <HeadsUpPanel key={selected.id} series={selected} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
