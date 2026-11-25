// Test-only pacing. Keep one consented guest and the production quotas intact.
export function createGuestVerifierPacer({
  now = () => performance.now(),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  log = event => console.log('TYPOLOGY_GUEST_BUDGET', JSON.stringify(event)),
} = {}) {
  const quietWindowMs = 61_000 // Existing 60-second server window + one-second margin.
  let lastRequestAt = null, scenario = null, scenarioRequests = 0, totalRequests = 0
  function record(path, method = 'GET') {
    const at = now()
    lastRequestAt = at
    scenarioRequests++
    totalRequests++
    const endpoint = path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/:id')
    log({ event: 'request', scenario, scenarioRequests, totalRequests, atMs: Math.round(at), method, endpoint })
  }
  function settled() {
    // Called only after all explicit API reads, page networkidle and page close.
    // Include transport/server latency instead of timing only from dispatch.
    if (lastRequestAt !== null) lastRequestAt = now()
    log({ event: 'settled', scenario, scenarioRequests, totalRequests, atMs: Math.round(now()) })
  }
  async function beforeScenario(name) {
    // Waiting since the last activity is conservative: no fixed server window
    // containing a previous request can remain open after this quiet interval.
    while (lastRequestAt !== null && now() - lastRequestAt < quietWindowMs) {
      const waitMs = quietWindowMs - (now() - lastRequestAt)
      log({ event: 'wait', nextScenario: name, waitMs: Math.ceil(waitMs), priorScenarioRequests: scenarioRequests })
      await sleep(waitMs)
    }
    scenario = name
    scenarioRequests = 0
    log({ event: 'scenario', scenario, atMs: Math.round(now()), totalRequests })
  }
  return { record, settled, beforeScenario }
}
