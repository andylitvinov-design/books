import { boundedBestEffort } from './browser-failure-evidence.mjs'

let nextToken = 0

// Isolated public verifier observer only. No focus, scroll, input mutation,
// event cancellation, synthetic action, retry, application props, or text reads.
export function installHolisticDaoActionProbe(originalRoot, { token, expiresAt }) {
  const doc = originalRoot.ownerDocument, win = doc.defaultView
  const key = '__hhHolisticDaoActionRegistry'
  let registry, probes, probe, lease = null, disposed = false
  const listeners = []
  const own = (value, property) => {
    try { return Object.getOwnPropertyDescriptor(value, property)?.value } catch { return undefined }
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    try { if (lease !== null) win.clearTimeout(lease) } catch { /* Best effort. */ }
    for (const [type, listener, capture] of listeners) {
      try { doc.removeEventListener(type, listener, capture) } catch { /* Continue owned cleanup. */ }
    }
    if (registry && probes) {
      try { registry.closedThrough = Math.max(own(registry, 'closedThrough'), token) } catch { /* No later observer touched. */ }
      try { if (Map.prototype.get.call(probes, token) === probe) Map.prototype.delete.call(probes, token) } catch { /* Fail closed. */ }
    }
  }
  try {
    if (!Number.isSafeInteger(token) || token <= 0 || !Number.isFinite(expiresAt) || Date.now() > expiresAt) return false
    const existing = Object.getOwnPropertyDescriptor(win, key)
    if (existing && !Object.hasOwn(existing, 'value')) return false
    registry = existing?.value
    if (!registry) {
      registry = { closedThrough: 0, probes: new Map() }
      Object.defineProperty(win, key, { value: registry, configurable: true })
    }
    probes = own(registry, 'probes')
    const closed = own(registry, 'closedThrough')
    const size = Object.getOwnPropertyDescriptor(Map.prototype, 'size').get.call(probes)
    if (!Number.isSafeInteger(closed) || closed < 0 || token <= closed || size >= 8 || Map.prototype.has.call(probes, token)) return false
    const types = ['input', 'change', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'submit', 'invalid', 'focusin', 'focusout']
    const records = [], counts = types.map(() => [0, 0]), trustedTargetCounts = [0, 0, 0, 0]
    let dropped = 0, observationErrors = 0
    const increment = value => Math.min(1000000, value + 1)
    const finite = value => typeof value === 'number' && Number.isFinite(value)
      ? Math.round(Math.max(-1000000, Math.min(1000000, value)) * 10) / 10 : null
    const rootNow = () => doc.querySelector('#dao-guidance[data-holistic-dao-screen] [data-ideas-discovery][data-temple-mode="true"]')
    const originalTarget = originalRoot.querySelector('[data-ideas-tao]')
    const originalForm = originalRoot.querySelector('form#ideas-question-form')
    const contains = (parent, child) => Boolean(parent && child && parent.contains(child))
    const rect = node => {
      if (!node) return null
      const box = node.getBoundingClientRect()
      return { x: finite(box.x), y: finite(box.y), width: finite(box.width), height: finite(box.height) }
    }
    const shown = node => {
      if (!node) return null
      const style = win.getComputedStyle(node), box = node.getBoundingClientRect()
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    }
    const snapshot = (event = null, phase = 'snapshot') => {
      const root = rootNow(), target = root?.querySelector('[data-ideas-tao]')
      const form = root?.querySelector('form#ideas-question-form'), input = root?.querySelector('textarea#ideas-question')
      const nav = doc.querySelector('.mobile-bottom-navigation'), results = root?.querySelectorAll('[data-ideas-result]')
      const result = results?.[0], mode = result?.getAttribute('data-ideas-result')
      const alias = node => {
        if (!node) return 'none'
        if (contains(target, node)) return 'target'
        if (contains(originalTarget, node)) return 'original-target'
        if (node === input) return 'question'
        if (contains(form, node)) return 'form'
        if (contains(nav, node)) return 'navigation'
        if (contains(result, node)) return 'result'
        return contains(root, node) ? 'root' : 'other'
      }
      const box = rect(target), x = finite(event?.clientX), y = finite(event?.clientY)
      const hitX = x ?? (box ? box.x + box.width / 2 : null)
      const hitY = y ?? (box ? box.y + box.height / 2 : null)
      const hit = hitX !== null && hitY !== null ? doc.elementFromPoint(hitX, hitY) : null
      const validity = input?.validity, navStyle = nav ? win.getComputedStyle(nav) : null
      return {
        type: event ? types[types.indexOf(event.type)] || 'unknown' : 'snapshot', phase,
        trusted: event?.isTrusted === true, defaultPrevented: event?.defaultPrevented === true,
        target: alias(event?.target), focus: alias(doc.activeElement), hit: alias(hit), submitter: alias(event?.submitter),
        inputLength: input && typeof input.value === 'string' ? Math.min(500, input.value.length) : null,
        inputValid: validity?.valid === true, valueMissing: validity?.valueMissing === true,
        tooLong: validity?.tooLong === true, customError: validity?.customError === true,
        disabled: target?.disabled === true, inputDisabled: input?.disabled === true,
        formAssociated: Boolean(target && form && target.form === form), inputFormAssociated: Boolean(input && form && input.form === form),
        rootConnected: root?.isConnected === true, targetConnected: target?.isConnected === true,
        formConnected: form?.isConnected === true, inputConnected: input?.isConnected === true,
        originalRootConnected: originalRoot.isConnected === true, originalTargetConnected: originalTarget?.isConnected === true,
        sameRoot: root === originalRoot, sameTarget: target === originalTarget, sameForm: form === originalForm,
        resultCount: Math.min(100, results?.length || 0), mode: ['dao', 'aphorisms', 'personal'].includes(mode) ? mode : result ? 'other' : 'none',
        targetVisible: shown(target), resultVisible: shown(result), navigationVisible: shown(nav),
        navigationPointerEventsNone: navStyle?.pointerEvents === 'none',
        x, y, targetRect: box, formRect: rect(form), navigationRect: rect(nav), resultRect: rect(result),
        scrollX: finite(win.scrollX), scrollY: finite(win.scrollY), viewportWidth: finite(win.innerWidth),
        viewportHeight: finite(win.innerHeight), documentHeight: finite(doc.documentElement?.scrollHeight),
      }
    }
    const read = () => {
      try { return snapshot() } catch { observationErrors = increment(observationErrors); return null }
    }
    const initial = read()
    if (Date.now() > expiresAt) { dispose(); return false }
    probe = { read() { return { initial, current: read(), records: records.slice(), counts: counts.map(pair => pair.slice()), trustedTargetCounts: trustedTargetCounts.slice(), dropped, observationErrors } }, dispose }
    Map.prototype.set.call(probes, token, probe)
    for (const [index, type] of types.entries()) for (const capture of [true, false]) {
      const listener = event => {
        if (disposed) return
        counts[index][capture ? 0 : 1] = increment(counts[index][capture ? 0 : 1])
        try {
          const entry = snapshot(event, capture ? 'capture' : 'bubble')
          const trustedIndex = ['pointerdown', 'pointerup', 'click', 'submit'].indexOf(type)
          if (capture && event.isTrusted === true && trustedIndex >= 0 &&
            (type === 'submit' ? entry.target === 'form' : entry.target === 'target'))
            trustedTargetCounts[trustedIndex] = increment(trustedTargetCounts[trustedIndex])
          if (records.length === 32) { records.shift(); dropped = increment(dropped) }
          records.push(entry)
        } catch { observationErrors = increment(observationErrors) }
      }
      // Register cleanup ownership first, including a host that adds then throws.
      listeners.push([type, listener, capture])
      doc.addEventListener(type, listener, { capture, passive: true })
    }
    if (Date.now() > expiresAt) { dispose(); return false }
    lease = win.setTimeout(dispose, 45000)
    return true
  } catch { dispose(); return false }
}

// Runs in the page; closing a token is also an installation tombstone. No
// cleanup may read/dispose a different token, including a later installation.
export function closeHolisticDaoActionProbe({ token, capture = false }) {
  const win = window, key = '__hhHolisticDaoActionRegistry'
  const own = (value, property) => {
    try { return Object.getOwnPropertyDescriptor(value, property)?.value } catch { return undefined }
  }
  if (!Number.isSafeInteger(token) || token <= 0) return null
  const descriptor = Object.getOwnPropertyDescriptor(win, key)
  if (descriptor && !Object.hasOwn(descriptor, 'value')) return null
  let registry = descriptor?.value
  if (!registry) {
    registry = { closedThrough: token, probes: new Map() }
    Object.defineProperty(win, key, { value: registry, configurable: true })
    return null
  }
  const probes = own(registry, 'probes'), closed = own(registry, 'closedThrough')
  if (!Number.isSafeInteger(closed) || closed < 0) return null
  registry.closedThrough = Math.max(closed, token)
  const probe = Map.prototype.get.call(probes, token)
  try { return capture && probe ? probe.read() : null }
  finally {
    try { probe?.dispose() }
    finally { Map.prototype.delete.call(probes, token) }
  }
}

// Fixed own-data snapshots only. Getters, proxy traps, unknown strings/keys,
// raw browser errors, URLs, values and toJSON methods never reach the sink.
export function sanitizeHolisticDaoActionDiagnostic(raw, meta = {}) {
  const own = (value, key) => {
    try { return value && typeof value === 'object' ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined }
    catch { return undefined }
  }
  const pick = (value, values) => values.includes(value) ? value : 'unknown'
  const count = (value, max = 1000000) => Number.isInteger(value) && value >= 0 ? Math.min(max, value) : null
  const finite = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-1000000, Math.min(1000000, value)) * 10) / 10 : null
  const sequence = (value, max, transform) => {
    const length = count(own(value, 'length'), max)
    if (length === null) return []
    const out = []
    for (let index = 0; index < length; index++) out.push(transform(own(value, String(index))))
    return out
  }
  const rect = value => {
    if (!value || typeof value !== 'object') return null
    return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, finite(own(value, key))]))
  }
  const aliases = ['none', 'target', 'original-target', 'question', 'form', 'navigation', 'result', 'root', 'other']
  const record = value => {
    if (!value || typeof value !== 'object') return null
    const out = {
      type: pick(own(value, 'type'), ['snapshot', 'input', 'change', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'submit', 'invalid', 'focusin', 'focusout']),
      phase: pick(own(value, 'phase'), ['snapshot', 'capture', 'bubble']),
      inputLength: count(own(value, 'inputLength'), 500), resultCount: count(own(value, 'resultCount'), 100),
      mode: pick(own(value, 'mode'), ['none', 'dao', 'aphorisms', 'personal', 'other']),
    }
    for (const key of ['target', 'focus', 'hit', 'submitter']) out[key] = pick(own(value, key), aliases)
    for (const key of ['trusted', 'defaultPrevented', 'inputValid', 'valueMissing', 'tooLong', 'customError', 'disabled', 'inputDisabled', 'formAssociated', 'inputFormAssociated', 'rootConnected', 'targetConnected', 'formConnected', 'inputConnected', 'originalRootConnected', 'originalTargetConnected', 'sameRoot', 'sameTarget', 'sameForm', 'navigationPointerEventsNone']) out[key] = own(value, key) === true
    for (const key of ['targetVisible', 'resultVisible', 'navigationVisible']) {
      const v = own(value, key); out[key] = typeof v === 'boolean' ? v : null
    }
    for (const key of ['x', 'y', 'scrollX', 'scrollY', 'viewportWidth', 'viewportHeight', 'documentHeight']) out[key] = finite(own(value, key))
    for (const key of ['targetRect', 'formRect', 'navigationRect', 'resultRect']) out[key] = rect(own(value, key))
    return out
  }
  const outcome = key => pick(own(meta, key), ['completed', 'rejected', 'timed_out', 'not-needed'])
  return {
    schema: 1, stage: 'support-dao-native-submit', locale: pick(own(meta, 'locale'), ['en', 'ru', 'es']),
    // This is only the enclosed DAO action, never whole-flow acceptance.
    actionResult: pick(own(meta, 'actionResult'), ['passed', 'failed']),
    installed: own(meta, 'installed') === true, setup: outcome('setup'), setupClose: outcome('setupClose'),
    capture: outcome('capture'), cleanup: outcome('cleanup'), pageErrorRead: outcome('pageErrorRead'),
    pageErrorCount: count(own(meta, 'pageErrorCount')),
    initial: record(own(raw, 'initial')), current: record(own(raw, 'current')),
    records: sequence(own(raw, 'records'), 32, record),
    counts: sequence(own(raw, 'counts'), 12, pair => sequence(pair, 2, value => count(value))),
    trustedTargetCounts: sequence(own(raw, 'trustedTargetCounts'), 4, value => count(value)),
    dropped: count(own(raw, 'dropped')), observationErrors: count(own(raw, 'observationErrors')),
  }
}

export async function withHolisticDaoActionDiagnostics(page, root, { locale, readPageErrorCount }, operation, {
  log = console.error, timeoutMs = 1000,
} = {}) {
  const token = ++nextToken
  let installed = false, setup = 'rejected', setupClose = 'not-needed', actionResult = 'failed'
  // Everything before the native sequence is best-effort, including a close
  // queued after a setup deadline. No additional await between fill and tap.
  try {
    setup = await boundedBestEffort(async () => {
      const value = await root.evaluate(installHolisticDaoActionProbe, { token, expiresAt: Date.now() + timeoutMs })
      installed = value === true
    }, timeoutMs)
    if (setup !== 'completed') setupClose = await boundedBestEffort(() => page.evaluate(closeHolisticDaoActionProbe, { token }), timeoutMs)
  } catch { /* Observation setup must never prevent the original operation. */ }
  try {
    const value = await operation() // Never bounded, changed, forced or retried.
    actionResult = 'passed'
    return value
  } finally {
    // Even non-Error/falsy rejections and successful return identity survive all
    // sink/protocol/host-read failures. Late callbacks have only token ownership.
    try {
      let raw, pageErrorCount
      const capture = await boundedBestEffort(async () => {
        raw = await page.evaluate(closeHolisticDaoActionProbe, { token, capture: true })
      }, timeoutMs)
      const cleanup = capture === 'completed' ? 'completed'
        : await boundedBestEffort(() => page.evaluate(closeHolisticDaoActionProbe, { token }), timeoutMs)
      const pageErrorRead = await boundedBestEffort(async () => { pageErrorCount = await readPageErrorCount?.() }, timeoutMs)
      const safe = sanitizeHolisticDaoActionDiagnostic(raw, { locale, actionResult, installed, setup, setupClose, capture, cleanup, pageErrorRead, pageErrorCount })
      await boundedBestEffort(() => log('HOLISTIC_DAO_ACTION_DIAGNOSTIC', JSON.stringify(safe)), timeoutMs)
    } catch { /* Keep the original action result/error; never print raw failures. */ }
  }
}
