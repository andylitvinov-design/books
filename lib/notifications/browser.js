export function detectPushCapability(browser = globalThis) {
  const navigator = browser.navigator || {}
  const installed = Boolean(browser.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone)
  // Device hint only supplies installation guidance. APIs remain the support test.
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const supported = Boolean(browser.isSecureContext && navigator.serviceWorker && browser.PushManager && browser.Notification)
  return { supported: supported && (!ios || installed), ios, installed, needsInstall: ios && !installed, permission: browser.Notification?.permission || 'unsupported' }
}
export function applicationServerKeyBytes(value, decode = globalThis.atob) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{87}$/.test(value)) throw new Error('PUSH_CONFIGURATION_UNAVAILABLE')
  const bytes = Uint8Array.from(decode(value.replace(/-/g, '+').replace(/_/g, '/') + '='), char => char.charCodeAt(0))
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error('PUSH_CONFIGURATION_UNAVAILABLE')
  return bytes
}
export async function endpointFingerprint(endpoint, crypto = globalThis.crypto) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}
// Browser push APIs can stall even when the account API is healthy. Keep this
// optional integration bounded; no caller should hold account controls hostage.
export async function boundedNotificationWork(work, timeoutMs = 3000) {
  let timer
  try {
    return await Promise.race([Promise.resolve(work), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('PUSH_BROWSER_TIMEOUT')), timeoutMs)
    })])
  } finally { clearTimeout(timer) }
}
// Caller must run this directly from the user's Enable button. No pre-permission await.
export function requestPushPermission(browser = globalThis) {
  if (!detectPushCapability(browser).supported) return Promise.reject(new Error('PUSH_UNSUPPORTED'))
  if (browser.Notification.permission === 'denied') return Promise.resolve('denied')
  return browser.Notification.permission === 'granted' ? Promise.resolve('granted') : browser.Notification.requestPermission()
}
export async function registerDevicePush(publicKey, registration, browser = globalThis) {
  if (!detectPushCapability(browser).supported || browser.Notification.permission !== 'granted') throw new Error('PUSH_PERMISSION_REQUIRED')
  const existing = await boundedNotificationWork(registration.pushManager.getSubscription())
  if (existing) {
    const linkedKey = existing.options?.applicationServerKey
    if (linkedKey) {
      const expected = applicationServerKeyBytes(publicKey), linked = new Uint8Array(linkedKey)
      if (linked.length !== expected.length || linked.some((byte, index) => byte !== expected[index])) throw new Error('PUSH_KEY_CHANGED')
    }
    return { subscription: existing, created: false }
  }
  // A timed-out subscribe may finish later. It has no server enrollment and
  // cannot receive our reminders; the next explicit attempt safely reuses it.
  return { subscription: await boundedNotificationWork(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKeyBytes(publicKey) })), created: true }
}
