// Meetings page: one row per recurring series (selectable, expandable) on the left, and the selected
// series' Heads-Up card on the right. The card belongs to the series, not one meeting: it lists
// items from the latest meeting plus open ones carried over from earlier meetings.
// Expanding a series lists its meetings; clicking one opens the existing meeting screen.
import React, { useState } from 'react'
import { BellRing, CalendarDays, ChevronRight, EyeOff, Mic, PanelLeftClose, PanelRightClose } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { SEED } from '../../data/seed.js'
import { longDate } from '../../logic/buildHeadsUp.js'
import { buildCardData } from '../../logic/buildCardData.js'
import { fmtClock } from '../../components/ui.jsx'
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

  const seriesOpen = !state.ansel.seriesCollapsed
  const cardOpen = !state.ansel.cardCollapsed
  const setCols = (nav) => dispatch({ type: 'ANSEL_NAV', nav })
  const strip = (label, Icon, onOpen) => (
    <button onClick={onOpen} title={`Show ${label}`} aria-label={`Show ${label}`}
      className="flex h-full w-12 shrink-0 flex-col items-center gap-3 border-slate-200 py-4 text-slate-500 hover:bg-slate-50 hover:text-ansel dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-ansel-300">
      <Icon size={18} aria-hidden />
      <span className="text-[13px] font-medium [writing-mode:vertical-rl]">{label}</span>
    </button>
  )

  return (
    <div className="flex h-full min-h-0">
      {/* Column 2: meeting series (collapsible) */}
      {seriesOpen ? (
        <div className={`flex min-h-0 flex-col border-r border-slate-200 dark:border-slate-800 ${cardOpen ? 'w-[24rem] shrink-0' : 'min-w-0 flex-1'}`}>
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h1 className="text-xl font-semibold">Meetings</h1>
            <button onClick={() => setCols({ seriesCollapsed: true })} title="Collapse meetings" aria-label="Collapse meetings"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><PanelLeftClose size={18} /></button>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-5" aria-label="Recurring meetings">
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
                      <ChevronRight size={18} className={`transition ${isOpen ? 'rotate-90' : ''}`} aria-hidden />
                    </button>
                    <button onClick={() => select(s.id)} aria-pressed={isSel} className="min-w-0 flex-1 text-left">
                      <div className="text-base font-medium">{s.title}</div>
                      <div className="text-[13px] text-slate-500">{s.cadence}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="text-slate-500">Next: {longDate(s.nextInstance.date)} · {fmtClock(hhmm(s.nextInstance.start))}</span>
                        {card.eligible
                          ? <span className="inline-flex items-center gap-1 rounded bg-ansel-50 px-1.5 py-0.5 font-medium text-ansel dark:bg-ansel/20 dark:text-ansel-300"><BellRing size={13} aria-hidden />Heads-Up{yours ? ` · ${yours} yours` : ''}</span>
                          : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800">No Heads-Up</span>}
                      </div>
                    </button>
                  </div>
                  {isOpen && (
                    <ul className="border-t border-slate-100 py-1 dark:border-slate-800">
                      {seriesMeetings(s).map((row) => {
                        const clickable = row.upcoming ? s.id === 'wps' : !!row.inst
                        const label = <>
                          <span className="flex-1">{longDate(row.date)}{row.upcoming ? ` · ${fmtClock(hhmm(row.time))}` : ''}</span>
                          {row.upcoming && <span className="inline-flex items-center gap-1 text-[13px]"><CalendarDays size={13} aria-hidden />Upcoming</span>}
                          {!row.upcoming && row.recorded && <span className="inline-flex items-center gap-1 text-[13px]"><Mic size={13} aria-hidden />Recorded</span>}
                          {!row.upcoming && !row.recorded && <span className="inline-flex items-center gap-1 text-[13px]"><EyeOff size={13} aria-hidden />Not recorded</span>}
                        </>
                        return (
                          <li key={row.key}>
                            {clickable
                              // Clickable meetings: deeper indigo so it's clear they open the meeting.
                              ? <button onClick={() => open(row, s)} className="flex w-full items-center gap-3 py-2 pl-10 pr-3 text-left text-[15px] font-medium text-ansel hover:bg-ansel-50 dark:text-ansel-300 dark:hover:bg-ansel/15">{label}<ChevronRight size={15} className="opacity-60" aria-hidden /></button>
                              : <div className="flex items-center gap-3 py-2 pl-10 pr-3 text-[15px] text-slate-400" title="No meeting page">{label}<span className="w-[15px]" /></div>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : <div className="border-r border-slate-200 dark:border-slate-800">{strip('Meetings', CalendarDays, () => setCols({ seriesCollapsed: false }))}</div>}

      {/* Column 3: the selected series' Heads-Up card (collapsible) */}
      {cardOpen ? (
        selected && (
          <section aria-label={`Heads-Up for ${selected.title}`} className="relative min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
            <button onClick={() => setCols({ cardCollapsed: true })} title="Collapse Heads-Up" aria-label="Collapse Heads-Up"
              className="absolute right-3 top-3 z-[1] rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><PanelRightClose size={18} /></button>
            <HeadsUpPanel key={selected.id} series={selected} />
          </section>
        )
      ) : <div className="ml-auto border-l border-slate-200 dark:border-slate-800">{strip('Heads-Up', BellRing, () => setCols({ cardCollapsed: false }))}</div>}
    </div>
  )
}
