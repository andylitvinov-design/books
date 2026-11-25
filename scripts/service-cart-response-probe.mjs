// Synthetic browser acceptance only. Observes fetch headers and the next task;
// it never consumes or drains a response that the mounted UI chose to ignore.
export function installCheckoutResponseProbe() {
  const originalFetch = window.fetch.bind(window)
  const probe = { received: 0, settled: 0, jsonReads: 0 }
  window.__serviceCartCheckoutProbe = probe
  window.fetch = async (...args) => {
    const response = await originalFetch(...args)
    const input = args[0]
    const url = new URL(typeof input === 'string' ? input : input.url, window.location.href)
    if (url.pathname === '/api/app/commerce/checkout') {
      const sequence = ++probe.received
      const originalJson = response.json.bind(response)
      response.json = (...jsonArgs) => { probe.jsonReads += 1; return originalJson(...jsonArgs) }
      // The awaiting application continuation runs before this task. A stale
      // checkout should return at its ownership guard without calling json().
      setTimeout(() => { probe.settled = sequence }, 0)
    }
    return response
  }
}
