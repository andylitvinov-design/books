import assert from 'node:assert/strict'
import test from 'node:test'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { EXPANDED_BATTERY_V3_DEFINITIONS, EXPANDED_BATTERY_V3_KEYS } from '../data/assessments/expanded-battery-v3.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildExplorerEntries, coverageForSelection } from '../lib/assessments/test-explorer.js'

test('14 new original bilingual questionnaires are distinct, complete and trackable', () => {
  assert.equal(EXPANDED_BATTERY_V3_KEYS.length, 14)
  assert.equal(new Set(EXPANDED_BATTERY_V3_KEYS).size, 14)
  assert.equal(EXPANDED_BATTERY_V3_DEFINITIONS.length, 28)
  const catalogKeys = MONITORING_CATALOG.map(({ key }) => key)
  assert.equal(new Set(catalogKeys).size, catalogKeys.length)
  const ids = ASSESSMENT_DEFINITIONS.map(({ id }) => id)
  assert.equal(new Set(ids).size, ids.length)
  for (const key of EXPANDED_BATTERY_V3_KEYS) {
    const item = MONITORING_CATALOG.find((entry) => entry.key === key)
    assert.ok(item?.startable && item.guestEligible && item.rightsStatus === 'cleared')
    assert.equal(item.questionCount, 6)
    assert.ok(item.analysisAxes.length >= 2)
    for (const locale of ['en','ru']) {
      const definition = getAssessmentDefinition(key, 'v1', locale)
      assert.equal(definition.questions.length, 6)
      assert.equal(new Set(definition.questions.map((q) => q.id)).size, 6)
      assert.match(definition.contentHash, /^sha256:[0-9a-f]{64}$/)
      assert.match(definition.id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/)
      const answers = Object.fromEntries(definition.questions.map((q) => [q.id,2]))
      assert.equal(Object.keys(validateAnswers(definition, answers)).length, 6)
      const result = scoreAssessment(definition, answers)
      assert.equal(result.dimensions.length, 1)
      assert.equal(result.dimensions[0].value, 2)
      assert.equal(result.dimensions[0].direction, 'higher-reported-resource')
      assert.equal(result.dimensions[0].timeframe, 'past-7-days')
    }
  }
})

test('new tests are selectable for guests in EN/RU and contribute to coverage', () => {
  for (const locale of ['en','ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'guest' })
    for (const key of EXPANDED_BATTERY_V3_KEYS) {
      const entry = entries.find((item) => item.key === key)
      assert.ok(entry?.selectable, `${key} must be playable in ${locale}`)
      assert.equal(entry.questionCount, entry.definition.questions.length)
      assert.ok(entry.analysisAxes.length >= 2)
    }
    const coverage = coverageForSelection(entries, ['hh-felt-safety','hh-values-direction','hh-conflict-repair'])
    assert.ok(coverage.axes.self_support.coverage > 0)
    assert.ok(coverage.axes.meaning.coverage > 0)
    assert.ok(coverage.axes.relationships.coverage > 0)
  }
})
