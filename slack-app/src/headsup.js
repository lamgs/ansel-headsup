// Heads-Up service: evaluate with the same pure buildHeadsUp() the prototype uses, post to Slack, handle card actions.
import { SEED } from '../../src/data/seed.js'
import { TRANSCRIPTS } from '../../src/data/transcripts.js'
import { buildHeadsUp, shortDate } from '../../src/logic/buildHeadsUp.js'
import { buildWorld } from '../../src/logic/world.js'
import { buildCard } from './card.js'

export function pilotLog(event, persona, detail = '') {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false })
  console.log(`[pilot] ${t}  ${event.padEnd(16)} ${String(persona).padEnd(7)} ${detail}`)
}

/** "maya=U123,jordan=jordan@acme.com" → { maya: 'U123', jordan: 'jordan@acme.com' } */
export function parseUserMap(s = '') {
  return Object.fromEntries(s.split(',').map((p) => p.split('=').map((x) => x.trim())).filter(([a, b]) => a && b))
}

export function createHeadsUp({ client, config, access, log = pilotLog }) {
  const muted = {} // `${persona}:${sid}` → true
  const live = new Map() // `${channel}:${ts}` → { ctx, muted, notUseful }
  const userIds = {}

  const seriesById = (sid) => SEED.series.find((s) => s.id === sid)

  function evaluate(persona, sid, { ignoreMute = false } = {}) {
    const m = { ...muted }
    if (ignoreMute) delete m[`${persona}:${sid}`]
    const world = buildWorld({ muted: m })
    const user = world.person(persona)
    const series = seriesById(sid)
    if (!user || !series) throw new Error(`Unknown persona "${persona}" or series "${sid}"`)
    if (!series.invitees.includes(persona)) return { series, result: { eligible: false, reason: 'Not invited to this series', items: [], considered: [], cost: '' } }
    return { series, result: buildHeadsUp(user, series, { date: series.nextInstance.date, sec: 0 }, world) }
  }

  async function resolveUser(ref) {
    if (/^[UW][A-Z0-9]{6,}$/.test(ref)) return ref
    if (!userIds[ref]) userIds[ref] = (await client.users.lookupByEmail({ email: ref })).user.id
    return userIds[ref]
  }

  /** Evaluate and, if eligible, post the card as a DM. Returns { posted, result }. */
  async function post({ persona, sid, slackUser, startMs, joinUrl }) {
    if (!access || !await access.isAllowed(slackUser)) {
      const series = seriesById(sid)
      const result = { eligible: false, reason: 'Not authorized for this app', items: [], considered: [], cost: '' }
      log('access_denied', persona, `Slack user ${slackUser || '(missing)'}`)
      return { posted: false, series, result }
    }
    const { series, result } = evaluate(persona, sid)
    if (!result.eligible) {
      log('card_skipped', persona, `${series.title}: ${result.reason}`)
      return { posted: false, series, result }
    }
    log('card_eligible', persona, `${series.title}: ${result.items.length} items`)
    const ctx = { series, result, startMs, joinUrl: joinUrl || config.demoJoinUrl, prototypeUrl: config.prototypeUrl, persona }
    const userId = await resolveUser(slackUser)
    const { channel } = await client.conversations.open({ users: userId })
    const res = await client.chat.postMessage({ channel: channel.id, ...buildCard({ ...ctx, nowMs: Date.now() }) })
    live.set(`${channel.id}:${res.ts}`, { channel: channel.id, ts: res.ts, ctx, muted: false, notUseful: false })
    log('card_posted', persona, `${series.title} · Slack DM ${userId}`)
    return { posted: true, series, result }
  }

  const render = (entry) => buildCard({ ...entry.ctx, nowMs: Date.now(), muted: entry.muted, notUseful: entry.notUseful })

  /** Keep the Join countdown current. Called by the scheduler every poll. */
  async function refreshCountdowns() {
    const now = Date.now()
    for (const [key, entry] of live) {
      if (now > entry.ctx.startMs + 15 * 60000) { live.delete(key); continue }
      await client.chat.update({ channel: entry.channel, ts: entry.ts, ...render(entry) }).catch((e) => console.warn('update failed', e.data?.error ?? e.message))
    }
  }

  /** Find (or rebuild after a restart) the state for the message an action came from. */
  function entryFor(body) {
    const key = `${body.channel.id}:${body.message.ts}`
    if (live.has(key)) return live.get(key)
    const meta = JSON.parse(body.actions[0].value)
    const { series, result } = evaluate(meta.persona, meta.sid, { ignoreMute: true })
    const entry = { channel: body.channel.id, ts: body.message.ts, ctx: { series, result, startMs: meta.startMs, joinUrl: meta.joinUrl, prototypeUrl: config.prototypeUrl, persona: meta.persona }, muted: false, notUseful: false }
    live.set(key, entry)
    return entry
  }

  async function setFlag(body, flag, on) {
    const entry = entryFor(body)
    const { persona, series } = entry.ctx
    entry[flag] = on
    if (flag === 'muted') {
      if (on) muted[`${persona}:${series.id}`] = true
      else delete muted[`${persona}:${series.id}`]
    }
    log(flag === 'muted' ? 'series_muted' : 'not_useful', persona, `${series.title}${on ? '' : ' (undone)'}`)
    await client.chat.update({ channel: entry.channel, ts: entry.ts, ...render(entry) })
  }

  function transcriptQuote(instanceId, t) {
    const segs = TRANSCRIPTS[instanceId] || []
    const i = segs.findIndex((s) => s.t === t)
    if (i < 0) return `No transcript line at ${t}.`
    const name = (id) => SEED.people.find((p) => p.id === id).name.split(' ')[0]
    const inst = SEED.instances.find((x) => x.id === instanceId)
    return [`*Weekly Product Sync · ${shortDate(inst.date)} · transcript*`, ...segs.slice(i, i + 2).map((s) => `>\`${s.t}\` *${name(s.speaker)}*  ${s.text}`)].join('\n')
  }

  function summaryText(instanceId) {
    const inst = buildWorld({}).instance(instanceId)
    const lines = [`*Weekly Product Sync · ${shortDate(inst.date)} · summary*`, '*Decisions*']
    for (const d of inst.decisions) lines.push(`• ${d.trackedChange ? `~${d.trackedChange.original}~ ` : ''}${d.text}  \`${d.t}\``)
    lines.push('*Open questions*')
    for (const q of inst.openQuestions) lines.push(`• ${q.text}  \`${q.t}\``)
    lines.push('*Action items*')
    for (const a of inst.actionItems) lines.push(`• ${a.text} · ${SEED.people.find((p) => p.id === a.owner).name}  \`${a.t}\``)
    return lines.join('\n')
  }

  function explain(persona) {
    const lines = [`*Heads-Up decisions for ${SEED.people.find((p) => p.id === persona)?.name ?? persona}*`]
    for (const s of SEED.series.filter((x) => x.invitees.includes(persona))) {
      const { result } = evaluate(persona, s.id)
      lines.push(`\n*${s.title}*: ${result.eligible ? 'Eligible' : 'Skip'} · ${result.reason}`)
      for (const c of result.considered) lines.push(`${c.picked ? '✓' : '–'} ${c.section} · ${c.text}: _${c.why}_`)
      if (result.cost) lines.push(`\`${result.cost}\``)
    }
    return lines.join('\n')
  }

  const reset = () => { for (const k of Object.keys(muted)) delete muted[k]; live.clear() }

  return { evaluate, post, resolveUser, refreshCountdowns, entryFor, setFlag, transcriptQuote, summaryText, explain, reset, live }
}
