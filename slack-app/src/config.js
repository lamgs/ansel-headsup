import { existsSync } from 'node:fs'
import { parseUserMap } from './headsup.js'

// Load slack-app/.env if present (Node 20.12+). Real environment variables win.
const envPath = new URL('../.env', import.meta.url)
if (existsSync(envPath)) process.loadEnvFile(envPath)

export function loadConfig(env = process.env) {
  return {
    botToken: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    users: parseUserMap(env.SLACK_USERS),
    demoPersona: env.DEMO_PERSONA || 'maya',
    icsUrl: env.CALENDAR_ICS_URL || '',
    seriesMap: env.SERIES_MAP || 'Weekly Product Sync=wps,Design Review=dr',
    reminderMinutes: Number(env.REMINDER_MINUTES || 30),
    pollSeconds: Number(env.POLL_SECONDS || 60),
    prototypeUrl: env.PROTOTYPE_URL || '',
    demoJoinUrl: env.DEMO_JOIN_URL || 'https://meet.google.com/',
  }
}

export function requireTokens(config, { app = true } = {}) {
  const missing = [!config.botToken && 'SLACK_BOT_TOKEN', app && !config.appToken && 'SLACK_APP_TOKEN'].filter(Boolean)
  if (missing.length) {
    console.error(`Missing ${missing.join(', ')}. Copy .env.example to .env and fill it in (see slack-app/README.md).`)
    process.exit(1)
  }
}
