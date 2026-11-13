import { existsSync } from 'node:fs'
import { parseUserMap } from './headsup.js'
import { parseAllowedUsers } from './access.js'

// Load slack-app/.env if present (Node 20.12+). Real environment variables win.
const envPath = new URL('../.env', import.meta.url)
if (existsSync(envPath)) process.loadEnvFile(envPath)

// The hosted Ansel prototype (GitHub Pages, published from main). The card's ▶ and
// "Open last meeting" buttons link here. PROTOTYPE_URL overrides it; PROTOTYPE_URL=off
// turns links off, so the buttons reply in Slack with the quoted line instead.
export const DEFAULT_PROTOTYPE_URL = 'https://lamgs.github.io/ansel-headsup/'

export function prototypeUrlFrom(value) {
  const v = (value ?? '').trim()
  if (!v) return DEFAULT_PROTOTYPE_URL
  return v.toLowerCase() === 'off' ? '' : v
}

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
    prototypeUrl: prototypeUrlFrom(env.PROTOTYPE_URL),
    demoJoinUrl: env.DEMO_JOIN_URL || 'https://zoom.us/',
    // Ansel → Slack status sync (api.js). Off unless SYNC_SECRET is set.
    syncSecret: env.SYNC_SECRET || '',
    apiPort: Number(env.API_PORT || env.PORT || 8787),
    apiHost: env.API_HOST || '127.0.0.1',
    apiAllowedOrigins: parseOrigins(env.API_ALLOWED_ORIGINS),
    // systemd's StateDirectory= sets STATE_DIRECTORY; without either, state is memory only.
    stateFile: env.STATE_FILE || (env.STATE_DIRECTORY ? `${env.STATE_DIRECTORY.split(':')[0]}/state.json` : ''),
  }
}

/** Browser origins allowed to call the sync API: the hosted prototype and local dev servers by default. */
export const DEFAULT_ORIGINS = ['https://lamgs.github.io', 'http://localhost:5173', 'http://localhost:4173']
export function parseOrigins(value) {
  const list = (value ?? '').split(',').map((x) => x.trim().replace(/\/$/, '')).filter(Boolean)
  return list.length ? list : DEFAULT_ORIGINS
}

/** CALENDAR_ICS_URL_GABRIEL=https://… → { gabriel: 'https://…' }. One variable per person keeps each link a separate secret. */
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
