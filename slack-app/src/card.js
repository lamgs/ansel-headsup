// Slack Block Kit version of the Heads-Up card, contract 2.0 (card/CONTRACT.md, matching card/heads-up-card.js).
// Countdown with Join, every action item from last meeting with its owner (the viewer's own first, YOURS),
// Mark done / Not right on rows, Open last meeting / Mute series / Not useful, the trust footer and
// "Why am I seeing this?". Slack can't draw the big timer, time bar or row colors, so they become text.

export const FLAG_REASONS = [['wrong_owner', 'Wrong owner'], ['not_real', 'Not a real item'], ['already_done', 'Already done']]
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

/** Ten-segment text stand-in for the web card's time bar. */
export function timeBar(nowMs, postMs, startMs) {
  const pct = Math.min(1, Math.max(0.04, (nowMs - postMs) / Math.max(1, startMs - postMs)))
  const on = Math.round(pct * 10)
  return '▰'.repeat(on) + '▱'.repeat(10 - on)
}

const btn = (action_id, text, value, extra = {}) => ({ type: 'button', action_id, text: { type: 'plain_text', text, emoji: true }, value, ...extra })
const md = (text) => ({ type: 'mrkdwn', text })
const ctxBlock = (text) => ({ type: 'context', elements: [md(text)] })

/**
 * entry: { persona, sid, startMs, joinUrl, postMs, data (contract 2.0), ui: { muted, notUseful, done, flags, whyOpen } }
 * Every button carries the meta needed to rebuild the card after a restart.
 */
export function buildCard(entry, { nowMs = Date.now(), prototypeUrl = '' } = {}) {
  const { data, ui } = entry
  const m = data.meeting
  const meta = JSON.stringify({ p: entry.persona, s: entry.sid, st: entry.startMs, j: entry.joinUrl })
  const state = cardState(nowMs, entry.startMs, m.durationMinutes)
  const mins = Math.max(1, Math.ceil((entry.startMs - nowMs) / 60000))
  const on = m.platform && m.platform !== 'meeting' ? ` on ${m.platform}` : ''
  const at = slackTime(entry.startMs)
  const join = state === 'ended' || !m.joinUrl ? null
    : btn('hu_join', state === 'started' ? 'Join now' : `Join ${m.platform || 'meeting'}`, meta, { url: m.joinUrl, style: 'primary' })
  const statusText = state === 'started' ? 'Started' : state === 'ended' ? 'Ended · new summary in about 6 min' : `Starts in ${mins} min`
  const fallback = `Heads-Up for ${m.title} · ${statusText}`

  if (ui.muted) {
    return { text: `${fallback} (muted)`, blocks: [
      { type: 'section', text: md(`*Muted ${m.title}*\nYou won't get Heads-Up for this series. ${statusText}`) },
      { type: 'actions', elements: [join, btn('hu_mute_undo', 'Undo', meta)].filter(Boolean) },
    ] }
  }

  const items = data.actionItems.items
  const count = items.length + (data.actionItems.moreCount || 0)
  const hero = state === 'started' ? '*Live*' : state === 'ended' ? '*Ended*' : `*${mins} min*${state === 'starting-soon' ? '  ·  starting soon' : ''}`
  const when = state === 'started' ? `Started at ${at}${on}` : state === 'ended' ? 'New summary in about 6 min' : `Starts at ${at}${on}`
  const itemsLine = count ? ` · ${count} action item${count === 1 ? '' : 's'} from last week` : ''

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: m.title, emoji: true } },
    { type: 'section', text: md(`${hero}\n${when}${itemsLine}`), ...(join ? { accessory: join } : {}) },
    ctxBlock(state === 'started' || state === 'ended' ? (state === 'started' ? '▰▰▰▰▰▰▰▰▰▰  Live' : '▱▱▱▱▱▱▱▱▱▱  Ended') : timeBar(nowMs, entry.postMs ?? entry.startMs - m.reminderMinutes * 60000, entry.startMs)),
  ]

  const me = data.viewer.id
  const mine = items.filter((i) => i.owner.id === me)
  const others = items.filter((i) => i.owner.id !== me)
  const row = (it, isMine) => {
    const done = isMine && (ui.done[it.id] ?? !!it.done)
    const flag = ui.flags[it.id]
    const flagLabel = flag?.reason ? FLAG_REASONS.find(([r]) => r === flag.reason)?.[1] : null
    const title = isMine ? `${done ? '✓ ' : ''}*${it.text}*   \`YOURS\`` : `*${it.text}*  ·  ${it.owner.name}`
    const notes = [it.summary, done ? '_Done_' : null, flag ? `_Flagged${flagLabel ? `: ${flagLabel}` : ''}_` : null].filter(Boolean).join('\n')
    const url = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, t: it.t, itemId: it.id })
    const acts = [btn(`hu_play:${it.id}`, `▶ ${fmtStamp(it.seconds)}`, meta, url ? { url } : {})]
    if (isMine) acts.push(done ? btn(`hu_done_undo:${it.id}`, '✓ Done', meta) : btn(`hu_done:${it.id}`, 'Mark done', meta))
    if (!done) acts.push(flag ? btn(`hu_flag_undo:${it.id}`, 'Flagged', meta) : btn(`hu_flag:${it.id}`, 'Not right', meta))
    const out = [{ type: 'section', text: md(notes ? `${title}\n${notes}` : title) }, { type: 'actions', elements: acts }]
    if (flag && !flag.reason) {
      out.push(ctxBlock(`What's wrong with *${it.text}*?`), { type: 'actions', elements: FLAG_REASONS.map(([r, label]) => btn(`hu_flag_reason:${it.id}:${r}`, label, meta)) })
    }
    return out
  }

  if (!items.length) blocks.push(ctxBlock('No action items from last week.'))
  for (const it of mine) blocks.push(...row(it, true))
  if (mine.length && others.length) blocks.push({ type: 'divider' })
  for (const it of others) blocks.push(...row(it, false))
  if (data.actionItems.moreCount > 0) {
    const url = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'summary' })
    blocks.push({ type: 'actions', elements: [btn('hu_more', `+${data.actionItems.moreCount} more in Ansel`, meta, url ? { url } : {})] })
  }

  if (ui.notUseful) {
    blocks.push(ui.notUseful.reason
      ? { type: 'section', text: md('Thanks for the feedback.'), accessory: btn('hu_nu_undo', 'Undo', meta) }
      : { type: 'section', text: md('Thanks. What was off?') },
    ...(ui.notUseful.reason ? [] : [{ type: 'actions', elements: [...NOT_USEFUL_REASONS.map(([r, label]) => btn(`hu_nu_reason:${r}`, label, meta)), btn('hu_nu_undo', 'Undo', meta)] }]))
  }

  const lastUrl = deepLink(prototypeUrl, { instanceId: data.lastMeeting.meetingId, tab: 'summary' })
  blocks.push({ type: 'actions', elements: [
    btn('hu_open_last', 'Open last meeting', meta, lastUrl ? { url: lastUrl } : {}),
    btn('hu_mute', 'Mute series', meta),
    ...(ui.notUseful ? [] : [btn('hu_nu', 'Not useful', meta)]),
  ] })
  blocks.push(ctxBlock(`:lock: Only you can see this. Built from ${data.lastMeeting.label}, which everyone on the invite can open, with no new AI processing.`))
  blocks.push({ type: 'actions', elements: [btn('hu_why', ui.whyOpen ? 'Hide why' : 'Why am I seeing this?', meta)] })
  if (ui.whyOpen) {
    blocks.push({ type: 'section', text: md(`>You're on the invite for ${m.title}. These items come from last week's Ansel recording, which invitees can already open. Only you see this card. Nothing new is shared. No new AI processing. Actions are audit-logged.`) })
  }
  return { text: fallback, blocks }
}
