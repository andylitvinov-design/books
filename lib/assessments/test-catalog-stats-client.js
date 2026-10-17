// Optional anonymous counts must never keep a catalogue request pending forever.
// No retries, invented zero counts or result/identity data are sent.
export function startTestCatalogStatsRequest(onStats, {
  fetchImpl = globalThis.fetch,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  timeoutMs = 5000,
} = {}) {
  const controller = new AbortController()
  let active = true
  const timer = setTimer(() => { active = false; controller.abort() }, timeoutMs)
  const done = Promise.resolve().then(() => fetchImpl('/api/test-catalog/stats', {
    credentials: 'same-origin', signal: controller.signal,
  })).then(response => response.ok ? response.json() : null).then(value => {
    if (active && Array.isArray(value?.stats)) onStats(value.stats)
  }).catch(() => {}).finally(() => clearTimer(timer))
  return {
    done,
    cancel() { active = false; clearTimer(timer); controller.abort() },
  }
}
