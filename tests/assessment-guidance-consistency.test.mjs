import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { monitoringCatalogItem } from '../data/assessments/catalog.js'
import { deterministicPatterns } from '../lib/assessments/monitoring.js'
import { practicalReflection } from '../lib/assessments/personal-guidance.js'
import { interpretationForDimension } from '../lib/assessments/interpretation-registry.js'

const accountId = randomUUID()
function fixture(key, day, overrides = {}, base = null) {
  const definition = getAssessmentDefinition(key, 'v1', 'en')
  const answers = Object.fromEntries(definition.questions.map(q => [q.id, base ?? q.min ?? definition.answerScale.min]))
  return { ...scoreAssessment(definition, { ...answers, ...overrides }),
    id: randomUUID(), accountId, measurementAt: `2026-10-${day}T12:00:00Z` }
}

test('monitoring preserves a one-point PHQ-9 change across the 4/5 reference boundary', () => {
  const results = [fixture('phq-9', 10, {'phq9.01': 3, 'phq9.02': 1}),
    fixture('phq-9', 11, {'phq9.01': 3, 'phq9.02': 1}),
    fixture('phq-9', 12, {'phq9.01': 3, 'phq9.02': 2})]
  assert.deepEqual(results.map(r => r.dimensions[0].value), [4, 4, 5])
  const [pattern] = deterministicPatterns({results})
  assert.equal(pattern.delta, 1)
  assert.equal(pattern.state, 'higher')
})

test('fractional ERQ changes are numeric, and identical endpoints do not infer clinical stability', () => {
  const results = [fixture('erq', 10), fixture('erq', 11), fixture('erq', 12, {'erq.02': 2})]
  assert.deepEqual(results.map(r => r.dimensions[1].value), [1, 1, 1.25])
  const patterns = deterministicPatterns({results})
  assert.equal(patterns.find(p => p.dimensionKey === 'resources.erq.suppression').state, 'higher')
  assert.equal(patterns.find(p => p.dimensionKey === 'resources.erq.suppression').delta, 0.25)
  assert.equal(patterns.find(p => p.dimensionKey === 'resources.erq.reappraisal').state, 'stable')
})

test('monitoring reports lower or higher scores without inferring improvement', () => {
  const results = [fixture('hh-stress-weather', 10, {}, 4), fixture('hh-stress-weather', 11, {}, 3), fixture('hh-stress-weather', 12, {}, 2)]
  const original = JSON.stringify(results)
  assert.ok(deterministicPatterns({results}).every(p => p.state === 'lower'))
  assert.equal(JSON.stringify(results), original)
})

for (const locale of ['en', 'ru']) test(`personal reflection uses shared score-specific ERQ guidance (${locale})`, () => {
  const prior = fixture('erq', 10)
  const current = fixture('erq', 12, {'erq.02': 2})
  const original = JSON.stringify([prior, current])
  const expected = interpretationForDimension(current, current.dimensions[1], locale)
  assert.equal(practicalReflection([prior, current], locale), expected.actions.join(' '))
  assert.match(practicalReflection([prior, current], locale), /1.25/)
  assert.doesNotMatch(practicalReflection([prior, current], locale), /replenish your energy|восстанавливать силы/)
  assert.equal(JSON.stringify([prior, current]), original)
})

test('unverified versions do not supply score-linked personal reflection', () => {
  const current = fixture('erq', 12)
  const altered = {...current, contentHash: 'unknown'}
  assert.equal(practicalReflection([altered]), '')
  assert.doesNotMatch(practicalReflection([altered]), /reappraisal|suppression|1 \(1/)
})

test('ASRS retains its regardless-of-count professional discussion prompt', () => {
  const current = fixture('asrs-6', 12)
  assert.match(practicalReflection([current]), /regardless of the count/)
  assert.match(practicalReflection([current], 'ru'), /независимо от балла/)
})


test('monitoring UI explains endpoint-only comparisons and avoids clinical stability wording', () => {
  const source = fs.readFileSync(new URL('../components/app/psi-monitoring.jsx', import.meta.url), 'utf8')
  assert.match(source, /Intermediate scores may differ/)
  assert.match(source, /Промежуточные баллы могут отличаться/)
  assert.match(source, /stable: 'the same as the earlier measurement'/)
  assert.match(source, /stable: 'такой же, как в раннем замере'/)
  assert.match(source, /does not establish improvement, deterioration or clinical significance/)
  assert.match(source, /sampleCount: 'Measurements in this comparison:'/ )
  assert.match(source, /sampleCount: 'Замеров в этом сравнении:'/ )
  assert.doesNotMatch(source, /changedAcross|across the last|за последние/)
  assert.ok(source.includes('{c[pattern.state]}. {c.sampleCount} {pattern.count}.'))
})


for (const key of ['hh-money-pressure', 'hh-overthinking-loop', 'hh-screen-saturation']) {
  test(`${key}: historical observations stay version-separated after a catalog upgrade`, () => {
    const historical = [fixture(key, 10, {}, 1), fixture(key, 11, {}, 2), fixture(key, 12, {}, 3)]
    const patterns = deterministicPatterns({results: historical})
    assert.equal(patterns.length, 1)
    assert.equal(patterns[0].state, 'higher')
    assert.equal(patterns[0].delta, 2)
    assert.equal(patterns[0].dimensionKey, historical[0].dimensions[0].key)
    if (monitoringCatalogItem(key).version === 'v2') {
      const definition = getAssessmentDefinition(key, 'v2', 'en')
      const current = { ...scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, 2]))),
        id: randomUUID(), accountId, measurementAt: '2026-10-13T12:00:00Z' }
      assert.deepEqual(deterministicPatterns({results: [...historical, current]}), [], 'One v2 result must not be combined with v1 history')
      const currentSeries = [13, 14, 15].map(day => ({...current, id: randomUUID(), measurementAt: `2026-10-${day}T12:00:00Z`}))
      const upgraded = deterministicPatterns({results: [...historical, ...currentSeries]})
      assert.ok(upgraded.length > 0)
      assert.ok(upgraded.every(pattern => current.dimensions.some(dimension => dimension.key === pattern.dimensionKey)))
      assert.ok(upgraded.every(pattern => pattern.count === 3 && pattern.delta === 0))
    }
  })
}
