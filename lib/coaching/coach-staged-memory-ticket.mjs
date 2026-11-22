import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const lifeMs = 45 * 60 * 1000
const shape = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9]{13})\.([np])\.([0-9a-f]{64})$/
function sign({ accountId, provider, nonce, expiresAt, scope, secret }) {
  return createHmac('sha256', secret)
    .update(JSON.stringify(['hh-coach-staged-memory-ticket-v1', accountId, provider, nonce, expiresAt, scope]))
    .digest('hex')
}
export function issueCoachMemoryTicket({ accountId, provider, secret, priorSessions = false, now = Date.now() }) {
  const nonce = randomUUID()
  const expiresAt = now + lifeMs
  const scope = priorSessions === true ? 'p' : 'n'
  return [nonce, expiresAt, scope, sign({ accountId, provider, nonce, expiresAt, scope, secret })].join('.')
}
export function verifyCoachMemoryTicket(token, { accountId, provider, secret, requirePrior = false, now = Date.now() }) {
  if (typeof token !== 'string') return false
  const match = shape.exec(token)
  if (!match) return false
  const [, nonce, timestamp, scope, signature] = match
  if (requirePrior && scope !== 'p') return false
  const expiresAt = Number(timestamp)
  if (expiresAt <= now || expiresAt > now + lifeMs) return false
  const expected = sign({ accountId, provider, nonce, expiresAt, scope, secret })
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
