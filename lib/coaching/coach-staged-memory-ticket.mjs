import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const lifeMs = 45 * 60 * 1000
const shape = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9]{13})\.([npe])\.([0-9a-f]{64})$/
function sign({ accountId, provider, nonce, expiresAt, scope, secret, consentRevision, topicKey, contextSessionToken }) {
  const parts=['hh-coach-staged-memory-ticket-v1', accountId, provider, nonce, expiresAt, scope]
  if(scope==='e')parts.push(consentRevision,topicKey||'',contextSessionToken||'')
  return createHmac('sha256', secret)
    .update(JSON.stringify(parts))
    .digest('hex')
}
export function issueCoachMemoryTicket({ accountId, provider, secret, priorSessions = false, entry = false, consentRevision, topicKey, contextSessionToken, now = Date.now() }) {
  const nonce = randomUUID()
  const expiresAt = now + lifeMs
  const scope = priorSessions === true ? (entry === true ? 'e' : 'p') : 'n'
  if(scope==='e'&&(!Number.isSafeInteger(consentRevision)||consentRevision<1))throw Error('MEMORY_CONSENT_REQUIRED')
  return [nonce, expiresAt, scope, sign({ accountId, provider, nonce, expiresAt, scope, secret, consentRevision, topicKey, contextSessionToken })].join('.')
}
export function verifyCoachMemoryTicket(token, { accountId, provider, secret, requirePrior = false, requireEntry = false, consentRevision, topicKey, contextSessionToken, now = Date.now() }) {
  if (typeof token !== 'string') return false
  const match = shape.exec(token)
  if (!match) return false
  const [, nonce, timestamp, scope, signature] = match
  if (requireEntry ? scope !== 'e' : scope === 'e' || (requirePrior && scope !== 'p')) return false
  if(requireEntry&&(!Number.isSafeInteger(consentRevision)||consentRevision<1))return false
  const expiresAt = Number(timestamp)
  if (expiresAt <= now || expiresAt > now + lifeMs) return false
  const expected = sign({ accountId, provider, nonce, expiresAt, scope, secret, consentRevision, topicKey, contextSessionToken })
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
