import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateLearningInterview, makeLearningPlan, validLearningStep,
  learningTutorFallback, LEARNING_PATH_LESSONS, LEARNING_PATH_COURSE_VERSION,
} from '../lib/learning-path/planner.mjs'
import { ENERGYWORK_VERSION, ENERGYWORK_LESSON_STARTS } from '../data/academy/energywork-ai-schema.js'

const valid = (changes = {}) => ({
  locale: 'ru', goal: 'Изучить основы Reiki через пять уроков',
  baseline: 'beginner', experience: '', outcome: 'Самостоятельно повторить изученную практику',
  minutesPerWeek: 90, weeks: 5, format: 'practice', obstacles: [],
  mentorPreference: 'self_guided', ...changes,
})

test('The planner uses five exact published Reiki entry IDs, not imaginary lessons', () => {
  assert.deepEqual(LEARNING_PATH_LESSONS.map(step => step.id), ENERGYWORK_LESSON_STARTS)
  assert.equal(LEARNING_PATH_COURSE_VERSION, ENERGYWORK_VERSION)
})
test('A 5-week route fits actual weekly time and never grants initiation', () => {
  const p = makeLearningPlan(valid())
  assert.equal(p.weeks.length, 5)
  assert.equal(p.budgetVerified, true)
  assert.equal(p.certificationGranted, false)
  assert.deepEqual(p.weeks.map(w => w.plannedMinutes), [25, 25, 25, 25, 25])
  assert.equal(p.totalMinutes, 125)
  assert.equal(p.weeks[4].steps[0].teacherApproval, false)
  assert.ok(validLearningStep(p, 'paths-01'))
  assert.equal(validLearningStep(p, 'unpublished-slide'), false)
})
test('A 4-week route fails closed if two lessons do not fit the budget', () => {
  assert.throws(() => makeLearningPlan(valid({ weeks: 4, minutesPerWeek: 30 })), e => e.code === 'PLAN_UNFEASIBLE')
  const plan = makeLearningPlan(valid({ weeks: 4, minutesPerWeek: 50 }))
  assert.equal(plan.weeks[3].plannedMinutes, 50)
  assert.ok(plan.weeks.every(w => w.plannedMinutes <= 50))
})
test('A 6-week route adds an honest reflection, not a fabricated source', () => {
  const plan = makeLearningPlan(valid({ weeks: 6, minutesPerWeek: 30 }))
  assert.equal(plan.weeks[5].steps[0].kind, 'reflection')
  assert.equal(plan.weeks[5].steps[0].sourceId, null)
  assert.equal(plan.totalMinutes, 140)
})
test('Spanish presentation falls back to the actual English Reiki material', () => {
  const plan = makeLearningPlan(valid({ locale: 'es' }))
  assert.equal(plan.weeks[0].steps[0].sourceLocale, 'en')
  assert.equal(plan.weeks[0].steps[0].href, '/en/academy/principles-of-energywork/learn')
})
test('Strict interview bounds, allowlist and text controls', () => {
  assert.equal(validateLearningInterview(valid()).goal.length > 0, true)
  for (const payload of [
    valid({ minutesPerWeek: 0 }), valid({ weeks: 8 }),
    valid({ baseline: 'doctor' }), valid({ goal: '<script>\n' }),
    valid({ obstacles: ['time', 'time'] }), valid({ locale: 'de' }),
    { ...valid(), clientId: 'someone-else' },
  ]) assert.throws(() => validateLearningInterview(payload))
})
test('Tutor is clearly deterministic, not paid AI or verified completion', () => {
  for (const action of ['explain', 'hint', 'example', 'review']) {
    const reply = learningTutorFallback({ locale: 'ru', action, stepKey: 'tan-01' })
    assert.equal(reply.mode, 'rules')
    assert.equal(reply.providerCalled, false)
    assert.equal(reply.verifiedLearning, false)
  }
  assert.throws(() => learningTutorFallback({ locale: 'en', action: 'write-to-crm', stepKey: 'tan-01' }))
})
