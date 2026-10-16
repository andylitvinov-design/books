import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { deterministicPatterns } from '../lib/assessments/monitoring.js'

const accountId = randomUUID()
function fixture(version, locale, day, value = 0, owner = accountId) {
  const definition = getAssessmentDefinition('hh-bach-flower-profile', version, locale)
  return { ...scoreAssessment(definition, Object.fromEntries(definition.questions.map(q => [q.id, value]))),
    id: randomUUID(), accountId: owner, measurementAt: `2026-10-${day}T12:00:00Z` }
}
for (const locale of ['en', 'ru']) {
  test(`Bach ${locale}: legacy v1 numeric patterns survive v2 catalog activation`, () => {
    const historical = [fixture('v1', locale, 10), fixture('v1', locale, 11, 1), fixture('v1', locale, 12, 2)]
    const original = JSON.stringify(historical)
    const patterns = deterministicPatterns({results: historical, locale, limit: 50})
    assert.equal(patterns.length, 38)
    for (const pattern of patterns) {
      const first = historical[0].dimensions.find(d => d.key === pattern.dimensionKey)
      const last = historical[2].dimensions.find(d => d.key === pattern.dimensionKey)
      assert.equal(pattern.delta, last.value - first.value)
      assert.equal(pattern.state, 'higher')
      assert.equal(pattern.count, 3)
    }
    assert.equal(JSON.stringify(historical), original)
  })
  test(`Bach ${locale}: v1 never supplements an incomplete v2 series`, () => {
    const historical = [10, 11, 12].map(day => fixture('v1', locale, day, 5))
    const current = fixture('v2', locale, 13)
    assert.deepEqual(deterministicPatterns({results: [...historical, current], locale}), [])
    const currentSeries = [current, fixture('v2', locale, 14), fixture('v2', locale, 15)]
    const patterns = deterministicPatterns({results: [...historical, ...currentSeries], locale, limit: 50})
    assert.equal(patterns.length, 38)
    assert.ok(patterns.every(p => p.count === 3 && p.delta === 0 && p.state === 'stable'))
    assert.ok(patterns.every(p => p.from === current.measurementAt))
  })
  test(`Bach ${locale}: legacy fallback never combines owners or altered provenance`, () => {
    const one = fixture('v1', locale, 10)
    const two = fixture('v1', locale, 11, 1)
    const otherOwner = fixture('v1', locale, 12, 2, randomUUID())
    assert.deepEqual(deterministicPatterns({results: [one, two, otherOwner], locale}), [])
    const altered = {...fixture('v1', locale, 12, 2), contentHash: 'unverified'}
    assert.deepEqual(deterministicPatterns({results: [one, two, altered], locale}), [])
  })
}
