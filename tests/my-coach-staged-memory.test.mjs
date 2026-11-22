import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { projectCoachPriorSessions, projectCoachSelectedContext,
  COACH_STAGED_MEMORY_VERSION } from '../lib/coaching/coach-staged-memory.mjs'
import { issueCoachMemoryTicket, verifyCoachMemoryTicket } from '../lib/coaching/coach-staged-memory-ticket.mjs'

const now = '2026-11-22T10:00:00.000Z'
const protocol = {
  provenance: 'client_reviewed_dialogue', completedAt: now,
  opening: { name: 'Anna' }, goal: 'Improve confidence',
  clientSummary: 'I noticed I need clearer boundaries',
  clientNextStep: 'Ask for a discussion at work',
  turns: [{ role: 'user', content: 'SECRET FULL TRANSCRIPT' }],
}
test('identity stage projects only reviewed past-session recaps; never raw transcripts', () => {
  assert.match(COACH_STAGED_MEMORY_VERSION, /staged-memory/)
  const result = projectCoachPriorSessions([protocol, { ...protocol, provenance: 'ai_generated_only' }], 'Wrong Name')
  assert.equal(result.hasPreviousSession, true)
  assert.equal(result.preferredName, 'Anna')
  assert.equal(result.previous.length, 1)
  assert.equal(result.previous[0].clientConclusions, protocol.clientSummary)
  assert.equal(JSON.stringify(result).includes('SECRET FULL TRANSCRIPT'), false)
  assert.deepEqual(projectCoachPriorSessions([]).previous, [])
  assert.equal(projectCoachPriorSessions([{ ...protocol, provenance: 'ai_generated_only' }]).hasPreviousSession, false)
})
test('personal stage passes only server-reviewed source kinds and category-scoped opt-ins', () => {
  const snapshot = { items: [
    { kind: 'goals', sourceKind: 'saved_life_plan', text: 'Make time for deep work' },
    { kind: 'test_results', sourceKind: 'selected_assessment', text: 'Validated dimension score' },
    { kind: 'goals', sourceKind: 'unreviewed_model_guess', text: 'UNAPPROVED' },
    { kind: 'preferences', sourceKind: 'private_profile', text: 'PRIVATE EMAIL' },
  ] }
  const goals = projectCoachSelectedContext(snapshot, { goals: true })
  assert.equal(goals.items.length, 1)
  assert.equal(goals.items[0].kind, 'goals')
  const scores = projectCoachSelectedContext(snapshot, { assessments: true })
  assert.equal(scores.items.length, 1)
  assert.equal(scores.items[0].kind, 'test_results')
  assert.deepEqual(projectCoachSelectedContext(snapshot).items, [])
  assert.equal(JSON.stringify(goals).includes('PRIVATE EMAIL'), false)
})
test('route requires authenticated owner and origin; personal uses live policy+DB grants', () => {
  const route = readFileSync(new URL('../app/api/app/my-coach/staged-memory/route.js', import.meta.url), 'utf8')
  const service = readFileSync(new URL('../lib/app/my-coach-staged-memory.js', import.meta.url), 'utf8')
  assert.match(route, /requireSameOrigin\(request, config\)/)
  assert.match(route, /auth\.verified\(\)/)
  assert.match(route, /ACCOUNT_CHANGED/)
  assert.match(service, /consent\.sessionAccepted !== true/)
  assert.match(service, /consent\.providerSharing !== true/)
  assert.match(service, /listMyCoachProtocols\(config, actor\)/)
  assert.match(service, /buildCoachContextSnapshot\(config, actor/)
  assert.match(service, /coachContextPolicy\(provider, env\)/)
  assert.doesNotMatch(route, /fetch\(/)
})
test('stage 3 token is bound to the signed-in owner, selected provider, and expiry', () => {
  const secret = 'integration-fixture-secret'
  const token = issueCoachMemoryTicket({ accountId: 'account-one', provider: 'gemini_free', secret, now: 1000000000000 })
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-one', provider: 'gemini_free', secret, now: 1000000000001 }), true)
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-two', provider: 'gemini_free', secret, now: 1000000000001 }), false)
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-one', provider: 'gemini_paid', secret, now: 1000000000001 }), false)
  assert.equal(verifyCoachMemoryTicket(token, { accountId: 'account-one', provider: 'gemini_free', secret, now: 1000000000000 + 46 * 60000 }), false)
  assert.equal(verifyCoachMemoryTicket('invalid', { accountId: 'account-one', provider: 'gemini_free', secret }), false)
})
