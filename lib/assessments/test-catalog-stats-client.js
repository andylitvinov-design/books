// Optional anonymous counts must never keep a catalogue request pending forever.
// No retries, invented zero counts or result/identity data are sent.
export function startTestCatalogStatsRequest(onStats, {
  fetchImpl = null,
  xhrFactory = typeof globalThis.XMLHttpRequest === 'function' ? () => new globalThis.XMLHttpRequest() : null,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  timeoutMs = 5000,
  lifecycleTarget = globalThis,
} = {}) {
  if (lifecycleTarget.__hhOptionalReadsDeparting === true) return { done: Promise.resolve(), cancel() {} }
  const requestImpl = fetchImpl || (xhrFactory ? (url, options) => readStatsWithXhr(url, options, xhrFactory) : globalThis.fetch)
  const controller = new AbortController()
  let active = true
  const onPageHide = () => cancel()
  const onNavigate = event => { if (event.destination?.sameDocument === false) cancel() }
  const detach = () => {
    lifecycleTarget.removeEventListener?.('beforeunload', onPageHide)
    lifecycleTarget.removeEventListener?.('pagehide', onPageHide)
    lifecycleTarget.navigation?.removeEventListener?.('navigate', onNavigate)
  }
  function cancel() { active = false; clearTimer(timer); detach(); controller.abort() }
  const timer = setTimer(cancel, timeoutMs)
  lifecycleTarget.addEventListener?.('beforeunload', onPageHide, { once: true })
  lifecycleTarget.addEventListener?.('pagehide', onPageHide, { once: true })
  lifecycleTarget.navigation?.addEventListener?.('navigate', onNavigate)
  const done = Promise.resolve().then(() => !active || lifecycleTarget.__hhOptionalReadsDeparting === true ? null : requestImpl('/api/test-catalog/stats', {
    credentials: 'same-origin', signal: controller.signal,
  })).then(response => {
    if (!response) return null
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

// WebKit can report a document-teardown fetch as an uncaught access-control
// diagnostic even when its rejection is handled. XHR gives this optional GET
// an explicit abort lifecycle. Keep the same origin, deadline and unknown state.
export function readStatsWithXhr(url, { signal }, xhrFactory) {
  return new Promise(resolve => {
    if (signal.aborted) { resolve(null); return }
    const xhr = xhrFactory()
    let settled = false
    const finish = value => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', abort)
      xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = xhr.onreadystatechange = null
      resolve(value)
    }
    const abort = () => { finish(null); xhr.abort() }
    signal.addEventListener('abort', abort, { once: true })
    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300
      const body = xhr.responseText
      finish({ ok, json: async () => JSON.parse(body) })
    }
    xhr.onerror = xhr.onabort = xhr.ontimeout = () => finish(null)
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 2 && xhr.status && (xhr.status < 200 || xhr.status >= 300)) {
        finish({ ok: false })
        xhr.abort()
      }
    }
    try { xhr.open('GET', url, true); xhr.send() }
    catch { finish(null) }
  })
}
