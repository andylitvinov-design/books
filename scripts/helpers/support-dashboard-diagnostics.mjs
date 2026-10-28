import { writeFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { types } from 'node:util'

// Failure-only fixed rectangles. No text, attributes, CSS, URLs or input values.
export function supportDashboardSnapshot() {
  const root = document.querySelector('[data-holistic-mobile-alternative]')
  const assessment = root?.querySelector('[aria-labelledby="mobile-assessment-title"]')
  const photo = root?.querySelector('[data-support-photo]')
  const nodes = [assessment?.parentElement, assessment, photo?.closest('section'),
    root?.querySelector('#support-tools'), root?.querySelector('[data-support-goal-filter-trigger]'),
    root?.querySelector('[data-support-recommendations]'), root?.querySelector('[data-support-player]')]
  const numeric = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 100000 ? value : null
  return { nodes: nodes.map(node => {
    if (!node) return null
    const rect = node.getBoundingClientRect()
    return { x: numeric(rect.x), y: numeric(rect.y), width: numeric(rect.width), height: numeric(rect.height) }
  }) }
}

// Reconstruct every retained field; reject proxies, accessors, symbols and unknown keys.
export function canonicalSupportDashboard(initial, raw, metadata) {
  const invalid = () => { throw new Error('Invalid bounded observation') }
  const object = (value, allowed, required = allowed) => {
    if (!value || typeof value !== 'object' || types.isProxy(value)) return invalid()
    const keys = Reflect.ownKeys(value)
    if (keys.some(key => typeof key !== 'string' || !allowed.includes(key))) return invalid()
    for (const key of keys) if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) return invalid()
    if (required.some(key => !Object.hasOwn(value, key))) return invalid()
    return value
  }
  const own = (value, key) => Object.getOwnPropertyDescriptor(value, key)?.value
  const number = value => value === null ? null : typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 100000 ? value : invalid()
  const enumeration = (value, values) => values.includes(value) ? value : invalid()
  const array = (value, max, exact = false) => {
    if (!Array.isArray(value) || types.isProxy(value)) return invalid()
    const n = own(value, 'length')
    if (!Number.isInteger(n) || n < 0 || n > max || (exact && n !== max)) return invalid()
    object(value, ['length', ...Array.from({ length: n }, (_, i) => String(i))])
    return Array.from({ length: n }, (_, i) => own(value, String(i)))
  }
  const rect = value => {
    if (value === null) return null
    object(value, ['x', 'y', 'width', 'height'])
    return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, number(own(value, key))]))
  }
  const originalRect = value => {
    object(value, ['x', 'y', 'right', 'bottom', 'width', 'height', 'shown'])
    if (typeof own(value, 'shown') !== 'boolean') return invalid()
    for (const key of ['right', 'bottom']) number(own(value, key))
    return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, number(own(value, key))]))
  }
  let engine, locale, width
  try {
    object(metadata, ['engine', 'locale', 'width'])
    engine = enumeration(own(metadata, 'engine'), ['chromium', 'webkit'])
    locale = enumeration(own(metadata, 'locale'), ['en', 'ru', 'es'])
    width = enumeration(own(metadata, 'width'), [320, 390, 430])
  } catch { return null }
  let original = { status: 'unavailable' }
  try {
    object(initial, ['client', 'scroll', 'a', 'photo', 'tools', 'toolsSection', 'readableTools', 'readableScores', 'hero', 'tabs', 'videos', 'footer', 'gallery'],
      ['client', 'scroll', 'a', 'photo', 'toolsSection', 'hero'])
    const targets = [['a', 'assessment'], ['photo', 'photo'], ['toolsSection', 'tools'], ['hero', 'hero']]
      .map(([key, alias]) => ({ alias, rect: originalRect(array(own(initial, key), 1, true)[0]) }))
    const a = targets[0].rect, hero = targets[3].rect
    original = { status: 'captured', client: number(own(initial, 'client')), scroll: number(own(initial, 'scroll')),
      dashboardHeight: a.y === null || hero.y === null ? null : number(hero.y - a.y), targets }
  } catch { /* No malformed measurement payload survives. */ }
  let observation = { status: 'unavailable' }
  try {
    object(raw, ['nodes'])
    const aliases = ['top-band', 'assessment', 'profile', 'tools', 'goal-filter', 'quick-match', 'hero']
    observation = { status: 'captured', targets: array(own(raw, 'nodes'), 7, true).map((value, i) => ({ alias: aliases[i], rect: rect(value) })) }
  } catch { /* Supplemental capture failure cannot erase the original rectangles. */ }
  return { schemaVersion: 1, caseAlias: `${engine}-${locale}-${width}`, phase: 'dashboard-height', original, observation }
}

export function createSupportDashboardRecorder() {
  let attempted = false
  return async (page, metadata, initial) => {
    if (attempted) return
    const seed = canonicalSupportDashboard(initial, null, metadata)
    if (!seed) return
    const [engine, locale, width] = seed.caseAlias.split('-')
    const capturedMetadata = { engine, locale, width: Number(width) }
    attempted = true
    let active = true, timer
    const deadline = performance.now() + 1000
    const current = () => active && performance.now() < deadline
    try {
      await Promise.race([
        Promise.resolve().then(async () => {
          let raw = null
          try { raw = await page.evaluate(supportDashboardSnapshot) } catch { /* No raw error strings. */ }
          if (!current()) return
          const supplemental = canonicalSupportDashboard(null, raw, capturedMetadata)
          if (!supplemental || !current()) return
          const data = { ...seed, observation: supplemental.observation }
          const serialized = JSON.stringify(data)
          if (serialized.length > 8192 || !current()) return
          try { writeFileSync('artifacts/holistic-support-mock-fidelity/dashboard-diagnostics.json', serialized) }
          catch { /* Preserve the original strict failure even if artifact I/O fails. */ }
          if (!current()) return
          console.error('OBSERVATION: support-dashboard', serialized)
        }),
        new Promise(resolve => { timer = setTimeout(resolve, 1000) }),
      ])
    } catch { /* Diagnostics never replace the existing fatal assertion. */ }
    finally { active = false; try { if (timer !== undefined) clearTimeout(timer) } catch { /* Original failure remains primary. */ } }
  }
}
