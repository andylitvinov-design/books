import { boundedBestEffort } from './browser-failure-evidence.mjs'

// Isolated verifier observation only: native event delivery is not proof that
// React handled the event. Never change focus, checked state, scroll, or styles.
// No text, attributes, contact values, URLs, or application objects leave here.
export function installCompactConsentProbe(form) {
  const doc = form.ownerDocument, win = doc.defaultView
  const consent = form.querySelector('input[type="checkbox"]')
  const phone = form.querySelector('input[type="tel"]')
  const label = consent?.closest('label')
  const types = ['pointerdown', 'mousedown', 'focusout', 'focusin', 'pointerup', 'mouseup', 'click', 'input', 'change']
  const events = [], listeners = []
  const counts = types.map(() => ({ capture: 0, bubble: 0, trusted: 0 }))
  let dropped = 0, errors = 0, disposed = false
  const finite = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-10000000, Math.min(10000000, value)) * 10) / 10 : null
  const rect = node => {
    const box = node?.getBoundingClientRect?.()
    return box ? { left: finite(box.left), top: finite(box.top), right: finite(box.right),
      bottom: finite(box.bottom), width: finite(box.width), height: finite(box.height) } : null
  }
  const inside = (parent, target) => Boolean(parent && target && parent.contains(target))
  const snapshot = (event = null) => {
    const nav = doc.querySelector('.mobile-bottom-navigation')
    const navStyle = nav && win.getComputedStyle(nav)
    const x = finite(event?.clientX), y = finite(event?.clientY)
    const point = x !== null && y !== null ? { x, y } : null
    const box = rect(consent)
    const hit = point ? doc.elementFromPoint(point.x, point.y)
      : box ? doc.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2) : null
    return {
      formConnected: Boolean(form.isConnected), consentConnected: Boolean(consent?.isConnected),
      sameConsent: form.querySelector('input[type="checkbox"]') === consent,
      checked: Boolean(consent?.checked), disabled: Boolean(consent?.disabled), required: Boolean(consent?.required),
      activeConsent: doc.activeElement === consent, activePhone: doc.activeElement === phone,
      consent: box, label: rect(label), target: rect(event?.target), navigation: rect(nav),
      navHidden: Boolean(navStyle && (navStyle.display === 'none' || navStyle.visibility === 'hidden')),
      navPointerEventsNone: navStyle?.pointerEvents === 'none',
      scrollY: finite(win.scrollY), viewportHeight: finite(win.innerHeight), viewportWidth: finite(win.innerWidth),
      documentHeight: finite(doc.documentElement?.scrollHeight), point,
      targetConsent: event?.target === consent, targetLabel: inside(label, event?.target),
      targetForm: inside(form, event?.target), targetNavigation: inside(nav, event?.target),
      hitConsent: hit === consent, hitLabel: inside(label, hit),
      hitForm: inside(form, hit), hitNavigation: inside(nav, hit),
    }
  }
  const initial = snapshot()
  for (const capture of [true, false]) {
    const listener = event => {
      try {
        const index = types.indexOf(event.type)
        if (index < 0 || disposed) return
        counts[index][capture ? 'capture' : 'bubble']++
        if (capture && event.isTrusted) counts[index].trusted++
        if (events.length >= 48) { dropped++; return }
        events.push({ kind: index + 1, capture, trusted: Boolean(event.isTrusted),
          defaultPrevented: Boolean(event.defaultPrevented), ...snapshot(event) })
      } catch { errors++ } // Observation cannot interrupt the native event.
    }
    for (const type of types) {
      doc.addEventListener(type, listener, { capture, passive: true })
      listeners.push([type, listener, capture])
    }
  }
  return {
    read() { return { initial, current: snapshot(), counts: counts.map(value => ({ ...value })),
      events: events.map(value => ({ ...value })), dropped, errors } },
    dispose() {
      disposed = true
      for (const [type, listener, capture] of listeners) doc.removeEventListener(type, listener, capture)
    },
  }
}

// This wraps one native check, not a replacement action or a retry. The failure
// log is already-sanitized JSON in the existing CI log stream. Diagnostics and
// cleanup are bounded; the action's original exception always wins.
export async function observeCompactConsentCheck(form, check, { log = console.error, timeoutMs = 1000 } = {}) {
  let probe = null, finished = false
  const dispose = async handle => {
    try { await handle.evaluate(value => value.dispose()) } finally { await handle.dispose() }
  }
  const installOutcome = await boundedBestEffort(async () => {
    const handle = await form.evaluateHandle(installCompactConsentProbe)
    if (finished) await dispose(handle)
    else probe = handle
  }, timeoutMs)
  try {
    return await check()
  } catch (error) {
    let evidence = null
    const readOutcome = probe ? await boundedBestEffort(async () => {
      evidence = await probe.evaluate(value => value.read())
    }, timeoutMs) : 'not_installed'
    try { log('COMPACT_PHONE_CONSENT_FAILURE', JSON.stringify({ installOutcome, readOutcome, evidence })) }
    catch { /* A diagnostic sink failure must not replace the native failure. */ }
    throw error
  } finally {
    finished = true
    if (probe) await boundedBestEffort(() => dispose(probe), timeoutMs)
  }
}
