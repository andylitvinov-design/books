import 'server-only'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { request as httpsRequest } from 'node:https'
import { validatePushSubscription } from './contracts.js'

export function isPublicPushAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0))
  }
  // Global unicast only; exclude transition/documentation/special-purpose blocks.
  if (isIP(address) !== 6) return false
  address = new URL(`https://[${address}]/`).hostname.slice(1, -1)
  return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(?:0*:|db8:|0?2:|0?10:|0?20:)/i.test(address) && !/^2002:/i.test(address) && !/^3fff:/i.test(address)
}
export async function resolvePushAddress(hostname, lookup = dnsLookup) {
  let timer
  let addresses
  try { addresses = await Promise.race([lookup(hostname, { all: true, verbatim: true }), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('PUSH_DNS_TIMEOUT')), 3000) })]) } finally { clearTimeout(timer) }
  if (!addresses.length || addresses.some(value => !isPublicPushAddress(value.address))) throw new Error('PUSH_ENDPOINT_BLOCKED')
  return addresses.find(value => value.family === 4) || addresses[0]
}
export function sendPinnedPushRequest(details, address, { request = httpsRequest, timeoutMs = 5000 } = {}) {
  const endpoint = new URL(details.endpoint)
  return new Promise(resolve => {
    let completed = false, started = false, timer
    const finish = value => { if (completed) return; completed = true; clearTimeout(timer); resolve(value) }
    const req = request({ protocol: 'https:', hostname: endpoint.hostname, port: 443, servername: endpoint.hostname, path: endpoint.pathname + endpoint.search, method: 'POST', headers: details.headers, agent: false, rejectUnauthorized: true,
      lookup: (_host, options, callback) => options?.all ? callback(null, [address]) : callback(null, address.address, address.family),
    }, response => {
      // Never follow Location or retain a provider response body/endpoint in logs.
      response.resume(); response.destroy?.()
      finish({ statusCode: response.statusCode, retryAfter: typeof response.headers['retry-after'] === 'string' ? response.headers['retry-after'] : null })
    })
    timer = setTimeout(() => { req.destroy(); finish({ outcome: started ? 'unknown' : 'not-attempted' }) }, timeoutMs)
    req.on('error', () => finish({ outcome: started ? 'unknown' : 'not-attempted' }))
    started = true
    req.end(details.body)
  })
}
export function createWebPushTransport(config, { lookup = dnsLookup, request = httpsRequest, generateRequestDetails, timeoutMs = 5000, clock = () => Date.now() } = {}) {
  return Object.freeze({ async send(input, payload, { ttlSeconds, notAfter, topic = 'hh-course-reminder' } = {}) {
    if (!config.deliveryEnabled || !config.privateKey || !config.publicKey || !config.subject) throw new Error('PUSH_DELIVERY_DISABLED')
    const subscription = validatePushSubscription(input)
    if (subscription.expirationTime !== null && subscription.expirationTime <= clock()) return { statusCode: 410 }
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300) throw new Error('PUSH_TTL_INVALID')
    const endpoint = new URL(subscription.endpoint)
    const address = await resolvePushAddress(endpoint.hostname, lookup)
    if (notAfter !== undefined) {
      const remaining = Math.floor((Date.parse(notAfter) - clock()) / 1000)
      if (!Number.isFinite(remaining) || remaining < 1) return { outcome: 'expired' }
      ttlSeconds = Math.min(ttlSeconds, remaining)
    }
    const generate = generateRequestDetails || (await import('web-push')).default.generateRequestDetails
    const details = generate(subscription, JSON.stringify(payload), { TTL: ttlSeconds, urgency: 'low', topic, contentEncoding: 'aes128gcm', vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey } })
    // The library handles standard encryption and VAPID. We control destination,
    // TLS, pinned DNS, timeout and redirects rather than using ambient proxies.
    if (details.endpoint !== subscription.endpoint || details.method !== 'POST') throw new Error('PUSH_ENDPOINT_BLOCKED')
    if (notAfter !== undefined && Date.parse(notAfter) <= clock()) return { outcome: 'expired' }
    return sendPinnedPushRequest(details, address, { request, timeoutMs })
  } })
}
