import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition, provenance, validateProvenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { courseMeasuredProfile } from '../lib/inner-growth/course-strategy.js'

const now = Date.parse('2026-10-15T12:00:00Z')
function result(key = 'hh-weekly-pulse', version = 'v1', locale = 'en') {
  const d = getAssessmentDefinition(key, version, locale)
  const answers = Object.fromEntries(d.questions.map(q => [q.id, q.min ?? d.answerScale.min]))
  return { ...scoreAssessment(d, answers), id: 'synthetic-only', measurementAt: new Date(now).toISOString() }
}
test('external symptom screens never become personality traits or course skill targets', () => {
  for (const locale of ['en', 'ru']) for (const key of ['gad-7', 'phq-4', 'phq-9', 'k6', 'phq-2', 'gad-2', 'k10', 'phq-15', 'ces-d-20', 'cbi-work']) {
    const guide = getTestScaleGuide(key, locale)
    assert.ok(guide)
    for (const s of guide.scales) {
      assert.equal(s.type, s.bands.basis === 'screening' ? 'symptom_screening' : 'symptom_measure', key)
      assert.equal(s.canChooseSkill, false, key)
      assert.equal(s.skill, null, key)
      assert.doesNotMatch(s.watch, /no trait|личностн/i)
    }
  }
})
test('neutral ERQ remains descriptive; real TIPI traits and HH self-ratings keep their semantics', () => {
  assert.ok(getTestScaleGuide('erq').scales.every(s => s.type === 'descriptive' && !s.canChooseSkill))
  assert.ok(getTestScaleGuide('tipi-10').scales.every(s => s.type === 'trait' && !s.canChooseSkill))
  assert.deepEqual(getTestScaleGuide('hh-weekly-pulse').scales.filter(s => !s.canChooseSkill).map(s=>s.key),['weekly.mood','weekly.connection'])
})
test('course profile fails closed for every changed or omitted provenance field', () => {
  const r = result(), fields = Object.keys(provenance(getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')))
  assert.equal(courseMeasuredProfile({ results: [r], testKeys: ['hh-weekly-pulse'], now }).eligible.length, 6)
  for (const key of fields) {
    for (const omit of [false, true]) {
      const changed = { ...r, [key]: 'mismatched' }
      if (omit) delete changed[key]
      assert.equal(courseMeasuredProfile({ results: [changed], testKeys: ['hh-weekly-pulse'], now }).scales.length, 0, key + (omit ? ' missing' : ' mismatch'))
    }
  }
})
test('valid Russian runs are independent of display locale; registered historical runs remain pinned', () => {
  const r = result('hh-weekly-pulse', 'v1', 'ru')
  assert.equal(courseMeasuredProfile({ results: [r], testKeys: ['hh-weekly-pulse'], locale: 'en', now }).eligible.length, 6)
  const historic = result('hh-current-state', 'v1', 'en')
  assert.equal(validateProvenance(historic).version, 'v1')
  assert.equal(historic.definitionVersion, 'v1')
  assert.equal(courseMeasuredProfile({ results: [historic], testKeys: ['hh-current-state'], now }).scales.length, 0)
})
