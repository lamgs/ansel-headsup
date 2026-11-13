// Slack Block Kit version of the Heads-Up card, contract 2.0 data (card/CONTRACT.md), in the team's chosen
// condensed layout (card/slack-mockups/condensed, B3 + M2): one text block and one row of buttons.
//   *30 min · Weekly Product Sync*
//   You own Forecast update (14:32) · 5 more items from last week     (one item of yours; 14:32 is the link)
//   [Join Zoom] [Open in Ansel] [Mute series] [Not useful]
// Several items of yours: "You own 2 items · 8 more from the team last week", then one line per item
// ("• Forecast update (14:32)"). Timestamps use the prototype's short #t/<itemId> link; "8 more…" links to the
// meeting's Action items tab. Marking items done happens in Ansel, not on the card: Ansel sends the change to this
// service (api.js), which redraws the card, so a done item shows struck through here within a second.

export const NOT_USEFUL_REASONS = [['already_knew', 'Already knew this'], ['wrong_meeting', 'Wrong meeting'], ['bad_timing', 'Bad timing']]
const SOON_MS = 5 * 60000

const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const slackTime = (ms) => `<!date^${Math.floor(ms / 1000)}^{time}|${fmtTime(ms)}>`
/** 872 → "14:32" (no leading zero, like the web card) */
export const fmtStamp = (seconds) => { const s = Math.max(0, Math.floor(seconds)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const pad = (n) => String(n).padStart(2, '0'); return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}` }

/** The prototype's address without its #route, plus ?k=<signed persona key> so Ansel can sync status back to this card. */
export function baseUrl(prototypeUrl, linkKey = '') {
  const base = prototypeUrl.replace(/#.*$/, '')
  if (!linkKey) return base
  const u = new URL(base)
  u.searchParams.set('k', linkKey)
  return u.toString()
}

/** Deep link into the hosted prototype, e.g. #ansel/wps-1106/transcript/14:32/a2 */
export function deepLink(prototypeUrl, { instanceId, tab = 'transcript', t = '', itemId = '' }, linkKey = '') {
  if (!prototypeUrl) return null
  return `${baseUrl(prototypeUrl, linkKey)}#ansel/${instanceId}/${tab}/${t}${itemId ? `/${itemId}` : ''}`
}

/** posted → starting-soon → started → ended (CONTRACT.md §4 state_changed) */
export function cardState(nowMs, startMs, durationMinutes) {
  if (nowMs >= startMs + durationMinutes * 60000) return 'ended'
  if (nowMs >= startMs) return 'started'
  if (startMs - nowMs <= SOON_MS) return 'starting-soon'
  return 'posted'
}

const btn = (action_id, text, value, extra = {}) => ({ type: 'button', action_id, text: { type: 'plain_text', text, emoji: true }, value, ...extra })
const md = (text) => ({ type: 'mrkdwn', text })
const ctxBlock = (text) => ({ type: 'context', elements: [md(text)] })

export const MAX_LISTED = 3 // items of yours listed on the card; the rest are "+N more of yours in Ansel"

/** Short transcript link (#t/<itemId>); the prototype opens that item's moment in its meeting. */
export const shortTranscriptLink = (prototypeUrl, itemId, linkKey = '') => (prototypeUrl ? `${baseUrl(prototypeUrl, linkKey)}#t/${itemId}` : null)

/**
 * entry: { persona, sid, startMs, joinUrl, postMs, data (contract 2.0), ui: { muted, notUseful } }
 * Every button carries the meta needed to rebuild the card after a restart.
 */
export function buildCard(entry, { nowMs = Date.now(), prototypeUrl = '', linkKey = '' } = {}) {
  const { data, ui } = entry
  const m = data.meeting
  const meta = JSON.stringify({ p: entry.persona, s: entry.sid, st: entry.startMs, j: entry.joinUrl })
  const state = cardState(nowMs, entry.startMs, m.durationMinutes)
  const mins = Math.max(1, Math.ceil((entry.startMs - nowMs) / 60000))
  const join = state === 'ended' || !m.joinUrl ? null
    : btn('hu_join', state === 'started' ? 'Join now' : `Join ${m.platform || 'meeting'}`, meta, { url: m.joinUrl, style: 'primary' })
  const hero = state === 'started' ? 'Live' : state === 'ended' ? 'Ended' : `${mins} min`
  const statusText = state === 'started' ? 'Started' : state === 'ended' ? 'Ended · new summary in about 6 min' : `Starts in ${mins} min`
  const fallback = `Heads-Up for ${m.title} · ${statusText}`

  if (ui.muted) {
    return { text: `${fallback} (muted)`, blocks: [
      { type: 'section', text: md(`*Muted ${m.title}*\nYou won't get Heads-Up for this series. ${statusText}`) },
      { type: 'actions', elements: [join, btn('hu_mute_undo', 'Undo', meta)].filter(Boolean) },
    ] }
  }

  const me = data.viewer.id
  const items = data.actionItems.items
  const mine = items.filter((i) => i.owner.id === me)
  const othersCount = items.length - mine.length + (data.actionItems.moreCount || 0)
  const isDone = (it) => !!it.done // done status comes from Ansel
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  const stampLink = (it) => {
    const url = shortTranscriptLink(prototypeUrl, it.id, linkKey)
    return url ? `<${url}|${fmtStamp(it.seconds)}>` : fmtStamp(it.seconds)
  }
  // "5 more items" links to the meeting's Action items tab in Ansel, where those items are listed.
  const teamUrl = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'actions' }, linkKey)
  const team = (text) => (teamUrl ? `<${teamUrl}|${text}>` : text)
  const named = (it) => `${isDone(it) ? `~${it.text}~` : `*${it.text}*`} (${stampLink(it)})${isDone(it) ? ' · _Done_' : ''}`

  let line
  if (mine.length === 0) line = `${team(plural(othersCount, 'action item'))} from last week, none assigned to you`
  else if (mine.length === 1) line = `You own ${named(mine[0])}${othersCount ? ` · ${team(`${othersCount} more item${othersCount === 1 ? '' : 's'}`)} from last week` : ''}`
  else {
    const shown = mine.slice(0, MAX_LISTED)
    line = [`You own ${mine.length} items${othersCount ? ` · ${team(`${othersCount} more from the team`)} last week` : ''}`,
      ...shown.map((it) => `• ${named(it)}`),
      ...(mine.length > shown.length ? [`• ${team(`+${mine.length - shown.length} more of yours in Ansel`)}`] : [])].join('\n')
  }
  if (state === 'ended') line += '\n_Meeting ended · new summary in about 6 min_'

  const blocks = [{ type: 'section', text: md(`*${hero} · ${m.title}*\n${line}`) }]

  if (ui.notUseful) {
    blocks.push(ui.notUseful.reason
      ? { type: 'section', text: md('Thanks for the feedback.'), accessory: btn('hu_nu_undo', 'Undo', meta) }
      : { type: 'section', text: md('Thanks. What was off?') },
    ...(ui.notUseful.reason ? [] : [{ type: 'actions', elements: [...NOT_USEFUL_REASONS.map(([r, label]) => btn(`hu_nu_reason:${r}`, label, meta)), btn('hu_nu_undo', 'Undo', meta)] }]))
  }

  const row = []
  if (join) row.push(join)
  const summaryUrl = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'summary' }, linkKey)
  row.push(btn('hu_open_last', 'Open in Ansel', meta, summaryUrl ? { url: summaryUrl } : {}))
  row.push(btn('hu_mute', 'Mute series', meta))
  if (!ui.notUseful) row.push(btn('hu_nu', 'Not useful', meta))
  blocks.push({ type: 'actions', elements: row })
  return { text: fallback, blocks }
}
