import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import { validateTestPlanInput } from '../lib/app/test-plans.js'

const item = (definitionKey, definitionVersion = 'v1', instrumentLocale = 'en') => ({
  definitionKey,
  definitionVersion,
  instrumentLocale,
})

test('validates ordered runnable guest definitions without persisting focus or filters', () => {
  const plan = validateTestPlanInput({
    items: [item('phq-4'), item('hh-current-state', 'v2', 'ru')],
    operationId: randomUUID(),
    replaceActive: false,
  }, { audience: 'guest' })

  assert.deepEqual(plan.definitionIds.length, 2)
  assert.deepEqual(plan.definitions.map((definition) => definition.key), ['phq-4', 'hh-current-state'])
  assert.equal(plan.replaceActive, false)
  assert.equal('focus' in plan, false)
})

test('rejects private preference fields rather than persisting them in a plan', () => {
  assert.throws(() => validateTestPlanInput({
    items: [item('phq-4')], operationId: randomUUID(), focus: ['anxiety'],
  }, { audience: 'guest' }), /UNKNOWN_FIELD/)
})

test('rejects guest PHQ-9, duplicate items, unknown definitions, and oversized plans', () => {
  const validOperation = randomUUID()
  assert.throws(() => validateTestPlanInput({ items: [item('phq-9')], operationId: validOperation }, { audience: 'guest' }), /GUEST_TEST_UNAVAILABLE/)
  assert.throws(() => validateTestPlanInput({ items: [item('phq-4'), item('phq-4')], operationId: validOperation }, { audience: 'account' }), /DUPLICATE_DEFINITION/)
  assert.throws(() => validateTestPlanInput({ items: [item('unknown')], operationId: validOperation }, { audience: 'account' }), /UNKNOWN_INSTRUMENT/)
  assert.throws(() => validateTestPlanInput({ items: Array.from({ length: 13 }, () => item('phq-4')), operationId: validOperation }, { audience: 'account' }), /INVALID_PLAN_ITEMS/)
})
