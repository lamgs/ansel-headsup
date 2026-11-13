// Durable service state: item status updates from Ansel, mutes, and the cards that are still live
// (so a restart can keep updating them). One small JSON file; memory only if no file is configured.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const empty = () => ({ itemUpdates: {}, muted: {}, cards: [] })

export function createStateStore(file = '') {
  let data = empty()
  if (file && existsSync(file)) {
    try {
      data = { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) }
    } catch (e) {
      console.error(`state file ${file} unreadable, starting empty: ${e.message}`)
    }
  }

  function save() {
    if (!file) return
    try {
      mkdirSync(dirname(file), { recursive: true })
      const tmp = `${file}.tmp`
      writeFileSync(tmp, JSON.stringify(data))
      renameSync(tmp, file) // atomic: a crash mid-write never leaves half a file
    } catch (e) {
      console.error(`state file ${file} not saved: ${e.message}`)
    }
  }

  return {
    file,
    get: () => data,
    /** Change the state in place, then save. */
    change(fn) { fn(data); save() },
    reset() { data = empty(); save() },
  }
}
