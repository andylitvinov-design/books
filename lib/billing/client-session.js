import { safeBillingRedirect } from './public-plan.js'

export async function requestBilling(accountId, action, body, fetcher = fetch, { signal } = {}) {
  if (typeof accountId !== 'string' || !accountId) throw new Error('ACCOUNT_REQUIRED')
  const response = await fetcher('/api/app/billing/' + action, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'X-HH-Account-ID': accountId, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const value = await response.json()
  if (!response.ok || !value || typeof value !== 'object' || Array.isArray(value) || value.error)
    {
      const code = typeof value?.error === 'string' && /^[A-Z_]+$/.test(value.error) ? value.error : 'BILLING_UNAVAILABLE'
      const error = new Error(code); error.code = code; throw error
    }
  return value
}

// Only a read is bounded/cancelled here. A timed-out mutation has an unknown
// outcome and must never be retried by this transport.
export async function requestBillingStatus(accountId, { signal: outer, fetcher = fetch, timeoutMs = 10000 } = {}) {
  if (outer?.aborted) throw new Error('REQUEST_ABORTED')
  const controller = new AbortController()
  let rejectCancelled
  const cancelled = new Promise((_, reject) => { rejectCancelled = reject })
  const abort = () => { controller.abort(); rejectCancelled(new Error('REQUEST_ABORTED')) }
  outer?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => { controller.abort(); rejectCancelled(new Error('REQUEST_TIMEOUT')) }, timeoutMs)
  try {
    return await Promise.race([
      requestBilling(accountId, 'status', undefined, fetcher, { signal: controller.signal }), cancelled,
    ])
  } finally { clearTimeout(timer); outer?.removeEventListener('abort', abort) }
}

// A late response cannot navigate an unmounted/switched account. A fresh server
// identity check also catches cookies changed by a different browser tab.
export async function verifiedBillingRedirect({ accountId, value, kind, isCurrent,
  request = requestBilling }) {
  if (!isCurrent()) return null
  const url = safeBillingRedirect(value, kind)
  if (!url) throw new Error('INVALID_REDIRECT')
  await request(accountId, 'status', undefined)
  return isCurrent() ? url : null
}
