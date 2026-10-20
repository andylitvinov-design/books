// In-memory only: never persist guest contact details or consent in browser storage.
const definiteRejections = new Map([
  [400, new Set(['INVALID_SERVICE_ENQUIRY', 'INVALID_REQUEST', 'INVALID_JSON'])],
  [413, new Set(['PAYLOAD_TOO_LARGE'])],
  [429, new Set(['RATE_LIMITED', 'RATE_LIMIT_EXCEEDED'])],
])

/** @typedef {{kind:'saved', referenceCode:string} | {kind:'stale'|'busy'|'unknown'|'rejected'}} SubmissionResult */

/**
 * Own one mounted service form's request lifecycle. An uncertain POST may have
 * committed, so retries must reuse the exact serialized payload and operation ID.
 * A later rejection cannot prove an earlier uncertain attempt did not commit.
 */
export function createPublicEnquirySubmissionScope({
  fetchImpl = (...args) => fetch(...args),
  createOperationId = () => crypto.randomUUID(),
} = {}) {
  const controller = new AbortController()
  let closed = false, inFlight = false, payload = null, confirmed = false
  return {
    get pending() { return payload !== null },
    /** @returns {Promise<SubmissionResult>} */
    async submit(input) {
      if (closed || confirmed) return { kind: 'stale' }
      if (inFlight) return { kind: 'busy' }
      const retryingUnknown = payload !== null
      if (!payload) payload = JSON.stringify({ ...input, operationId: createOperationId() })
      inFlight = true
      try {
        const response = await fetchImpl('/api/service-enquiries', {
          method: 'POST', credentials: 'same-origin', signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }, body: payload,
        })
        const data = await response.json().catch(() => null)
        if (closed) return { kind: 'stale' }
        if (response.ok && data?.saved === true && /^HH-[A-F0-9]{12}$/.test(data.referenceCode || '')) {
          payload = null
          confirmed = true
          return { kind: 'saved', referenceCode: data.referenceCode }
        }
        if (!retryingUnknown && definiteRejections.get(response.status)?.has(data?.error)) {
          payload = null
          return { kind: 'rejected' }
        }
        return { kind: 'unknown' }
      } catch {
        return { kind: closed ? 'stale' : 'unknown' }
      } finally {
        inFlight = false
      }
    },
    reset() {
      if (!inFlight && !payload) confirmed = false
    },
    close() {
      closed = true
      controller.abort()
    },
  }
}
