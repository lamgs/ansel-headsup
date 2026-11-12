const SLACK_USER_ID = /^[UW][A-Z0-9]{6,}$/

export function parseAllowedUsers(value = '') {
  return [...new Set(value.split(',').map((entry) => entry.trim()).filter(Boolean))]
}

export function createAccessControl({ client, allowedUsers = [], log = console.warn }) {
  const allowedIds = new Set(allowedUsers.filter((entry) => SLACK_USER_ID.test(entry)))
  const allowedEmails = allowedUsers.filter((entry) => entry.includes('@')).map((entry) => entry.toLowerCase())
  const resolvedEmails = new Map()

  async function resolveEmail(email) {
    if (resolvedEmails.has(email)) return resolvedEmails.get(email)
    try {
      const id = (await client.users.lookupByEmail({ email })).user.id
      resolvedEmails.set(email, id)
      return id
    } catch (error) {
      log(`Could not resolve allowed Slack user ${email}: ${error.data?.error ?? error.message}`)
      return null
    }
  }

  async function isAllowed(ref = '') {
    const normalized = ref.trim()
    if (!normalized) return false
    if (normalized.includes('@')) return allowedEmails.includes(normalized.toLowerCase())
    if (allowedIds.has(normalized)) return true
    for (const email of allowedEmails) {
      if (await resolveEmail(email) === normalized) return true
    }
    return false
  }

  return { isAllowed, allowedUsers: [...allowedUsers] }
}
