import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTestDynamicsGroups } from '../lib/assessments/test-dynamics.js'

const base = (id, at, value, extra = {}) => ({
  id, accountId: 'private-account-1',
  definitionId: 'definition-1', definitionKey: 'example-assessment',
  definitionVersion: '1.0', contentHash: 'hash-v1',
  instrumentLocale: 'en', scoringKey: 'configured',
  scoringVersion: '1', resultVersion: '1', timeframe: 'now',
  measurementAt: at,
  dimensions: [{
    key: 'anxiety', min: 0, max: 10, unit: 'points',
    timeframe: 'now', direction: 'neutral', dimensionClass: 'state',
    sourceConstruct: 'Reported tension', displayKind: 'continuous',
    value,
  }],
  ...extra,
})

test('dynamics defaults to all time and shows first/last values and retake data for every test', () => {
  const one = base('one', '2026-08-01T12:00:00Z', 8)
  const two = base('two', '2026-10-13T12:00:00Z', 4)
  const other = base('other', '2026-10-10T12:00:00Z', 3, {
    definitionId: 'definition-2', definitionKey: 'different-assessment',
  })
  const view = buildTestDynamicsGroups([two, other, one], 'ru')
  assert.equal(view.valid, true)
  assert.equal(view.groups.length, 2)
  assert.equal(view.attempts, 3)
  assert.equal(view.repeated, 1)
  const repeated = view.groups.find(group => group.key === 'example-assessment')
  assert.equal(repeated.count, 2)
  assert.equal(repeated.first.id, 'one')
  assert.equal(repeated.latest.id, 'two')
  assert.equal(repeated.scales[0].firstValue, 8)
  assert.equal(repeated.scales[0].lastValue, 4)
  assert.equal(repeated.scales[0].delta, -4)
  assert.equal(repeated.scales[0].track.length, 2)
})

test('period limits comparisons to available results without losing older values in all time', () => {
  const old = base('old', '2026-08-01T12:00:00Z', 8)
  const recent = base('recent', '2026-10-13T12:00:00Z', 4)
  const now = new Date('2026-10-14T12:00:00Z')
  const currentWeek = buildTestDynamicsGroups([old, recent], 'en', 'week', '', '', now)
  assert.equal(currentWeek.groups.length, 1)
  assert.equal(currentWeek.groups[0].count, 1)
  assert.equal(currentWeek.groups[0].scales[0].delta, null)
  const all = buildTestDynamicsGroups([old, recent])
  assert.equal(all.groups[0].count, 2)
  assert.equal(all.groups[0].scales[0].delta, -4)
  assert.equal(buildTestDynamicsGroups([old, recent], 'en', 'custom', '2026-10-14', '2026-10-01').valid, false)
})

test('a change in test definition never produces a fabricated comparable delta', () => {
  const first = base('first', '2026-09-01T12:00:00Z', 4)
  const changed = base('new', '2026-10-01T12:00:00Z', 8, { contentHash: 'new-hash' })
  const view = buildTestDynamicsGroups([first, changed])
  assert.equal(view.groups[0].scales[0].firstValue, 4)
  assert.equal(view.groups[0].scales[0].lastValue, 8)
  assert.equal(view.groups[0].scales[0].delta, null)
  assert.equal(view.groups[0].scales[0].track.length, 1)
})

test('retained histories remain visible even when there is no active test plan', () => {
  const result = base('saved', '2026-06-01T12:00:00Z', 7)
  const view = buildTestDynamicsGroups([result], 'en')
  assert.equal(view.groups.length, 1)
  assert.equal(view.groups[0].latest.definitionId, 'definition-1')
})
