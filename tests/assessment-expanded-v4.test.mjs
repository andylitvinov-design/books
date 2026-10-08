import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { EXPANDED_BATTERY_V4_KEYS, EXPANDED_BATTERY_V4_DEFINITIONS } from '../data/assessments/expanded-battery-v4.js'
import { getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, coverageForSelection } from '../lib/assessments/test-explorer.js'

test('v4 has ten distinct non-diagnostic bilingual questionnaires with reproducible immutable hashes', () => {
  assert.equal(EXPANDED_BATTERY_V4_KEYS.length, 10)
  assert.equal(EXPANDED_BATTERY_V4_DEFINITIONS.length, 20)
  assert.equal(new Set(EXPANDED_BATTERY_V4_KEYS).size, 10)
  assert.equal(new Set(EXPANDED_BATTERY_V4_DEFINITIONS.map(({ id }) => id)).size, 20)
  assert.equal(MONITORING_CATALOG.filter(item => item.startable).length, 66)
  for (const key of EXPANDED_BATTERY_V4_KEYS) {
    const item = MONITORING_CATALOG.find(entry => entry.key === key)
    assert.equal(item?.guestEligible, true)
    assert.equal(item?.rightsStatus, 'cleared')
    assert.equal(item?.questionCount, 6)
    assert.equal(item?.analysisAxes.length >= 2, true)
    for (const locale of ['en', 'ru']) {
      const d = getAssessmentDefinition(key, 'v1', locale)
      const { contentHash, ...body } = d
      assert.equal(contentHash, 'sha256:' + createHash('sha256').update(canonicalJSON(body)).digest('hex'))
      assert.equal(d.timeframe, 'past-7-days')
      assert.equal(d.source.status, 'original-playful-non-diagnostic-reflection')
      assert.equal(d.questions.length, 6)
      assert.equal(new Set(d.questions.map(q => q.id)).size, 6)
      const answers = Object.fromEntries(d.questions.map(q => [q.id, 2]))
      assert.equal(Object.keys(validateAnswers(d, answers)).length, 6)
      const scored = scoreAssessment(d, answers)
      assert.equal(scored.dimensions.length, 1)
      assert.equal(scored.dimensions[0].value, 2)
      assert.equal(scored.dimensions[0].direction, 'higher-reported-resource')
    }
  }
})

test('v4 is shown as available in EN/RU Test Explorer with weighted coverage', () => {
  for (const locale of ['en','ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    for (const key of EXPANDED_BATTERY_V4_KEYS) {
      const entry = entries.find(item => item.key === key)
      assert.equal(entry?.selectable, true, key)
      assert.equal(entry?.questionCount, 6)
      assert.ok(entry.analysisAxes.every(a => a.weight > 0 && a.weight <= 1), key)
    }
    const coverage = coverageForSelection(entries, ['hh-body-mind-context','hh-role-freedom','hh-work-boundaries'])
    assert.ok(coverage.axes.stress.coverage > 0)
    assert.ok(coverage.axes.meaning.coverage > 0)
    assert.ok(coverage.axes.self_support.coverage > 0)
  }
})
