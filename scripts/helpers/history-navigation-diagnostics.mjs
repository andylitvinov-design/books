import { performance } from 'node:perf_hooks'
import { observeReload } from './reload-diagnostics.mjs'
const PHASES = new Set(['recovery-start','recovery-teardown-start','recovery-teardown-complete','goto-start','goto-complete','ready-start','ready-complete','assertion-start','assertion-complete','screenshot-start','screenshot-complete','failure'])

// Passive main-page evidence. Flags below are Playwright's local bookkeeping;
// no evaluate, protocol command, retry or extra network request is performed.
export function observeHistoryNavigation(page, browser, { origin, runtime, log = () => {} } = {}) {
  const network = observeReload(page, { origin, runtime, onEvent: event => log('SYNTHETIC_HISTORY_NETWORK', event) })
  const started = performance.now(), stages = []
  let stopped = false, result, droppedStages = 0
  const record = stage => {
    if (stopped) return
    let event
    try { event = { stage, atMs: Math.round(performance.now() - started), browserConnected: browser.isConnected() === true, pageClosed: page.isClosed() === true } } catch { return }
    if (stages.length >= 32) { droppedStages++; return }
    stages.push(event)
    try { log('SYNTHETIC_HISTORY_LIVENESS', event) } catch { /* Evidence must not affect the journey. */ }
  }
  const disconnected = () => record('browser-disconnected')
  const closed = () => record('page-closed')
  browser.on('disconnected', disconnected); page.on('close', closed)
  return {
    mark(stage) { if (PHASES.has(stage)) record(stage) },
    stop() {
      if (!stopped) {
        result = { ...network.stop(), stages, droppedStages }
        stopped = true
        browser.off('disconnected', disconnected); page.off('close', closed)
      }
      return structuredClone(result)
    },
  }
}

export function collectHistoryNavigationEvidence(observer, failure = false) {
  if (failure) { try { observer?.mark('failure') } catch { /* Keep cleanup possible. */ } }
  try { return observer?.stop() } catch { return null }
}
