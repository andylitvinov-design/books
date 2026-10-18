import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildTestDynamicsGroups, visibleTestDynamicsBand } from '../lib/assessments/test-dynamics.js'
import { readFileSync } from 'node:fs'

const base = (id, at, value, extra = {}) => {
  const definition = getAssessmentDefinition(extra.definitionKey || 'hh-current-state', 'v1', 'en')
  const scored = scoreAssessment(definition, Object.fromEntries(definition.questions.map(question =>
    [question.id, question.min ?? definition.answerScale.min])))
  return { ...scored, id, accountId: 'private-account-1', measurementAt: at,
    dimensions: scored.dimensions.map((dimension, index) => index === 0 ? { ...dimension, value } : dimension),
    ...extra }
}

test('dynamics defaults to all time and shows first/last values and retake data for every test', () => {
  const one = base('one', '2026-08-01T12:00:00Z', 8)
  const two = base('two', '2026-10-13T12:00:00Z', 4)
  const other = base('other', '2026-10-10T12:00:00Z', 3, {
    definitionKey: 'hh-weekly-pulse',
  })
  const view = buildTestDynamicsGroups([two, other, one], 'ru')
  assert.equal(view.valid, true)
  assert.equal(view.groups.length, 2)
  assert.equal(view.attempts, 3)
  assert.equal(view.repeated, 1)
  const repeated = view.groups.find(group => group.key === 'hh-current-state')
  assert.equal(repeated.count, 2)
  assert.equal(repeated.first.id, 'one')
  assert.equal(repeated.latest.id, 'two')
  assert.equal(repeated.scales[0].firstValue, 8)
  assert.equal(repeated.scales[0].lastValue, 4)
  assert.equal(repeated.scales[0].delta, -4)
  assert.equal(repeated.scales[0].track.length, 2)
  assert.equal(repeated.scales[0].gaugeDimension.value, 4)
  assert.equal(repeated.scales[0].gaugeDimension.min, 0)
  assert.equal(repeated.scales[0].gaugeDimension.max, 10)
  const baseline = view.groups.find(group => group.key === 'hh-weekly-pulse')
  assert.equal(baseline.count, 1)
  assert.equal(baseline.scales[0].firstValue, 3)
  assert.equal(baseline.scales[0].lastValue, null, 'do not repeat the first score as the missing retake')
  assert.equal(baseline.scales[0].delta, null)
  assert.equal(baseline.scales[0].gaugeDimension.value, 3, 'speedometer uses actual baseline score')
})

test('period limits comparisons to available results without losing older values in all time', () => {
  const old = base('old', '2026-08-01T12:00:00Z', 8)
  const recent = base('recent', '2026-10-13T12:00:00Z', 4)
  const now = new Date('2026-10-14T12:00:00Z')
  const currentWeek = buildTestDynamicsGroups([old, recent], 'en', 'week', '', '', now)
  assert.equal(currentWeek.groups.length, 1)
  assert.equal(currentWeek.groups[0].count, 1)
  assert.equal(currentWeek.groups[0].scales[0].delta, null)
  assert.equal(currentWeek.groups[0].scales[0].firstValue, 4)
  assert.equal(currentWeek.groups[0].scales[0].lastValue, null, 'a period with one attempt has no second comparison')
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
  assert.equal(view.groups[0].scales[0].gaugeDimension.value, 8)
  assert.equal(view.groups[0].scales[0].delta, null)
  assert.equal(view.groups[0].scales[0].track.length, 1)
})

test('retained histories remain visible even when there is no active test plan', () => {
  const result = base('saved', '2026-06-01T12:00:00Z', 7)
  const view = buildTestDynamicsGroups([result], 'en')
  assert.equal(view.groups.length, 1)
  assert.equal(view.groups[0].latest.definitionId, getAssessmentDefinition('hh-current-state','v1','en').id)
})

test('test dynamics shows only the current published score interval and hides its peers', () => {
  const phq4 = base('phq4', '2026-10-17T12:00:00Z', 6, { definitionKey: 'phq-4' })
  const current = visibleTestDynamicsBand(phq4.dimensions[0], phq4, 'ru')
  assert.ok(current, 'the published PHQ-4 result must have an active range')
  assert.equal(current.kind, 'published')
  assert.equal(current.current.from, 6)
  assert.equal(current.current.to, 8)
  assert.equal(current.others.length, 3)
  assert.ok(current.others.every(band => band.code !== current.current.code))
  const low = visibleTestDynamicsBand({ ...phq4.dimensions[0], value: 0 }, phq4, 'ru')
  assert.equal(low.current.from, 0)
  assert.equal(low.current.to, 2)
})

test('unpublished reading aids remain explicitly descriptive and current-only', () => {
  const cbi = base('cbi', '2026-10-17T12:00:00Z', 50, { definitionKey: 'cbi-personal' })
  const current = visibleTestDynamicsBand(cbi.dimensions[0], cbi, 'en')
  assert.equal(visibleTestDynamicsBand({...cbi.dimensions[0],value:45},cbi,'en'),null,'Off-lattice CBI values cannot acquire an interpretation')
  assert.equal(current?.kind, 'descriptive')
  assert.equal(current?.others.length, 4)
  assert.ok(current.caveat.includes('not published norms'))
})

test('Results mobile view collapses extra measured scales and score intervals by default', () => {
  const view = readFileSync(new URL('../components/app/test-dynamics.jsx', import.meta.url), 'utf8')
  assert.match(view, /group\.scales\.slice\(0,1\)/)
  assert.match(view, /group\.scales\.slice\(1\)/)
  assert.match(view, /showLegend=\{false\}/)
  assert.match(view, /data-current-score-band/)
  assert.match(view, /<details className=\{styles\.levelDetails\} data-other-score-bands>/)
})

test('unverified saved history is labelled and cannot masquerade as a validated score', () => {
  const verified = base('verified', '2026-09-20T12:00:00Z', 4)
  const rejected = { ...base('rejected', '2026-10-15T12:00:00Z', 7), contentHash: 'wrong-sha' }
  const view = buildTestDynamicsGroups([verified, rejected], 'ru')
  assert.equal(view.groups.length, 1)
  assert.equal(view.groups[0].count, 2, 'the original raw records remain visible')
  assert.equal(view.groups[0].unverifiedCount, 1, 'the rejected record is explicitly marked')
  assert.equal(view.groups[0].scales[0].delta, null, 'invalid source must not establish a trend')
  assert.equal(buildTestDynamicsGroups([verified], 'en').groups[0].unverifiedCount, 0)
  const page = readFileSync(new URL('../components/app/test-dynamics.jsx', import.meta.url), 'utf8')
  assert.match(page, /data-dynamics-unverified-history/)
  assert.match(page, /не считаются подтверждёнными психологическими измерениями/)
})

test('Results dynamics reuses the exact authored subscale intervals from full reports', () => {
  const definition = getAssessmentDefinition('hh-money-pressure','v2','ru')
  const answers = Object.fromEntries(definition.questions.map((q,i) =>
    [q.id, i===0 ? 3 : i===1 ? 2 : i===2 ? 1 : 2]))
  const result = scoreAssessment(definition,answers)
  for (const dimension of result.dimensions) {
    const active = visibleTestDynamicsBand(dimension,result,'ru')
    assert.equal(active.kind,'answers')
    assert.equal(active.current.code,'hh-score-cluster-3')
    assert.deepEqual([active.current.from,active.current.to],[1.67,2.33])
    assert.equal(active.others.length,4)
    assert.equal(active.others[0].displayRange,'0–0,33')
    assert.match(active.current.note,/среднему ответу/)
    assert.match(active.caveat,/не медицинские нормы/)
  }
})
