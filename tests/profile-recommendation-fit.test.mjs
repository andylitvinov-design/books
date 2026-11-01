import assert from 'node:assert/strict'
import test from 'node:test'
import { rankProfileAxisTests, recommendProfileTopThreeTests } from '../lib/profile/profile-scale-selection.js'

const tests = [
  { key: 'focused', testKind: 'monitoring', minutes: 2, free: true, startable: true, rightsStatus: 'cleared' },
  { key: 'broad', testKind: 'monitoring', minutes: 7, free: true, startable: true, rightsStatus: 'cleared' },
  { key: 'alternative', testKind: 'monitoring', minutes: 5, free: true, startable: true, rightsStatus: 'cleared' },
  { key: 'unrelated', testKind: 'monitoring', minutes: 4, free: true, startable: true, rightsStatus: 'cleared' },
  { key: 'pro', testKind: 'professional', minutes: 4, free: true, startable: true, rightsStatus: 'cleared' },
  { key: 'restricted', testKind: 'monitoring', free: true, startable: true, rightsStatus: 'restricted' },
  { key: 'research-only', testKind: 'monitoring', free: true, startable: false, rightsStatus: 'cleared' },
  { key: 'optin', testKind: 'monitoring', free: true, startable: true, explicitOptIn: true, rightsStatus: 'cleared' },
]
const scale = (testKey, key, researchAxisId) =>
  ({ id: testKey + '::' + key, key, testKey, researchAxisId })
const groups = [{
  area: 'work',
  scales: [
    scale('focused', 'f', 'work::focus'),
    scale('broad', 'f', 'work::focus'),
    scale('broad', 'p', 'work::functioning'),
    scale('alternative', 'f', 'work::focus'),
    scale('unrelated', 's', 'emotions::stress'),
    scale('pro', 'f', 'work::focus'),
    scale('restricted', 'f', 'work::focus'),
    scale('research-only', 'f', 'work::focus'),
    scale('optin', 'f', 'work::focus'),
  ],
}]
const chosen = ['focused::f', 'broad::p']

test('source-backed match percentages rank all compatible eligible tests, not only checked ones', () => {
  const ranked = rankProfileAxisTests(tests, groups, chosen, 'questionnaires')
  assert.deepEqual(ranked.map(item => item.key), ['broad', 'focused', 'alternative'])
  assert.deepEqual(ranked.map(item => item.matchPercent), [90, 50, 40])
  assert.ok(Object.isFrozen(ranked))
  assert.ok(Object.isFrozen(ranked[0].matchedAxes))
  assert.equal(ranked[0].matchedAxes.length, 2)
  assert.equal(rankProfileAxisTests(tests, groups, [], 'questionnaires').length, 0)
  assert.deepEqual(rankProfileAxisTests(tests, groups, chosen, 'pro').map(item => item.key), ['pro'])
})

test('three featured test slots retain source coverage and fill from ranked alternatives', () => {
  const first = recommendProfileTopThreeTests(tests, groups, chosen, 'questionnaires')
  assert.equal(first.length, 3)
  assert.equal(new Set(first).size, 3)
  assert.ok(first.includes('broad'))
  assert.ok(first.includes('focused'))
  assert.ok(first.includes('alternative'))
  assert.ok(Object.isFrozen(first))
  // One selected facet should still offer three source-supported choices, not
  // collapse to one merely because the first pick covered that one construct.
  const one = recommendProfileTopThreeTests(tests, groups, ['focused::f'], 'questionnaires')
  assert.deepEqual([...one].sort(), ['alternative', 'broad', 'focused'])
  assert.equal(recommendProfileTopThreeTests(tests, groups, [], 'questionnaires').length, 0)
  assert.deepEqual(recommendProfileTopThreeTests(tests, groups, chosen, 'pro'), ['pro'])
})

test('relevance responds to topic and source scale choices, not a test checkbox or clinical result', () => {
  const first = rankProfileAxisTests(tests, groups, chosen, 'questionnaires')
  const same = rankProfileAxisTests(tests, groups, [...chosen], 'questionnaires')
  assert.deepEqual(same, first)
  const changed = rankProfileAxisTests(tests, groups, ['focused::f'], 'questionnaires')
  assert.equal(changed[0].matchPercent, 100)
  assert.equal(changed[0].key, 'focused')
  for (const item of changed) {
    assert.ok(item.matchPercent >= 1 && item.matchPercent <= 100)
    assert.equal(typeof item.key, 'string')
  }
})
