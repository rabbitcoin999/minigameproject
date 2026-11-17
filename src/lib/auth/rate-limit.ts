// Simple in-memory rate limiter.
// Suitable for single-instance deployments; for production multi-instance,
// swap the underlying store for Redis or similar.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean expired entries to prevent memory growth.
// Hard cap: if the map grows too large (e.g. IP-spoofing flood), evict
// everything expired immediately and, if still oversized, reset entirely.
const MAX_STORE_SIZE = 10_000
let lastCleanup = Date.now()
function cleanup(): void {
  const now = Date.now()
  if (store.size < 1000 && now - lastCleanup < 60_000) return
  lastCleanup = now
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  })
  if (store.size > MAX_STORE_SIZE) {
    store.clear()
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanup()
  const now = Date.now()
  const key = identifier
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') ?? 'unknown'
}
