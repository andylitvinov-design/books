import test from 'node:test'
import assert from 'node:assert/strict'
import { planIntelligenceRequest } from '../lib/holistic-support/intelligence-plan.mjs'
import { hasActiveIntelligenceCourse } from '../lib/app/intelligence-course.js'

const body = {
  requestId: 'd4502108-a8b8-4d3b-813f-c255b452bde4', surface: 'cabinet',
  intent: { language: 'en', selectedTopics: ['energy'], formats: ['course'] },
  preflight: { immediateDanger: 'no', selfHarmThoughts: 'no' },
}

test('only an explicit cabinet choice reads course availability after safety preflight', async () => {
  let reads = 0
  const loadActiveCourse = async () => { reads++; return { hasActiveCourse: true } }
  await planIntelligenceRequest(body, { loadActiveCourse })
  assert.equal(reads, 0)
  const chosen = { ...body, courseSelection: 'active_course' }
  await planIntelligenceRequest({ ...chosen, preflight: { ...body.preflight, selfHarmThoughts: 'yes' } }, { loadActiveCourse })
  await planIntelligenceRequest({ ...chosen, intent: { ...body.intent, maxDurationMinutes: 5 } }, { loadActiveCourse })
  assert.equal(reads, 0)
  await assert.rejects(planIntelligenceRequest({ ...chosen, surface: 'meditation' }, { loadActiveCourse }), /INVALID_INTELLIGENCE_REQUEST/)
  const result = await planIntelligenceRequest(chosen, { loadActiveCourse })
  assert.equal(reads, 1)
  assert.equal(result.status, 'recommend')
  assert.equal(result.primary.href, '/en/app/course?view=courses')
  assert.equal(result.primary.requiresUserConfirmation, true)
  assert.doesNotMatch(JSON.stringify(result), /accountId|courseId|concerns|results/)
})

test('missing, dismissed or unavailable active course never becomes a fabricated action', async () => {
  const chosen = { ...body, courseSelection: 'active_course' }
  assert.equal((await planIntelligenceRequest(chosen, { loadActiveCourse: async () => ({ hasActiveCourse: false }) })).status, 'no_match')
  assert.equal((await planIntelligenceRequest(chosen, { loadActiveCourse: async () => ({ hasActiveCourse: 'yes' }) })).status, 'unavailable')
  assert.equal((await planIntelligenceRequest(chosen, { loadActiveCourse: async () => { throw Error('database') } })).status, 'unavailable')
  assert.equal((await planIntelligenceRequest({ ...chosen, session: { dismissedIds: ['course:active'] } }, { loadActiveCourse: async () => ({ hasActiveCourse: true }) })).status, 'no_match')
})

test('saved negative feedback affects an active course only with separate opt-in', async () => {
  let reads = 0
  const loadActiveCourse = async () => ({ hasActiveCourse: true })
  const loadFeedback = async candidates => { reads++; assert.deepEqual(candidates, ['course:active']); return { dismissedIds: ['course:active'] } }
  const chosen = { ...body, courseSelection: 'active_course' }
  assert.equal((await planIntelligenceRequest(chosen, { loadActiveCourse, loadFeedback })).status, 'recommend')
  assert.equal(reads, 0)
  assert.equal((await planIntelligenceRequest({ ...chosen, feedbackHistory: 'avoid_not_useful' }, { loadActiveCourse, loadFeedback })).status, 'no_match')
  assert.equal(reads, 1)
  assert.equal((await planIntelligenceRequest({ ...chosen, feedbackHistory: 'avoid_not_useful' }, { loadActiveCourse: async () => ({ hasActiveCourse: false }), loadFeedback })).status, 'no_match')
  assert.equal(reads, 1)
})

test('course availability uses the authenticated account parameter and returns only a boolean', async () => {
  const owners = new Set(['owner-a'])
  const seen = []
  const runTransaction = async (_config, actor, fn) => fn({ query: async (sql, params) => {
    seen.push({ sql, params, actor: actor.id })
    assert.deepEqual(params, [actor.id])
    if (sql.includes('app.accounts')) return { rows: [{ status: 'active', onboarding_state: 'active' }] }
    assert.match(sql, /account_id=\$1/)
    assert.doesNotMatch(sql, /concerns|goal|assessment|select \*/i)
    return { rows: [{ present: owners.has(actor.id) }] }
  } })
  assert.deepEqual(await hasActiveIntelligenceCourse({}, { id: 'owner-a' }, { runTransaction }), { hasActiveCourse: true })
  assert.deepEqual(await hasActiveIntelligenceCourse({}, { id: 'owner-b' }, { runTransaction }), { hasActiveCourse: false })
  assert.equal(seen.length, 4)
})

test('an inactive account is rejected before accessing course information', async () => {
  let reads = 0
  const runTransaction = async (_config, _actor, fn) => fn({ query: async () => {
    reads++
    return { rows: [{ status: 'inactive', onboarding_state: 'active' }] }
  } })
  await assert.rejects(hasActiveIntelligenceCourse({}, { id: 'owner-a' }, { runTransaction }), /ACCOUNT_UNAVAILABLE/)
  assert.equal(reads, 1)
})
