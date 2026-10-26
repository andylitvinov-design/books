import {randomUUID} from "node:crypto"

// Disposable, isolated Ideas acceptance only. This observer does not dispatch,
// focus, scroll, mutate controls/styles, change timeouts or retry native input.
// Only fixed categories, finite numbers and booleans cross the page boundary.
export function installIdeasTapProbe({ expectedOrigin, expectedPath, owner }) {
  if (window.__ideasTapProbe) throw new Error('IDEAS_PROBE_ALREADY_INSTALLED')
  const root = document.querySelector('[data-ideas-discovery]')
  if (!root) throw new Error('IDEAS_PROBE_ROOT_MISSING')
  const entries = [], layouts = [], listeners = [], ids = new WeakMap()
  let active = true, nextId = 0, dropped = 0, droppedLayouts = 0, scrollSamples = 0, droppedScroll = 0
  const began = performance.now()
  const number = value => Number.isFinite(value) && Math.abs(value) <= 1e9 ? Math.round(value * 100) / 100 : null
  const token = node => { if (!node) return 0; if (!ids.has(node)) ids.set(node, ++nextId); return ids.get(node) }
  const nodes = () => ({
    input: root.querySelector('#ideas-question'), button: root.querySelector('[data-ideas-free-test]'),
    panel: root.querySelector('[data-ideas-filtered-tests]'), nav: document.querySelector('.ia222-bottom-navigation'),
  })
  const category = (target, n) => {
    if (!target) return 'none'
    if (target === window || target === window.visualViewport || target === document || target === document.documentElement || target === document.body) return 'document'
    for (const key of ['input', 'button', 'panel', 'nav']) if (n[key] && (target === n[key] || n[key].contains(target))) return key
    return root.contains(target) ? 'ideas-other' : 'outside'
  }
  const state = () => {
    try {
      const n = nodes(), length = typeof n.input?.value === 'string' ? number(n.input.value.length) : null
      const expanded = n.button?.getAttribute('aria-expanded')
      return {available: true, sameOrigin: window.location.origin === expectedOrigin,
        samePath: window.location.pathname === expectedPath, queryAbsent: window.location.search === '', fragmentAbsent: window.location.hash === '',
        rootConnected: root.isConnected === true, input: token(n.input), button: token(n.button), panel: token(n.panel),
        inputLength: length, question: length === null ? 'missing' : length === 0 ? 'empty' : 'nonempty',
        expanded: expanded === 'true' ? 'true' : expanded === 'false' ? 'false' : 'other',
        panelHidden: n.panel ? n.panel.hidden === true : null, disabled: n.button ? n.button.disabled === true : null,
        activeTarget: category(document.activeElement, n), scroll: [window.scrollX, window.scrollY].map(number)}
    } catch { return {available: false} }
  }
  const geometry = point => {
    try {
      const n = nodes(), viewport = window.visualViewport
      const rect = node => { const r = node?.getBoundingClientRect(); return r ? [r.x, r.y, r.width, r.height].map(number) : null }
      const px = value => /^-?(?:\d+\.?\d*|\.\d+)px$/.test(value || '') ? number(Number.parseFloat(value)) : null
      const choice = (value, allowed) => allowed.includes(value) ? value : 'other'
      const button = rect(n.button), body = getComputedStyle(document.body), nav = n.nav ? getComputedStyle(n.nav) : null
      const at = p => p?.every(v => typeof v === 'number') ? category(document.elementFromPoint(p[0], p[1]), n) : 'none'
      return {available: true, button, input: rect(n.input), panel: rect(n.panel), nav: rect(n.nav),
        viewport: [window.innerWidth, window.innerHeight, viewport?.width, viewport?.height, viewport?.offsetLeft, viewport?.offsetTop, viewport?.scale].map(number),
        scroll: [window.scrollX, window.scrollY].map(number),
        documentSize: [document.documentElement.clientWidth, document.documentElement.clientHeight, document.documentElement.scrollWidth, document.documentElement.scrollHeight].map(number),
        bodyPadding: [px(body.paddingTop), px(body.paddingBottom)], bottomHeight: px(body.getPropertyValue('--ia222-bottom-height').trim()),
        navDisplay: nav ? choice(nav.display, ['none','grid','flex','block']) : 'missing',
        navVisibility: nav ? choice(nav.visibility, ['visible','hidden','collapse']) : 'missing',
        hitAtPoint: at(point), hitAtButtonCenter: button?.every(v => typeof v === 'number') ? at([button[0] + button[2] / 2, button[1] + button[3] / 2]) : 'none'}
    } catch { return {available: false} }
  }
  const record = (kind, phase, event) => {
    if (!active) return
    if (entries.length >= 96) { dropped++; return }
    try {
      const n = nodes(), touch = event?.changedTouches?.[0] ?? event?.touches?.[0]
      const point = [touch?.clientX ?? event?.clientX, touch?.clientY ?? event?.clientY].map(number)
      entries.push({kind, phase, ms: number(performance.now() - began), target: category(event?.target, n),
        relatedTarget: category(event?.relatedTarget, n), trusted: event?.isTrusted === true, prevented: event?.defaultPrevented === true,
        primary: event?.isPrimary === true, pointer: ['touch','mouse','pen'].includes(event?.pointerType) ? event.pointerType : 'other',
        point, state: state()})
      if (phase !== 'bubble') {
        if (layouts.length < 20) layouts.push({row: entries.length - 1, geometry: geometry(point)})
        else droppedLayouts++
      }
    } catch { dropped++ } // A diagnostic read cannot escape into event dispatch.
  }
  const observer = new MutationObserver(() => record('mutation', 'observer'))
  const detach = () => {
    active = false
    for (const [target, type, listener, capture] of listeners) {
      try { target.removeEventListener(type, listener, capture) } catch { /* Fixed unavailable result only. */ }
    }
    try { observer.disconnect() } catch { /* Page teardown remains authoritative. */ }
  }
  const probe = { owner, stop() {
    detach()
    if (window.__ideasTapProbe === probe) delete window.__ideasTapProbe
    return {schemaVersion: 1, outcome: 'captured', entries, layouts, final: state(), finalGeometry: geometry(), dropped, droppedLayouts, droppedScroll}
  } }
  const on = (target, type, listener, capture = true) => {
    listeners.push([target, type, listener, capture])
    target.addEventListener(type, listener, {capture, passive: true})
  }
  try {
    for (const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend','touchcancel','mousedown','mouseup','click','focusin','focusout','input']) {
      for (const capture of [true, false]) on(document, type, event => record(type, capture ? 'capture' : 'bubble', event), capture)
    }
    const scroll = kind => event => {
      if (!active) return
      if (scrollSamples++ < 8) record(kind, 'capture', event)
      else droppedScroll++
    }
    on(document, 'scroll', scroll('scroll'))
    if (window.visualViewport) {
      on(window.visualViewport, 'scroll', scroll('viewport-scroll'))
      on(window.visualViewport, 'resize', scroll('viewport-resize'))
    }
    observer.observe(root, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded','hidden']})
    window.__ideasTapProbe = probe
    record('start', 'snapshot')
    return true
  } catch {
    detach()
    if (window.__ideasTapProbe === probe) delete window.__ideasTapProbe
    throw new Error('IDEAS_PROBE_INSTALL_FAILED')
  }
}

const categories = ['none','input','button','panel','nav','document','ideas-other','outside']
const kinds = ['start','pointerdown','pointerup','pointercancel','touchstart','touchend','touchcancel','mousedown','mouseup','click','focusin','focusout','input','mutation','scroll','viewport-scroll','viewport-resize']
const n = value => Number.isFinite(value) && Math.abs(value) <= 1e9 ? Math.round(value * 100) / 100 : null
const choice = (value, allowed) => allowed.includes(value) ? value : 'other'
const bool = value => typeof value === 'boolean' ? value : null
const vector = (value, length) => Array.isArray(value) && value.length === length ? Array.from({length}, (_, i) => n(value[i])) : null
const state = value => value?.available === true ? {
  available: true, sameOrigin: bool(value.sameOrigin), samePath: bool(value.samePath), queryAbsent: bool(value.queryAbsent), fragmentAbsent: bool(value.fragmentAbsent),
  rootConnected: bool(value.rootConnected), input: n(value.input), button: n(value.button), panel: n(value.panel), inputLength: n(value.inputLength),
  question: choice(value.question, ['missing','empty','nonempty']), expanded: choice(value.expanded, ['true','false']),
  panelHidden: bool(value.panelHidden), disabled: bool(value.disabled), activeTarget: choice(value.activeTarget, categories), scroll: vector(value.scroll, 2),
} : {available: false}
const geometry = value => value?.available === true ? {
  available: true, button: vector(value.button, 4), input: vector(value.input, 4), panel: vector(value.panel, 4), nav: vector(value.nav, 4),
  viewport: vector(value.viewport, 7), scroll: vector(value.scroll, 2), documentSize: vector(value.documentSize, 4), bodyPadding: vector(value.bodyPadding, 2), bottomHeight: n(value.bottomHeight),
  navDisplay: choice(value.navDisplay, ['none','grid','flex','block','missing']), navVisibility: choice(value.navVisibility, ['visible','hidden','collapse','missing']),
  hitAtPoint: choice(value.hitAtPoint, categories), hitAtButtonCenter: choice(value.hitAtButtonCenter, categories),
} : {available: false}

// Reconstruct the output in Node too: even a replaced page global cannot inject
// raw strings, extra properties or toJSON payloads into acceptance logs.
export function redactIdeasTapDiagnostic(value) {
  try {
    if (value?.outcome !== 'captured') return {schemaVersion: 1, outcome: 'unavailable'}
    return {schemaVersion: 1, outcome: 'captured',
      entries: Array.isArray(value.entries) ? value.entries.slice(0, 96).map(row => ({kind: choice(row?.kind, kinds), phase: choice(row?.phase, ['capture','bubble','observer','snapshot']),
        ms: n(row?.ms), target: choice(row?.target, categories), relatedTarget: choice(row?.relatedTarget, categories), trusted: bool(row?.trusted), prevented: bool(row?.prevented), primary: bool(row?.primary),
        pointer: choice(row?.pointer, ['touch','mouse','pen']), point: vector(row?.point, 2), state: state(row?.state)})) : [],
      layouts: Array.isArray(value.layouts) ? value.layouts.slice(0, 20).map(row => ({row: n(row?.row), geometry: geometry(row?.geometry)})) : [],
      final: state(value.final), finalGeometry: geometry(value.finalGeometry), dropped: n(value.dropped), droppedLayouts: n(value.droppedLayouts), droppedScroll: n(value.droppedScroll)}
  } catch { return {schemaVersion: 1, outcome: 'unavailable'} }
}

export async function ideasTapFailureState(page, {origin, locale}) {
  try {
    return state(await page.evaluate(({expectedOrigin, expectedPath}) => {
      const input = document.querySelector('[data-ideas-discovery] #ideas-question')
      const button = document.querySelector('[data-ideas-discovery] [data-ideas-free-test]')
      const expanded = button?.getAttribute('aria-expanded')
      return {available: true, sameOrigin: window.location.origin === expectedOrigin, samePath: window.location.pathname === expectedPath,
        queryAbsent: window.location.search === '', fragmentAbsent: window.location.hash === '',
        inputLength: typeof input?.value === 'string' ? input.value.length : null,
        expanded: expanded === 'true' ? 'true' : expanded === 'false' ? 'false' : 'other'}
    }, {expectedOrigin: origin, expectedPath: `/${locale}/books`}))
  } catch { return {available: false} }
}

export async function withIdeasTapDiagnostics(page, {origin, locale, width, browser}, run) {
  const owner = randomUUID()
  let captured
  try { await page.evaluate(installIdeasTapProbe, {expectedOrigin: origin, expectedPath: `/${locale}/books`, owner}) }
  catch { /* Diagnostics cannot replace the original native action. */ }
  try { return await run() }
  finally {
    // Installation may have executed even if its response was lost. Clean only
    // this invocation's observer; never stop a pre-existing/foreign probe.
    try { captured = await page.evaluate(owner => window.__ideasTapProbe?.owner === owner ? window.__ideasTapProbe.stop() : undefined, owner) }
    catch { /* A closed/disappeared page remains unavailable, never raw error text. */ }
    try {
      console.log('SYNTHETIC_IDEAS_NATIVE_TAP', JSON.stringify({browser: choice(browser, ['webkit','chromium']), locale: choice(locale, ['en','ru','es']),
        width: [320,375,390,430].includes(width) ? width : null, ...redactIdeasTapDiagnostic(captured)}))
    } catch { /* Logging failure cannot turn a native failure into a pass or mask it. */ }
  }
}
