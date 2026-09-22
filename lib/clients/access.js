import { createHash, createHmac, randomBytes } from 'node:crypto'
import { isSelector, isBearerSecret, digestSessionToken, verifyPrescriptionSecret } from '../prescriptions/access.js'
export { digestSessionToken }
export const cabinetSessionTtlSeconds = 30 * 24 * 60 * 60
const hash = value => createHash('sha256').update(value).digest('hex')
function derive(client, environment) {
  const encoded = environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY
  const key = encoded ? Buffer.from(encoded.trim().replace(/-/g, '+').replace(/_/g, '/'), 'base64') : (['development','test'].includes(environment.NODE_ENV) || environment.VERCEL_ENV === 'preview') && environment.PRESCRIPTIONS_ADMIN_TOKEN ? Buffer.from(environment.PRESCRIPTIONS_ADMIN_TOKEN) : undefined
  if (!key || (encoded && key.length !== 32)) throw new Error('Cabinet links unavailable')
  return createHmac('sha256', key).update(JSON.stringify(['holistichouse:cabinet:v1', client.id, client.cabinetAccess.selector, client.cabinetAccess.version])).digest('base64url')
}
export function verifyCabinetSecret(client, secret) { return Boolean(client?.cabinetAccess && !client.cabinetAccess.revoked && verifyPrescriptionSecret({ ...client, access: client.cabinetAccess }, secret)) }
async function issue(store, id, environment, rotate) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await store.findClientById(id)
    if (!current || current.status !== 'active') throw new Error('Client unavailable')
    if (!rotate && current.cabinetAccess) {
      if (current.cabinetAccess.revoked) throw new Error('Cabinet access revoked; explicitly rotate to restore')
      const secret = derive(current, environment)
      if (!verifyCabinetSecret(current, secret)) throw new Error('Cabinet links unavailable')
      return { selector: current.cabinetAccess.selector, secret }
    }
    const next = { ...current, updatedAt: new Date().toISOString(), cabinetAccess: { selector: randomBytes(16).toString('base64url'), version: (current.cabinetAccess?.version ?? 0) + 1, issuedAt: new Date().toISOString() } }
    const secret = derive(next, environment); next.cabinetAccess.secretHash = hash(secret)
    if (await store.saveClientIfUnchanged(current, next)) return { selector: next.cabinetAccess.selector, secret }
  }
  throw new Error('Client changed; retry')
}
export const getOwnerCabinetLink = (store, id, environment = process.env) => issue(store, id, environment, false)
export const rotateCabinetAccess = (store, id, environment = process.env) => issue(store, id, environment, true)
export async function revokeCabinetAccess(store, id) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await store.findClientById(id)
    if (!current) throw new Error('Client unavailable')
    const next = { ...current, updatedAt: new Date().toISOString(), cabinetAccess: { version: (current.cabinetAccess?.version ?? 0) + 1, revoked: true } }
    if (await store.saveClientIfUnchanged(current, next)) return next
  }
  throw new Error('Client changed; retry')
}
export function createCabinetSession(client, nowMs = Date.now()) {
  if (client?.status !== 'active' || client.cabinetAccess?.revoked || !isSelector(client.cabinetAccess?.selector)) throw new Error('Active cabinet required')
  const token = randomBytes(32).toString('base64url')
  return { token, digest: hash(token), clientId: client.id, selector: client.cabinetAccess.selector, accessVersion: client.cabinetAccess.version, expiresAt: nowMs + cabinetSessionTtlSeconds * 1000 }
}
export function authorizeCabinetSession(client, selector, session, nowMs = Date.now()) {
  return Boolean(client?.status === 'active' && !client.cabinetAccess?.revoked && isSelector(selector) && session?.clientId === client.id && session.selector === selector && client.cabinetAccess?.selector === selector && session.accessVersion === client.cabinetAccess.version && Number.isFinite(session.expiresAt) && session.expiresAt > nowMs)
}
export function authorizeCabinetDocument(client, selector, session, record, nowMs = Date.now()) { return Boolean(authorizeCabinetSession(client, selector, session, nowMs) && record?.status === 'active' && record.clientId === client.id) }
export { isSelector, isBearerSecret }
