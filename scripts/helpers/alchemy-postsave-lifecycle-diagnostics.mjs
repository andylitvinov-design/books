// Synthetic QA evidence only. Synchronous event listeners/flags: no browser RPC,
// DOM reads, timers, action retries, exception text, or visitor data. Rejection
// is emitted before cleanup; a hanging action that never rejects has no timer
// and may therefore produce no immediate diagnostic snapshot.
const stages = new Set([
  'owned-page-ready', 'saved-assertions-complete',
  'close-click-start', 'close-click-complete', 'reopen-click-start', 'reopen-click-complete',
  'primary-rejected', 'popup-restore-requested', 'popup-restore-resolved',
  'cleanup-requested', 'context-close-requested', 'context-close-resolved', 'cleanup-ended',
])
const eventNames = ['page-close', 'page-crash', 'context-close', 'browser-disconnected']
const perEventLimit = 4, totalLimit = stages.size + eventNames.length * perEventLimit

export function createAlchemyPostSaveDiagnostics({locale, denyReceiptStorage, browser,
  emit = record => console.log('SYNTHETIC_ALCHEMY_POSTSAVE_LIFECYCLE', JSON.stringify(record))} = {}) {
  const metadata = {locale: ['en','ru'].includes(locale) ? locale : 'unknown', denyReceiptStorage: denyReceiptStorage === true}
  const entries = [], seen = new Set(), owned = []
  const counts = Object.fromEntries(eventNames.map(name => [name, 0]))
  const registered = Object.fromEntries(eventNames.map(name => [name, false]))
  let page, attached = false, disposed = false, recording = false, emitting = false, stage = 'unattached', dropped = 0, detachFailed = false, emitAttempts = 0, emitFailures = 0
  const began = performance.now()
  const drop = () => { dropped = Math.min(255, dropped + 1) }
  const publish = phase => {
    if (emitting || emitAttempts >= 3) return
    emitting = true; emitAttempts++
    try {
      const common = {schemaVersion: 1, ...metadata, phase}
      emit(phase === 'context-close-requested' ? common : {...common, attached,
        registered: {...registered}, entries: entries.map(entry => ({...entry})), counts: {...counts},
        dropped, stage, detachFailed, emitAttempts, emitFailures})
    } catch { emitFailures = Math.min(3, emitFailures + 1) } finally { emitting = false }
  }
  const flag = read => { try { const value = read(); return typeof value === 'boolean' ? value : null } catch { return null } }
  const record = kind => {
    if (disposed) return
    if (recording || emitting || entries.length >= totalLimit) { drop(); return }
    recording = true
    try {
      const elapsed = performance.now() - began
      const ms = Number.isFinite(elapsed) && elapsed >= 0 ? Math.min(Number.MAX_SAFE_INTEGER, Math.round(elapsed)) : null
      const entry = {order: entries.length + 1, kind, stage, ms,
        pageClosed: flag(() => page?.isClosed()), browserConnected: flag(() => browser?.isConnected())}
      if (!disposed) entries.push(entry)
    } catch { drop() } finally { recording = false }
  }
  const mark = next => {
    if (disposed || !attached || !stages.has(next) || seen.has(next)) return
    if (recording || emitting) { drop(); return }
    seen.add(next); stage = next; record('stage')
    if (!disposed && (next === 'primary-rejected' || next === 'context-close-requested')) publish(next)
  }
  const listen = (target, event, kind) => {
    try {
      if (disposed || typeof target?.on !== 'function' || typeof target?.off !== 'function') return
      const listener = () => {
        if (disposed) return
        if (recording || emitting) { drop(); return }
        counts[kind] = Math.min(255, counts[kind] + 1)
        if (counts[kind] > perEventLimit) { drop(); return }
        record(kind)
      }
      // Retain ownership before on(): a partial registration can throw after
      // installing its listener. Disposal still removes precisely this callback.
      owned.push({target, event, listener})
      try {
        target.on(event, listener)
        if (!disposed) registered[kind] = true
      } finally {
        // A reentrant on() may dispose before installing the callback. Undo that
        // late registration too; later listen() calls must not attach anything.
        if (disposed) { try { target.off(event, listener) } catch { detachFailed = true } }
      }
    } catch { /* Missing/failed observation never changes the journey verdict. */ }
  }
  return {
    mark,
    attach(ownedPage, context) {
      if (attached || disposed) return
      attached = true; page = ownedPage
      listen(page, 'close', 'page-close'); listen(page, 'crash', 'page-crash')
      listen(context, 'close', 'context-close'); listen(browser, 'disconnected', 'browser-disconnected')
      mark('owned-page-ready')
    },
    dispose() {
      if (disposed) return
      disposed = true // Reentrant lifecycle/emit callbacks cannot add evidence.
      for (const {target, event, listener} of owned) {
        try { target.off(event, listener) } catch { detachFailed = true }
      }
      owned.length = 0
      publish('final')
    },
  }
}
