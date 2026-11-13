import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { SEED, SEED_COMMENTS, DEMO_DATE, CLOCK_START } from '../data/seed.js'
import { buildHeadsUp, triggerSec, hhmmToSec } from '../logic/buildHeadsUp.js'
import { buildWorld } from '../logic/world.js'

// Always start in light mode (reads better on a projector); the demo bar's toggle switches to dark.
export function initialState(theme = 'light') {
  return {
    theme,
    persona: 'gabriel',
    clock: CLOCK_START,
    tab: 'slack',
    drawerOpen: false,
    itemUpdates: {},
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
    ansel: { page: 'meetings', view: 'detail', instanceId: 'wps-1106', tab: 'summary', highlight: null, panelItem: null, focusId: null, selectedItem: null, themeId: null, shareOpen: false, chat: 'closed', chatThread: [], showFullSummary: null },
    join: null, // null | { step: 'notice' | 'call', keptOut, joinedAt }
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

function reducer(s, a) {
  switch (a.type) {
    case 'TICK': return processTriggers({ ...s, clock: s.clock + 1 })
    case 'SET_CLOCK': return processTriggers({ ...s, clock: a.sec })
    case 'AT_LEAST_CLOCK': return s.clock >= a.sec ? s : processTriggers({ ...s, clock: a.sec })
    case 'ADD_CLOCK': return processTriggers({ ...s, clock: s.clock + a.sec })
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
      return { ...s, tab: 'ansel', ansel: { ...s.ansel, page: 'meetings', view: 'detail', panelItem: null, focusId: null, highlight: null, selectedItem: null, themeId: null, showFullSummary: null, ...a.nav } }
    case 'ANSEL_NAV': return { ...s, ansel: { ...s.ansel, ...a.nav } }
    case 'CARD_OPENED': {
      if (s.opened[a.key]) return s
      return addLog({ ...s, opened: { ...s.opened, [a.key]: true } }, s.persona, 'card_opened', a.detail)
    }
    case 'UPDATE_ITEM': {
      const u = { ...a.update, by: s.persona, atSec: s.clock }
      let n = { ...s, itemUpdates: { ...s.itemUpdates, [a.id]: u } }
      n = addLog(n, s.persona, 'item_acted_on', `${a.id}: ${a.label}`)
      return addToast(n, 'Saved. Alicia will see this in the meeting record.')
    }
    case 'CLEAR_ITEM_UPDATE': {
      // Undo of Mark done from the Heads-Up card: the item goes back to its seed state.
      if (!s.itemUpdates[a.id]) return s
      const itemUpdates = { ...s.itemUpdates }
      delete itemUpdates[a.id]
      return addLog({ ...s, itemUpdates }, s.persona, 'item_acted_on', `${a.id}: ${a.label || 'undone'}`)
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
      const n = { ...s, join: { ...s.join, step: 'call', keptOut: a.keptOut } }
      return addLog(n, s.persona, 'meeting_joined', `${series.title}: ${when}${a.keptOut ? ' · Ansel kept out' : ''}`)
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
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(t)
  }, [])
  // Deep links from the Slack app: #ansel/<instanceId>/<tab>/<mm:ss>/<itemId>, or the short
  // #t/<itemId> (opens that item's moment in its meeting's transcript; short enough for Slack checkbox notes).
  useEffect(() => {
    const open = () => {
      const parts = decodeURIComponent(location.hash.slice(1)).split('/')
      if (parts[0] === 't') {
        const inst = SEED.instances.find((i) => [...i.actionItems, ...i.decisions, ...i.openQuestions].some((x) => x.id === parts[1]))
        const item = inst && [...inst.actionItems, ...inst.decisions, ...inst.openQuestions].find((x) => x.id === parts[1])
        if (item) parts.splice(0, 2, 'ansel', inst.id, 'transcript', item.t, item.id)
      }
      // #headsup opens the Heads-Up card, which is the latest meeting's Summary.
      if (parts[0] === 'headsup') {
        const latest = SEED.instances.filter((i) => i.series === 'wps' && i.recorded).sort((x, y) => (x.date < y.date ? 1 : -1))[0]
        parts.splice(0, parts.length, 'ansel', latest.id, 'summary')
      }
      const [root, instanceId, tab = 'summary', t, panelItem] = parts
      if (root !== 'ansel' || !(instanceId === 'upcoming' || SEED.instances.some((i) => i.id === instanceId))) return
      dispatch({ type: 'AT_LEAST_CLOCK', sec: 13.5 * 3600 })
      dispatch({ type: 'OPEN_ANSEL', nav: { instanceId, tab, highlight: t ? { t, n: Date.now() } : null, panelItem: panelItem || null } })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark')
  }, [state.theme])
  const world = useMemo(() => buildWorld(state), [state.itemUpdates, state.edits, state.muted, state.reminder])
  const value = useMemo(() => ({ state, dispatch, world }), [state, world])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
