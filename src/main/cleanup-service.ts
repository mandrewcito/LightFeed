import { getSetting, deleteEntriesOlderThan } from './database'

let interval: ReturnType<typeof setInterval> | null = null

export function startCleanupScheduler(): void {
  stopCleanupScheduler()

  setTimeout(runCleanup, 60000)
  interval = setInterval(runCleanup, 24 * 60 * 60 * 1000)
}

export function stopCleanupScheduler(): void {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}

export function runCleanup(): number {
  const daysStr = getSetting('cleanup_older_than_days')
  if (!daysStr) return 0
  const days = parseInt(daysStr, 10)
  if (isNaN(days) || days <= 0) return 0
  const deleted = deleteEntriesOlderThan(days)
  if (deleted > 0) {
    console.log(`[Cleanup] Deleted ${deleted} entries older than ${days} days`)
  }
  return deleted
}
