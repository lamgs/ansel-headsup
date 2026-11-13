// HTTP API for Ansel → Slack status sync. Ansel (the hosted prototype) calls it when someone marks an action
// item done (or On track / New date / Reassign); the service saves the change and redraws the live Slack cards.
//
//   GET    /api/health              → { ok: true }
//   GET    /api/items               → { itemUpdates }            current statuses (seeded demo data, public)
//   POST   /api/items/:id           body { kind, due?, owner?, note? }   needs Authorization: Bearer <key>
//   DELETE /api/items/:id           undo the change                      needs Authorization: Bearer <key>
//
// <key> is the signed persona key from the card's links (?k=…, see items.js). Browsers may call it only from
// API_ALLOWED_ORIGINS. Socket Mode still carries all Slack traffic; this port only needs to be reachable by
// browsers, behind HTTPS (Caddy on the VM, see deploy/setup-vm.sh).
import { createServer } from 'node:http'
import { verifyKey } from './items.js'

const MAX_BODY = 4096

export function createApi({ headsUp, config, log = console.log }) {
  const origins = new Set(config.apiAllowedOrigins ?? [])

  function send(req, res, status, body) {
    const origin = req.headers.origin
    const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' }
    if (origin && origins.has(origin)) {
      Object.assign(headers, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '600',
        vary: 'Origin',
      })
    }
    res.writeHead(status, headers)
    res.end(body === undefined ? '' : JSON.stringify(body))
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let size = 0
      const chunks = []
      req.on('data', (c) => {
        size += c.length
        if (size > MAX_BODY) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy() } else chunks.push(c)
      })
      req.on('end', () => {
        if (!chunks.length) return resolve({})
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })) }
      })
      req.on('error', reject)
    })
  }

  async function handle(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost')
    if (req.method === 'OPTIONS') return send(req, res, 204)
    if (req.headers.origin && !origins.has(req.headers.origin)) return send(req, res, 403, { error: 'Origin not allowed' })

    if (pathname === '/api/health' && req.method === 'GET') return send(req, res, 200, { ok: true })
    if (pathname === '/api/items' && req.method === 'GET') return send(req, res, 200, { itemUpdates: headsUp.itemUpdates() })

    const m = pathname.match(/^\/api\/items\/([A-Za-z0-9_-]{1,40})$/)
    if (!m || !['POST', 'DELETE'].includes(req.method)) return send(req, res, 404, { error: 'Not found' })

    const persona = verifyKey(config.syncSecret, (req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''))
    if (!persona) {
      log('api_denied', '-', `${req.method} ${pathname}: missing or invalid key`)
      return send(req, res, 401, { error: 'Open Ansel from your Heads-Up card in Slack to sync changes' })
    }
    const r = req.method === 'POST'
      ? await headsUp.updateItem(m[1], persona, await readJson(req))
      : await headsUp.reopenItem(m[1], persona)
    return send(req, res, r.ok ? 200 : r.status, r.ok ? r : { error: r.error, itemUpdates: r.itemUpdates })
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (!e.status) console.error('api error:', e.message)
      send(req, res, e.status ?? 500, { error: e.status ? e.message : 'Server error' })
    })
  })

  return {
    server,
    /** → the port it listens on */
    listen: (port = config.apiPort, host = config.apiHost) => new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, host, () => resolve(server.address().port))
    }),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
