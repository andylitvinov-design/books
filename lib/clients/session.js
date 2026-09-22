import { createHash } from 'node:crypto'
import { cookies } from 'next/headers.js'
import { getPrescriptionStore } from '../prescriptions/store.js'
import { isSameOriginRequest } from '../prescriptions/session.js'
import { isSelector, isBearerSecret } from '../prescriptions/access.js'
import { verifyCabinetSecret, createCabinetSession, authorizeCabinetSession, authorizeCabinetDocument, cabinetSessionTtlSeconds, digestSessionToken } from './access.js'
export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }
export const cabinetCookieName = () => process.env.NODE_ENV === 'production' ? '__Host-client_access' : 'client_access_dev'
export async function exchangeCabinetAccess(request, store) {
  if (!store || !isSameOriginRequest(request) || !request.headers.get('content-type')?.startsWith('application/json')) return undefined
  if (Number(request.headers.get('content-length') ?? 0) > 2048) return undefined
  const text = await request.text()
  if (Buffer.byteLength(text) > 2048) return undefined
  const body = JSON.parse(text)
  if (!body || Object.keys(body).sort().join(',') !== 'secret,selector' || !isSelector(body.selector) || !isBearerSecret(body.secret)) return undefined
  const hash = value => createHash('sha256').update(value).digest('hex')
  if (!await store.consumeAccessAttempt(hash(`cabinet:ip:${request.headers.get('x-real-ip') ?? 'unknown'}`), 30, 300)
      || !await store.consumeAccessAttempt(hash(`cabinet:selector:${body.selector}`), 12, 300)) return undefined
  const client = await store.findClientBySelector(body.selector)
  if (!verifyCabinetSecret(client, body.secret)) return undefined
  const session = createCabinetSession(client)
  await store.createCabinetSession(session, cabinetSessionTtlSeconds)
  return session
}
export async function authorizeCabinetRequest(selector, documentId) {
  const store = getPrescriptionStore()
  const token = (await cookies()).get(cabinetCookieName())?.value
  const digest = digestSessionToken(token)
  if (!store || !isSelector(selector) || !digest) return undefined
  const session = await store.findCabinetSession(digest)
  const client = await store.findClientBySelector(selector)
  if (!authorizeCabinetSession(client, selector, session)) return undefined
  if (!documentId) return { client, store }
  const record = await store.findById(documentId)
  return authorizeCabinetDocument(client, selector, session, record) ? { client, store, record } : undefined
}
