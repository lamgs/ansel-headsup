import React, { useState } from 'react'
import { useStore } from '../state/store.jsx'
import { findItem } from '../logic/world.js'
import { hhmmToSec, longDate, shortDate, weekday } from '../logic/buildHeadsUp.js'
import { Avatar, Ts, fmtClock, mmss, personName, firstName } from '../components/ui.jsx'

const SECTION = { own: 'You own', open: 'Still open', decided: 'Decided' }

function ownedLine(item, base) {
  const u = item.update
  if (!u) return `${base} — due ${weekday(item.due)} (may already be done)`
  if (u.kind === 'done') return `✓ ${base} — marked done`
  if (u.kind === 'on_track') return `${base} — on track for today`
  if (u.kind === 'new_date') return `${base} — new date ${longDate(u.due)}`
  if (u.kind === 'reassign') return `${base} — reassigned to ${personName(u.owner)}`
  return base
}

export function joinLabel(clock, startSec) {
  const d = startSec - clock
  if (d > 0) return `Join · starts in ${mmss(d)}`
  const ago = Math.floor(-d / 60)
  return ago < 1 ? 'Join · starting now' : `Join · started ${ago} min ago`
}

export default function HeadsUpCard({ series, snap }) {
  const { state, dispatch, world } = useStore()
  const key = `${state.persona}:${series.id}`
  const muted = !!state.muted[key]
  const notUseful = !!state.notUseful[key]
  const start = hhmmToSec(series.nextInstance.start)
  const sourceInst = world.instance(snap.items[0]?.instanceId)
  const [tip, setTip] = useState(null)

  const tap = (it) => {
    dispatch({ type: 'LOG', event: 'timestamp_tapped', detail: `▶ ${it.t} (${SECTION[it.section]})` })
    dispatch({
      type: 'OPEN_ANSEL',
      nav: { instanceId: it.instanceId, tab: 'transcript', highlight: { t: it.t, n: Date.now() }, selectedItem: it.id },
    })
  }

  const edited = (it, tc) => (
    <span className="relative">
      <button
        onMouseEnter={() => setTip(it.id)} onMouseLeave={() => setTip(null)}
        onClick={() => dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: it.instanceId, tab: 'summary', focusId: it.id } })}
        className="rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-300">
        Edited
      </button>
      {tip === it.id && (
        <span className="absolute bottom-full left-1/2 z-20 mb-1 w-60 -translate-x-1/2 rounded bg-slate-900 px-2 py-1.5 text-xs text-white shadow-lg dark:bg-slate-700">
          Edited by {firstName(tc.by)}{tc.by === series.organizer ? ' (organizer)' : ''} after the meeting · view original
        </span>
      )}
    </span>
  )

  return (
    <div className="flex gap-3">
      <Avatar id="ansel" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-bold">Ansel</span>
          <span className="rounded bg-slate-200 px-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">APP</span>
          <span className="text-xs text-slate-500">{fmtClock(snap.atSec)}</span>
        </div>
        <div className="mt-1 max-w-xl rounded-lg border border-slate-200 border-l-4 border-l-ansel bg-white p-3 shadow-sm dark:border-slate-700 dark:border-l-ansel-400 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Heads-Up · {series.title} · {fmtClock(start)}</div>
            <button onClick={() => dispatch({ type: 'JOIN_START', sid: series.id })}
              className="rounded-md bg-ansel px-2.5 py-1 font-mono text-xs font-semibold text-white tabular-nums hover:bg-ansel-700 dark:bg-ansel-400 dark:text-slate-950">
              {joinLabel(state.clock, start)}
            </button>
          </div>

          {muted ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Muted {series.title}. You won't get Heads-Up for this series.{' '}
              <button className="font-medium text-ansel underline dark:text-ansel-300" onClick={() => dispatch({ type: 'MUTE', sid: series.id, title: series.title, on: false })}>Undo</button>
            </p>
          ) : notUseful ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Thanks. We'll use this to tune Heads-Up.{' '}
              <button className="font-medium text-ansel underline dark:text-ansel-300" onClick={() => dispatch({ type: 'NOT_USEFUL', sid: series.id, title: series.title, on: false })}>Undo</button>
            </p>
          ) : (
            <>
              <div className="mt-2 space-y-2">
                {snap.items.slice(0, 3).map((s) => {
                  const found = findItem(world, s.id)
                  if (!found) return null
                  const it = found.item
                  const text = s.section === 'own' ? ownedLine(it, it.short || it.text) : it.text
                  const done = s.section === 'own' && it.update?.kind === 'done'
                  return (
                    <div key={s.id}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{SECTION[s.section]}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400">•</span>
                        <span className={`flex-1 ${done ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{text}</span>
                        {it.trackedChange && edited(s, it.trackedChange)}
                        <Ts t={s.t} onClick={() => tap(s)} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                <button className="font-medium text-ansel hover:underline dark:text-ansel-300" onClick={() => {
                  dispatch({ type: 'LOG', event: 'open_last_meeting', detail: `${series.title} · ${shortDate(sourceInst.date)}` })
                  dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: sourceInst.id, tab: 'summary' } })
                }}>Open last meeting</button>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <button className="text-slate-600 hover:underline dark:text-slate-300" onClick={() => dispatch({ type: 'MUTE', sid: series.id, title: series.title, on: true })}>Mute series</button>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <button className="text-slate-600 hover:underline dark:text-slate-300" onClick={() => dispatch({ type: 'NOT_USEFUL', sid: series.id, title: series.title, on: true })}>Not useful</button>
              </div>
            </>
          )}
          <div className="mt-2 text-[11px] text-slate-500">Private to you · from meetings you attended · {sourceInst ? shortDate(sourceInst.date) : ''}</div>
        </div>
      </div>
    </div>
  )
}
