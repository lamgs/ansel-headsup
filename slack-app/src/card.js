// Renders a buildHeadsUp() result as Slack Block Kit. Same copy as the prototype card (PRD 3.1).
import { SEED } from '../../src/data/seed.js'
import { shortDate } from '../../src/logic/buildHeadsUp.js'

const SECTION = { own: 'YOU OWN', open: 'STILL OPEN', decided: 'DECIDED' }
const personName = (id) => SEED.people.find((p) => p.id === id)?.name ?? id

export function joinText(nowMs, startMs) {
  const d = Math.round((startMs - nowMs) / 60000)
  if (d > 0) return `Join · starts in ${d} min`
  if (d === 0) return 'Join · starting now'
  return `Join · started ${-d} min ago`
}

const fmtTime = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const slackTime = (ms) => `<!date^${Math.floor(ms / 1000)}^{time}|${fmtTime(ms)}>`

/** Deep link into the hosted prototype, e.g. #ansel/wps-1106/transcript/14:32/a2 */
export function deepLink(prototypeUrl, { instanceId, tab = 'transcript', t = '', itemId = '' }) {
  if (!prototypeUrl) return null
  return `${prototypeUrl.replace(/#.*$/, '')}#ansel/${instanceId}/${tab}/${t}${itemId ? `/${itemId}` : ''}`
}

/**
 * ctx: { series, result, startMs, joinUrl, prototypeUrl, persona, nowMs, muted, notUseful }
 * Everything a re-render needs is packed into button values so Undo can rebuild the card.
 */
export function buildCard(ctx) {
  const { series, result, startMs, joinUrl, prototypeUrl, nowMs = Date.now(), muted, notUseful } = ctx
  const meta = JSON.stringify({ sid: series.id, persona: ctx.persona, startMs, joinUrl })
  const source = result.items[0]
  const sourceInst = SEED.instances.find((i) => i.id === source?.instanceId)
  const title = `Heads-Up · ${series.title} · ${fmtTime(startMs)}`

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Heads-Up · ${series.title} · ${slackTime(startMs)}*` },
      accessory: { type: 'button', action_id: 'join', text: { type: 'plain_text', text: joinText(nowMs, startMs) }, url: joinUrl, style: 'primary', value: meta },
    },
  ]

  if (muted || notUseful) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: muted ? `Muted ${series.title}. You won't get Heads-Up for this series.` : "Thanks. We'll use this to tune Heads-Up." },
      accessory: { type: 'button', action_id: muted ? 'undo_mute' : 'undo_not_useful', text: { type: 'plain_text', text: 'Undo' }, value: meta },
    })
  } else {
    for (const it of result.items.slice(0, 3)) {
      const line = it.section === 'own' ? `${it.text} — ${it.dueLabel}${it.hedge ? ' (may already be done)' : ''}` : it.text
      const edited = it.edited ? '  `Edited`' : ''
      const url = deepLink(prototypeUrl, { instanceId: it.instanceId, t: it.t, itemId: it.section === 'own' ? it.id : '' })
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${SECTION[it.section]}*\n• ${line}${edited}` },
        accessory: {
          type: 'button', action_id: `ts_${it.id}`,
          text: { type: 'plain_text', text: `▶ ${it.t}` },
          value: JSON.stringify({ instanceId: it.instanceId, t: it.t, section: it.section }),
          ...(url ? { url } : {}),
        },
      })
    }
    const editedItems = result.items.filter((i) => i.edited)
    if (editedItems.length) {
      blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `\`Edited\`: changed by ${personName(series.organizer).split(' ')[0]} (organizer) after the meeting. ▶ shows the original.` }] })
    }
    const lastUrl = sourceInst ? deepLink(prototypeUrl, { instanceId: sourceInst.id, tab: 'summary' }) : null
    blocks.push({
      type: 'actions',
      elements: [
        { type: 'button', action_id: 'open_last_meeting', text: { type: 'plain_text', text: 'Open last meeting' }, value: meta, ...(lastUrl ? { url: lastUrl } : {}) },
        { type: 'button', action_id: 'mute_series', text: { type: 'plain_text', text: 'Mute series' }, value: meta },
        { type: 'button', action_id: 'not_useful', text: { type: 'plain_text', text: 'Not useful' }, value: meta },
      ],
    })
  }

  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `Private to you · from meetings you attended · ${sourceInst ? shortDate(sourceInst.date) : ''}` }] })
  return { text: title, blocks }
}
