// Test-only TLS edge. Never imported by application routes or runtime configuration.
const externalOrigin = 'https://127.0.0.1:3444'
const internalOrigin = 'https://localhost:3203'
export function loopbackHeaders(input) {
  if (input.host !== '127.0.0.1:3444' || input.origin === internalOrigin) throw new Error('Untrusted loopback edge request')
  const headers = { ...input, host: 'localhost:3203', 'x-forwarded-host': 'localhost:3203', 'x-forwarded-proto': 'https', 'x-forwarded-port': '3203' }
  delete headers.forwarded
  // Translate only an exact original browser origin. Preserve missing/foreign origins.
  if (input.origin === externalOrigin) headers.origin = internalOrigin
  return headers
}
export function loopbackLocation(value) {
  if (typeof value !== 'string') throw new Error('Invalid loopback redirect')
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value
  const url = new URL(value)
  if (url.username || url.password) throw new Error('Invalid loopback redirect')
  if (url.origin === externalOrigin) return value
  if (![internalOrigin, 'http://localhost:3203'].includes(url.origin)) throw new Error('Unexpected loopback redirect origin')
  return externalOrigin + url.pathname + url.search + url.hash
}
