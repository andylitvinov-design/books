// Disposable local synthetic personal-intent check only; never an input fix.
// No field values, DOM text, URLs, storage, network or raw errors are exported.
// Bounds concern retained observations, not a wall-clock guarantee: evaluate
// and native browser actions still depend on the existing browser lifecycle.
export function isYggdrasilConsentDiagnosticCase(meta) {
  return meta?.live === false && meta.engine === 'webkit' && meta.locale === 'ru'
    && meta.width === 390 && meta.phase === 'yggdrasil-personal'
}

// Self-contained for page.evaluate; all selectors and scope are fixed here.
export function installYggdrasilConsentProbe({owner}) {
  const key = '__yggdrasilConsentProbe'
  if (window[key]) return false // Never overwrite or remove another owner.
  const expectedPath = '/ru/academy/reiki/yggdrasil/free-initiation'
  if (window.location.protocol !== 'http:' || !['127.0.0.1','localhost'].includes(window.location.hostname)
    || !window.location.port || window.location.pathname !== expectedPath) return false
  const roots = document.querySelectorAll('[data-yggdrasil-form]')
  if (roots.length !== 1) return false
  const root = roots[0], listeners = [], entries = [], layouts = [], ids = new WeakMap()
  let nextId = 0, active = true, observer, controller, finished, lastState = null
  let dropped = 0, scrollSamples = 0, droppedScroll = 0, droppedLayouts = 0
  let scrollEnds = 0, cleanupFailures = 0, scopeEnded = null, observationFailed = false
  const began = performance.now()
  const number = value => Number.isFinite(value) ? Math.round(value) : null
  const choice = (value, allowed) => allowed.includes(value) ? value : 'other'
  const token = node => { if (!node) return 0; if (!ids.has(node)) ids.set(node, ++nextId); return ids.get(node) }
  const selected = () => {
    const values = ['free','personal','pdf'].filter(intent =>
      root.querySelector(`[data-intent="${intent}"]`)?.getAttribute('aria-pressed') === 'true')
    return values.length === 1 ? values[0] : values.length ? 'multiple' : 'none'
  }
  const scope = () => {
    if (!root.isConnected || root.ownerDocument !== document) return 'root'
    if (window.location.pathname !== expectedPath) return 'path'
    if (selected() !== 'personal') return 'intent'
    return null
  }
  if (scope()) return false
  const chooser = () => root.querySelector('[data-contact-channel-chooser]')
  const category = target => {
    const current = chooser(), form = current?.querySelector('form')
    if (!target || !root.contains(target)) return 'outside'
    for (const [kind, selector] of [
      ['consent','input[type="checkbox"]'], ['email','input[autocomplete="email"]'],
      ['phone','input[type="tel"]'], ['name','input[autocomplete="name"]'], ['note','textarea'],
      ['submit','button[type="submit"]'],
    ]) if (target === form?.querySelector(selector)) return kind
    if (target.closest?.('label')?.querySelector('input[type="checkbox"]')) return 'consent-label'
    if (target.closest?.('[data-intent]')) return 'intent'
    if (target.closest?.('[data-contact-order]')) return 'open-button'
    return current?.contains(target) ? 'chooser-other' : 'root-other'
  }
  const state = () => {
    const current = chooser(), form = current?.querySelector('form')
    const checkboxes = form?.querySelectorAll('input[type="checkbox"]') || []
    const consent = checkboxes.length === 1 ? checkboxes[0] : null
    const submit = form?.querySelector('button[type="submit"]'), rect = consent?.getBoundingClientRect()
    return {chooser: token(current), form: token(form), checkbox: token(consent),
      checkboxCount: Math.min(checkboxes.length, 2), selected: selected(),
      open: current?.querySelector('[data-contact-order]')?.getAttribute('aria-expanded') === 'true',
      checked: consent ? consent.checked === true : null, disabled: consent ? consent.disabled === true : null,
      submitDisabled: submit ? submit.disabled === true : null,
      optionalNameOpen: form?.querySelector('input[autocomplete="name"]')?.closest('details')?.open === true,
      optionalNoteOpen: form?.querySelector('textarea')?.closest('details')?.open === true,
      activeTarget: category(document.activeElement),
      rect: rect ? [rect.x, rect.y, rect.width, rect.height].map(number) : null,
      scroll: [window.scrollX, window.scrollY].map(number)}
  }
  const geometry = () => {
    try {
      const consent = chooser()?.querySelector('form input[type="checkbox"]')
      const nav = document.querySelector('.ia222-bottom-navigation'), viewport = window.visualViewport
      const pixels = value => /^-?(?:\d+\.?\d*|\.\d+)px$/.test(value || '') ? number(Number.parseFloat(value)) : null
      const rect = node => { const box = node?.getBoundingClientRect(); return box ? [box.x,box.y,box.width,box.height].map(number) : null }
      const clearance = style => ['scrollMarginTop','scrollMarginRight','scrollMarginBottom','scrollMarginLeft'].map(key => pixels(style[key]))
      const box = node => {
        const style = getComputedStyle(node)
        return {rect: rect(node), scroll: [node.scrollLeft,node.scrollTop].map(number),
          client: [node.clientWidth,node.clientHeight].map(number), extent: [node.scrollWidth,node.scrollHeight].map(number),
          overflow: [style.overflowX,style.overflowY].map(value => choice(value,['visible','hidden','clip','auto','scroll','overlay'])),
          position: choice(style.position,['static','relative','absolute','fixed','sticky']),
          behavior: choice(style.scrollBehavior,['auto','smooth']),
          snap: choice(style.scrollSnapType,['none','x proximity','y proximity','both proximity','x mandatory','y mandatory','both mandatory']),
          padding: [pixels(style.scrollPaddingTop),pixels(style.scrollPaddingBottom)], clearance: clearance(style)}
      }
      const ancestors = []
      let ancestor = consent?.parentElement
      for (let depth = 0; ancestor && depth < 12; depth++, ancestor = ancestor.parentElement)
        ancestors.push({depth, tag: choice(ancestor.tagName,['LABEL','FORM','DIV','SECTION','MAIN','BODY','HTML']), ...box(ancestor)})
      const body = getComputedStyle(document.body), navStyle = nav ? getComputedStyle(nav) : null
      return {available: true, clearance: consent ? clearance(getComputedStyle(consent)) : null,
        viewport: [window.innerWidth,window.innerHeight,viewport?.width,viewport?.height,viewport?.offsetLeft,viewport?.offsetTop].map(number),
        viewportScale: Number.isFinite(viewport?.scale) ? Math.round(viewport.scale * 100) / 100 : null,
        bodyPadding: [pixels(body.paddingTop),pixels(body.paddingBottom)],
        navHeightVariable: pixels(body.getPropertyValue('--ia222-bottom-height').trim()),
        nav: navStyle ? {rect: rect(nav), display: choice(navStyle.display,['none','grid','flex','block']),
          visibility: choice(navStyle.visibility,['visible','hidden','collapse'])} : null,
        root: box(document.documentElement), ancestors, ancestorLimitReached: Boolean(ancestor)}
    } catch { return {available: false} }
  }
  const cleanup = () => {
    for (const [type, listener, capture] of listeners) {
      try { document.removeEventListener(type, listener, capture) } catch { cleanupFailures++ }
    }
    listeners.length = 0
    const installedObserver = observer; observer = null
    try { installedObserver?.disconnect() } catch { cleanupFailures++ }
  }
  const deactivate = reason => { active = false; scopeEnded = reason; cleanup() }
  const record = (kind, phase, event) => {
    if (!active) return
    try {
      const ended = scope()
      if (ended) { deactivate(ended); return }
      if (entries.length >= 120) { dropped++; return }
      const snapshot = state(); lastState = snapshot
      entries.push({kind, phase, ms: number(performance.now() - began),
        ...(event ? {target: category(event.target), trusted: event.isTrusted === true,
          prevented: event.defaultPrevented === true, point: [event.clientX,event.clientY].map(number)} : {}), state: snapshot})
      const captureLayout = (kind === 'pointerdown' && phase === 'capture' && category(event?.target) === 'consent')
        || (kind === 'focusin' && category(event?.target) === 'consent')
        || (kind === 'pointerup' && phase === 'capture' && snapshot.activeTarget === 'consent')
        || (kind === 'scroll' && snapshot.activeTarget === 'consent') || kind === 'scrollend'
      if (captureLayout) {
        if (layouts.length < 8) layouts.push({row: entries.length - 1, kind, phase, geometry: geometry()})
        else droppedLayouts++
      }
    } catch { observationFailed = true; deactivate('observation') }
  }
  const stop = () => {
    if (finished) return finished
    let final = null, finalGeometry = {available: false}
    try {
      if (active) {
        const ended = scope()
        if (ended) scopeEnded = ended
        else { final = state(); finalGeometry = geometry() }
      }
    } catch { observationFailed = true }
    active = false; cleanup()
    finished = {schemaVersion: 1, outcome: 'captured', entries, layouts, final, finalGeometry,
      lastState, dropped, droppedScroll, droppedLayouts, scrollEnds, scopeEnded, observationFailed, cleanupFailures}
    return finished
  }
  try {
    controller = {owner, stop}
    window[key] = controller
    for (const type of ['pointerdown','mousedown','pointerup','mouseup','click','input','change','focusin']) {
      for (const capture of [true,false]) {
        const listener = event => {
          try {
            record(type, capture ? 'capture' : 'bubble', event)
            if (active && entries.length < 120 && capture && ['click','input','change'].includes(type))
              queueMicrotask(() => record(type, 'microtask', event))
          } catch { observationFailed = true; deactivate('observation') }
        }
        listeners.push([type,listener,capture])
        document.addEventListener(type,listener,{capture,passive:true})
      }
    }
    const scroll = () => { if (!active) return; if (scrollSamples++ < 8) record('scroll','capture'); else droppedScroll++ }
    const scrollend = event => {
      if (!active || ![document,document.documentElement,document.body].includes(event.target)) return
      scrollEnds++; record('scrollend','capture')
    }
    for (const [type,listener] of [['scroll',scroll],['scrollend',scrollend]]) {
      listeners.push([type,listener,true]); document.addEventListener(type,listener,{capture:true,passive:true})
    }
    observer = new MutationObserver((changes = []) => {
      if (!active) return
      try {
        // An intent can change away and back before an observer callback. Do
        // not treat that later personal selection as this original phase.
        if (changes.some(change => change.type === 'attributes' && change.attributeName === 'aria-pressed'
          && change.target.matches?.('[data-intent]'))) { deactivate('intent'); return }
        record('mutation','observer')
      } catch { observationFailed = true; deactivate('observation') }
    })
    observer.observe(root,{subtree:true,childList:true,attributes:true,
      attributeFilter:['disabled','checked','aria-expanded','aria-pressed','hidden','open']})
    record('start','snapshot')
    return true
  } catch {
    active = false; cleanup()
    if (window[key] === controller) delete window[key]
    return false
  }
}

export function stopYggdrasilConsentProbe({owner}) {
  const key = '__yggdrasilConsentProbe', probe = window[key]
  if (!probe || probe.owner !== owner) return null
  try { return probe.stop() }
  finally { if (window[key] === probe) delete window[key] }
}

let nextOwner = 0
export async function withYggdrasilConsentDiagnostics(page, meta, run, collect) {
  if (!isYggdrasilConsentDiagnosticCase(meta)) return await run()
  const owner = ++nextOwner
  let diagnostic = {schemaVersion:1,outcome:'unavailable'}, actionOutcome = 'success'
  try { await page.evaluate(installYggdrasilConsentProbe,{owner}) } catch { /* Best effort; no raw error. */ }
  try { return await run() }
  catch (error) { actionOutcome = 'failure'; throw error }
  finally {
    // Attempt owner-matched cleanup even if the install response was lost.
    // No diagnostic timer, racing evaluate or native-action retry. Rejected
    // transport does not prove removal; scope guards and context disposal remain.
    try { const captured = await page.evaluate(stopYggdrasilConsentProbe,{owner}); if (captured) diagnostic = captured }
    catch { /* Existing page/context cleanup remains responsible for disposal. */ }
    try {
      collect({engine:'webkit',locale:'ru',width:390,phase:'yggdrasil-personal',
        contactMethod: meta.contactMethod === 'phone' ? 'phone' : meta.contactMethod === 'email' ? 'email' : 'other',
        optionalName: meta.optionalName === true, optionalNote: meta.optionalNote === true,
        actionOutcome,...diagnostic})
    } catch { /* Collection must not replace the original native result/error. */ }
  }
}
