import test from 'node:test'
import assert from 'node:assert/strict'
import {CURRENT_STATE_V1} from '../data/assessments/current-state-v1.js'
import {MINI_IPIP_20_EN_V1} from '../data/assessments/mini-ipip-20-en-v1.js'
import {getAssessmentDefinition, validateAnswers} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {createAssessmentRun, saveRunAnswers, submitRun} from '../lib/assessments/run-lifecycle.js'
import {compareResults, createProfileSnapshot} from '../lib/profile/history.js'

test('R1 definitions freeze the stated source, locale, scale and question identities', () => {
  assert.equal(CURRENT_STATE_V1.key, 'hh-current-state')
  assert.equal(CURRENT_STATE_V1.version, 'v1')
  assert.equal(CURRENT_STATE_V1.instrumentLocale, 'en-ru')
  assert.deepEqual(CURRENT_STATE_V1.questions.map(question => question.id), [
    'state.problem_intensity', 'state.resource', 'state.tension', 'state.fatigue', 'state.life_impact'
  ])
  assert.equal(MINI_IPIP_20_EN_V1.key, 'mini-ipip-20')
  assert.equal(MINI_IPIP_20_EN_V1.version, 'v1')
  assert.equal(MINI_IPIP_20_EN_V1.instrumentLocale, 'en')
  assert.equal(MINI_IPIP_20_EN_V1.questions.length, 20)
  assert.equal(new Set(MINI_IPIP_20_EN_V1.questions.map(question => question.id)).size, 20)
  assert.equal(MINI_IPIP_20_EN_V1.source.permission, 'public-domain')
  assert.equal(MINI_IPIP_20_EN_V1.source.contentHash, 'sha256:a9451a4356aaf8a7b83cb8d7e23807dfc7c7915dd91b49221c9ced6ba551eea9')
  assert.equal(getAssessmentDefinition('mini-ipip-20', 'v1'), MINI_IPIP_20_EN_V1)
})

test('Current State keeps raw 0–10 values and rejects missing, fractional and out-of-range answers', () => {
  const answers = {
    'state.problem_intensity': 7,
    'state.resource': 3,
    'state.tension': 6,
    'state.fatigue': 4,
    'state.life_impact': 8
  }
  assert.deepEqual(validateAnswers(CURRENT_STATE_V1, answers), answers)
  assert.throws(() => validateAnswers(CURRENT_STATE_V1, {...answers, 'state.tension': 5.5}), /integer/i)
  assert.throws(() => validateAnswers(CURRENT_STATE_V1, {...answers, 'state.resource': 11}), /range/i)
  assert.throws(() => validateAnswers(CURRENT_STATE_V1, {'state.resource': 3}), /required/i)
  const result = scoreAssessment(CURRENT_STATE_V1, answers)
  assert.deepEqual(result.dimensions.map(dimension => [dimension.key, dimension.value, dimension.min, dimension.max]), [
    ['state.problem_intensity', 7, 0, 10],
    ['state.resource', 3, 0, 10],
    ['state.tension', 6, 0, 10],
    ['state.fatigue', 4, 0, 10],
    ['state.life_impact', 8, 0, 10]
  ])
  assert.equal(result.total, undefined)
})

test('Mini-IPIP preserves original 1–5 scoring and reverse keys across all five factors', () => {
  const answers = Object.fromEntries(MINI_IPIP_20_EN_V1.questions.map(question => [question.id, question.keyed === '+' ? 5 : 1]))
  const result = scoreAssessment(MINI_IPIP_20_EN_V1, answers)
  assert.deepEqual(Object.fromEntries(result.dimensions.map(dimension => [dimension.key, dimension.value])), {
    extraversion: 20,
    agreeableness: 20,
    conscientiousness: 20,
    neuroticism: 20,
    intellect_imagination: 20
  })
  const midpoint = Object.fromEntries(MINI_IPIP_20_EN_V1.questions.map(question => [question.id, 3]))
  assert.deepEqual(Object.fromEntries(scoreAssessment(MINI_IPIP_20_EN_V1, midpoint).dimensions.map(dimension => [dimension.key, dimension.value])), {
    extraversion: 12,
    agreeableness: 12,
    conscientiousness: 12,
    neuroticism: 12,
    intellect_imagination: 12
  })
  assert.throws(() => validateAnswers(MINI_IPIP_20_EN_V1, {...midpoint, 'mini-ipip-20.en.01': 0}), /range/i)
})

test('run lifecycle uses revision conflicts and freezes the exact submitted answer revision', () => {
  const accountId = '00000000-0000-4000-8000-000000000001'
  const run = createAssessmentRun({id: '00000000-0000-4000-8000-000000000010', accountId, definition: CURRENT_STATE_V1, now: '2026-10-02T12:00:00.000Z'})
  const saved = saveRunAnswers(run, {'state.problem_intensity': 4}, {expectedRevision: 0, now: '2026-10-02T12:01:00.000Z'})
  assert.equal(saved.revision, 1)
  assert.throws(() => saveRunAnswers(saved, {'state.resource': 2}, {expectedRevision: 0}), /stale/i)
  const complete = saveRunAnswers(saved, {
    'state.problem_intensity': 4,
    'state.resource': 2,
    'state.tension': 3,
    'state.fatigue': 5,
    'state.life_impact': 6
  }, {expectedRevision: 1, now: '2026-10-02T12:02:00.000Z'})
  const submitted = submitRun(complete, {expectedRevision: 2, now: '2026-10-02T12:03:00.000Z'})
  assert.equal(submitted.status, 'submitted')
  assert.equal(submitted.submittedRevision, 2)
  assert.throws(() => saveRunAnswers(submitted, complete.answers, {expectedRevision: 2}), /submitted|immutable/i)
})

test('run lifecycle validates draft keys and ranges but only requires completeness on submit', () => {
  const run = createAssessmentRun({id: '00000000-0000-4000-8000-000000000011', accountId: '00000000-0000-4000-8000-000000000001', definition: CURRENT_STATE_V1, now: '2026-10-02T12:00:00.000Z'})
  assert.throws(() => saveRunAnswers(run, {'state.resource': 12}, {expectedRevision: 0}), /range/i)
  assert.throws(() => saveRunAnswers(run, {'unexpected.answer': 2}, {expectedRevision: 0}), /unknown/i)
  const draft = saveRunAnswers(run, {'state.resource': 2}, {expectedRevision: 0})
  assert.throws(() => submitRun(draft, {expectedRevision: 1}), /required/i)
})

test('history compares only compatible measurements and preserves source dates in a snapshot', () => {
  const baseline = {id: 'result-1', accountId: 'account-a', definitionKey: 'hh-current-state', definitionVersion: 'v1', instrumentLocale: 'en-ru', measurementAt: '2026-10-01T10:00:00.000Z', dimensions: [{key: 'state.tension', value: 7, min: 0, max: 10, timeframe: 'right-now'}]}
  const latest = {...baseline, id: 'result-2', measurementAt: '2026-10-08T10:00:00.000Z', dimensions: [{...baseline.dimensions[0], value: 4}]}
  assert.deepEqual(compareResults(latest, baseline), [{key: 'state.tension', current: 4, prior: 7, delta: -3, unit: 'points'}])
  assert.throws(() => compareResults({...latest, instrumentLocale: 'ru'}, baseline), /compatible/i)
  const snapshot = createProfileSnapshot({id: 'snapshot-1', accountId: 'account-a', generatedResult: latest, carriedResults: [{...baseline, definitionKey: 'mini-ipip-20'}], createdAt: '2026-10-08T10:01:00.000Z'})
  assert.equal(snapshot.dimensions.find(dimension => dimension.key === 'state.tension').measurementAt, latest.measurementAt)
  assert.equal(snapshot.dimensions.find(dimension => dimension.sourceResultId === baseline.id).measurementAt, baseline.measurementAt)
})
