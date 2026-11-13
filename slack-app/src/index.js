// Ansel Heads-Up Slack app (Socket Mode). Run: npm start
import bolt from '@slack/bolt'
import { SEED } from '../../src/data/seed.js'
import { loadConfig, requireTokens } from './config.js'
import { createAccessControl } from './access.js'
import { createHeadsUp, pilotLog } from './headsup.js'
import { createScheduler } from './scheduler.js'
import { buildHome } from './home.js'

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
  '`/headsup clear [all]`: delete every Heads-Up message in your DM with Ansel (`all`: in every mapped teammate\'s DM too), for a clean demo',
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
    if (sub === 'clear') {
      pilotLog('clear', arg === 'all' ? 'all' : '-', `by ${command.user_id}`)
      if (arg !== 'all') {
        const { deleted } = await headsUp.clearDm(command.user_id)
        return say(`Cleared ${deleted} message${deleted === 1 ? '' : 's'} from your DM with Ansel.`)
      }
      const users = { ...config.users, _requester: command.user_id }
      const { cleared, failed } = await headsUp.clearAll(users)
      const total = cleared.reduce((n, r) => n + r.deleted, 0)
      return say([
        `Cleared ${total} message${total === 1 ? '' : 's'} across ${cleared.length} DM${cleared.length === 1 ? '' : 's'}.`,
        failed.length ? `*Failed:* ${failed.map((r) => `${r.persona === '_requester' ? 'you' : nameOf(r.persona)} (${r.reason})`).join(', ')}` : null,
      ].filter(Boolean).join('\n'))
    }
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
    await reply(body, respond, r.posted ? `Sent ${nameOf(persona)}'s Heads-Up to your DMs with Ansel.` : `No card for ${nameOf(persona)}: *${r.result.reason}*.`)
  } catch (e) {
    console.error('ping me failed:', e.data?.error ?? e.message)
    await reply(body, respond, `Something went wrong: ${e.data?.error ?? e.message}`)
  }
})

let pinging = false
app.action('ping_everyone', async ({ ack, body, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  if (pinging) return reply(body, respond, 'A ping is already being sent.')
  pinging = true
  try {
    if (fromHome(body)) await publishHome(body.user.id, 'Sending…')
    else await respond({ response_type: 'ephemeral', replace_original: true, text: 'Sending…' })
    pilotLog('ping_everyone', '-', `by ${body.user.id}`)
    const { sent, skipped, failed } = await headsUp.pingAll(config.users, { startMs: demoStartMs(), joinUrl: config.demoJoinUrl })
    const line = (label, rows, why) => (rows.length ? `*${label}:* ${rows.map((r) => (why ? `${nameOf(r.persona)} (${r.reason})` : nameOf(r.persona))).join(', ')}` : null)
    const summary = [
      '*Ping sent.*',
      line('Card sent to', sent, false) ?? '*Card sent to:* nobody',
      line('No card, nothing sent (by design)', skipped, true),
      line('Failed', failed, true),
    ].filter(Boolean).join('\n')
    if (fromHome(body)) await publishHome(body.user.id, summary)
    else await respond({ response_type: 'ephemeral', replace_original: true, text: summary })
  } finally {
    pinging = false
  }
})


// Buttons on the Home tab have no response_url, so their feedback is shown on the Home tab itself.
const fromHome = (body) => body.view?.type === 'home'
async function reply(body, respond, text) {
  if (fromHome(body)) return publishHome(body.user.id, text)
  return respond({ response_type: 'ephemeral', replace_original: false, text })
}

/** Personas in SLACK_USERS that belong to this Slack user. */
async function personasFor(userId) {
  const mine = []
  for (const [p, ref] of Object.entries(config.users)) {
    if (await headsUp.resolveUser(ref).catch(() => null) === userId) mine.push(p)
  }
  return mine
}

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))])

async function publishHome(userId, status) {
  try {
    const allowed = await access.isAllowed(userId)
    const view = { allowed, demoName: nameOf(config.demoPersona), mappedNames: Object.keys(config.users).map(nameOf), reminderMinutes: config.reminderMinutes, status }
    if (allowed) {
      const [persona] = await personasFor(userId)
      view.personaName = persona && nameOf(persona)
      view.calendar = !!persona && scheduler.calendarPersonas().includes(persona)
      if (view.calendar) {
        try {
          const o = (await withTimeout(scheduler.upcoming(24 * 7, [persona]), 5000)).find((x) => x.recurring && x.sid && x.fireAtMs > Date.now())
          if (o) view.next = { title: o.title, fireAt: fmt(o.fireAtMs) }
        } catch { view.calendarError = true }
      }
    }
    await app.client.views.publish({ user_id: userId, view: buildHome(view) })
  } catch (e) {
    console.error('home publish failed:', e.data?.error ?? e.message)
  }
}

app.event('app_home_opened', async ({ event }) => {
  if (event.tab === 'home') await publishHome(event.user)
})

async function allowAction(body, respond) {
  if (await access.isAllowed(body.user?.id)) return true
  pilotLog('access_denied', 'action', `by ${body.user?.id || '(missing)'}`)
  if (respond) await respond({ response_type: 'ephemeral', replace_original: false, text: 'This private demo is not enabled for your Slack account.' })
  return false
}

// Every card button: action_id "hu_<act>[:<item>][:<reason>]" (see headsup.js handleAction)
app.action(/^hu_/, async ({ ack, body, action, respond }) => {
  await ack()
  if (!await allowAction(body, respond)) return
  try {
    const reply = await headsUp.handleAction(body, action)
    if (reply) await respond({ response_type: 'ephemeral', replace_original: false, text: reply })
  } catch (e) {
    console.error('card action failed:', e.data?.error ?? e.message)
    await respond({ response_type: 'ephemeral', replace_original: false, text: `Something went wrong: ${e.data?.error ?? e.message}` })
  }
})

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
