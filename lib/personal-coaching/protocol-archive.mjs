/** Pure validation for the private, owner-scoped My Coach protocol archive. */
export const MY_COACH_PROTOCOL_PAGE_SIZE = 20
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const isMyCoachProtocolId = value => typeof value === 'string' && uuid.test(value)
const strictIso = value => typeof value === 'string' && value.length <= 35 &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value

/** Keyset pagination; nothing user-authored is concatenated into SQL. */
export function normalizeMyCoachProtocolCursor({before = null, beforeId = null} = {}) {
  if (before === null && beforeId === null) return null
  if (!strictIso(before) || !isMyCoachProtocolId(beforeId))
    throw Error('MY_COACH_PROTOCOL_CURSOR_INVALID')
  return {before, beforeId}
}

/** Remove only the legacy envelope's storage timestamp, not client content. */
export function unpackLegacyMyCoachProtocol(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    !isMyCoachProtocolId(value.id) || value.provenance !== 'client_reviewed_dialogue')
    throw Error('MY_COACH_PROTOCOL_UNAVAILABLE')
  const {savedAt, ...protocol} = value
  const time = strictIso(savedAt) ? savedAt : protocol.completedAt
  if (!strictIso(time)) throw Error('MY_COACH_PROTOCOL_UNAVAILABLE')
  return {protocol, savedAt: time}
}

/** Exact saved retries are idempotent; altered content with the same ID is not. */
export function sameMyCoachProtocol(a, b) {
  return Boolean(a && b && a.id === b.id && JSON.stringify(a) === JSON.stringify(b))
}
