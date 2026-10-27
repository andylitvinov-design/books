import { performance } from 'node:perf_hooks'
import { types } from 'node:util'
import { classifyDiagnosticError } from './isolated-browser-diagnostics.mjs'

const SERVICES = new Map([
  ['dao-health-profile', 'dao'], ['alchemy-of-soul', 'alchemy'],
  ['hypnotherapy-course', 'hypnotherapy'], ['free-situation-review', 'free-review'],
])
const RESOURCE_TYPES = new Set(['document','stylesheet','image','media','font','script','texttrack','xhr','fetch','eventsource','websocket','manifest','other'])
const METHODS = new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'])
const API_ROUTES = new Map([
  ['/api/service-enquiries/booking-status', 'booking-status'],
  ['/api/app/auth/contact-profile', 'contact-profile'],
  ['/api/app/bootstrap', 'app-bootstrap'],
  ['/api/app/guest/bootstrap', 'guest-bootstrap'],
])
const MAX_EVENTS = 100, MAX_PENDING_DETAILS = 32
const NativePromise = Promise, nativePromisePrototype = Promise.prototype
const nativeThen = nativePromisePrototype.then
const nativeSpeciesGetter = Object.getOwnPropertyDescriptor(NativePromise, Symbol.species)?.get

// Only an ordinary native Promise with a trusted constructor/species lookup is
// consumed. Never read a foreign then/constructor accessor or assimilate a
// thenable/subclass. Descriptor checks are synchronous, before intrinsic then.
function silenceNativeSinkRejection(value) {
  if (!value || typeof value !== 'object' || types.isProxy(value) || !types.isPromise(value)) return
  const ownConstructor = Object.getOwnPropertyDescriptor(value, 'constructor')
  if (ownConstructor) {
    if (!Object.hasOwn(ownConstructor, 'value') || ownConstructor.value !== NativePromise) return
  } else {
    if (Object.getPrototypeOf(value) !== nativePromisePrototype) return
    const constructor = Object.getOwnPropertyDescriptor(nativePromisePrototype, 'constructor')
    if (!constructor || !Object.hasOwn(constructor, 'value') || constructor.value !== NativePromise) return
  }
  const species = Object.getOwnPropertyDescriptor(NativePromise, Symbol.species)
  if (!species || Object.hasOwn(species, 'value') || species.get !== nativeSpeciesGetter || species.set !== undefined) return
  nativeThen.call(value, undefined, () => {})
}

function checkedScope({ origin, locale, slug, width, runtime }) {
  const url = new URL(origin)
  if (runtime !== 'isolated' || url.protocol !== 'http:' || !['localhost','127.0.0.1'].includes(url.hostname)
    || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || !['en','ru'].includes(locale) || !SERVICES.has(slug) || ![320,360,390,1280].includes(width)) {
    throw new Error('Isolated public-service navigation diagnostics only')
  }
  return { origin: url.origin, locale, service: SERVICES.get(slug), width }
}

// Fixed route aliases only. Never return a URL, arbitrary path segment, query,
// fragment, host, request payload, response header, error message or DOM text.
function routeAlias(raw, origin) {
  if (typeof raw !== 'string') return 'other'
  try {
    const url = new URL(raw)
    if (url.username || url.password) return 'other'
    if (url.origin !== origin) return url.protocol === 'about:' ? 'blank' : 'external'
    const service = url.pathname.match(/^\/(?:en|ru)\/services\/([^/]+)$/)?.[1]
    if (SERVICES.has(service)) return 'public-' + SERVICES.get(service)
    if (API_ROUTES.has(url.pathname)) return API_ROUTES.get(url.pathname)
    if (url.pathname === '/_next/webpack-hmr') return 'next-hmr'
    if (url.pathname === '/_next/image') return 'next-image'
    if (url.pathname.startsWith('/_next/static/')) return 'next-static'
    return 'other-local'
  } catch { return 'other' }
}

// Browser error objects are not trusted diagnostics input. Own primitive data
// descriptors only: never invoke accessors, inherited values, coercion or Proxy
// traps. The shared classifier receives a fresh trusted primitive-only object.
function ownString(value, key) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return ''
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string'
    ? descriptor.value.slice(0, 2000) : ''
}
function safeErrorCategory(value) {
  return classifyDiagnosticError({
    message: typeof value === 'string' ? value.slice(0, 2000) : ownString(value, 'message'),
    name: ownString(value, 'name'),
  })
}

// All observations are Playwright event/local-bookkeeping reads on this exact
// page. No evaluate, locator, route, request, retry, delay or readiness action.
export function observePublicServiceNavigation(page, options) {
  const scope = checkedScope(options), started = performance.now()
  const listeners = [], events = [], pending = new Map()
  const lifecycle = { domcontentloaded: false, load: false, crash: false, close: false }
  let mainFrameNavigations = 0, lastMainFrameRoute = null, lastMainDocumentResponse = null
  let seen = new WeakMap(), pendingCount = 0, sequence = 0, droppedEvents = 0
  let diagnosticErrors = 0, stopped = false, result
  const elapsed = () => Math.max(0, Math.round(performance.now() - started))
  const add = event => {
    if (stopped) return
    if (events.length >= MAX_EVENTS) { droppedEvents++; return }
    events.push({ atMs: elapsed(), ...event })
  }
  const listen = (name, handler) => {
    const safe = (...args) => {
      if (stopped) return
      try { handler(...args) } catch { diagnosticErrors++ }
    }
    // Retain before attaching, so partial installation still removes every
    // listener if an emitter throws after attaching it.
    listeners.push([name, safe]); page.on(name, safe)
  }
  const describe = request => {
    const method = request.method(), type = request.resourceType()
    return { route: routeAlias(request.url(), scope.origin),
      method: METHODS.has(method) ? method : 'OTHER', resource: RESOURCE_TYPES.has(type) ? type : 'other',
      navigation: request.isNavigationRequest() === true }
  }
  const finish = (request, type) => {
    const value = seen.get(request)
    if (!value) return
    seen.delete(request); pending.delete(request); pendingCount--
    add({ type, ...value, ...(type === 'request-failed' ? { category: safeErrorCategory(ownString(request.failure(), 'errorText')) } : {}) })
  }
  const cleanup = () => {
    for (const [name, handler] of listeners) {
      try { page.off(name, handler) } catch { diagnosticErrors++ }
    }
    pending.clear(); seen = new WeakMap()
  }
  try {
    listen('request', request => {
      if (seen.has(request)) return
      const value = { id: ++sequence, ...describe(request) }
      seen.set(request, value); pendingCount++
      if (pending.size < MAX_PENDING_DETAILS) pending.set(request, value)
      add({ type: 'request', ...value })
    })
    listen('response', response => {
      const request = response.request(), value = seen.get(request)
      if (!value) return
      const status = response.status()
      value.status = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null
      if (value.navigation && value.resource === 'document' && request.frame() === page.mainFrame()) {
        lastMainDocumentResponse = { route: value.route, status: value.status }
      }
      add({ type: 'response', ...value })
    })
    listen('requestfinished', request => finish(request, 'request-finished'))
    listen('requestfailed', request => finish(request, 'request-failed'))
    listen('framenavigated', frame => {
      const main = frame === page.mainFrame(), route = routeAlias(frame.url(), scope.origin)
      if (main) { mainFrameNavigations++; lastMainFrameRoute = route }
      add({ type: 'frame', main, route })
    })
    listen('pageerror', error => add({ type: 'page-error', category: safeErrorCategory(error) }))
    for (const type of ['domcontentloaded','load','crash','close']) listen(type, () => { lifecycle[type] = true; add({ type }) })
  } catch (error) {
    stopped = true; cleanup(); throw error
  }
  return {
    stop() {
      if (!stopped) {
        stopped = true
        let currentRoute = 'unavailable', pageClosed = null
        try { currentRoute = routeAlias(page.url(), scope.origin); pageClosed = page.isClosed() === true } catch { diagnosticErrors++ }
        result = { schemaVersion: 1, locale: scope.locale, service: scope.service, width: scope.width,
          elapsedMs: elapsed(), currentRoute, pageClosed, lifecycle: { ...lifecycle },
          mainFrameNavigations, lastMainFrameRoute, lastMainDocumentResponse, events: events.map(event => ({ ...event })), droppedEvents,
          pendingCount, pendingDetails: [...pending.values()].map(value => ({ ...value })),
          pendingDetailsTruncated: pendingCount - pending.size }
        cleanup(); result.diagnosticErrors = diagnosticErrors
      }
      return structuredClone(result)
    },
  }
}

// Keep the caller's exact goto and timeout policy. Successful navigation is
// silent; failure evidence can never replace, recover, retry or suppress it.
export async function withPublicServiceNavigationDiagnostics(page, options, navigate) {
  const { log = (name, value) => console.log(name, JSON.stringify(value)), runtime = process.env.HH_APP_TEST_RUNTIME } = options
  let observer, setupUnavailable = false
  try { observer = observePublicServiceNavigation(page, { ...options, runtime }) } catch { setupUnavailable = true }
  try {
    return await navigate()
  } catch (error) {
    let evidence = { schemaVersion: 1, observer: setupUnavailable ? 'unavailable' : 'failed' }
    try { evidence = { ...observer.stop(), observer: 'completed' } } catch { /* Preserve the original failure. */ }
    try { silenceNativeSinkRejection(log('SYNTHETIC_PUBLIC_SERVICE_NAVIGATION_FAILURE', evidence)) } catch { /* Logging is passive. */ }
    throw error
  } finally {
    try { observer?.stop() } catch { /* Cleanup cannot change the verdict. */ }
  }
}
