// Passed directly to page.evaluate. Read-only geometry for isolated loopback
// fixtures only: no input values, account/contact text, DOM edits or scrolling.
export function collectReportOverflowDiagnostics() {
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
    throw new Error('Report layout diagnostics require an isolated loopback fixture')
  }
  const limit = 16
  const round = value => Number.isFinite(value) ? Math.round(value * 100) / 100 : null
  const parent = element => element.parentElement || element.getRootNode?.().host || null
  const identity = element => ({
    tag: element.localName,
    id: element.id?.startsWith('hh-') ? element.id : undefined,
    class: (element.getAttribute('class') || '').slice(0, 180),
    scale: element.getAttribute('data-active-scale') || element.getAttribute('data-assessment-scale-trigger') || undefined,
    gauge: element.getAttribute('data-assessment-gauge') || undefined,
  })
  const box = element => {
    const rect = element.getBoundingClientRect()
    return {
      left: round(rect.left), right: round(rect.right), top: round(rect.top), bottom: round(rect.bottom),
      width: round(rect.width), height: round(rect.height),
      documentLeft: round(rect.left + scrollX), documentRight: round(rect.right + scrollX),
      clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      offsetWidth: element.offsetWidth ?? null, scrollLeft: round(element.scrollLeft),
    }
  }
  const css = element => {
    const style = getComputedStyle(element)
    return Object.fromEntries(['display', 'position', 'boxSizing', 'width', 'minWidth', 'maxWidth',
      'overflowX', 'overflowY', 'overflowWrap', 'whiteSpace', 'wordBreak', 'flex', 'gridTemplateColumns',
      'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth', 'transform', 'contain']
      .map(key => [key, style[key]]))
  }
  const describe = element => {
    const report = element.closest('[data-personal-result-report]')
    const svg = element.closest('svg')
    const frameSource = element.localName === 'iframe' ? element.getAttribute('src') : null
    let frameOrigin
    if (frameSource) {
      try { const url = new URL(frameSource, location.href); frameOrigin = url.origin === 'null' ? url.protocol : url.origin }
      catch { frameOrigin = 'invalid URL' }
    }
    return {
      ...identity(element), ...box(element), css: css(element),
      // Sampling is deliberately limited to synthetic report copy; never read
      // form values or surrounding account/contact/navigation UI text.
      text: report && !['input', 'textarea', 'select', 'option', 'script', 'style'].includes(element.localName)
        ? [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent || '')
          .join(' ').replace(/\s+/g, ' ').trim().slice(0, 100) : undefined,
      svgOwner: svg && svg !== element ? identity(svg) : undefined,
      shadowHost: element.getRootNode?.().host ? identity(element.getRootNode().host) : undefined,
      frameOrigin,
    }
  }
  const ancestors = element => {
    const chain = []
    for (let current = parent(element); current && chain.length < 10; current = parent(current)) {
      const style = getComputedStyle(current)
      chain.push({ ...identity(current), ...box(current), overflowX: style.overflowX,
        overflowY: style.overflowY, minWidth: style.minWidth, display: style.display,
        clipsHorizontally: ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX) })
    }
    return chain
  }
  const elements = [...document.querySelectorAll('*')]
  // Include open shadow trees (for example the development overlay) without
  // traversing iframe documents or changing either document's state.
  for (let index = 0; index < elements.length; index++) {
    if (elements[index].shadowRoot) elements.push(...elements[index].shadowRoot.querySelectorAll('*'))
  }
  const escaping = [], scrolling = [], embedded = []
  for (const element of elements) {
    const rect = element.getBoundingClientRect()
    if (!(rect.width > 0 && rect.height > 0)) continue
    const left = rect.left + scrollX, right = rect.right + scrollX
    if (left < -1 || right > innerWidth + 1) {
      const chain = ancestors(element)
      escaping.push({ ...describe(element), escapedBy: round(Math.max(-left, right - innerWidth)),
        clippingAncestors: chain.filter(item => item.clipsHorizontally), ancestors: chain })
    }
    if (element.scrollWidth > element.clientWidth + 1) scrolling.push(describe(element))
    if (element.localName === 'iframe' || element.localName === 'svg') embedded.push(describe(element))
  }
  escaping.sort((a, b) => b.escapedBy - a.escapedBy)
  const unclipped = escaping.filter(item => !item.clippingAncestors.length)
  const clipped = escaping.filter(item => item.clippingAncestors.length)
  const landmarks = [...document.querySelectorAll('.hh-app, .hh-result-page, .hh-result-hero, .hh-result-comparison, .hh-result-footer, [data-personal-result-report], [data-assessment-scale-picker], [data-assessment-scale-picker] [role="group"], [data-assessment-scale-picker] select, [data-active-scale], [data-assessment-gauge], [data-personality-type-summary]')]
  const viewport = { innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio,
    scrollX: round(scrollX), scrollY: round(scrollY),
    scrollbarWidth: innerWidth - document.documentElement.clientWidth,
    visual: typeof visualViewport === 'undefined' || !visualViewport ? null : Object.fromEntries(
      ['width', 'height', 'offsetLeft', 'offsetTop', 'pageLeft', 'pageTop', 'scale'].map(key => [key, round(visualViewport[key])])) }
  return {
    viewport, document: describe(document.documentElement), body: document.body ? describe(document.body) : null,
    selectedScales: [...document.querySelectorAll('[data-assessment-scale-trigger][aria-pressed="true"]')]
      .map(element => element.getAttribute('data-assessment-scale-trigger')),
    counts: { elements: elements.length, escaping: escaping.length, withoutClippingAncestor: unclipped.length,
      withClippingAncestor: clipped.length, scrollOverflow: scrolling.length, embedded: embedded.length },
    // A clipping ancestor is attribution, not proof that an element is safe.
    // Keep intentional tab scrolling separate from possible document overflow.
    escapingWithoutClippingAncestor: unclipped.slice(0, limit),
    escapingWithClippingAncestor: clipped.slice(0, limit),
    scrollOverflowElements: scrolling.slice(0, limit), embeddedElements: embedded.slice(0, 8),
    landmarks: landmarks.slice(0, 24).map(describe),
  }
}
