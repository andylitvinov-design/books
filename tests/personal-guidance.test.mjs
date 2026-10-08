import assert from 'node:assert/strict'
import test from 'node:test'
import { interpretConcern, assessmentHistoryGroups, nextPersonalRecommendation, resultChangeSummary } from '../lib/assessments/personal-guidance.js'

const result = (id, date, key = 'hh-current-state', value = 5) => ({
  id, definitionKey: key, definitionId: 'stable-definition', contentHash: 'stable-hash',
  measurementAt: date,
  dimensions: [{ key: 'resource', value, min: 0, max: 10, unit: 'points', sourceConstruct: 'Resource' }],
})

test('typed English, Russian and Spanish concerns map locally to relevant filters', () => {
  assert.deepEqual(interpretConcern('I am exhausted, cannot focus, and sleep badly').focus.sort(), ['attention', 'body', 'sleep'].sort())
  assert.ok(interpretConcern('Чувствую тревогу и одиночество').focus.includes('relationships'))
  assert.ok(interpretConcern('Estoy cansado y siento ansiedad').focus.includes('anxiety'))
  assert.deepEqual(interpretConcern(''), { focus: [], urgent: false })
  assert.equal(interpretConcern('I want to kill myself').urgent, true)
  assert.equal(interpretConcern('У меня мысли о самоубийстве').urgent, true)
})

test('history groups repeated tests and preserves separate attempts and draft', () => {
  const old = result('a', '2026-09-01T11:00:00Z', 'hh-current-state', 3)
  const latest = result('b', '2026-10-01T11:00:00Z', 'hh-current-state', 6)
  const groups = assessmentHistoryGroups([old, latest], [{ id:'draft-1', definitionKey:'hh-current-state', status:'in_progress', startedAt:'2026-10-07T09:00:00Z', progress:4 }])
  assert.equal(groups.length, 1)
  assert.equal(groups[0].count, 2)
  assert.equal(groups[0].latest.id, 'b')
  assert.equal(groups[0].prior.id, 'a')
  assert.equal(groups[0].draft.id, 'draft-1')
  assert.equal(groups[0].history.length, 2)
})

test('recommendation considers past dates and does not diagnose or conflate instruments', () => {
  assert.equal(nextPersonalRecommendation({ results: [], locale: 'en' }).kind, 'baseline')
  const last = result('b', '2026-09-01T11:00:00Z')
  const due = nextPersonalRecommendation({ results: [last], locale: 'en', now: Date.parse('2026-10-08T00:00:00Z') })
  assert.equal(due.kind, 'repeat')
  assert.equal(due.key, 'hh-current-state')
  const fresh = nextPersonalRecommendation({ results: [result('c', '2026-10-08T00:00:00Z')], locale: 'ru', now: Date.parse('2026-10-08T00:01:00Z') })
  assert.ok(['explore', 'review'].includes(fresh.kind))
})

test('compatible prior comparisons show raw differences only, not clinical inference', () => {
  const prior = result('a', '2026-09-01T11:00:00Z', 'hh-current-state', 3)
  const latest = result('b', '2026-10-01T11:00:00Z', 'hh-current-state', 6)
  const change = resultChangeSummary(latest, [prior, latest])
  assert.equal(change.previous.id, 'a')
  assert.deepEqual(change.changes.map(({ delta }) => delta), [3])
  assert.equal(resultChangeSummary(latest, [{ ...prior, contentHash: 'different' }, latest]).previous, null)
})

test('change summary never mixes different owners, instruments or translations', () => {
  const one = { ...result('old', '2026-09-01T00:00:00Z', 'hh-current-state', 2), accountId: 'account-A', instrumentLocale: 'en', scoringVersion: 'v1', resultVersion: 'v1' }
  const current = { ...result('new', '2026-10-01T00:00:00Z', 'hh-current-state', 8), accountId: 'account-A', instrumentLocale: 'en', scoringVersion: 'v1', resultVersion: 'v1' }
  assert.equal(resultChangeSummary(current, [one, current]).previous.id, 'old')
  assert.equal(resultChangeSummary(current, [{ ...one, accountId: 'account-B' }, current]).previous, null)
  assert.equal(resultChangeSummary(current, [{ ...one, instrumentLocale: 'ru' }, current]).previous, null)
  assert.equal(resultChangeSummary(current, [{ ...one, scoringVersion: 'v2' }, current]).previous, null)
  assert.equal(resultChangeSummary(current, [{ ...one, definitionId: 'another-instrument' }, current]).previous, null)
})
