// A document-wide read gate survives account/provider remounts during unload.
// It stores no account, entitlement or payment data and never starts a request.
const documents = new WeakMap()
export function billingReadLifecycle(window, document) {
  let existing = documents.get(document)
  if (existing) return existing
  let leaving = false
  const listeners = new Set()
  const canRead = () => !leaving && document.visibilityState !== 'hidden'
  const notify = () => { for (const listener of listeners) listener(canRead()) }
  const stop = () => { leaving = true; notify() }
  const resume = () => { leaving = false; notify() }
  const focus = () => { if (!leaving && document.visibilityState !== 'hidden') notify() }
  const resumeInteraction = event => {
    // Focus alone cannot prove that pending navigation was canceled.
    // A canceled beforeunload need not fire pageshow. A subsequent real user
    // interaction proves this document is still in use; ordinary clicks while
    // active do not trigger more reads. Synthetic events cannot unblock it.
    if (leaving && event?.isTrusted === true && document.visibilityState !== 'hidden') resume()
  }
  window.addEventListener('beforeunload', stop)
  window.addEventListener('pagehide', stop)
  window.addEventListener('pageshow', resume)
  window.addEventListener('focus', focus)
  window.addEventListener('pointerdown', resumeInteraction)
  window.addEventListener('keydown', resumeInteraction)
  document.addEventListener('visibilitychange', notify)
  existing = { canRead, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) } }
  // One passive set of handlers per document, even with zero current providers.
  // Removing the last subscriber must not forget a pending unload before remount.
  documents.set(document, existing)
  return existing
}
