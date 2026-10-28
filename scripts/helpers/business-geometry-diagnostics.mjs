import { writeFileSync } from 'node:fs'
import { performance as nodePerformance } from 'node:perf_hooks'
import { types as nodeTypes } from 'node:util'

// Failure-only observations: no text, attributes, URLs, CSS rules or form values.
// The caller retains its original geometry assertions and existing rectangles.
export function businessGeometrySnapshot(phase) {
  const selectors = {
    'initial-needs': ['[data-direction-filter="decisions"]', '[data-direction-filter="productivity"]',
      '[data-direction-filter="work-stress"]', '[data-direction-filter="money-beliefs"]', '[data-direction-filter="money-beliefs"]'],
    'selected-needs': ['[data-goal-support-action="business-review"]', '[data-offer-id="primary-session"] [data-offer-action="session"]'],
    'express-option': ['[data-business-direct-option="express"]'],
    'full-option': ['[data-business-direct-option="full"]'],
  }
  const selected = Object.hasOwn(selectors, phase) ? selectors[phase] : null
  if (!selected) return null
  const number = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-100000, Math.min(100000, value)) * 10) / 10 : null
  const rect = bounds => Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, number(bounds[key])]))
  const state = element => {
    if (!element) return { visibility: 'absent', pointerEvents: 'absent' }
    const style = getComputedStyle(element)
    const visibility = style.display === 'none' ? 'not-rendered'
      : ['visible', 'hidden', 'collapse'].find(value => value === style.visibility) ?? 'other'
    const pointerEvents = ['auto', 'none'].find(value => value === style.pointerEvents) ?? 'other'
    return { visibility, pointerEvents }
  }
  const nodes = document.querySelectorAll('.mobile-bottom-navigation, .ia222-bottom-navigation')
  const viewport = window.visualViewport
  return {
    viewport: { width: number(innerWidth), height: number(innerHeight), scrollX: number(scrollX), scrollY: number(scrollY),
      visualWidth: number(viewport?.width), visualHeight: number(viewport?.height),
      offsetLeft: number(viewport?.offsetLeft), offsetTop: number(viewport?.offsetTop), scale: number(viewport?.scale) },
    targets: selected.map(selector => state(document.querySelector(selector))),
    navCount: Math.min(nodes.length, 4),
    nav: Array.from({ length: 3 }, (_, index) => ({ ...state(nodes[index]),
      rect: nodes[index] ? rect(nodes[index].getBoundingClientRect()) : null })),
  }
}

// Node reconstructs every output field using own data descriptors. No aliases,
// strings, array methods, getters, proxies or extra properties cross this boundary.
export function canonicalBusinessGeometry(raw, metadata, boxes) {
  const invalid = () => { throw new Error('Invalid bounded observation') }
  const own = (value, key) => {
    if (!value || typeof value !== 'object' || nodeTypes.isProxy(value)) return invalid()
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return invalid()
    return descriptor.value
  }
  const number = value => value === null ? null : typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(-100000, Math.min(100000, value)) * 10) / 10 : invalid()
  const count = (value, cap) => typeof value === 'number' && Number.isInteger(value) && value >= 0 ? Math.min(value, cap) : invalid()
  const arrayLength = value => {
    if (nodeTypes.isProxy(value) || !Array.isArray(value)) return invalid()
    return count(own(value, 'length'), 4294967295)
  }
  const enumValue = (value, allowed) => allowed.find(item => item === value) ?? invalid()
  const rect = value => value === null ? null
    : Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, number(own(value, key))]))
  const state = value => ({
    visibility: enumValue(own(value, 'visibility'), ['absent', 'not-rendered', 'visible', 'hidden', 'collapse', 'other']),
    pointerEvents: enumValue(own(value, 'pointerEvents'), ['absent', 'auto', 'none', 'other']),
  })
  const phases = {
    'initial-needs': ['need-01', 'need-02', 'need-03', 'need-04', 'last-need'],
    'selected-needs': ['free-review', 'paid-session'],
    'express-option': ['express-direct'], 'full-option': ['full-direct'],
  }
  let engine, locale, width, phase
  try {
    engine = enumValue(own(metadata, 'engine'), ['webkit', 'chromium'])
    locale = enumValue(own(metadata, 'locale'), ['en', 'ru', 'es'])
    width = enumValue(own(metadata, 'width'), [320, 375, 390, 430])
    phase = enumValue(own(metadata, 'phase'), Object.keys(phases))
  } catch { return null }
  let measurement = { status: 'unavailable' }
  try {
    const aliases = phases[phase]
    const targets = own(raw, 'targets'), nav = own(raw, 'nav'), viewport = own(raw, 'viewport')
    if (arrayLength(targets) < aliases.length || arrayLength(boxes) < aliases.length || arrayLength(nav) < 3) return invalid()
    measurement = {
      status: 'captured',
      viewport: Object.fromEntries(['width', 'height', 'scrollX', 'scrollY', 'visualWidth', 'visualHeight', 'offsetLeft', 'offsetTop', 'scale']
        .map(key => [key, number(own(viewport, key))])),
      targets: aliases.map((alias, index) => ({ alias, rect: rect(own(boxes, String(index))), ...state(own(targets, String(index))) })),
      navCount: count(own(raw, 'navCount'), 4),
      nav: Array.from({ length: 3 }, (_, index) => {
        const value = own(nav, String(index))
        return { alias: `bottom-nav-0${index + 1}`, rect: rect(own(value, 'rect')), ...state(value) }
      }),
    }
  } catch { /* Missing, malformed, accessor or proxy data has no reportable payload. */ }
  return { schemaVersion: 1, caseAlias: `${engine}-${locale}-${width}`, phase, measurement }
}

export function createBusinessGeometryRecorder(engine, locale, width) {
  const records = []
  let attempts = 0
  return async (page, phase, boxes) => {
    // At most the four explicit failed phases; no full-page scan or recurring poll.
    if (attempts >= 4) return
    const metadata = { engine, locale, width, phase }
    if (!canonicalBusinessGeometry(null, metadata, null)) return
    attempts++
    let active = true, timer
    try {
      const deadline = nodePerformance.now() + 1000
      const isActive = () => active && nodePerformance.now() < deadline
      await Promise.race([
        Promise.resolve().then(async () => {
          let raw = null
          try { raw = await page.evaluate(businessGeometrySnapshot, phase) }
          catch { /* Never emit browser errors or DOM payloads. */ }
          if (!isActive()) return
          const diagnostic = canonicalBusinessGeometry(raw, metadata, boxes)
          if (!diagnostic || !isActive()) return
          const next = [...records, diagnostic]
          const serialized = JSON.stringify({ schemaVersion: 1, observations: next })
          if (serialized.length > 8192 || !isActive()) return
          try { writeFileSync('artifacts/business-quiz-mobile/geometry-diagnostics.json', serialized) }
          catch { /* Diagnostic I/O never replaces the original geometry failure. */ }
          if (!isActive()) return
          console.error('OBSERVATION: business-geometry', serialized)
          if (!isActive()) return
          records.push(diagnostic)
        }),
        new Promise(resolve => { timer = setTimeout(resolve, 1000) }),
      ])
    } catch { /* Diagnostic failures never replace the original assertion. */ }
    finally {
      active = false
      try { if (timer !== undefined) clearTimeout(timer) } catch { /* Keep the original assertion primary. */ }
    }
  }
}
