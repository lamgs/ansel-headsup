// The full Heads-Up card inside Ansel. Slack's Block Kit can only show a basic version, so the
// Slack message links here for the rich card. This loads Varun's <heads-up-card> element from
// card/ unchanged, feeds it the demo cast's data (same buildCardData the Slack app uses), keeps its
// clock on the prototype's simulated clock, and turns its taps into Ansel actions.
import React, { useEffect, useMemo, useRef } from 'react'
import { BellRing } from 'lucide-react'
import '../../../card/heads-up-card.js'
import { useStore } from '../../state/store.jsx'
import { DEMO_DATE } from '../../data/seed.js'
import { buildCardData } from '../../logic/buildCardData.js'
import { triggerSec } from '../../logic/buildHeadsUp.js'
import { fmtClock } from '../../components/ui.jsx'

const JOIN_URL = 'https://zoom.us/j/0000000000'

/** Local time on the demo day, e.g. secOnDemoDay(14 * 3600) → Fri Nov 13, 2:00 PM. */
const secOnDemoDay = (sec) => {
  const [y, m, d] = DEMO_DATE.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, sec).getTime()
}
const hhmm = (s) => { const [h, m] = s.split(':').map(Number); return h * 3600 + m * 60 }

export default function HeadsUpPanel({ series }) {
  const { state, dispatch, world } = useStore()
  const ref = useRef(null)
  const user = world.person(state.persona)
  const startSec = hhmm(series.nextInstance.start)
  const postSec = triggerSec(user, series)

  // The card shows its own muted view, so build its data as if nothing were muted.
  const result = useMemo(
    () => buildCardData(user, series, { ...world, isMuted: () => false }, { startMs: secOnDemoDay(startSec), joinUrl: JOIN_URL }),
    [user, series, world, startSec],
  )
  const data = result.eligible ? result.data : null
  // Items marked done elsewhere in Ansel (item panel) need the card to re-read its data.
  const doneKey = data ? data.actionItems.items.filter((i) => i.done).map((i) => i.id).join(',') : ''
  const lastDone = useRef(null)
  const fromCard = useRef(false) // the card already shows its own Mark done, so don't reset it

  useEffect(() => {
    const el = ref.current
    if (!el || !data) return
    el.data = data
    if (lastDone.current !== null && lastDone.current !== doneKey && !fromCard.current) el.reset()
    fromCard.current = false
    lastDone.current = doneKey
  }, [data, doneKey])

  // Keep the card's countdown on the prototype's clock (Jump to 1:30 PM, +5 min, …).
  useEffect(() => {
    if (ref.current && data) ref.current.now = secOnDemoDay(state.clock)
  }, [state.clock, data])

  // Card taps → Ansel. preventDefault stops the card's own backup links.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onAction = (e) => {
      const { action, payload = {} } = e.detail
      e.preventDefault()
      const last = data?.lastMeeting.meetingId
      const item = data?.actionItems.items.find((i) => i.id === payload.itemId)
      switch (action) {
        case 'timestamp_tap':
          // Open the meeting the item was said in (carried-over items come from earlier meetings).
          dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: item?.meetingId || payload.meetingId || last, tab: 'transcript', highlight: item ? { t: item.t, n: Date.now() } : null, panelItem: payload.itemId } })
          break
        case 'open_last_meeting':
          dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: last, tab: 'summary', seriesId: series.id } })
          break
        case 'more_tap':
          dispatch({ type: 'OPEN_ANSEL', nav: { instanceId: last, tab: 'actions' } })
          break
        case 'mark_done':
          fromCard.current = true
          dispatch({ type: 'UPDATE_ITEM', id: payload.itemId, update: { kind: 'done' }, label: 'Marked done (Heads-Up card)' })
          break
        case 'mark_done_undone':
          fromCard.current = true
          dispatch({ type: 'CLEAR_ITEM_UPDATE', id: payload.itemId, label: 'Mark done undone (Heads-Up card)' })
          break
        case 'join_tap':
          dispatch({ type: 'JOIN_START', sid: series.id })
          break
        case 'mute_series':
        case 'mute_undone':
          dispatch({ type: 'MUTE', sid: series.id, title: series.title, on: action === 'mute_series' })
          break
        case 'not_useful':
        case 'not_useful_undone':
          dispatch({ type: 'NOT_USEFUL', sid: series.id, title: series.title, on: action === 'not_useful' })
          break
        case 'state_changed':
          break
        default:
          dispatch({ type: 'LOG', event: action, detail: payload.itemId || payload.reason || series.title })
      }
    }
    el.addEventListener('headsup:action', onAction)
    return () => el.removeEventListener('headsup:action', onAction)
  }, [data, dispatch, series])

  if (!data) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        No Heads-Up for {series.title}: <b>{result.reason}</b>.
        {series.note && <span className="mt-1 block text-xs text-slate-500">{series.note.replace(/'Keep Ansel out'/, '“Keep Ansel out”')}.</span>}
      </div>
    )
  }

  const early = state.clock < postSec
  return (
    <div>
      {early && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <BellRing size={16} className="text-ansel dark:text-ansel-300" aria-hidden />
          Your Heads-Up for {series.title} arrives at {fmtClock(postSec)}, {user.reminderMinutes} minutes before the meeting.
          <button onClick={() => dispatch({ type: 'SET_CLOCK', sec: postSec })} className="ml-auto text-xs font-medium text-ansel underline-offset-2 hover:underline dark:text-ansel-300">Jump to {fmtClock(postSec)}</button>
        </div>
      )}
      {/* Embedded: no Slack message frame, Ansel's font and colours (index.css). The card renders
          nothing before its reminder time, so the container hides until then; keep it mounted so its clock runs. */}
      <div className={early ? 'hidden' : 'rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60'}>
        <heads-up-card ref={ref} embedded="" />
      </div>
    </div>
  )
}
