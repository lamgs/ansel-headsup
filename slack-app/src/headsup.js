// Heads-Up service: build card data (contract 2.0, card/CONTRACT.md), post it to Slack, handle every card action.
import { SEED, RETENTION_DAYS } from '../../src/data/seed.js'
import { TRANSCRIPTS } from '../../src/data/transcripts.js'
import { shortDate, buildHeadsUp } from '../../src/logic/buildHeadsUp.js'
import { buildCardData } from '../../src/logic/buildCardData.js'
import { buildWorld } from '../../src/logic/world.js'
import { buildCard, cardState } from './card.js'

export function pilotLog(event, persona, detail = '') {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false })
  console.log(`[pilot] ${t}  ${event.padEnd(16)} ${String(persona).padEnd(7)} ${detail}`)
}

/** "gabriel=U123,alicia=alicia@acme.com" → { gabriel: 'U123', alicia: 'alicia@acme.com' } */
export function parseUserMap(s = '') {
  return Object.fromEntries(s.split(',').map((p) => p.split('=').map((x) => x.trim())).filter(([a, b]) => a && b))
}

export function createHeadsUp({ client, config, access, log = pilotLog }) {
  const muted = {} // `${persona}:${sid}` → true
  const live = new Map() // `${channel}:${ts}` → card entry
  const userIds = {}

  const seriesById = (sid) => SEED.series.find((s) => s.id === sid)
  const nameOf = (id) => SEED.people.find((p) => p.id === id)?.name ?? id

  /** → { series, result: { eligible, reason, suppressed?, data? } } */
  function evaluate(persona, sid, { ignoreMute = false, startMs, joinUrl } = {}) {
    const m = { ...muted }
    if (ignoreMute) delete m[`${persona}:${sid}`]
    const world = buildWorld({ muted: m })
    const user = world.person(persona)
    const series = seriesById(sid)
    if (!user || !series) throw new Error(`Unknown persona "${persona}" or series "${sid}"`)
    const result = buildCardData(user, series, world, { startMs, joinUrl: joinUrl || config.demoJoinUrl, reminderMinutes: config.reminderMinutes, retentionDays: RETENTION_DAYS })
    if (result.data) {
      // Still open / Decided: the prototype's picks (one open question you're a stakeholder on, or the latest
      // meeting's; the latest meeting's top decision). Slack-only addition to the contract data.
      const picks = buildHeadsUp(user, series, { date: series.nextInstance.date, sec: 0 }, world).items
      const pick = (section) => picks.filter((i) => i.section === section).map(({ id, text, t }) => ({ id, text, t }))
      result.data.stillOpen = pick('open')
      result.data.decided = pick('decided')
    }
    return { series, result }
  }

  async function resolveUser(ref) {
    if (/^[UW][A-Z0-9]{6,}$/.test(ref)) return ref
    if (!userIds[ref]) userIds[ref] = (await client.users.lookupByEmail({ email: ref })).user.id
    return userIds[ref]
  }

  const freshUi = () => ({ muted: false, notUseful: null })
  const render = (entry) => buildCard(entry, { nowMs: Date.now(), prototypeUrl: config.prototypeUrl })
  const update = (entry) => client.chat.update({ channel: entry.channel, ts: entry.ts, ...render(entry) })

  /** Evaluate and, if eligible, post the card as a DM. Returns { posted, series, result }. */
  async function post({ persona, sid, slackUser, startMs, joinUrl }) {
    if (!access || !await access.isAllowed(slackUser)) {
      const result = { eligible: false, reason: 'Not authorized for this app' }
      log('access_denied', persona, `Slack user ${slackUser || '(missing)'}`)
      return { posted: false, series: seriesById(sid), result }
    }
    const { series, result } = evaluate(persona, sid, { startMs, joinUrl })
    if (!result.eligible) {
      log(result.suppressed ? 'card_suppressed' : 'card_skipped', persona, `${series.title}: ${result.reason}`)
      return { posted: false, series, result }
    }
    const userId = await resolveUser(slackUser)
    const { channel } = await client.conversations.open({ users: userId })
    const entry = { channel: channel.id, persona, sid, startMs, joinUrl: result.data.meeting.joinUrl, postMs: Date.now(), data: result.data, ui: freshUi() }
    entry.lastState = cardState(Date.now(), startMs, result.data.meeting.durationMinutes)
    const res = await client.chat.postMessage({ channel: channel.id, ...render(entry) })
    entry.ts = res.ts
    live.set(`${channel.id}:${res.ts}`, entry)
    log('card_shown', persona, `${series.title} · ${result.data.actionItems.items.length} action items · Slack DM ${userId}`)
    return { posted: true, series, result }
  }

  /** "Ping everyone": post each mapped person their own card. People with no card get nothing. */
  async function pingAll(users, { sid = 'wps', startMs, joinUrl } = {}) {
    const sent = [], skipped = [], failed = []
    for (const [persona, slackUser] of Object.entries(users)) {
      try {
        const r = await post({ persona, sid, slackUser, startMs, joinUrl })
        ;(r.posted ? sent : skipped).push({ persona, reason: r.result.reason })
      } catch (e) {
        failed.push({ persona, reason: e.data?.error ?? e.message })
        console.error(`ping failed for ${persona}:`, e.data?.error ?? e.message)
      }
    }
    return { sent, skipped, failed }
  }

  /** Keep the countdown current and log state changes. Called by the scheduler every poll. */
  async function refreshCountdowns() {
    const now = Date.now()
    for (const [key, entry] of live) {
      const state = cardState(now, entry.startMs, entry.data.meeting.durationMinutes)
      if (state !== entry.lastState) { log('state_changed', entry.persona, `${entry.lastState} → ${state}`); entry.lastState = state }
      await update(entry).catch((e) => console.warn('update failed', e.data?.error ?? e.message))
      if (state === 'ended') live.delete(key)
    }
  }

  /** The button with this action_id in the message the click came from (its blocks are in the payload). */
  const buttonInMessage = (body, actionId) => (body.message?.blocks ?? [])
    .flatMap((b) => (b.type === 'actions' ? b.elements : b.accessory ? [b.accessory] : []))
    .find((e) => e.action_id === actionId)

  /** Find (or rebuild after a restart) the state for the message an action came from. */
  function entryFor(body) {
    const key = `${body.channel.id}:${body.message.ts}`
    if (live.has(key)) return live.get(key)
    // Buttons carry the card's meta; ⋮ menus don't (option values are capped at 150 characters), so use any button in the message.
    const raw = body.actions[0].value ?? (body.message?.blocks ?? [])
      .flatMap((b) => (b.type === 'actions' ? b.elements : b.accessory ? [b.accessory] : []))
      .find((e) => e.type === 'button' && e.value?.startsWith('{'))?.value
    if (!raw) throw new Error('Card can\'t be rebuilt: no card data in this message')
    const meta = JSON.parse(raw)
    const { result } = evaluate(meta.p, meta.s, { ignoreMute: true, startMs: meta.st, joinUrl: meta.j })
    if (!result.data) throw new Error(`Card can't be rebuilt: ${result.reason}`)
    const entry = { channel: body.channel.id, ts: body.message.ts, persona: meta.p, sid: meta.s, startMs: meta.st, joinUrl: meta.j, data: result.data, ui: freshUi() }
    entry.lastState = cardState(Date.now(), entry.startMs, entry.data.meeting.durationMinutes)
    live.set(key, entry)
    return entry
  }


  /**
   * Handle a card button (action_id "hu_<act>[:<reason>]").
   * Updates the card, logs the contract event and returns a private reply to show the user, if any.
   */
  async function handleAction(body, action) {
    const [act, a1] = action.action_id.replace(/^hu_/, '').split(':')
    const entry = entryFor(body)
    const { ui, persona } = entry
    const title = entry.data.meeting.title
    const ev = (name, detail = '') => log(name, persona, detail)
    switch (act) {
      case 'join':
        ev('join_tap', entry.data.meeting.platform)
        return null
      case 'open_last':
        ev('open_last_meeting', entry.data.lastMeeting.meetingId)
        // Slack's click payload doesn't include a link button's url, so look the button up in the card itself.
        // Only a button without a link (PROTOTYPE_URL=off) replies with the summary.
        return action.url || buttonInMessage(body, action.action_id)?.url ? null : summaryText(entry.data.lastMeeting.meetingId)
      case 'mute': ui.muted = true; muted[`${persona}:${entry.sid}`] = true; ev('mute_series', title); break
      case 'mute_undo': ui.muted = false; delete muted[`${persona}:${entry.sid}`]; ev('mute_undone', title); break
      case 'nu': ui.notUseful = { reason: null }; ev('not_useful', title); break
      case 'nu_reason': ui.notUseful = { reason: a1 }; ev('not_useful_reason', a1); break
      case 'nu_undo': ui.notUseful = null; ev('not_useful_undone', title); break
      default: return null
    }
    await update(entry)
    return null
  }

  function transcriptQuote(instanceId, t) {
    const segs = TRANSCRIPTS[instanceId] || []
    const i = segs.findIndex((s) => s.t === t)
    if (i < 0) return `No transcript line at ${t}.`
    const inst = SEED.instances.find((x) => x.id === instanceId)
    return [`*Weekly Product Sync · ${shortDate(inst.date)} · transcript*`, ...segs.slice(i, i + 2).map((s) => `>\`${s.t}\` *${nameOf(s.speaker)}*  ${s.text}`)].join('\n')
  }

  function summaryText(instanceId) {
    const inst = buildWorld({}).instance(instanceId)
    const lines = [`*Weekly Product Sync · ${shortDate(inst.date)} · summary*`, '*Decisions*']
    for (const d of inst.decisions) lines.push(`• ${d.trackedChange ? `~${d.trackedChange.original}~ ` : ''}${d.text}  \`${d.t}\``)
    lines.push('*Open questions*')
    for (const q of inst.openQuestions) lines.push(`• ${q.text}  \`${q.t}\``)
    lines.push('*Action items*')
    for (const a of inst.actionItems) lines.push(`• ${a.text} · ${nameOf(a.owner)}  \`${a.t}\``)
    return lines.join('\n')
  }

  function explain(persona) {
    const lines = [`*Heads-Up for ${nameOf(persona)}*`]
    for (const s of SEED.series.filter((x) => x.invitees.includes(persona))) {
      const { result } = evaluate(persona, s.id)
      lines.push(`\n*${s.title}*: ${result.eligible ? 'Card' : 'No card'} · ${result.reason}`)
      if (result.data) {
        for (const i of result.data.actionItems.items) lines.push(`${i.owner.id === persona ? '• *YOURS*' : '•'} ${i.text} · ${i.owner.name}  \`▶ ${i.t}\``)
        lines.push('`Built from last week\'s recording · no new AI processing · only you see it`')
      }
    }
    return lines.join('\n')
  }

  const reset = () => { for (const k of Object.keys(muted)) delete muted[k]; live.clear() }

  return { evaluate, post, pingAll, resolveUser, refreshCountdowns, entryFor, handleAction, transcriptQuote, summaryText, explain, reset, live }
}
