// The one fully active screen: transcript with speaker blocks, cited-line chips,
// theme dividers and line comments. Player and search are visible but inactive.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquarePlus, PanelRightOpen, Play, Search, SkipBack, SkipForward } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { TRANSCRIPTS } from '../../data/transcripts.js'
import { Avatar, Btn, firstName, mmss } from '../../components/ui.jsx'
import { KIND, KindChip, citedByTime, commentWhen, jumpTo, lineKey, toSec, useNip } from './shared.jsx'

export default function TranscriptTab({ inst }) {
  const { state, dispatch } = useStore()
  const segs = TRANSCRIPTS[inst.id] || []
  const cited = useMemo(() => citedByTime(inst), [inst])
  const themes = inst.themes || []
  const selTheme = themes.find((th) => th.id === state.ansel.themeId)
  const h = state.ansel.highlight
  const [flashT, setFlashT] = useState(null)

  // Deep link or panel click: scroll to the line and flash it. If nothing is selected yet,
  // select the summary item that line supports so the side panel shows it.
  const mounted = useRef(false)
  useEffect(() => {
    if (!h) { document.getElementById('ansel-scroll')?.scrollTo({ top: 0 }); return }
    // Jump instantly when the tab first opens (layout is still settling); glide on later clicks.
    const behavior = mounted.current ? 'smooth' : 'auto'
    const raf = requestAnimationFrame(() => {
      document.getElementById(`seg-${h.t}`)?.scrollIntoView({ block: 'center', behavior })
      mounted.current = true
    })
    setFlashT(h.t)
    if (!state.ansel.selectedItem && !state.ansel.themeId) {
      const first = cited.get(h.t)?.[0]
      if (first) dispatch({ type: 'ANSEL_NAV', nav: { selectedItem: first.item.id } })
    }
    const tm = setTimeout(() => setFlashT(null), 3000)
    return () => { clearTimeout(tm); cancelAnimationFrame(raf) }
  }, [h?.n, inst.id])

  // Group consecutive lines by speaker; a theme boundary always starts a new block.
  const blocks = useMemo(() => {
    const themeAt = new Map(themes.map((th) => [th.start, th]))
    const out = []
    for (const s of segs) {
      const theme = themeAt.get(s.t)
      const last = out.at(-1)
      if (!last || theme || last.speaker !== s.speaker) out.push({ speaker: s.speaker, theme, lines: [s] })
      else last.lines.push(s)
    }
    return out
  }, [segs, themes])

  const durationSec = (inst.durationMin ?? Math.ceil((segs.at(-1)?.sec ?? 0) / 60)) * 60
  const posSec = h ? toSec(h.t) : 0

  return (
    <div>
      <PlayerBar inst={inst} durationSec={durationSec} posSec={posSec} />
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-2">
        {blocks.map((b, i) => (
          <React.Fragment key={`${b.lines[0].t}-${i}`}>
            {b.theme && <ThemeDivider theme={b.theme} selected={selTheme?.id === b.theme.id} />}
            <div className="mt-3">
              <div className="ml-14 flex items-center gap-2 pb-0.5">
                <Avatar id={b.speaker} size="xs" />
                <span className="text-sm font-semibold">{firstName(b.speaker)}</span>
              </div>
              {b.lines.map((s) => (
                <Line key={s.t} s={s} inst={inst} items={cited.get(s.t) || []} flash={flashT === s.t}
                  inTheme={!!selTheme && s.sec >= toSec(selTheme.start) && s.sec <= toSec(selTheme.end)} />
              ))}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function PlayerBar({ inst, durationSec, posSec }) {
  const { state, dispatch } = useStore()
  const nip = useNip()
  const pct = durationSec ? Math.min(100, (posSec / durationSec) * 100) : 0
  const markers = [...inst.decisions.map((x) => ['decision', x]), ...inst.openQuestions.map((x) => ['question', x]), ...inst.actionItems.map((x) => ['action', x])]
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="@container mx-auto max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={nip('Audio playback')} aria-label="Play" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ansel text-white hover:bg-ansel-700 dark:bg-ansel-400 dark:text-slate-950">
          <Play size={14} fill="currentColor" aria-hidden />
        </button>
        <button onClick={nip('Audio playback')} aria-label="Back 15 seconds" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><SkipBack size={16} /></button>
        <button onClick={nip('Audio playback')} aria-label="Forward 15 seconds" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><SkipForward size={16} /></button>
        <span className="w-24 shrink-0 font-mono text-xs text-slate-500">{mmss(posSec)} / {mmss(durationSec)}</span>
        <div className="relative h-1.5 min-w-20 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="absolute inset-y-0 left-0 rounded-full bg-ansel/60 dark:bg-ansel-400/60" style={{ width: `${pct}%` }} />
          {markers.map(([kind, x]) => (
            <button key={x.id} title={`${KIND[kind].label} · ${x.t}`} onClick={() => jumpTo(dispatch, x.t, { item: x.id })}
              className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-slate-950 ${KIND[kind].dot}`}
              style={{ left: `${(toSec(x.t) / durationSec) * 100}%` }} />
          ))}
        </div>
        <button onClick={nip('Playback speed')} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">1x</button>
        <button onClick={nip('Transcript search')} aria-label="Search transcript" className="text-slate-500 hover:text-slate-800 @2xl:hidden dark:hover:text-slate-200"><Search size={16} /></button>
        <div className="relative hidden @2xl:block">
          <Search size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input readOnly onClick={nip('Transcript search')} placeholder="Search transcript"
            className="w-44 cursor-pointer rounded-md border border-slate-300 bg-transparent py-1 pl-7 pr-2 text-xs dark:border-slate-600" />
        </div>
        {!state.ansel.sideOpen && (
          <button onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { sideOpen: true } })} title="Show summary panel"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><PanelRightOpen size={16} /></button>
        )}
      </div>
      </div>
    </div>
  )
}

function ThemeDivider({ theme, selected }) {
  const { dispatch } = useStore()
  return (
    <button onClick={() => jumpTo(dispatch, theme.start, { theme: theme.id })}
      className={`mt-6 flex w-full items-center gap-3 text-left text-xs font-semibold uppercase tracking-wider ${selected ? 'text-ansel dark:text-ansel-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
      <span className="h-px w-10 bg-current opacity-40" />
      {theme.title} · {theme.start}–{theme.end}
      <span className="h-px flex-1 bg-current opacity-40" />
    </button>
  )
}

function Line({ s, inst, items, flash, inTheme }) {
  const { state, dispatch } = useStore()
  const key = lineKey(inst.id, s.t)
  const comments = state.comments[key] || []
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const selected = items.some((x) => x.item.id === state.ansel.selectedItem)
  const tint = items.length ? KIND[items[0].kind].tint : inTheme ? 'bg-slate-50 dark:bg-slate-900/60' : ''
  const submit = () => { if (draft.trim()) dispatch({ type: 'COMMENT', id: key, text: draft.trim() }); setDraft(''); setComposing(false) }

  return (
    <div id={`seg-${s.t}`}
      className={`group relative flex gap-3 rounded-md py-1 pr-2 ${tint} ${selected ? 'ring-2 ring-ansel/30 dark:ring-ansel-300/30' : ''} ${flash ? 'flash ring-2 ring-amber-400' : ''}`}>
      <button onClick={() => jumpTo(dispatch, s.t)} title={`Play from ${s.t}`}
        className="w-11 shrink-0 pt-0.5 text-right font-mono text-xs text-slate-400 hover:text-ansel dark:hover:text-ansel-300">{s.t}</button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">{s.text}</p>
        {items.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {items.map((x) => (
              <KindChip key={x.item.id} kind={x.kind} active={x.item.id === state.ansel.selectedItem}
                onClick={() => dispatch({ type: 'ANSEL_NAV', nav: { selectedItem: x.item.id, themeId: null, sideOpen: true, sideTab: 'summary', panelItem: null } })} />
            ))}
          </div>
        )}
        {comments.map((c, i) => (
          <div key={i} className="mt-1.5 flex items-start gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
            <Avatar id={c.by} size="xs" />
            <div><b className="font-semibold">{firstName(c.by)}</b> <span className="text-xs text-slate-400">{commentWhen(c)}</span><div>{c.text}</div></div>
          </div>
        ))}
        {composing && (
          <div className="mt-1.5 flex gap-2">
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment for attendees"
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setComposing(false) }}
              className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
            <Btn variant="primary" onClick={submit}>Comment</Btn>
            <Btn variant="ghost" onClick={() => setComposing(false)}>Cancel</Btn>
          </div>
        )}
      </div>
      {!composing && (
        <button onClick={() => setComposing(true)} title="Comment on this line"
          className="mt-0.5 h-6 shrink-0 rounded p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-slate-800">
          <MessageSquarePlus size={15} />
        </button>
      )}
    </div>
  )
}
