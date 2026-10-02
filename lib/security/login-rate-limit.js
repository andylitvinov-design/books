// Server-instance limiter for a single non-identifying login bucket. The UI always
// returns the same generic failure; no submitted credential is retained or logged.
export function createLoginRateLimiter({ maxAttempts = 5, windowMs = 10 * 60_000, globalMaxAttempts = 50 } = {}) {
  const failures = new Map()
  const globalFailures = []

  function recent(entries, now) {
    return entries.filter((time) => time > now - windowMs)
  }

  function failuresFor(bucket, now) {
    const entries = recent(failures.get(bucket) ?? [], now)
    if (entries.length) failures.set(bucket, entries)
    else failures.delete(bucket)
    return entries
  }

  function globalFor(now) {
    const entries = recent(globalFailures, now)
    globalFailures.splice(0, globalFailures.length, ...entries)
    return entries
  }

  return {
    canAttempt(bucket, now = Date.now()) {
      return failuresFor(bucket, now).length < maxAttempts && globalFor(now).length < globalMaxAttempts
    },
    recordFailure(bucket, now = Date.now()) {
      const entries = failuresFor(bucket, now)
      entries.push(now)
      failures.set(bucket, entries)
      globalFor(now).push(now)
    },
    recordSuccess(bucket) {
      failures.delete(bucket)
    },
  }
}
