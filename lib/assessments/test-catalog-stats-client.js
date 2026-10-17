// Optional anonymous counts must never keep a catalogue request pending forever.
// No retries, invented zero counts or result/identity data are sent.
export function startTestCatalogStatsRequest(onStats, {
  fetchImpl = globalThis.fetch,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  timeoutMs = 5000,
  lifecycleTarget = globalThis,
} = {}) {
  const controller = new AbortController()
  let active = true
  const onPageHide = () => cancel()
  const onNavigate = event => { if (event.sameDocument === false) cancel() }
  const detach = () => {
    lifecycleTarget.removeEventListener?.('pagehide', onPageHide)
    lifecycleTarget.navigation?.removeEventListener?.('navigate', onNavigate)
  }
  function cancel() { active = false; clearTimer(timer); detach(); controller.abort() }
  const timer = setTimer(cancel, timeoutMs)
  lifecycleTarget.addEventListener?.('pagehide', onPageHide, { once: true })
  lifecycleTarget.navigation?.addEventListener?.('navigate', onNavigate)
  const done = Promise.resolve().then(() => fetchImpl('/api/test-catalog/stats', {
    credentials: 'same-origin', signal: controller.signal,
  })).then(response => {
    if (!response.ok) {
      // Headers resolve fetch before its body is finished. Explicitly release
      // an unused error response instead of clearing its only abort deadline.
      active = false
      controller.abort()
      return null
    }
    return response.json()
  }).then(value => {
    if (active && Array.isArray(value?.stats)) onStats(value.stats)
  }).catch(() => {}).finally(() => { clearTimer(timer); detach() })
  return {
    done,
    cancel,
  }
}
