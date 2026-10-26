// Host-side observation for the fresh, guarded synthetic free-review page only.
// Templates: Next v15.5.21 / e26f6ffaa710fc62ca0c8640db0e43b6663edf32,
// compiled react-dom-client.development.js blob 4376913076151ad78dcc4059ad4152fad25478da.
// A recognized message family is not proof of provenance, recovery or cause.
const prefixes = [
  ['hydration-html-mismatch', "Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client."],
  ['hydration-text-mismatch', "Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client."],
  ['hydration-attribute-mismatch', "A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up."],
  ['dom-invalid-child', 'In HTML, %s cannot be a child of <%s>.%s\nThis will cause a hydration error.%s'],
  ['dom-invalid-descendant', 'In HTML, %s cannot be a descendant of <%s>.\nThis will cause a hydration error.%s'],
  ['dom-text-child', 'In HTML, text nodes cannot be a child of <%s>.\nThis will cause a hydration error.%s'],
  ['dom-whitespace-child', "In HTML, whitespace text nodes cannot be a child of <%s>. Make sure you don't have any extra whitespace between tags on each line of your source code.\nThis will cause a hydration error.%s"],
  ['hydration-boundary-recovery-message', 'There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.'],
  ['hydration-root-recovery-message', 'There was an error while hydrating but React was able to recover by instead client rendering the entire root.'],
]

export function classifyFreeReviewStartupMessage(value) {
  // Never coerce objects, inspect args/cause/stack, or retain diagnostic text.
  if (typeof value !== 'string') return 'unclassified'
  let prefix = value.slice(0, 512)
  if (prefix.startsWith('Error: ')) prefix = prefix.slice(7)
  for (const [family, literal] of prefixes) if (prefix.startsWith(literal)) return family
  // Some engines interpolate console placeholders; WebKit may preserve them.
  // Only bounded tag tokens and the exact source-backed warning are accepted.
  const tag = '<[a-z][a-z0-9:-]{0,31}>'
  if (new RegExp('^In HTML, ' + tag + ' cannot be a child of ' + tag + '\\.\\nThis will cause a hydration error\\.').test(prefix)) return 'dom-invalid-child'
  if (new RegExp('^In HTML, ' + tag + ' cannot be a descendant of ' + tag + '\\.\\nThis will cause a hydration error\\.').test(prefix)) return 'dom-invalid-descendant'
  if (new RegExp('^In HTML, text nodes cannot be a child of ' + tag + '\\.\\nThis will cause a hydration error\\.').test(prefix)) return 'dom-text-child'
  if (new RegExp('^In HTML, whitespace text nodes cannot be a child of ' + tag + "\\. Make sure you don't have any extra whitespace between tags on each line of your source code\\.\\nThis will cause a hydration error\\.").test(prefix)) return 'dom-whitespace-child'
  return 'unclassified'
}

export function createFreeReviewStartupDiagnostics(beforeBoundary) {
  const events = []
  let readFailureCount = 0, omittedCallbackCount = 0, overflow = false, observing = false
  let cutoff = null, consoleListener = 'unavailable', attachedPage = null
  const freeze = reason => {
    if (!cutoff) cutoff = ['boundary', 'interaction', 'cleanup'].includes(reason) ? reason : 'unavailable'
  }
  const active = () => {
    if (cutoff) return false
    try {
      const before = beforeBoundary()
      if (cutoff) return false
      if (before === true) return true
      freeze(before === false ? 'boundary' : 'unavailable')
    } catch { freeze('unavailable') }
    return false
  }
  const observe = work => {
    // Guard before calling even the boundary predicate: malformed host getters
    // cannot recursively read events or consume/fabricate additional slots.
    if (observing || cutoff) return
    observing = true
    try {
      if (!active()) return
      if (events.length >= 8) {
        // No event getter, including type(), is read after the eight-slot cap.
        // Omitted callbacks can include irrelevant console levels; not errors.
        overflow = true; omittedCallbackCount = Math.min(255, omittedCallbackCount + 1)
        return
      }
      work()
    } finally { observing = false }
  }
  const record = (source, read) => {
    let value, failed = false
    try { value = read() } catch { failed = true }
    // A getter may synchronously cross the fatal boundary or freeze the list.
    // Discard that observation; never attribute a post-boundary read to startup.
    if (!active() || events.length >= 8) return
    if (failed) readFailureCount++
    events.push(Object.freeze({order:events.length + 1, source, family:classifyFreeReviewStartupMessage(value)}))
  }
  const observeConsole = message => observe(() => {
    let type
    try { type = message.type() }
    catch { if (active()) record('console-unavailable', () => { throw null }); return }
    // Recheck before reading text: type() is also an external host getter.
    if (!active()) return
    if (type === 'error' || type === 'warning') record(type === 'error' ? 'console-error' : 'console-warning', () => message.text())
  })
  const observePageError = error => observe(() => record('pageerror', () => error.message))
  const attachConsole = page => {
    if (attachedPage || cutoff) return
    attachedPage = page
    try { page.on('console', observeConsole); consoleListener = 'attached' }
    catch { /* Partial registration is still detached below. */ }
  }
  const detachConsole = () => {
    const page = attachedPage
    attachedPage = null
    try { page?.off('console', observeConsole) } catch { /* Cleanup cannot replace the original result. */ }
  }
  const snapshot = () => Object.freeze({consoleListener, cutoff:cutoff || 'unavailable', eventCount:events.length, readFailureCount, overflow, omittedCallbackCount,
    events:Object.freeze([...events])})
  return Object.freeze({observeConsole, observePageError, attachConsole, detachConsole, freeze, snapshot})
}
