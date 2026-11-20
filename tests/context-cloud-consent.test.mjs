import test from 'node:test'
import assert from 'node:assert/strict'
import { hasCoachContextGrant } from '../lib/coaching/context-cloud-consent.mjs'

const request = {
  accountId: 'owner', provider: 'groq', policyVersion: 'v2', role: 'coach',
  category: 'goals', itemId: 'goal', sessionId: 'session', now: 100, sourceRevision: '2',
}
const grant = {
  ...request, purpose: 'coaching', decision: 'grant', revision: 1,
  occurredAt: 50, expiresAt: null,
}

test('consent requires an explicit matching owner, role, provider, item, session and policy', () => {
  assert.equal(hasCoachContextGrant(request, []), false)
  assert.equal(hasCoachContextGrant(request, [grant]), true)
  for (const mismatch of [
    { accountId: 'other' }, { role: 'secretary' }, { provider: 'gemini_free' },
    { itemId: 'other-goal' }, { sessionId: 'other-session' }, { policyVersion: 'v3' },
    { category: 'test_results' },
  ]) assert.equal(hasCoachContextGrant({ ...request, ...mismatch }, [grant]), false)
})

test('a category grant cannot override a revision mismatch on an existing item grant', () => {
  const categoryGrant = { ...grant, itemId: null, sourceRevision: null, revision: 2 }
  assert.equal(hasCoachContextGrant({ ...request, sourceRevision: '3' }, [grant, categoryGrant]), false)
})

test('category withdrawal, expiration and policy changes never revive older grants', () => {
  const withdrawal = { ...grant, itemId: null, revision: 2, decision: 'revoke' }
  assert.equal(hasCoachContextGrant(request, [withdrawal, grant]), false)
  assert.equal(hasCoachContextGrant(request, [grant, { ...grant, revision: 2, expiresAt: 100 }]), false)
  assert.equal(hasCoachContextGrant(request, [grant, { ...grant, revision: 2, policyVersion: 'v3' }]), false)
})

test('a category grant cannot lift an explicit item withdrawal', () => {
  const revoked = { ...grant, decision: 'revoke', revision: 2 }
  const categoryGrant = { ...grant, itemId: null, revision: 3 }
  assert.equal(hasCoachContextGrant(request, [categoryGrant, grant, revoked]), false)
  assert.equal(hasCoachContextGrant(request, [revoked, categoryGrant, { ...grant, revision: 4 }]), true)
})
