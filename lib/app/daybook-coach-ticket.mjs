import { randomUUID } from 'node:crypto'
import { seal, openSealed } from './crypto.js'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { PUBLIC_COACH_PERSONA_IDS } from '../coaching/persona-registry.mjs'

const lifetime = 45 * 60 * 1000
const context = (actor, recordId) => ({ accountId: actor.id, recordId, field: 'daybook.coach_ticket' })
function locator(input) {
  onlyKeys(input, ['kind', 'itemId', 'revision', 'coachId'])
  if (!['goal', 'journal'].includes(input.kind) ||
      !Number.isSafeInteger(input.revision) || input.revision < 1 ||
      !PUBLIC_COACH_PERSONA_IDS.includes(input.coachId)) throw new AppError('DAYBOOK_COACH_SOURCE_INVALID')
  return { kind: input.kind, itemId: requireUUID(input.itemId), revision: input.revision, coachId: input.coachId }
}
export function issueDaybookCoachTicket(config, actor, input, now = Date.now()) {
  const source = locator(input)
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(now + lifetime))
    throw new AppError('DAYBOOK_COACH_TIME_INVALID')
  const recordId = randomUUID(), expiresAt = now + lifetime
  const encrypted = seal({ source, issuedAt: now, expiresAt }, context(actor, recordId), config)
  return { token: recordId + '.' + Buffer.from(encrypted).toString('base64url'), expiresAt }
}
// A locator is never consent. Resolve its current owner source again before preview/use.
export function verifyDaybookCoachTicket(config, actor, token, coachId, now = Date.now()) {
  try {
    if (!actor?.id || !Number.isSafeInteger(now) || now < 0 ||
        !PUBLIC_COACH_PERSONA_IDS.includes(coachId) || typeof token !== 'string' ||
        token.length > 2048) return null
    const match = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]+)$/.exec(token)
    if (!match) return null
    const [, recordId, encoded] = match
    requireUUID(recordId)
    const bytes = Buffer.from(encoded, 'base64url')
    if (bytes.toString('base64url') !== encoded) return null
    const value = openSealed(bytes.toString('utf8'), context(actor, recordId), config)
    onlyKeys(value, ['source', 'issuedAt', 'expiresAt'])
    if (!Number.isSafeInteger(value.issuedAt) || value.issuedAt < 0 ||
        value.issuedAt > now || value.expiresAt !== value.issuedAt + lifetime ||
        !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now) return null
    const source = locator(value.source)
    return source.coachId === coachId ? source : null
  } catch {
    return null
  }
}
