import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const SELECTOR_PATTERN = /^[A-Za-z0-9_-]{22}$/
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/
const HASH_PATTERN = /^[a-f0-9]{64}$/

export const prescriptionSessionTtlSeconds = 15 * 60

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function equalHex(left, right) {
  if (!HASH_PATTERN.test(left ?? '') || !HASH_PATTERN.test(right ?? '')) return false
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
}

export function isSelector(value) {
  return typeof value === 'string' && SELECTOR_PATTERN.test(value)
}

export function isBearerSecret(value) {
  return typeof value === 'string' && SECRET_PATTERN.test(value)
}

export function isSessionToken(value) {
  return isBearerSecret(value)
}

export function digestSessionToken(value) {
  return isSessionToken(value) ? sha256(value) : undefined
}

export function issuePrescriptionAccess(record, now = new Date().toISOString()) {
  if (!record || record.status !== 'active') throw new Error('Only an active prescription can issue access')
  const safeRecord = { ...record }
  delete safeRecord.publicId
  const selector = randomBytes(16).toString('base64url')
  const secret = randomBytes(32).toString('base64url')
  return {
    selector,
    secret,
    record: {
      ...safeRecord,
      access: {
        selector,
        secretHash: sha256(secret),
        version: Math.max(0, Number(safeRecord.access?.version) || 0) + 1,
        issuedAt: now,
      },
      updatedAt: now,
    },
  }
}

export function verifyPrescriptionSecret(record, secret) {
  if (!record || record.status !== 'active' || !isBearerSecret(secret)) return false
  return equalHex(record.access?.secretHash, sha256(secret))
}

export function createPrescriptionSession(record, nowMs = Date.now()) {
  if (!record?.id || record.status !== 'active' || !isSelector(record.access?.selector)) {
    throw new Error('Active issued prescription required')
  }
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    digest: sha256(token),
    recordId: record.id,
    selector: record.access.selector,
    accessVersion: record.access.version,
    expiresAt: nowMs + prescriptionSessionTtlSeconds * 1000,
  }
}

export function authorizePrescriptionSession(record, selector, session, nowMs = Date.now()) {
  return Boolean(
    record
      && session
      && record.status === 'active'
      && isSelector(selector)
      && record.id === session.recordId
      && record.access?.selector === selector
      && session.selector === selector
      && record.access?.version === session.accessVersion
      && Number.isFinite(session.expiresAt)
      && session.expiresAt > nowMs,
  )
}
