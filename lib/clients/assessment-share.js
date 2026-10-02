import { createHmac, timingSafeEqual } from 'node:crypto'
import { isClientId } from './service.js'

export const reportClaimCookieName = (environment = process.env) =>
  environment.NODE_ENV === 'production' ? '__Host-hh_report_claim' : 'hh_report_claim_dev'
export const reportClaimTtlSeconds = 15 * 60

function signingKey(environment = process.env) {
  const encoded = environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY
  if (encoded) {
    const normalized = encoded.trim().replace(/-/g, '+').replace(/_/g, '/')
    const key = Buffer.from(normalized, 'base64')
    if (key.length === 32) return key
  }
  if (
    ['development', 'test'].includes(environment.NODE_ENV) ||
    environment.VERCEL_ENV === 'preview'
  ) {
    const fallback = environment.PRESCRIPTIONS_ADMIN_TOKEN
    if (fallback) return Buffer.from(fallback)
  }
  return undefined
}

function digest(key, value) {
  return createHmac('sha256', key).update(value).digest('base64url')
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function assessmentShareSecret(record, environment = process.env) {
  const key = signingKey(environment)
  if (
    !key ||
    !record ||
    record.status !== 'shared' ||
    !isClientId(record.id) ||
    !isClientId(record.clientId) ||
    !Number.isSafeInteger(record.revision)
  )
    return undefined
  return digest(
    key,
    JSON.stringify([
      'holistichouse:assessment-share:v1',
      record.id,
      record.clientId,
      record.revision,
    ]),
  )
}

export function verifyAssessmentShareSecret(record, secret, environment = process.env) {
  const expected = assessmentShareSecret(record, environment)
  return Boolean(expected && /^[A-Za-z0-9_-]{43}$/.test(secret || '') && safeEqual(expected, secret))
}

export function publicAssessmentView(record) {
  if (!record || record.status !== 'shared') return undefined
  return {
    id: record.id,
    kind: record.kind,
    title: record.title,
    occurredOn: record.occurredOn,
    language: record.language,
    sourceName: record.sourceName,
    sourceVersion: record.sourceVersion,
    description: record.description,
    originalResult: record.originalResult,
    practitionerComment: record.practitionerComment,
  }
}

export function createPendingReportClaim(record, environment = process.env, nowMs = Date.now()) {
  const key = signingKey(environment)
  if (!key || !assessmentShareSecret(record, environment)) return undefined
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      id: record.id,
      revision: record.revision,
      exp: Math.floor(nowMs / 1000) + reportClaimTtlSeconds,
    }),
  ).toString('base64url')
  return payload + '.' + digest(key, 'holistichouse:report-claim:v1:' + payload)
}

export function readPendingReportClaim(value, environment = process.env, nowMs = Date.now()) {
  const key = signingKey(environment)
  if (!key || typeof value !== 'string' || value.length > 1024) return undefined
  const parts = value.split('.')
  if (parts.length !== 2) return undefined
  const [payload, signature] = parts
  if (!safeEqual(digest(key, 'holistichouse:report-claim:v1:' + payload), signature)) return undefined
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (
      parsed?.v !== 1 ||
      !isClientId(parsed.id) ||
      !Number.isSafeInteger(parsed.revision) ||
      !Number.isSafeInteger(parsed.exp) ||
      parsed.exp <= Math.floor(nowMs / 1000)
    )
      return undefined
    return { id: parsed.id, revision: parsed.revision, expiresAt: parsed.exp * 1000 }
  } catch {
    return undefined
  }
}

export function assessmentShareUrl(record, locale = 'en', origin, environment = process.env) {
  const secret = assessmentShareSecret(record, environment)
  if (!secret || !origin) return undefined
  const lang = locale === 'ru' ? 'ru' : 'en'
  return `${String(origin).replace(/\/$/, '')}/${lang}/report/${record.id}#${secret}`
}
