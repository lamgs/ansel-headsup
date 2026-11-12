// One-shot manual trigger without the long-running app (cron, a keyboard shortcut, or a backup for the live demo).
//   npm run trigger -- --to U0123ABC [--persona gabriel] [--in 30]
// Buttons on the card (Mute, Not useful, ▶ quotes) only respond while `npm start` is running.
import { WebClient } from '@slack/web-api'
import { loadConfig, requireTokens } from './config.js'
import { createHeadsUp } from './headsup.js'
import { createAccessControl } from './access.js'

const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((p) => p.trim().split(/\s+/)))
const config = loadConfig()
requireTokens(config, { app: false })
const persona = args.persona || config.demoPersona
const to = args.to || config.users[persona]
if (!to) { console.error('Pass --to <slack user id or email>, or map the persona in SLACK_USERS.'); process.exit(1) }
const minutes = Number(args.in ?? config.reminderMinutes)
const startMs = Math.ceil((Date.now() + minutes * 60000) / 60000) * 60000

const client = new WebClient(config.botToken)
const access = createAccessControl({ client, allowedUsers: config.allowedUsers })
const headsUp = createHeadsUp({ client, config, access })
const r = await headsUp.post({ persona, sid: args.series || 'wps', slackUser: to, startMs, joinUrl: config.demoJoinUrl })
console.log(r.posted ? 'Posted.' : `Not posted: ${r.result.reason}`)
