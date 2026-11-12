// App Home tab: what Heads-Up is, the viewer's own setup, the demo ping buttons and the commands.
// Pure: index.js gathers the facts and publishes the view.

const md = (text) => ({ type: 'mrkdwn', text })
const section = (text) => ({ type: 'section', text: md(text) })
const context = (text) => ({ type: 'context', elements: [md(text)] })
const divider = { type: 'divider' }

const INTRO = 'Before a recurring meeting, Ansel sends you a short private note drawn from the meetings you attended: *what you own*, *what is still open* and *what was decided*. It stays quiet when there is nothing for you.'

/**
 * @param {object} p
 * @param {boolean} p.allowed         viewer is on the pilot allowlist
 * @param {string}  [p.personaName]   viewer's demo persona name, if mapped in SLACK_USERS
 * @param {boolean} [p.calendar]      viewer's persona has a calendar feed
 * @param {object}  [p.next]          { title, fireAt } next scheduled Heads-Up, formatted
 * @param {boolean} [p.calendarError] the calendar couldn't be read just now
 * @param {string}  p.demoName        persona used by Ping me
 * @param {string[]} p.mappedNames    personas Ping everyone sends to
 * @param {number}  p.reminderMinutes
 * @param {string}  [p.status]        result of the last button press, shown under the buttons
 */
export function buildHome(p) {
  const blocks = [{ type: 'header', text: { type: 'plain_text', text: 'Ansel Heads-Up' } }, section(INTRO)]

  if (!p.allowed) {
    blocks.push(divider, section('This private pilot is not enabled for your Slack account. Ask the pilot team if you should have access.'))
    return { type: 'home', blocks }
  }

  const nextLine = p.next
    ? `${p.next.fireAt}\nfor ${p.next.title}`
    : p.calendarError ? 'Calendar could not be read just now' : p.calendar ? 'None in the next 7 days' : 'Connect a calendar to schedule one'

  blocks.push(
    divider,
    section('*Your setup*'),
    { type: 'section', fields: [
      md(`*Persona*\n${p.personaName ?? 'Not mapped yet'}`),
      md(`*Calendar*\n${p.calendar ? 'Connected (Outlook)' : 'Not connected'}`),
      md(`*Timing*\n${p.reminderMinutes} min before the meeting`),
      md(`*Next Heads-Up*\n${nextLine}`),
    ] },
    divider,
    section(`*Try it*\n• *Ping me* sends ${p.demoName}'s demo card to you only.\n• *Ping everyone* sends ${p.mappedNames.length ? p.mappedNames.join(', ') : 'nobody yet'} their own card at once.`),
    { type: 'actions', elements: [
      { type: 'button', action_id: 'ping_me', text: { type: 'plain_text', text: 'Ping me' }, value: 'home' },
      ...(p.mappedNames.length ? [{ type: 'button', action_id: 'ping_everyone', style: 'primary', text: { type: 'plain_text', text: 'Ping everyone' }, value: 'home' }] : []),
    ] },
  )
  if (p.status) blocks.push(context(p.status))

  blocks.push(
    divider,
    section([
      '*Commands* (type in any conversation, for example your own DM)',
      '`/headsup demo [persona]`: send a demo card to yourself',
      '`/headsup ping`: the Ping me / Ping everyone buttons',
      '`/headsup check [persona]`: why a persona gets a card or is skipped',
      '`/headsup next`: your upcoming recurring meetings and when Heads-Up fires',
    ].join('\n')),
    context('Pilot demo: cards use seeded demo meetings, not real transcripts. Cards are sent only to you, and only from meetings you attended. Personas and roles: see profiles.md in the repo.'),
  )
  return { type: 'home', blocks }
}
