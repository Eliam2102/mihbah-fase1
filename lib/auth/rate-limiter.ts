// In-memory rate limiter — resets on server restart
// 5 attempts per 15-minute window per IP

const WINDOW_MS = 15 * 60 * 1000 // 15 min
const MAX_ATTEMPTS = 5

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

export function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  let entry = store.get(ip)

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    store.set(ip, entry)
  }

  entry.count++

  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count)
  const allowed = entry.count <= MAX_ATTEMPTS

  return { allowed, remaining, resetAt: entry.resetAt }
}

// Prune expired entries to avoid memory leak (called lazily on each check)
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of store) {
    if (now >= entry.resetAt) store.delete(ip)
  }
}, WINDOW_MS)
