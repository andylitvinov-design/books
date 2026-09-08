import { createHash } from 'node:crypto'

import { cookies } from 'next/headers.js'

import {
  authorizePrescriptionSession,
  createPrescriptionSession,
  digestSessionToken,
  isBearerSecret,
  isSelector,
  isSessionToken,
  prescriptionSessionTtlSeconds,
  verifyPrescriptionSecret,
} from './access.js'
import { getPrescriptionStore } from './store.js'

export const prescriptionAccessFailure = Symbol('prescription-access-failure')
export const prescriptionAccessFailureBody = Object.freeze({ error: 'Prescription unavailable' })

export function prescriptionSessionCookieName(environment = process.env) {
  return environment.NODE_ENV === 'production' ? '__Host-prescription_access' : 'prescription_access_dev'
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try { return origin === new URL(request.url).origin } catch { return false }
}

async function readExchangeBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return undefined
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (!Number.isFinite(declaredLength) || declaredLength > 2048) return undefined
  const text = await request.text()
  if (!text || Buffer.byteLength(text, 'utf8') > 2048) return undefined
  try {
    const body = JSON.parse(text)
    if (!body || Object.keys(body).sort().join(',') !== 'secret,selector') return undefined
    return body
  } catch {
    return undefined
  }
}

function rateDigest(ip, selector) {
  return createHash('sha256').update(`${String(ip).slice(0, 128)}\0${String(selector).slice(0, 128)}`, 'utf8').digest('hex')
}

export async function exchangePrescriptionAccess({ request, store, ip = 'unknown', nowMs = Date.now() }) {
  if (!store || !isSameOriginRequest(request)) return prescriptionAccessFailure
  const body = await readExchangeBody(request)
  if (!body) return prescriptionAccessFailure
  const allowed = await store.consumeAccessAttempt(rateDigest(ip, body.selector), 12, 5 * 60)
  if (!allowed || !isSelector(body.selector) || !isBearerSecret(body.secret)) return prescriptionAccessFailure
  const record = await store.findBySelector(body.selector)
  if (!verifyPrescriptionSecret(record, body.secret)) return prescriptionAccessFailure
  const session = createPrescriptionSession(record, nowMs)
  await store.createAccessSession(session, prescriptionSessionTtlSeconds)
  return session
}

export async function authorizePrescription(store, selector, token, nowMs = Date.now()) {
  if (!store || !isSelector(selector) || !isSessionToken(token)) return undefined
  const digest = digestSessionToken(token)
  const session = await store.findAccessSession(digest)
  if (!session) return undefined
  const record = await store.findById(session.recordId)
  return authorizePrescriptionSession(record, selector, session, nowMs) ? record : undefined
}

export async function authorizePrescriptionRequest(selector) {
  const store = getPrescriptionStore()
  const token = (await cookies()).get(prescriptionSessionCookieName())?.value
  return authorizePrescription(store, selector, token)
}

export async function deletePrescriptionRequestSession() {
  const cookieStore = await cookies()
  const name = prescriptionSessionCookieName()
  const token = cookieStore.get(name)?.value
  const digest = digestSessionToken(token)
  const store = getPrescriptionStore()
  if (store && digest) await store.deleteAccessSession(digest)
  return { cookieStore, name }
}
