// A single shared push + notificationclick implementation; no second listener.
importScripts('/course-notifications-sw.js')
const CACHE_NAME = 'psialchemy-public-v1'
const OFFLINE_CACHE_NAME = 'hh-public-offline-v1'
const OFFLINE_PATHS = ['/holistic-house-offline-en.html', '/holistic-house-offline-ru.html', '/holistic-house-offline-es.html']
const PRIVATE_PREFIXES = ['/en/client', '/ru/client', '/es/client', '/en/app', '/ru/app', '/es/app', '/en/report/', '/ru/report/', '/es/report/', '/api/app', '/api/client', '/ru/prescriptions/', '/en/prescriptions/', '/api/prescriptions/', '/api/prescription-access', '/api/admin/', '/admin', '/document-preview/']
function policy(url) {
  let pathname = url.pathname
  try { pathname = decodeURIComponent(pathname).replace(/\/+/g, '/') } catch { return 'network-only' }
  if (PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'network-only'
  if (pathname.startsWith('/media/') || pathname.startsWith('/icons/') || pathname.startsWith('/_next/static/')) return 'public-asset'
  if (/^\/(ru|en)\/homeopathy(?:\/remedies(?:\/[-a-z0-9]+)?)?$/.test(pathname)) return 'public-route'
  return 'network-first'
}
function mayCache(response) { return response.ok && !/private|no-store/i.test(response.headers.get('Cache-Control') || '') && !/cookie/i.test(response.headers.get('Vary') || '') }
self.addEventListener('install', (event) => {
  // Cache only anonymous standalone fallback documents; no private HTML.
  event.waitUntil(caches.open(OFFLINE_CACHE_NAME)
    .then((cache) => cache.addAll(OFFLINE_PATHS))
    .then(() => self.skipWaiting()))
})
self.addEventListener('activate', (event) => event.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('hh-public-offline-') && key !== OFFLINE_CACHE_NAME)
    .map((key) => caches.delete(key)))),
])))
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_PUBLIC_REMEDY' || typeof event.data.url !== 'string') return
  const url = new URL(event.data.url, self.location.origin)
  if (url.origin !== self.location.origin || policy(url) !== 'public-route') return
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    const response = await fetch(url, { cache: 'no-store' })
    if (mayCache(response)) await cache.put(url, response.clone())
  }))
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  const requestPolicy = policy(url)
  // Do not interpose in authenticated traffic. Native networking retains the
  // caller's abort/cookie behavior; private server headers already forbid cache.
  if (requestPolicy === 'network-only') return
  // Only public Holistic House page navigation receives a generic offline
  // fallback. Private responses are NEVER cached, and PsiAlchemy is separate.
  if (request.mode === 'navigate' && requestPolicy === 'network-first' &&
      (url.pathname === '/' || /^\/(?:ru|en|es)(?:\/|$)/.test(url.pathname))) {
    const locale = url.pathname.match(/^\/(ru|en|es)(?:\/|$)/)?.[1] || 'en'
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE_NAME)
      return await cache.match('/holistic-house-offline-' + locale + '.html') || Response.error()
    }))
    return
  }
  if (requestPolicy === 'public-asset') {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(request)) || fetch(request).then((response) => {
      if (mayCache(response)) cache.put(request, response.clone())
      return response
    })))
  }
})

