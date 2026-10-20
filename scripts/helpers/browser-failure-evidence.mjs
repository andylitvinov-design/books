import { classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

// Evidence/cleanup only: never used to time out or retry a tested assertion.
export async function boundedBestEffort(operation, timeoutMs = 5000) {
  let timer
  try {
    return await Promise.race([
      Promise.resolve().then(operation).then(() => 'completed', () => 'rejected'),
      new Promise(resolve => { timer = setTimeout(() => resolve('timed_out'), timeoutMs) }),
    ])
  } finally { clearTimeout(timer) }
}

export async function preserveBrowserFailure({ error, stage, elapsedMs, write, screenshot, log, timeoutMs = 5000 }) {
  const evidence = {
    category: classifyDiagnosticError(error),
    stage: ['goto-start','goto-complete','ready-start','ready-complete','assertion-start','assertion-complete','screenshot-start','screenshot-complete'].includes(stage) ? stage : 'outside-history',
    elapsedMs: Number.isFinite(elapsedMs) && elapsedMs >= 0 ? Math.round(elapsedMs) : null,
  }
  // Print before any await, then persist before interacting with a failed page.
  log('SYNTHETIC_FAILURE_ENTERED', evidence)
  const record = await boundedBestEffort(() => write(evidence), timeoutMs)
  log('SYNTHETIC_FAILURE_RECORD', { outcome: record })
  const image = await boundedBestEffort(screenshot, timeoutMs)
  log('SYNTHETIC_FAILURE_SCREENSHOT', { outcome: image })
}
