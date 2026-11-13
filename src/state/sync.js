// Ansel → Slack status sync (client side). The Slack service's API is slack-app/src/api.js.
//
// The API address is set at build time (VITE_HEADSUP_API, from the repo variable HEADSUP_API_URL in the Pages
// workflow). Links from a Heads-Up card carry ?k=<persona>.<signature>; that key is kept in localStorage and
// sent with each update, so only the person the card was sent to can change their items. Without an API
// address or a key, the prototype works as before: changes stay in this browser tab.

export const API = (import.meta.env?.VITE_HEADSUP_API || '').replace(/\/+$/, '')
const STORAGE = 'headsup-sync-key'

/** Pick up ?k= from a card link (then drop it from the address bar) or reuse the saved one. */
export function readKey() {
  try {
    const url = new URL(location.href)
    const k = url.searchParams.get('k')
    if (k) {
      localStorage.setItem(STORAGE, k)
      url.searchParams.delete('k')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    return localStorage.getItem(STORAGE) || ''
  } catch {
    return ''
  }
}

/** The persona a key belongs to ("gabriel.Xy…" → "gabriel"). The server checks the signature. */
export const keyPersona = (key) => (key && key.includes('.') ? key.slice(0, key.lastIndexOf('.')) : '')

/** Can this persona's changes reach the Slack card? */
export const canSync = (key, persona) => !!API && !!key && keyPersona(key) === persona

/** Server time → the prototype's seconds-of-day clock (for "Done · Gabriel, 1:42 PM"). */
const toSec = (iso) => { const d = new Date(iso); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() }
const normalize = (itemUpdates = {}) => Object.fromEntries(Object.entries(itemUpdates).map(([id, u]) => [id, { ...u, atSec: u.atSec ?? toSec(u.at) }]))

async function call(path, { method = 'GET', key, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json.error || `HTTP ${res.status}`), { status: res.status, itemUpdates: json.itemUpdates && normalize(json.itemUpdates) })
  return { ...json, itemUpdates: normalize(json.itemUpdates) }
}

export const fetchItemUpdates = () => call('/api/items')
export const pushItemUpdate = (key, id, update) => call(`/api/items/${encodeURIComponent(id)}`, { method: 'POST', key, body: update })
export const undoItemUpdate = (key, id) => call(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE', key })
