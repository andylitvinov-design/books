const CACHE_NAME = 'psialchemy-public-v1'
const PRIVATE_PREFIXES = ['/en/client', '/ru/client', '/es/client', '/en/app', '/ru/app', '/en/report/', '/ru/report/', '/api/app', '/api/client', '/ru/prescriptions/', '/en/prescriptions/', '/api/prescriptions/', '/api/prescription-access', '/api/admin/', '/admin', '/document-preview/']
function policy(url) {
  let pathname = url.pathname
  try { pathname = decodeURIComponent(pathname).replace(/\/+/g, '/') } catch { return 'network-only' }
  if (PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return 'network-only'
  if (pathname.startsWith('/media/') || pathname.startsWith('/icons/') || pathname.startsWith('/_next/static/')) return 'public-asset'
  if (/^\/(ru|en)\/homeopathy(?:\/remedies(?:\/[-a-z0-9]+)?)?$/.test(pathname)) return 'public-route'
  return 'network-first'
}
function mayCache(response) { return response.ok && !/private|no-store/i.test(response.headers.get('Cache-Control') || '') && !/cookie/i.test(response.headers.get('Vary') || '') }
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
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
  if (requestPolicy === 'network-only') { event.respondWith(fetch(request, { cache: 'no-store' })); return }
  if (requestPolicy === 'public-asset') {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => (await cache.match(request)) || fetch(request).then((response) => {
      if (mayCache(response)) cache.put(request, response.clone())
      return response
    })))
  }
})
