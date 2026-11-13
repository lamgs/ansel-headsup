// Slack Block Kit version of the Heads-Up card, contract 2.0 data (card/CONTRACT.md), in the team's chosen
// condensed layout (card/slack-mockups/condensed, B3 + M2): one text block and one row of buttons.
//   *30 min · Weekly Product Sync*
//   You own Forecast update (14:32) · 5 more items from last week     (one item of yours; 14:32 is the link)
//   [✓] [Join Zoom] [Open in Ansel] [Mute series] [Not useful]
// Several items of yours: "You own 3 items · …" and a checkbox per item (up to 3; ticked = done) with the
// timestamp link as its note. Slack caps checkbox labels and notes at 75 characters, link address included,
// so links use the prototype's short #t/<itemId> form.

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

export const MAX_CHECKBOXES = 3
export const OPTION_LIMIT = 75 // Slack's limit for a checkbox label or note

/** Short transcript link (#t/<itemId>); the prototype opens that item's moment in its meeting. */
export const shortTranscriptLink = (prototypeUrl, itemId) => (prototypeUrl ? `${prototypeUrl.replace(/#.*$/, '')}#t/${itemId}` : null)

/**
 * entry: { persona, sid, startMs, joinUrl, postMs, data (contract 2.0), ui: { muted, notUseful, done } }
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
  const isDone = (it) => ui.done[it.id] ?? !!it.done
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  const fit = (text) => (text.length <= OPTION_LIMIT ? text : `${text.slice(0, OPTION_LIMIT - 1)}…`)

  const stampLink = (it) => {
    const url = shortTranscriptLink(prototypeUrl, it.id)
    return url ? `<${url}|${fmtStamp(it.seconds)}>` : fmtStamp(it.seconds)
  }

  let line
  if (mine.length === 0) line = `${plural(othersCount, 'action item')} from last week, none assigned to you`
  else if (mine.length === 1) {
    const it = mine[0]
    line = `You own ${isDone(it) ? `~${it.text}~` : `*${it.text}*`} (${stampLink(it)})${isDone(it) ? ' · _Done_' : ''}${othersCount ? ` · ${othersCount} more item${othersCount === 1 ? '' : 's'} from last week` : ''}`
  } else line = `You own ${mine.length} items${othersCount ? ` · ${othersCount} more from the team last week` : ''}`
  if (state === 'ended') line += '\n_Meeting ended · new summary in about 6 min_'

  const blocks = [{ type: 'section', text: md(`*${hero} · ${m.title}*\n${line}`) }]

  if (mine.length > 1) {
    const shown = mine.slice(0, MAX_CHECKBOXES)
    const option = (it) => {
      const name = it.text.slice(0, OPTION_LIMIT - 4)
      const url = shortTranscriptLink(prototypeUrl, it.id)
      const stamp = fmtStamp(it.seconds)
      const note = url && `<${url}|${stamp} ↗>`.length <= OPTION_LIMIT ? `<${url}|${stamp} ↗>` : stamp
      return { text: md(isDone(it) ? `~${name}~` : `*${name}*`), description: md(fit(note)), value: it.id }
    }
    const checked = shown.filter(isDone).map(option)
    blocks.push({ type: 'actions', elements: [{ type: 'checkboxes', action_id: 'hu_check', options: shown.map(option), ...(checked.length ? { initial_options: checked } : {}) }] })
    if (mine.length > shown.length) {
      const url = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'summary' })
      const more = `+${mine.length - shown.length} more of yours in Ansel`
      blocks.push(ctxBlock(url ? `<${url}|${more}>` : more))
    }
  }

  if (ui.notUseful) {
    blocks.push(ui.notUseful.reason
      ? { type: 'section', text: md('Thanks for the feedback.'), accessory: btn('hu_nu_undo', 'Undo', meta) }
      : { type: 'section', text: md('Thanks. What was off?') },
    ...(ui.notUseful.reason ? [] : [{ type: 'actions', elements: [...NOT_USEFUL_REASONS.map(([r, label]) => btn(`hu_nu_reason:${r}`, label, meta)), btn('hu_nu_undo', 'Undo', meta)] }]))
  }

  const row = []
  if (mine.length === 1) {
    const it = mine[0]
    row.push(isDone(it)
      ? btn(`hu_done_undo:${it.id}`, '✓', meta, { style: 'primary', accessibility_label: `Done: ${it.text}. Tap to undo`.slice(0, 75) })
      : btn(`hu_done:${it.id}`, '✓', meta, { accessibility_label: `Mark done: ${it.text}`.slice(0, 75) }))
  }
  if (join) row.push(join)
  const summaryUrl = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'summary' })
  row.push(btn('hu_open_last', 'Open in Ansel', meta, summaryUrl ? { url: summaryUrl } : {}))
  row.push(btn('hu_mute', 'Mute series', meta))
  if (!ui.notUseful) row.push(btn('hu_nu', 'Not useful', meta))
  blocks.push({ type: 'actions', elements: row })
  return { text: fallback, blocks }
}
