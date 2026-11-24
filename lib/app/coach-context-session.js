import 'server-only'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { operationHash } from './crypto.js'

const lifetimeMs = 4 * 60 * 60 * 1000
const format = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([0-9]{13})\.([0-9a-f]{64})$/

function sessionSignature(config, accountId, sessionId, expiresAt) {
  return operationHash({ purpose: 'coach-context-session-v1', accountId, sessionId, expiresAt }, config)
}

export function issueCoachContextSession(config, actor, now = Date.now()) {
  const sessionId = randomUUID()
  const expiresAt = now + lifetimeMs
  const signature = sessionSignature(config, actor.id, sessionId, expiresAt)
  return { sessionId, expiresAt, token: [sessionId, expiresAt, signature].join('.') }
}

export function verifyCoachContextSession(config, actor, token, now = Date.now()) {
  if (!actor?.id || typeof token !== 'string' || token.length !== 115) return null
  const parts = format.exec(token)
  if (!parts) return null
  const [, sessionId, expiry, signature] = parts
  const expiresAt = Number(expiry)
  if (expiresAt <= now || expiresAt > now + lifetimeMs) return null
  const expected = sessionSignature(config, actor.id, sessionId, expiresAt)
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return null
  return { sessionId, expiresAt }
}
