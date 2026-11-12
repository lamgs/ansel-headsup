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
  '`/headsup next`: upcoming recurring meetings from the calendar feed and when Heads-Up fires',
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
      if (!config.icsUrl) return say('No CALENDAR_ICS_URL set. Use `/headsup demo` for the manual trigger.')
      const occ = (await scheduler.upcoming()).filter((o) => o.recurring).slice(0, 10)
      if (!occ.length) return say('No recurring meetings in the next 7 days.')
      return say(['*Upcoming recurring meetings*', ...occ.map((o) => `• ${o.title}: ${fmt(o.startMs)} · ${o.sid ? `Heads-Up at ${fmt(o.fireAtMs)} (series ${o.sid})` : 'no Ansel series matches, skipped'}`)].join('\n'))
    }
    if (sub === 'reset') { headsUp.reset(); scheduler.reset(); return say('Reset: mutes and fired triggers cleared.') }
    return say(HELP)
  } catch (e) {
    console.error(e)
    return say(`Something went wrong: ${e.data?.error ?? e.message}`)
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
console.log(`Ansel Heads-Up is running (Socket Mode).
  Calendar: ${config.icsUrl ? 'ICS feed, polled every ' + config.pollSeconds + 's' : 'none (manual trigger only)'}
  Reminder: ${config.reminderMinutes} min before · Personas mapped: ${Object.keys(config.users).join(', ') || 'none'}
  Allowed Slack users: ${config.allowedUsers.length}
  Manual trigger: /headsup demo   ·   or: npm run trigger -- --to <slack user id or email>`)
