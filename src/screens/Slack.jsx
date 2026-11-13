import React, { useEffect } from 'react'
import { useStore } from '../state/store.jsx'
import { SEED } from '../data/seed.js'
import HeadsUpCard from './HeadsUpCard.jsx'
import { Avatar, personName } from '../components/ui.jsx'

const CHANNELS = {
  product: [
    ['alicia', 'Fri Nov 13 · 10:02 AM', 'Reminder: launch checklist doc is updated. Comments welcome before the sync.'],
    ['alicia', '10:15 AM', 'Pricing page copy v3 is in the shared folder.'],
    ['varun', '11:40 AM', 'October actuals are posted in the finance folder.'],
  ],
  'eng-standup': [
    ['rishabh', '9:30 AM', 'Payments: two flaky tests left in staging. Looking at them today.'],
    ['aryan', '9:34 AM', 'Starting on the payment flow test plan.'],
  ],
  random: [
    ['varun', '12:05 PM', 'Lunch truck is outside again.'],
    ['gabriel', '12:07 PM', 'The taco one?'],
  ],
}

function Message({ who, time, text }) {
  return (
    <div className="flex gap-3">
      <Avatar id={who} />
      <div>
        <div className="flex items-baseline gap-2"><span className="font-bold">{personName(who)}</span><span className="text-xs text-slate-500">{time}</span></div>
        <div className="text-sm">{text}</div>
      </div>
    </div>
  )
}

export default function Slack() {
  const { state, dispatch, world } = useStore()
  const me = world.person(state.persona)
  const ch = state.slackChannel
  const cards = SEED.series
    .map((s) => ({ series: s, snap: state.processed[`${me.id}:${s.id}`] }))
    .filter((x) => x.snap?.eligible)
    .sort((a, b) => a.snap.atSec - b.snap.atSec)
  const unread = cards.filter((c) => !state.opened[`${me.id}:${c.series.id}`]).length
  const attendedNov6 = world.instance('wps-1106').attendees.includes(me.id)

  useEffect(() => {
    if (state.tab !== 'slack' || ch !== 'ansel') return
    for (const c of cards) {
      const key = `${me.id}:${c.series.id}`
      if (!state.opened[key]) dispatch({ type: 'CARD_OPENED', key, detail: c.series.title })
    }
  }, [state.tab, ch, cards.length, me.id])

  const dms = SEED.people.filter((p) => p.id !== me.id && p.org === 'acme' && ['alicia', 'gabriel', 'rishabh', 'varun'].includes(p.id))

  const Item = ({ id, label, badge, prefix = '#' }) => (
    <button onClick={() => dispatch({ type: 'SLACK_CHANNEL', id })}
      className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${ch === id ? 'bg-slate-600/60 text-white' : 'text-slate-300 hover:bg-slate-700/50'}`}>
      <span className={badge ? 'font-bold text-white' : ''}><span className="mr-1 opacity-60">{prefix}</span>{label}</span>
      {badge ? <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{badge}</span> : null}
    </button>
  )

  if (!me.slack) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Slack (mock)</div>
          <p className="mt-2 text-lg font-semibold">{me.name} has no Slack connected.</p>
          <p className="mt-1 text-sm text-slate-500">{me.org === 'acme' ? 'Heads-Up is delivered only in Slack, so no card is posted.' : 'External guests are not in the Acme workspace and never receive Heads-Up.'} Open the drawer for the decision.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0">
      {/* workspace rail */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-3 bg-slate-900 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 font-bold text-slate-900">Ac</div>
        <div className="text-[9px] font-semibold uppercase text-slate-400">mock</div>
      </div>
      {/* channels */}
      <div className="flex w-56 shrink-0 flex-col gap-4 overflow-y-auto bg-slate-800 p-3">
        <div>
          <div className="font-bold text-white">Acme</div>
          <div className="text-[11px] text-slate-400">Slack (mock) · {me.name}</div>
        </div>
        <div>
          <div className="mb-1 px-2 text-xs font-semibold text-slate-400">Channels</div>
          <Item id="product" label="product" />
          <Item id="eng-standup" label="eng-standup" />
          <Item id="random" label="random" />
        </div>
        <div>
          <div className="mb-1 px-2 text-xs font-semibold text-slate-400">Direct messages</div>
          <Item id="ansel" label="Ansel" prefix="◆" badge={unread || null} />
          {dms.map((p) => <Item key={p.id} id={`dm-${p.id}`} label={p.name} prefix="●" />)}
        </div>
      </div>
      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-slate-950">
        <div className="border-b border-slate-200 px-5 py-3 font-bold dark:border-slate-800">
          {ch === 'ansel' ? <>Ansel <span className="ml-1 text-xs font-normal text-slate-500">App · Heads-Up and meeting summaries</span></> : ch.startsWith('dm-') ? personName(ch.slice(3)) : `# ${ch}`}
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {ch === 'ansel' && (
            <>
              {attendedNov6 && (
                <div className="flex gap-3 opacity-80">
                  <Avatar id="ansel" />
                  <div>
                    <div className="flex items-baseline gap-2"><span className="font-bold">Ansel</span><span className="rounded bg-slate-200 px-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">APP</span><span className="text-xs text-slate-500">Fri Nov 6 · 2:52 PM</span></div>
                    <div className="mt-1 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">Summary ready: Weekly Product Sync (Nov 6)</div>
                  </div>
                </div>
              )}
              {cards.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-slate-500"><div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />Today<div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
              )}
              {cards.map((c) => <HeadsUpCard key={c.series.id} series={c.series} snap={c.snap} />)}
              {cards.length === 0 && <p className="text-sm text-slate-500">No Heads-Up yet today.</p>}
            </>
          )}
          {CHANNELS[ch]?.map(([who, time, text], i) => <Message key={i} who={who} time={time} text={text} />)}
          {ch.startsWith('dm-') && <p className="text-sm text-slate-500">This is the start of your conversation with {personName(ch.slice(3))}.</p>}
        </div>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-400 dark:border-slate-700">Message {ch === 'ansel' ? 'Ansel' : ch.startsWith('dm-') ? personName(ch.slice(3)) : `#${ch}`} (disabled in mock)</div>
        </div>
      </div>
    </div>
  )
}
