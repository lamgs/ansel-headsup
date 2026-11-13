// Slack Block Kit version of the Heads-Up card, contract 2.0 data (card/CONTRACT.md), in the team's chosen
// condensed layout (card/slack-mockups/condensed, B3 + M2): one text block and one row of buttons.
//   *30 min · Weekly Product Sync*
//   You own Forecast update (14:32) · 5 more items from last week     (one item of yours; 14:32 is the link)
//   [Join Zoom] [Open in Ansel] [Mute series] [Not useful]
// Several items of yours: "You own 2 items · 8 more from the team last week", then one line per item
// ("• Forecast update (14:32)"). Timestamps use the prototype's short #t/<itemId> link; "8 more…" links to the
// meeting's Action items tab. Marking items done happens in Ansel, not on the card.
// Then "Still Open" (one open question) and "Decided" (one decision) as bullets with the same timestamp links.

export const NOT_USEFUL_REASONS = [['already_knew', 'Already knew this'], ['wrong_meeting', 'Wrong meeting'], ['bad_timing', 'Bad timing']]
const SOON_MS = 5 * 60000

const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const slackTime = (ms) => `<!date^${Math.floor(ms / 1000)}^{time}|${fmtTime(ms)}>`
/** 872 → "14:32" (no leading zero, like the web card) */
export const fmtStamp = (seconds) => { const s = Math.max(0, Math.floor(seconds)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const pad = (n) => String(n).padStart(2, '0'); return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}` }

/** Deep link into the hosted prototype, e.g. #ansel/wps-1106/transcript/14:32/a2 */
export function deepLink(prototypeUrl, { instanceId, tab = 'transcript', t = '', itemId = '' }) {
  if (!prototypeUrl) return null
  return `${prototypeUrl.replace(/#.*$/, '')}#ansel/${instanceId}/${tab}/${t}${itemId ? `/${itemId}` : ''}`
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

// Bullets are indented with an en space (Slack trims ordinary leading spaces).
const BULLET = '\u2002• '
export const MAX_LISTED = 3 // items of yours listed on the card; the rest are "+N more of yours in Ansel"

/** Short transcript link (#t/<itemId>); the prototype opens that item's moment in its meeting. */
/** The full Heads-Up card in Ansel (#headsup); Slack can only carry a basic version. */
export const headsUpLink = (prototypeUrl) => (prototypeUrl ? `${prototypeUrl.replace(/#.*$/, '')}#headsup` : null)

export const shortTranscriptLink = (prototypeUrl, itemId) => (prototypeUrl ? `${prototypeUrl.replace(/#.*$/, '')}#t/${itemId}` : null)

/**
 * entry: { persona, sid, startMs, joinUrl, postMs, data (contract 2.0), ui: { muted, notUseful } }
 * Every button carries the meta needed to rebuild the card after a restart.
 */
export function buildCard(entry, { nowMs = Date.now(), prototypeUrl = '' } = {}) {
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
    const url = shortTranscriptLink(prototypeUrl, it.id)
    return url ? `<${url}|${fmtStamp(it.seconds)}>` : fmtStamp(it.seconds)
  }
  // "5 more items" links to the meeting's Action items tab in Ansel, where those items are listed.
  const teamUrl = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'actions' })
  const team = (text) => (teamUrl ? `<${teamUrl}|${text}>` : text)
  const named = (it, bold = true) => `${isDone(it) ? `~${it.text}~` : bold ? `*${it.text}*` : it.text} (${stampLink(it)})${isDone(it) ? ' · _Done_' : ''}`

  let line
  if (mine.length === 0) line = `${team(plural(othersCount, 'action item'))} from last week, none assigned to you`
  else if (mine.length === 1) line = `You own ${named(mine[0])}${othersCount ? ` · ${team(`${othersCount} more item${othersCount === 1 ? '' : 's'}`)} from last week` : ''}`
  else {
    const shown = mine.slice(0, MAX_LISTED)
    line = [`You own *${mine.length}* items${othersCount ? ` · ${team(`${othersCount} more from the team`)} last week` : ''}`,
      ...shown.map((it) => `${BULLET}${named(it, false)}`),
      ...(mine.length > shown.length ? [`${BULLET}${team(`+${mine.length - shown.length} more of yours in Ansel`)}`] : [])].join('\n')
  }
  // Still open / Decided, in the same bullet format: "• Launch date: Mar 3 or Mar 10? (27:05)"
  const note = (it) => {
    const url = shortTranscriptLink(prototypeUrl, it.id)
    return `${BULLET}${it.text} (${url ? `<${url}|${it.t.replace(/^0/, '')}>` : it.t.replace(/^0/, '')})`
  }
  if (data.stillOpen?.length) line += `\n*Still Open*\n${data.stillOpen.map(note).join('\n')}`
  if (data.decided?.length) line += `\n*Decided*\n${data.decided.map(note).join('\n')}`
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
  // Open in Ansel opens the full Heads-Up card; the card's Open last meeting leads on to the Summary.
  const cardUrl = headsUpLink(prototypeUrl)
  row.push(btn('hu_open_last', 'Open in Ansel', meta, cardUrl ? { url: cardUrl } : {}))
  row.push(btn('hu_mute', 'Mute series', meta))
  if (!ui.notUseful) row.push(btn('hu_nu', 'Not useful', meta))
  blocks.push({ type: 'actions', elements: row })
  return { text: fallback, blocks }
}
