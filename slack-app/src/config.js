import { existsSync } from 'node:fs'
import { parseUserMap } from './headsup.js'
import { parseAllowedUsers } from './access.js'

// Load slack-app/.env if present (Node 20.12+). Real environment variables win.
const envPath = new URL('../.env', import.meta.url)
if (existsSync(envPath)) process.loadEnvFile(envPath)

export function loadConfig(env = process.env) {
  return {
    botToken: env.SLACK_BOT_TOKEN,
    appToken: env.SLACK_APP_TOKEN,
    allowedUsers: parseAllowedUsers(env.ALLOWED_SLACK_USERS),
    users: parseUserMap(env.SLACK_USERS),
    demoPersona: env.DEMO_PERSONA || 'gabriel',
    icsUrl: env.CALENDAR_ICS_URL || '',
    calendars: parseCalendarFeeds(env),
    seriesMap: env.SERIES_MAP || 'Weekly Product Sync=wps,Design Review=dr',
    reminderMinutes: Number(env.REMINDER_MINUTES || 30),
    pollSeconds: Number(env.POLL_SECONDS || 60),
    prototypeUrl: env.PROTOTYPE_URL || '',
    demoJoinUrl: env.DEMO_JOIN_URL || 'https://meet.google.com/',
  }
}

/** CALENDAR_ICS_URL_MAYA=https://… → { gabriel: 'https://…' }. One variable per person keeps each link a separate secret. */
export function parseCalendarFeeds(env = process.env) {
  const prefix = 'CALENDAR_ICS_URL_'
  return Object.fromEntries(Object.entries(env)
    .filter(([k, v]) => k.startsWith(prefix) && k.length > prefix.length && v?.trim())
    .map(([k, v]) => [k.slice(prefix.length).toLowerCase(), v.trim()]))
}

export function requireTokens(config, { app = true } = {}) {
  const missing = [
    !config.botToken && 'SLACK_BOT_TOKEN',
    app && !config.appToken && 'SLACK_APP_TOKEN',
    !config.allowedUsers?.length && 'ALLOWED_SLACK_USERS',
  ].filter(Boolean)
  if (missing.length) {
    console.error(`Missing ${missing.join(', ')}. Copy .env.example to .env and fill it in (see slack-app/README.md).`)
    process.exit(1)
  }
}
