// The one fully active screen: transcript with speaker blocks, cited-line chips,
// theme dividers and line comments. Player and search are visible but inactive.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Highlighter, Link2, MessageSquarePlus, PanelRightOpen, Play, Search, SkipBack, SkipForward } from 'lucide-react'
import { useStore } from '../../state/store.jsx'
import { TRANSCRIPTS } from '../../data/transcripts.js'
import { Avatar, Btn, PERSON_COLORS, firstName, mmss } from '../../components/ui.jsx'
import { KIND, KindChip, citedByTime, commentWhen, jumpTo, lineKey, toSec, useNip } from './shared.jsx'

/**
 * Scroll so the line sits about a third of the way down the area below the sticky player,
 * leaving room above it for its speaker name and theme divider.
 */
function scrollToLine(t, behavior) {
  const box = document.getElementById('ansel-scroll')
  const el = document.getElementById(`seg-${t}`)
  if (!box || !el) return
  const barH = document.getElementById('ansel-player')?.offsetHeight ?? 0
  const elTop = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop
  box.scrollTo({ top: Math.max(0, elTop - barH - (box.clientHeight - barH) * 0.33), behavior })
}

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
      scrollToLine(h.t, behavior)
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
  return (
    <div id="ansel-player" className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="@container mx-auto max-w-3xl">
      <div className="flex items-center gap-2.5">
        <button onClick={nip('Audio playback')} aria-label="Play" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ansel text-white hover:bg-ansel-700 dark:bg-ansel-400 dark:text-slate-950">
          <Play size={14} fill="currentColor" aria-hidden />
        </button>
        <button onClick={nip('Audio playback')} aria-label="Back 15 seconds" className="hidden text-slate-500 @lg:block hover:text-slate-800 dark:hover:text-slate-200"><SkipBack size={16} /></button>
        <button onClick={nip('Audio playback')} aria-label="Forward 15 seconds" className="hidden text-slate-500 @lg:block hover:text-slate-800 dark:hover:text-slate-200"><SkipForward size={16} /></button>
        <span className="shrink-0 font-mono text-xs text-slate-500">{mmss(posSec)}<span className="hidden @md:inline"> / {mmss(durationSec)}</span></span>
        <Waveform inst={inst} durationSec={durationSec} posSec={posSec} />
        <button onClick={nip('Playback speed')} className="hidden shrink-0 rounded border @lg:block border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300">1x</button>
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

const BARS = 84
// Small deterministic hash so the waveform looks the same on every load.
const noise = (seed, i) => { let x = Math.sin(seed * 9301 + i * 49297) * 233280; return x - Math.floor(x) }

/**
 * Static waveform with a playhead, item markers and a speaker strip underneath.
 * Clicking anywhere on it jumps the transcript to the line being said at that moment.
 */
function Waveform({ inst, durationSec, posSec }) {
  const { dispatch } = useStore()
  const segs = TRANSCRIPTS[inst.id] || []
  const seed = inst.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0)
  const bars = useMemo(() => Array.from({ length: BARS }, (_, i) => {
    const sec = (i / BARS) * durationSec
    const line = segs.findLast((x) => x.sec <= sec)
    const speaking = line ? Math.min(1, line.text.length / 90) : 0.2
    return 0.25 + 0.75 * (0.45 * speaking + 0.55 * noise(seed, i))
  }), [inst.id, durationSec])
  // Speaker turns: merge consecutive lines by the same person.
  const turns = useMemo(() => {
    const out = []
    segs.forEach((x, i) => {
      const end = segs[i + 1]?.sec ?? durationSec
      const last = out.at(-1)
      if (last && last.speaker === x.speaker) last.end = end
      else out.push({ speaker: x.speaker, start: x.sec, end })
    })
    return out
  }, [inst.id, durationSec])
  const markers = [...inst.decisions.map((x) => ['decision', x]), ...inst.openQuestions.map((x) => ['question', x]), ...inst.actionItems.map((x) => ['action', x])]
  const pct = durationSec ? Math.min(100, (posSec / durationSec) * 100) : 0
  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const sec = ((e.clientX - r.left) / r.width) * durationSec
    const line = segs.findLast((x) => x.sec <= sec) ?? segs[0]
    if (line) jumpTo(dispatch, line.t)
  }
  return (
    <div className="min-w-24 flex-1">
      <div className="relative h-8 cursor-pointer" onClick={seek} title="Jump to this point in the transcript">
        <div className="flex h-full items-center gap-px">
          {bars.map((h, i) => (
            <span key={i} className={`flex-1 rounded-full ${(i + 0.5) / BARS * 100 <= pct ? 'bg-ansel dark:bg-ansel-300' : 'bg-slate-300 dark:bg-slate-600'}`} style={{ height: `${Math.round(h * 100)}%` }} />
          ))}
        </div>
        <span className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded bg-slate-900 dark:bg-white" style={{ left: `${pct}%` }} />
        {markers.map(([kind, x]) => (
          <button key={x.id} title={`${KIND[kind].label} · ${x.t}`} onClick={(e) => { e.stopPropagation(); jumpTo(dispatch, x.t, { item: x.id }) }}
            className={`absolute -top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-white dark:ring-slate-950 ${KIND[kind].dot}`}
            style={{ left: `${(toSec(x.t) / durationSec) * 100}%` }} />
        ))}
      </div>
      <div className="relative mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label="Who was speaking">
        {turns.map((tn, i) => (
          <span key={i} title={`${firstName(tn.speaker)} · ${mmss(tn.start)}–${mmss(tn.end)}`}
            className={`absolute inset-y-0 ${PERSON_COLORS[tn.speaker] || 'bg-slate-400'}`}
            style={{ left: `${(tn.start / durationSec) * 100}%`, width: `${((tn.end - tn.start) / durationSec) * 100}%` }} />
        ))}
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

const ToolBtn = ({ title, onClick, children }) => (
  <button title={title} aria-label={title} onClick={onClick}
    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">{children}</button>
)

function Line({ s, inst, items, flash, inTheme }) {
  const { state, dispatch } = useStore()
  const key = lineKey(inst.id, s.t)
  const comments = state.comments[key] || []
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const selected = items.some((x) => x.item.id === state.ansel.selectedItem)
  const tint = items.length ? KIND[items[0].kind].tint : inTheme ? 'bg-slate-50 dark:bg-slate-900/60' : ''
  const submit = () => { if (draft.trim()) dispatch({ type: 'COMMENT', id: key, text: draft.trim() }); setDraft(''); setComposing(false) }
  const nip = useNip()
  // The same deep link the Heads-Up card uses, so any line can become a ▶ link in Slack.
  const copyLink = () => {
    const url = `${location.origin}${location.pathname}#ansel/${inst.id}/transcript/${s.t}`
    navigator.clipboard?.writeText(url).catch(() => {})
    dispatch({ type: 'TOAST', text: `Link to ${s.t} copied` })
    dispatch({ type: 'LOG', event: 'link_copied', detail: `${inst.id} ${s.t}` })
  }

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
        <div className="absolute -top-3 right-2 z-[1] hidden items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm group-hover:flex group-focus-within:flex dark:border-slate-700 dark:bg-slate-900">
          <ToolBtn title="Copy link to this moment" onClick={copyLink}><Link2 size={14} /></ToolBtn>
          <ToolBtn title="Comment on this line" onClick={() => setComposing(true)}><MessageSquarePlus size={14} /></ToolBtn>
          <ToolBtn title="Highlight" onClick={nip('Highlight')}><Highlighter size={14} /></ToolBtn>
        </div>
      )}
    </div>
  )
}
