// Ansel Heads-Up Slack app (Socket Mode). Run: npm start
import bolt from '@slack/bolt'
import { SEED } from '../../src/data/seed.js'
import { loadConfig, requireTokens } from './config.js'
import { createAccessControl } from './access.js'
import { createHeadsUp, pilotLog } from './headsup.js'
import { createScheduler } from './scheduler.js'

const { App, LogLevel } = bolt
const config = loadConfig()
requireTokens(config)

const app = new App({ token: config.botToken, appToken: config.appToken, socketMode: true, logLevel: LogLevel.WARN })
const access = createAccessControl({ client: app.client, allowedUsers: config.allowedUsers })
const headsUp = createHeadsUp({ client: app.client, config, access })
const scheduler = createScheduler({ headsUp, config, users: config.users })
const personas = SEED.people.map((p) => p.id)
const fmt = (ms) => new Date(ms).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

const HELP = [
  '*Heads-Up demo controls*',
  '`/headsup demo [persona]`: post a Heads-Up to you now, for a Weekly Product Sync starting in ' + config.reminderMinutes + ' min (default persona: ' + config.demoPersona + ')',
  '`/headsup check [persona]`: why a persona gets a card or is skipped (the behind-the-scenes drawer)',
  '`/headsup next`: your upcoming recurring meetings from your calendar feed and when Heads-Up fires',
  '`/headsup ping`: demo buttons. *Ping me* sends the demo card to you; *Ping everyone* sends each mapped teammate their own Heads-Up (people with no card get nothing)',
  '`/headsup reset`: clear mutes and fired triggers',
  `Personas: ${personas.join(', ')}`,
].join('\n')

app.command('/headsup', async ({ command, ack, respond }) => {
  await ack()
  if (!await access.isAllowed(command.user_id)) {
    pilotLog('access_denied', 'command', `by ${command.user_id}`)
    return respond({ response_type: 'ephemeral', text: 'This private demo is not enabled for your Slack account.' })
  }
  const [sub = 'help', arg] = command.text.trim().split(/\s+/)
  const persona = (arg || config.demoPersona).toLowerCase()
  const say = (text) => respond({ response_type: 'ephemeral', text })
  try {
    if (sub === 'demo') {
      if (!personas.includes(persona)) return say(`Unknown persona "${persona}". ${HELP}`)
      const startMs = Math.ceil((Date.now() + config.reminderMinutes * 60000) / 60000) * 60000
      pilotLog('manual_trigger', persona, `by ${command.user_id}`)
      const r = await headsUp.post({ persona, sid: 'wps', slackUser: command.user_id, startMs, joinUrl: config.demoJoinUrl })
      return say(r.posted ? `Posted ${persona}'s Heads-Up to your DMs with Ansel.` : `No card for ${persona}: *${r.result.reason}*.`)
    }
    if (sub === 'check') return say(headsUp.explain(persona))
    if (sub === 'next') {
      // Only show the requester's own calendar(s): meeting titles are private.
      const mine = []
      for (const p of scheduler.calendarPersonas()) {
        if (await headsUp.resolveUser(config.users[p]).catch(() => null) === command.user_id) mine.push(p)
      }
      if (!mine.length) return say('No calendar feed is connected for you. Use `/headsup demo` for the manual trigger.')
      const occ = (await scheduler.upcoming(24 * 7, mine)).filter((o) => o.recurring).slice(0, 10)
      if (!occ.length) return say('No recurring meetings in the next 7 days.')
      const who = (o) => (mine.length > 1 ? ` [${o.personas.join(', ')}]` : '')
      return say(['*Your upcoming recurring meetings*', ...occ.map((o) => `• ${o.title}: ${fmt(o.startMs)}${who(o)} · ${o.sid ? `Heads-Up at ${fmt(o.fireAtMs)} (series ${o.sid})` : 'no Ansel series matches, skipped'}`)].join('\n'))
    }
    if (sub === 'ping') return respond({ response_type: 'ephemeral', text: 'Ping everyone', blocks: pingBlocks() })
    if (sub === 'reset') { headsUp.reset(); scheduler.reset(); return say('Reset: mutes and fired triggers cleared.') }
    return say(HELP)
  } catch (e) {
    console.error(e)
    return say(`Something went wrong: ${e.data?.error ?? e.message}`)
  }
})

const nameOf = (id) => SEED.people.find((p) => p.id === id)?.name ?? id
const demoStartMs = () => Math.ceil((Date.now() + config.reminderMinutes * 60000) / 60000) * 60000

function pingBlocks() {
  const mapped = Object.keys(config.users)
  const buttons = [{ type: 'button', action_id: 'ping_me', text: { type: 'plain_text', text: 'Ping me' }, value: config.demoPersona }]
  if (mapped.length) buttons.push({ type: 'button', action_id: 'ping_everyone', style: 'primary', text: { type: 'plain_text', text: 'Ping everyone' }, value: 'wps' })
  return [
    { type: 'section', text: { type: 'mrkdwn', text: [
      `*Demo ping*: a Heads-Up for a Weekly Product Sync starting in ${config.reminderMinutes} min.`,
      `• *Ping me*: sends ${nameOf(config.demoPersona)}'s card to you only.`,
      mapped.length
        ? `• *Ping everyone*: sends each of ${mapped.map(nameOf).join(', ')} their own Heads-Up. People with nothing to show get no message.`
        : '• *Ping everyone* is unavailable: no teammates are mapped in `SLACK_USERS`.',
    ].join('\n') } },
    { type: 'actions', elements: buttons },
  ]
}

app.action('ping_me', async ({ ack, body, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  const persona = config.demoPersona
  pilotLog('manual_trigger', persona, `ping me by ${body.user.id}`)
  try {
    const r = await headsUp.post({ persona, sid: 'wps', slackUser: body.user.id, startMs: demoStartMs(), joinUrl: config.demoJoinUrl })
    await respond({ response_type: 'ephemeral', replace_original: false, text: r.posted ? `Sent ${nameOf(persona)}'s Heads-Up to your DMs with Ansel.` : `No card for ${nameOf(persona)}: *${r.result.reason}*.` })
  } catch (e) {
    console.error('ping me failed:', e.data?.error ?? e.message)
    await respond({ response_type: 'ephemeral', replace_original: false, text: `Something went wrong: ${e.data?.error ?? e.message}` })
  }
})

let pinging = false
app.action('ping_everyone', async ({ ack, body, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  if (pinging) return respond({ response_type: 'ephemeral', replace_original: false, text: 'A ping is already being sent.' })
  pinging = true
  try {
    await respond({ response_type: 'ephemeral', replace_original: true, text: 'Sending…' })
    pilotLog('ping_everyone', '-', `by ${body.user.id}`)
    const { sent, skipped, failed } = await headsUp.pingAll(config.users, { startMs: demoStartMs(), joinUrl: config.demoJoinUrl })
    const line = (label, rows, why) => (rows.length ? `*${label}:* ${rows.map((r) => (why ? `${nameOf(r.persona)} (${r.reason})` : nameOf(r.persona))).join(', ')}` : null)
    await respond({ response_type: 'ephemeral', replace_original: true, text: [
      '*Ping sent.*',
      line('Card sent to', sent, false) ?? '*Card sent to:* nobody',
      line('No card, nothing sent (by design)', skipped, true),
      line('Failed', failed, true),
    ].filter(Boolean).join('\n') })
  } finally {
    pinging = false
  }
})

const meta = (body) => JSON.parse(body.actions[0].value)

async function allowAction(body, respond) {
  if (await access.isAllowed(body.user?.id)) return true
  pilotLog('access_denied', 'action', `by ${body.user?.id || '(missing)'}`)
  if (respond) await respond({ response_type: 'ephemeral', replace_original: false, text: 'This private demo is not enabled for your Slack account.' })
  return false
}

app.action('join', async ({ ack, body, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  const m = meta(body)
  const d = Math.round((m.startMs - Date.now()) / 60000)
  pilotLog('meeting_joined', m.persona, Math.abs(d) < 1 ? 'on time' : d > 0 ? `joined ${d} min before start` : `late, ${-d} min after start`)
})

app.action(/^ts_/, async ({ ack, body, action, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  const v = JSON.parse(action.value)
  const entry = headsUp.entryFor(body)
  pilotLog('timestamp_tapped', entry.ctx.persona, `▶ ${v.t} (${v.section})`)
  if (!action.url) await respond({ response_type: 'ephemeral', replace_original: false, text: headsUp.transcriptQuote(v.instanceId, v.t) })
})

app.action('open_last_meeting', async ({ ack, body, action, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  const entry = headsUp.entryFor(body)
  const inst = entry.ctx.result.items[0]?.instanceId
  pilotLog('open_last_meeting', entry.ctx.persona, inst)
  if (!action.url && inst) await respond({ response_type: 'ephemeral', replace_original: false, text: headsUp.summaryText(inst) })
})

app.action('mute_series', async ({ ack, body, respond }) => { await ack(); if (await allowAction(body, respond)) await headsUp.setFlag(body, 'muted', true) })
app.action('undo_mute', async ({ ack, body, respond }) => { await ack(); if (await allowAction(body, respond)) await headsUp.setFlag(body, 'muted', false) })
app.action('not_useful', async ({ ack, body, respond }) => { await ack(); if (await allowAction(body, respond)) await headsUp.setFlag(body, 'notUseful', true) })
app.action('undo_not_useful', async ({ ack, body, respond }) => { await ack(); if (await allowAction(body, respond)) await headsUp.setFlag(body, 'notUseful', false) })

await app.start()
scheduler.start()

// Hosts (Railway, Docker) send SIGTERM on redeploy: stop polling and close the Slack socket so the
// old and new deployments don't both post cards.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, async () => {
    scheduler.stop()
    await app.stop().catch(() => {})
    process.exit(0)
  })
}
console.log(`Ansel Heads-Up is running (Socket Mode).
  Calendar: ${scheduler.feedCount() ? `${scheduler.feedCount()} ICS feed(s) for ${scheduler.calendarPersonas().join(', ')}, polled every ${config.pollSeconds}s` : 'none (manual trigger only)'}
  Reminder: ${config.reminderMinutes} min before · Personas mapped: ${Object.keys(config.users).join(', ') || 'none'}
  Allowed Slack users: ${config.allowedUsers.length}
  Manual trigger: /headsup demo   ·   or: npm run trigger -- --to <slack user id or email>`)
