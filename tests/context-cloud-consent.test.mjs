import test from 'node:test'
import assert from 'node:assert/strict'
import { hasCoachContextGrant, matchesCoachContextReview } from '../lib/coaching/context-cloud-consent.mjs'

test('confirmation applies only to the same item, topic, source revision and provider policy', () => {
  const item = { itemId: 'goal', category: 'goals', topicKey: 'finance', sourceRevision: '2' }
  const approval = { ...item, confirmed: true, policyVersion: 'v2' }
  assert.equal(matchesCoachContextReview(approval, item, 'v2'), true)
  for (const mismatch of [{ confirmed: false }, { itemId: 'other' }, { category: 'actions' },
    { topicKey: 'relationships' }, { sourceRevision: '1' }, { policyVersion: 'v1' }]) {
    assert.equal(matchesCoachContextReview({ ...approval, ...mismatch }, item, 'v2'), false)
  }
})

const request = {
  accountId: 'owner', provider: 'groq', policyVersion: 'v2', role: 'coach',
  category: 'goals', itemId: 'goal', sessionId: 'session', now: 100, sourceRevision: '2',
}
const grant = {
  ...request, purpose: 'coaching', decision: 'grant', revision: 1,
  occurredAt: 50, expiresAt: null,
}

test('assessment consent requires an exact result and scale and respects withdrawal', () => {
  const scope = { ...request, category: 'test_results', scaleKey: 'trait.ipip50.extraversion' }
  const permission = { ...grant, ...scope }
  assert.equal(hasCoachContextGrant(scope, [permission]), true)
  assert.equal(hasCoachContextGrant({ ...scope, scaleKey: 'trait.ipip50.openness' }, [permission]), false)
  assert.equal(hasCoachContextGrant(scope, [{ ...permission, itemId: null }]), false)
  assert.equal(hasCoachContextGrant(scope, [permission, { ...permission, decision: 'revoke', revision: 2 }]), false)
})

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

test('deleting or replacing a report invalidates consent for its derived goal', () => {
  const reportGrant = { ...grant, sourceRevision: '2:report:original:1' }
  assert.equal(hasCoachContextGrant({ ...request, sourceRevision: reportGrant.sourceRevision }, [reportGrant]), true)
  for (const sourceRevision of ['2', '2:report:replacement:1', '2:report:original:2']) {
    assert.equal(hasCoachContextGrant({ ...request, sourceRevision }, [reportGrant]), false)
  }
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

test('reviewed protocol fields need an expiring Groq grant for the exact session, source and policy',()=>{
  const scope={...request,category:'reviewed_protocol_fields',sessionOnly:true}
  const approved={...grant,...scope,expiresAt:150}
  assert.equal(hasCoachContextGrant(scope,[approved]),true)
  for(const change of [{accountId:'other'},{sessionId:'another'},{sourceRevision:'changed'},
    {policyVersion:'changed'},{provider:'openrouter'},{sessionOnly:false},{now:150}]){
    assert.equal(hasCoachContextGrant({...scope,...change},[approved]),false)
  }
  for(const change of [{sessionId:null},{itemId:null},{expiresAt:null}]){
    assert.equal(hasCoachContextGrant(scope,[{...approved,...change}]),false)
  }
  const withdrawal={...approved,itemId:null,sourceRevision:null,decision:'revoke',revision:2,expiresAt:null}
  assert.equal(hasCoachContextGrant(scope,[approved,withdrawal]),false)
})
