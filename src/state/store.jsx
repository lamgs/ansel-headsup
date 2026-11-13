import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { SEED, SEED_COMMENTS, DEMO_DATE, CLOCK_START } from '../data/seed.js'
import { buildHeadsUp, triggerSec, hhmmToSec } from '../logic/buildHeadsUp.js'
import { buildWorld, mergeItemEdit } from '../logic/world.js'

// Always start in light mode (reads better on a projector); the demo bar's toggle switches to dark.
export function initialState(theme = 'light') {
  return {
    theme,
    persona: 'varun',
    clock: CLOCK_START,
    // The clock runs on real time from this anchor (sec at real ms), so it stays right in a background
    // tab and when a Slack link sets it from the meeting's real start (?start=).
    clockAnchor: { ms: Date.now(), sec: CLOCK_START },
    tab: 'slack',
    drawerOpen: false,
    itemUpdates: {},
    itemEdits: {},
    edits: {},
    comments: SEED_COMMENTS,
    muted: {},
    notUseful: {},
    reminder: {},
    processed: {},
    opened: {},
    log: [],
    nextId: 1,
    toasts: [],
    share: null, // { sec } when the G3 direct share is ticked
    slackChannel: 'product',
    ansel: { page: 'meetings', view: 'detail', instanceId: 'wps-1106', tab: 'summary', highlight: null, panelItem: null, focusId: null, selectedItem: null, themeId: null, shareOpen: false, chat: 'closed', chatThread: [], seriesId: 'wps' },
    join: null, // null | { step: 'notice', sid }: the recording consent dialog is open
  }
}

function addLog(s, persona, event, detail = '') {
  return { ...s, nextId: s.nextId + 1, log: [...s.log, { id: s.nextId, sec: s.clock, persona, event, detail }] }
}
function addToast(s, text, extra = {}) {
  return { ...s, nextId: s.nextId + 1, toasts: [...s.toasts, { id: s.nextId, text, ...extra }] }
}

/** Evaluate every (person, series) pair whose trigger time has passed. */
function processTriggers(s) {
  const world = buildWorld(s)
  let next = s
  for (const series of world.series) {
    for (const pid of series.invitees) {
      const key = `${pid}:${series.id}`
      if (next.processed[key]) continue
      const user = world.person(pid)
      const fireAt = triggerSec(user, series)
      if (next.clock < fireAt) continue
      const r = buildHeadsUp(user, series, { date: DEMO_DATE, sec: next.clock }, buildWorld(next))
      next = {
        ...next,
        processed: {
          ...next.processed,
          [key]: { eligible: r.eligible, reason: r.reason, atSec: fireAt, recordsRead: r.recordsRead, items: r.items.map(({ section, id, instanceId, t }) => ({ section, id, instanceId, t })) },
        },
      }
      const saved = next.clock
      next = { ...next, clock: fireAt }
      if (r.eligible) {
        next = addLog(next, pid, 'card_eligible', `${series.title}: ${r.items.length} items`)
        next = addLog(next, pid, 'card_posted', `${series.title} · Slack DM`)
        if (pid === next.persona) next = addToast(next, `Ansel: Heads-Up · ${series.title}`, { action: 'openDM' })
      } else {
        next = addLog(next, pid, 'card_skipped', `${series.title}: ${r.reason}`)
      }
      next = { ...next, clock: saved }
    }
  }
  return next
}

const setClock = (s, sec) => processTriggers({ ...s, clock: sec, clockAnchor: { ms: Date.now(), sec } })

function reducer(s, a) {
  switch (a.type) {
    case 'TICK': {
      const sec = s.clockAnchor.sec + Math.floor(((a.now ?? Date.now()) - s.clockAnchor.ms) / 1000)
      return sec === s.clock ? s : processTriggers({ ...s, clock: sec })
    }
    case 'SET_CLOCK': return setClock(s, a.sec)
    case 'AT_LEAST_CLOCK': return s.clock >= a.sec ? s : setClock(s, a.sec)
    case 'ADD_CLOCK': return setClock(s, s.clock + a.sec)
    // From a Slack link's ?start=<epoch seconds>: put the demo clock as far before the series' start
    // as the real meeting is from now, so the countdown matches the Slack card and survives reopening.
    case 'SYNC_TO_START': {
      const series = SEED.series.find((x) => x.id === a.sid) ?? SEED.series[0]
      const sec = hhmmToSec(series.nextInstance.start) - Math.round((a.startMs - Date.now()) / 1000)
      return setClock(s, Math.max(0, Math.min(86399, sec)))
    }
    case 'RESET': return initialState(s.theme)
    case 'NOT_IN_PROTOTYPE':
      // One toast at a time for inactive controls: a new click replaces the old toast.
      return addToast({ ...s, toasts: s.toasts.filter((t) => t.kind !== 'nip') },a.what ? `${a.what} · not in this prototype` : 'Not in this prototype', { kind: 'nip' })
    case 'SET_PERSONA': return { ...s, persona: a.id, join: null, ansel: { ...s.ansel, chatThread: [] } }
    case 'SET_TAB': return { ...s, tab: a.tab }
    case 'TOGGLE_DRAWER': return { ...s, drawerOpen: !s.drawerOpen }
    case 'TOGGLE_THEME': return { ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }
    case 'LOG': return addLog(s, a.persona ?? s.persona, a.event, a.detail)
    case 'TOAST': return addToast(s, a.text, a.extra)
    case 'DISMISS_TOAST': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) }
    case 'SLACK_CHANNEL': return { ...s, slackChannel: a.id, tab: 'slack' }
    case 'OPEN_ANSEL':
      // There's no Action items tab: a meeting's items are on its Summary, and the series' items are on
      // the Meetings page card. Old links to the tab (Slack's "N more from the team") open the card expanded.
      if (a.nav?.tab === 'actions') {
        const series = SEED.instances.find((i) => i.id === a.nav.instanceId)?.series ?? 'wps'
        return { ...s, tab: 'ansel', ansel: { ...s.ansel, page: 'meetings', view: 'list', seriesId: series, expandCard: Date.now(), panelItem: null, focusId: null, highlight: null, selectedItem: null, themeId: null } }
      }
      return { ...s, tab: 'ansel', ansel: { ...s.ansel, page: 'meetings', view: 'detail', panelItem: null, focusId: null, highlight: null, selectedItem: null, themeId: null, expandCard: null, ...a.nav } }
    case 'ANSEL_NAV': return { ...s, ansel: { ...s.ansel, ...a.nav } }
    case 'CARD_OPENED': {
      if (s.opened[a.key]) return s
      return addLog({ ...s, opened: { ...s.opened, [a.key]: true } }, s.persona, 'card_opened', a.detail)
    }
    case 'UPDATE_ITEM': {
      const u = { ...a.update, by: s.persona, atSec: s.clock }
      let n = { ...s, itemUpdates: { ...s.itemUpdates, [a.id]: u } }
      n = addLog(n, s.persona, 'item_acted_on', `${a.id}: ${a.label}`)
      // Mark done shows on the item itself (✓ / Done), so no toast for it.
      return a.update.kind === 'done' ? n : addToast(n, 'Saved. Alicia will see this in the meeting record.')
    }
    case 'CLEAR_ITEM_UPDATE': {
      // Undo of Mark done from the Heads-Up card: the item goes back to its seed state.
      if (!s.itemUpdates[a.id]) return s
      const itemUpdates = { ...s.itemUpdates }
      delete itemUpdates[a.id]
      return addLog({ ...s, itemUpdates }, s.persona, 'item_acted_on', `${a.id}: ${a.label || 'undone'}`)
    }
    case 'EDIT_ITEM': {
      // Audited correction to an action item (wording, owner, due date). Shown as Edited; G4 audit log.
      // Kept as the difference from the original: editing back to the original clears Edited.
      const fields = mergeItemEdit(s.itemEdits[a.id], a.changes, SEED.instances.flatMap((i) => i.actionItems).find((x) => x.id === a.id))
      const itemEdits = { ...s.itemEdits }
      if (fields) itemEdits[a.id] = { ...fields, by: s.persona, on: DEMO_DATE, atSec: s.clock }
      else delete itemEdits[a.id]
      const n = addLog({ ...s, itemEdits }, s.persona, 'item_edited', `${a.id}: ${a.label}`)
      return addToast(n, itemEdits[a.id] ? 'Saved as a tracked change. Attendees see who edited and the original.' : 'Back to the original. No longer marked Edited.')
    }
    case 'EDIT': {
      const n = { ...s, edits: { ...s.edits, [a.id]: { text: a.text, by: s.persona, on: DEMO_DATE, atSec: s.clock } } }
      return addToast(n, 'Saved as a tracked change. Attendees see who edited and the original.')
    }
    case 'COMMENT': {
      const list = s.comments[a.id] || []
      const n = { ...s, comments: { ...s.comments, [a.id]: [...list, { by: s.persona, text: a.text, sec: s.clock }] } }
      return addLog(n, s.persona, 'comment_added', a.id)
    }
    case 'MUTE': {
      const key = `${s.persona}:${a.sid}`
      const muted = { ...s.muted }
      if (a.on) muted[key] = true
      else delete muted[key]
      return addLog({ ...s, muted }, s.persona, 'series_muted', `${a.title}${a.on ? '' : ' (undone)'}`)
    }
    case 'NOT_USEFUL': {
      const key = `${s.persona}:${a.sid}`
      const notUseful = { ...s.notUseful }
      if (a.on) notUseful[key] = true
      else delete notUseful[key]
      return addLog({ ...s, notUseful }, s.persona, 'not_useful', `${a.title}${a.on ? '' : ' (undone)'}`)
    }
    case 'SET_REMINDER': return { ...s, reminder: { ...s.reminder, [s.persona]: a.minutes } }
    case 'JOIN_START': return { ...s, join: { step: 'notice', sid: a.sid } }
    case 'JOIN_CONFIRM': {
      const series = SEED.series.find((x) => x.id === s.join.sid)
      const start = hhmmToSec(series.nextInstance.start)
      const diff = Math.round((start - s.clock) / 60)
      const when = Math.abs(start - s.clock) < 60 ? 'on time' : diff > 0 ? `joined ${diff} min before start` : `late, ${-diff} min after start`
      // The dialog opens the real Zoom room itself; the prototype just logs the join and closes it.
      const n = { ...s, join: null }
      return addLog(n, s.persona, 'meeting_joined', `${series.title}: ${when}${a.keptOut ? ' · Ansel kept out' : ' · recording consent given'}`)
    }
    case 'JOIN_CLOSE': return { ...s, join: null }
    case 'SET_SHARE': return { ...s, share: a.on ? { sec: s.clock } : null }
    default: return s
  }
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), 1000)
    return () => clearInterval(t)
  }, [])
  // Deep links from the Slack app: #ansel/<instanceId>/<tab>/<mm:ss>/<itemId>, #headsup, or the short
  // #t/<itemId> (opens that item's moment in its meeting's transcript; short enough for Slack checkbox notes).
  useEffect(() => {
    const open = () => {
      // ?as=<persona> (added by the Slack app for each message's recipient) opens the prototype as that person.
      const [path, query = ''] = decodeURIComponent(location.hash.slice(1)).split('?')
      const params = new URLSearchParams(query)
      const as = params.get('as')
      if (as && SEED.people.some((p) => p.id === as)) dispatch({ type: 'SET_PERSONA', id: as })
      const parts = path.split('/')
      // ?start=<epoch seconds>: the real meeting start from the Slack card. The clock follows it;
      // without it, links jump to at least 1:30 PM as before.
      const startS = Number(params.get('start'))
      const synced = Number.isFinite(startS) && startS > 0
      const sid = (parts[0] === 'headsup' && parts[1]) || SEED.instances.find((i) => i.id === parts[1])?.series || 'wps'
      const toClock = () => dispatch(synced ? { type: 'SYNC_TO_START', startMs: startS * 1000, sid } : { type: 'AT_LEAST_CLOCK', sec: 13.5 * 3600 })
      if (parts[0] === 't') {
        const inst = SEED.instances.find((i) => [...i.actionItems, ...i.decisions, ...i.openQuestions].some((x) => x.id === parts[1]))
        const item = inst && [...inst.actionItems, ...inst.decisions, ...inst.openQuestions].find((x) => x.id === parts[1])
        if (item) parts.splice(0, 2, 'ansel', inst.id, 'transcript', item.t, item.id)
      }
      // #headsup opens the Meetings page with Weekly Product Sync's Heads-Up card selected.
      if (parts[0] === 'headsup') {
        toClock()
        dispatch({ type: 'OPEN_ANSEL', nav: { view: 'list', seriesId: parts[1] || 'wps' } })
        return
      }
      const [root, instanceId, tab = 'summary', t, itemId] = parts
      if (root !== 'ansel' || !(instanceId === 'upcoming' || SEED.instances.some((i) => i.id === instanceId))) return
      toClock()
      dispatch({ type: 'OPEN_ANSEL', nav: { instanceId, tab, highlight: t ? { t, n: Date.now() } : null,
        // On the transcript the item is just highlighted; the item panel only opens on the Summary.
        ...(tab === 'transcript' ? { selectedItem: itemId || null } : { panelItem: itemId || null }) } })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state.theme])
  const world = useMemo(() => buildWorld(state), [state.itemUpdates, state.edits, state.muted, state.reminder, state.itemEdits])
  const value = useMemo(() => ({ state, dispatch, world }), [state, world])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
