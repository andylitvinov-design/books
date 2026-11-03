import { notificationDeliveryDecision, localNotificationTime, privateNotificationPayload } from './delivery.js'
import { minuteOfDay } from './contracts.js'

export function dispatchDecision(snapshot, now) {
  if (!snapshot) return { due: false, reason: 'missing' }
  const decision = notificationDeliveryDecision({ ...snapshot, now })
  if (!decision.due) return decision
  const local = localNotificationTime(now, snapshot.preferences.timezone)
  const seconds = new Date(now).getUTCSeconds()
  const windowRemaining = (minuteOfDay(snapshot.preferences.dailyAt) + 60 - local.minute) * 60 - seconds
  let quietRemaining = Infinity
  if (snapshot.preferences.quietHoursEnabled) quietRemaining = ((minuteOfDay(snapshot.preferences.quietStart) - local.minute + 1440) % 1440) * 60 - seconds
  const paidRemaining = Math.floor((Date.parse(snapshot.paidThrough) - new Date(now).getTime()) / 1000)
  const ttlSeconds = Math.min(300, windowRemaining, quietRemaining, paidRemaining, (1440 - local.minute) * 60 - seconds)
  return ttlSeconds > 0 ? { ...decision, ttlSeconds, notAfter: new Date(new Date(now).getTime() + ttlSeconds * 1000).toISOString() } : { due: false, reason: 'expired-window' }
}
export function deliveryOutcome(response, attempt, decision, now) {
  const status = response?.statusCode
  if (status >= 200 && status < 300) return { status: 'accepted', providerStatus: status }
  if (status === 404 || status === 410) return { status: 'revoked', providerStatus: status }
  if (response?.outcome === 'expired') return { status: 'skipped', providerStatus: null }
  if (response?.outcome === 'unknown') return { status: 'unknown', providerStatus: null }
  if ((status === 429 || status >= 500) && attempt < 3) {
    const header = /^\d+$/.test(response.retryAfter || '') ? Number(response.retryAfter) : 0
    const delay = Math.max(60 * (2 ** (attempt - 1)), Math.min(header, 300))
    // Conservative: only retry while the current short safe delivery interval remains.
    if (delay < decision.ttlSeconds) return { status: 'retry', providerStatus: status, retryAt: new Date(new Date(now).getTime() + delay * 1000).toISOString() }
  }
  return { status: 'failed', providerStatus: Number.isInteger(status) ? status : null }
}
// Repository owns durable claims and final locked eligibility. Transport is injected;
// tests use only synthetic in-memory implementations and never call push services.
export function createNotificationDispatcher({ repository, transport, config, clock = () => new Date(), maxBatch = 20, maxRunMs = 40000, monotonic = () => performance.now() }) {
  return Object.freeze({ async run() {
    if (!config.deliveryEnabled) return { disabled: true, examined: 0, accepted: 0, skipped: 0, retry: 0, unknown: 0, failed: 0, revoked: 0 }
    const summary = { disabled: false, examined: 0, accepted: 0, skipped: 0, retry: 0, unknown: 0, failed: 0, revoked: 0 }
    const started = monotonic()
    const candidates = await repository.listCandidates(Math.min(Math.max(maxBatch, 1), 50))
    for (const deviceId of candidates) {
      if (monotonic() - started >= maxRunMs) break
      summary.examined++
      const snapshot = await repository.snapshot(deviceId)
      const decision = dispatchDecision(snapshot, clock())
      if (!decision.due) { summary.skipped++; continue }
      const claim = await repository.claim(deviceId, decision.localDay)
      if (!claim) { summary.skipped++; continue }
      const outcome = await repository.withClaim(claim, async current => {
        const now = clock(), checked = dispatchDecision(current, now)
        if (!checked.due || checked.localDay !== decision.localDay) return { status: 'skipped', providerStatus: null }
        try {
          const response = await transport.send(current.subscription, privateNotificationPayload(checked.locale), { ttlSeconds: checked.ttlSeconds, notAfter: checked.notAfter, topic: 'hh-course-reminder' })
          return deliveryOutcome(response, claim.attempt, checked, now)
        } catch {
          // Includes an ambiguous interruption after a request may have left.
          // Never automatically resend an unknown attempt.
          return { status: 'unknown', providerStatus: null }
        }
      })
      const state = outcome?.status || 'unknown'
      summary[state in summary ? state : 'failed']++
    }
    return summary
  } })
}
