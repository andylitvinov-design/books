import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TRAUMA_PHASE_OUTCOME_VERSION, phaseOutcomeContext, phaseScaleRole,
  phaseOrderScales, phaseRetestPrimaryState, phasePrimaryComparisonState,
} from '../lib/inner-growth/trauma-phase-outcomes.js'
import { ANTISTRESS_ROUTER_VERSION } from '../lib/inner-growth/antistress-module-router.js'
import { antistressRoleForScale, orderAntistressScales,
  antistressTestWindow } from '../lib/inner-growth/anti-stress-measurement-contract.js'
import { buildFinalCourseRetest } from '../lib/inner-growth/course-final-retest.js'

const VERSION = 'opora-trauma-1.3-20261015'
const FINDER = 'hh-module-finder', WEEKLY = 'hh-weekly-pulse'
const phase = id => phaseOutcomeContext(id, VERSION)
const finderRecord = (answers, overrides = {}) => ({
  definitionKey: FINDER, version: 'v1', locale: 'en', recallDays: 7,
  measuredAt: '2026-10-01T09:00:00.000Z', answers, ...overrides,
})
const followUpRecord = (answers, overrides = {}) => finderRecord(answers, {
  measuredAt: '2026-10-15T09:00:00.000Z', ...overrides,
})
const matrix = [
  ['AS1', FINDER, 'F2', ['F1']],
  ['AS2', WEEKLY, 'weekly.load', ['weekly.tension', 'weekly.recovery', 'weekly.clarity']],
  ['AS3', FINDER, 'F4', ['F3']],
  ['AS4', null, null, []],
  ['AS5', FINDER, 'F7', ['F8']],
  ['AS6', WEEKLY, 'weekly.functioning', ['weekly.connection', 'weekly.energy', 'weekly.recovery']],
]

test('all six phase contexts match the approved TRAUMA-1.3 section 10.2 matrix', () => {
  assert.equal(TRAUMA_PHASE_OUTCOME_VERSION, VERSION)
  assert.equal(ANTISTRESS_ROUTER_VERSION, VERSION)
  for (const [moduleId, testKey, scaleKey, secondary] of matrix) {
    const context = phase(moduleId)
    assert.deepEqual(context, {
      moduleId, routerVersion: VERSION,
      primaryMetric: testKey ? `${testKey}::${scaleKey}` : null,
      primaryTestKey: testKey, primaryScaleKey: scaleKey,
      secondaryMetrics: secondary.map(key => `${testKey}::${key}`),
      clinicalGated: moduleId === 'AS4',
    })
    assert.ok(Object.isFrozen(context))
    assert.ok(Object.isFrozen(context.secondaryMetrics))
    if (testKey) {
      assert.equal(phaseScaleRole(context, testKey, scaleKey), 'primary')
      for (const key of secondary) assert.equal(phaseScaleRole(context, testKey, key), 'secondary')
    }
  }
})

test('legacy, absent, future and malformed versions/modules produce no override', () => {
  for (const version of [undefined, null, '', 'opora-nav-1.0', 'opora-nav-2.0-20261014',
    'opora-trauma-1.4-20261016', `${VERSION} `]) {
    for (const [moduleId] of matrix) assert.equal(phaseOutcomeContext(moduleId, version), null)
  }
  for (const moduleId of [undefined, null, '', 'AS0', 'AS7', 'as1', 'AS1 ', '__proto__', 'constructor', {}]) {
    assert.equal(phaseOutcomeContext(moduleId, VERSION), null)
  }
  for (const context of [null, undefined, {}, {moduleId:'AS1'},
    {moduleId:'AS1', routerVersion:'opora-nav-2.0-20261014'}]) {
    assert.equal(phaseScaleRole(context, WEEKLY, 'weekly.load'), null)
    assert.equal(phaseOrderScales(context, WEEKLY, []), null)
    assert.equal(phaseRetestPrimaryState(context, {F2:5}, true), null)
    assert.equal(phasePrimaryComparisonState(context, finderRecord({F2:5}), followUpRecord({F2:6})), null)
  }
})

test('weekly.load is primary only in AS2; unrelated test roles retain their contract', () => {
  for (const [moduleId] of matrix) {
    assert.equal(phaseScaleRole(phase(moduleId), WEEKLY, 'weekly.load'),
      moduleId === 'AS2' ? 'primary' : 'supplementary')
  }
  assert.equal(phaseScaleRole(phase('AS2'), WEEKLY, 'weekly.functioning'), 'supplementary')
  assert.equal(phaseScaleRole(phase('AS6'), WEEKLY, 'weekly.clarity'), 'supplementary')
  for (const [testKey, scaleKey, role] of [
    ['gad-7', 'symptoms.gad7.total', 'anxiety_screening'],
    ['hh-resource-pulse', 'resource.self_support', 'optional'],
  ]) {
    assert.equal(phaseScaleRole(phase('AS1'), testKey, scaleKey), null)
    assert.equal(phaseScaleRole(phase('AS1'), testKey, scaleKey) ?? antistressRoleForScale(testKey, scaleKey), role)
  }
  for (const [testKey, scaleKey] of [[WEEKLY,'F2'], [FINDER,'weekly.load'],
    [WEEKLY,'weekly.unknown'], ['constructor','F2'], [null,'F2']]) {
    assert.equal(phaseScaleRole(phase('AS1'), testKey, scaleKey), null)
  }
})

test('ordering is primary then exact source supports, without changing row values or missing rows', () => {
  for (const [moduleId, testKey, primaryKey, secondaryKeys] of matrix.filter(row => row[1])) {
    const other = Object.freeze({key:'unrelated', value:null, direction:'unchanged', timeframe:'as-recorded'})
    const expectedKeys = [primaryKey, ...secondaryKeys]
    const rows = Object.freeze([other, ...expectedKeys.toReversed().map((key, index) =>
      Object.freeze({key, value:index, min:0, max:10,
        direction:key === 'weekly.load' || key === 'weekly.tension' ? 'lower' : 'higher',
        timeframe:'past-7-days'}))])
    const original = structuredClone(rows)
    const ordered = phaseOrderScales(phase(moduleId), testKey, rows)
    assert.deepEqual(ordered.map(row => row.key), [...expectedKeys, 'unrelated'])
    assert.deepEqual(rows, original)
    assert.notEqual(ordered, rows)
    for (const row of ordered) assert.ok(rows.includes(row), 'Only reorder the original row references')
    assert.deepEqual(phaseOrderScales(phase(moduleId), testKey, [other]), [other])
  }
})

test('metric-ID rows are ordered only within their own test and duplicate ranks stay stable', () => {
  const rows = Object.freeze([
    {id:`${WEEKLY}::weekly.load`, value:8},
    {id:`${FINDER}::weekly.functioning`, value:7},
    {id:`${WEEKLY}::weekly.energy`, value:4},
    {id:`${WEEKLY}::weekly.functioning`, value:1},
    {id:`${WEEKLY}::weekly.functioning`, value:2},
  ].map(Object.freeze))
  assert.deepEqual(phaseOrderScales(phase('AS6'), WEEKLY, rows), [rows[3],rows[4],rows[2],rows[0],rows[1]])
  assert.deepEqual(phaseOrderScales(phase('AS1'), WEEKLY, rows), rows)
  assert.deepEqual(phaseOrderScales(phase('AS1'), 'gad-7', rows), rows)
  assert.deepEqual(phaseOrderScales(phase('AS6'), WEEKLY, null), [])
})

test('unversioned fallback preserves legacy ordering, roles, and recall-window contracts', () => {
  const rows = [{key:'weekly.functioning',value:4,direction:'higher'},
    {key:'weekly.load',value:7,direction:'lower'}]
  const legacy = phaseOutcomeContext('AS6', 'opora-nav-2.0-20261014')
  assert.deepEqual(phaseOrderScales(legacy,WEEKLY,rows) ?? orderAntistressScales(WEEKLY,rows), [rows[1],rows[0]])
  assert.equal(phaseScaleRole(legacy,WEEKLY,'weekly.load') ?? antistressRoleForScale(WEEKLY,'weekly.load'), 'primary')
  assert.equal(antistressTestWindow(WEEKLY), 'past-7-days')
  assert.equal(antistressTestWindow('gad-7'), 'past-2-weeks')
  assert.equal(antistressTestWindow('hh-resource-pulse'), 'right-now')
})

test('F-primary retest requires its own primary answer, including zero, or an explicit skip', () => {
  for (const [moduleId, testKey, key, secondary] of matrix.filter(row => row[1] === FINDER)) {
    const context = phase(moduleId)
    for (const answer of [0, 1, 10]) {
      assert.deepEqual(phaseRetestPrimaryState(context, {[key]:answer}), {
        primaryMetric:`${testKey}::${key}`, primaryScaleKey:key,
        required:true, answered:true, skipped:false, canSubmit:true,
      })
    }
    const optionalAnswers = Object.freeze({[secondary[0]]:7})
    assert.equal(phaseRetestPrimaryState(context, optionalAnswers).canSubmit, false)
    assert.deepEqual(phaseRetestPrimaryState(context, optionalAnswers, true), {
      primaryMetric:`${testKey}::${key}`, primaryScaleKey:key,
      required:true, answered:false, skipped:true, canSubmit:true,
    })
    assert.deepEqual(optionalAnswers, {[secondary[0]]:7})
    assert.equal(phaseRetestPrimaryState(context, {}, true).canSubmit, true)
  }
})

test('blank, invalid, inherited and coerced primary answers are missing; only boolean true confirms skip', () => {
  const context = phase('AS1')
  for (const value of [undefined, null, '', '0', '5', false, true, NaN, Infinity, -1, 11, 2.5, {}, []]) {
    const state = phaseRetestPrimaryState(context, {F2:value})
    assert.equal(state.answered, false)
    assert.equal(state.canSubmit, false)
    assert.equal(state.skipped, false)
  }
  for (const answers of [undefined, null, [], Object.assign([], {F2:5}), Object.create({F2:5})]) {
    assert.equal(phaseRetestPrimaryState(context, answers).canSubmit, false)
  }
  for (const skip of ['true', 1, false, {}, []]) assert.equal(phaseRetestPrimaryState(context, {F1:4}, skip).canSubmit, false)
  const raw = Object.freeze({F2:6})
  assert.equal(phaseRetestPrimaryState(context, raw, true).answered, false)
  assert.equal(phaseRetestPrimaryState(context, raw, true).skipped, true)
  assert.deepEqual(raw, {F2:6})
})

test('weekly phases do not acquire an F-exit requirement and AS4 cannot submit a self-guided exit', () => {
  for (const moduleId of ['AS2', 'AS6']) {
    const state = phaseRetestPrimaryState(phase(moduleId), {}, true)
    assert.equal(state.required, false)
    assert.equal(state.canSubmit, true)
    assert.equal(state.answered, false)
    assert.equal(state.skipped, false)
    assert.equal(phasePrimaryComparisonState(phase(moduleId), finderRecord({F2:1}), followUpRecord({F2:2})), null)
  }
  const clinical = phaseRetestPrimaryState(phase('AS4'), {F5:10,F6:10}, true)
  assert.equal(clinical.primaryMetric, null)
  assert.equal(clinical.canSubmit, false)
  assert.equal(phaseScaleRole(phase('AS4'), FINDER, 'F6'), 'supplementary')
  assert.equal(phasePrimaryComparisonState(phase('AS4'), finderRecord({F6:1}), followUpRecord({F6:2})), null)
})

test('F-primary paired comparisons preserve actual zero, unchanged and worsening values without interpreting them', () => {
  for (const [moduleId, , key] of matrix.filter(row => row[1] === FINDER)) {
    for (const [before, after] of [[0,1], [0,0], [7,7], [9,2]]) {
      const baseline = Object.freeze(finderRecord(Object.freeze({[key]:before})))
      const followUp = Object.freeze(followUpRecord(Object.freeze({[key]:after})))
      const original = structuredClone({baseline,followUp})
      assert.deepEqual(phasePrimaryComparisonState(phase(moduleId),baseline,followUp), {
        primaryMetric:`${FINDER}::${key}`,primaryScaleKey:key,
        comparable:true,reason:null,before,after,delta:after-before,
      })
      assert.deepEqual({baseline,followUp},original)
    }
  }
})

test('missing or skipped primary remains non-comparable even when optional answers or follow-up primary exist', () => {
  const context = phase('AS1')
  const cases = [
    [finderRecord({F2:2}), null, 'no_follow_up'],
    [null, followUpRecord({F2:3}), 'missing_primary'],
    [finderRecord({F1:2}), followUpRecord({F2:3}), 'missing_primary'],
    [finderRecord({F2:2}), followUpRecord({F1:3}), 'missing_primary'],
    [finderRecord({F1:2}), followUpRecord({F1:3}), 'missing_primary'],
    [finderRecord({F2:null}), followUpRecord({F2:3}), 'missing_primary'],
    [finderRecord({F2:2},{primarySkipped:true}), followUpRecord({F2:3}), 'explicit_skip'],
    [finderRecord({F2:2}), followUpRecord({F2:3},{primarySkipped:true}), 'explicit_skip'],
  ]
  for (const [before,after,reason] of cases) {
    assert.deepEqual(phasePrimaryComparisonState(context,before,after), {
      primaryMetric:`${FINDER}::F2`,primaryScaleKey:'F2',comparable:false,reason,
    })
  }
})

test('comparison requires actual matching provenance, supported language and the unchanged seven-day minimum', () => {
  const context = phase('AS1'), before = finderRecord({F2:2})
  const invalid = [
    {definitionKey:WEEKLY}, {version:'v2'}, {version:null}, {recallDays:14}, {recallDays:'7'},
    {locale:'ru'}, {locale:'unknown'}, {locale:undefined}, {locale:'es'},
    {measuredAt:undefined}, {measuredAt:'not-a-date'}, {measuredAt:'0'},
    {measuredAt:'2026-02-30T09:00:00.000Z'}, {measuredAt:'2026-10-15'},
    {measuredAt:'2026-10-15T09:00:00'}, {measuredAt:'2026-09-30T09:00:00.000Z'},
    {measuredAt:before.measuredAt}, {measuredAt:'2026-10-08T08:59:59.999Z'},
    {translationVersion:'new'}, {contentHash:'new'}, {timeframe:'right-now'},
  ]
  for (const overrides of invalid) {
    assert.equal(phasePrimaryComparisonState(context,before,followUpRecord({F2:3},overrides)).reason,
      'incompatible_provenance', JSON.stringify(overrides))
  }
  for (const overrides of [{definitionKey:null},{version:null},{recallDays:null},
    {locale:'unknown'},{locale:null},{measuredAt:null}]) {
    assert.equal(phasePrimaryComparisonState(context,finderRecord({F2:2},overrides),followUpRecord({F2:3})).reason,
      'incompatible_provenance')
  }
  assert.equal(phasePrimaryComparisonState(context,before,
    followUpRecord({F2:3},{measuredAt:'2026-10-08T09:00:00.000Z'})).comparable,true)
  assert.equal(phasePrimaryComparisonState(context,before,
    followUpRecord({F2:3},{measuredAt:'2026-10-08T11:00:00+02:00'})).comparable,true)
  assert.equal(phasePrimaryComparisonState(context,
    finderRecord({F2:2},{locale:'ru'}), followUpRecord({F2:3},{locale:'ru'})).comparable,true)
  assert.equal(phasePrimaryComparisonState(context,
    finderRecord({F2:2},{locale:'unknown'}), followUpRecord({F2:3},{locale:'unknown'})).comparable,false)
})

test('copied context fields cannot replace the versioned primary or bypass the clinical gate', () => {
  const altered = {...phase('AS1'),primaryMetric:`${WEEKLY}::weekly.load`,primaryScaleKey:'F1'}
  assert.equal(phaseScaleRole(altered,WEEKLY,'weekly.load'),'supplementary')
  assert.equal(phaseRetestPrimaryState(altered,{F1:5}).canSubmit,false)
  assert.equal(phaseRetestPrimaryState({...phase('AS4'),clinicalGated:false},{F6:5},true).canSubmit,false)
})

// Synthetic pure-function fixtures. No account, DB, assessment registration or
// browser result is read or written by these final-report integration tests.
const weeklyKeys = ['weekly.load', 'weekly.tension', 'weekly.recovery', 'weekly.mood',
  'weekly.energy', 'weekly.clarity', 'weekly.connection', 'weekly.functioning']
const weeklyResult = (followUp = false, keys = weeklyKeys) => ({
  id: followUp ? 'follow-weekly' : 'baseline-weekly',
  definitionKey: WEEKLY, definitionVersion: 'v1', instrumentLocale: 'en',
  translationVersion: 'synthetic-en-v1', contentHash: 'synthetic-weekly-content',
  timeframe: 'past-7-days', scoringKey: 'synthetic-weekly', scoringVersion: 'v1', resultVersion: 'v1',
  measurementAt: followUp ? '2026-10-15T11:00:00.000Z' : '2026-10-01T09:00:00.000Z',
  dimensions: keys.map(key => ({
    key, value: key === 'weekly.load' ? (followUp ? 7 : 8) : (followUp ? 4 : 3),
    min: 0, max: 10,
    direction: ['weekly.load','weekly.tension'].includes(key) ? 'lower' : 'higher',
  })),
})
const retestFixture = (keys = weeklyKeys) => ({
  testKeys: [WEEKLY], primaryTestKey: WEEKLY, antiStress: true,
  startedAt: '2026-10-01T10:00:00.000Z', completedAt: '2026-10-15T10:00:00.000Z',
  now: '2026-10-15T12:00:00.000Z',
  metadata: [{key:WEEKLY,title:'Weekly Pulse',version:'v1',locale:'en',
    startable:true,rightsStatus:'cleared',suggestedRepeatDays:7}],
  results: [weeklyResult(false,keys),weeklyResult(true,keys)],
})

test('final report integrates pinned AS6 functioning primary before its supports and keeps load supporting', () => {
  const input = retestFixture(), original = structuredClone(input)
  const plan = buildFinalCourseRetest({...input,phaseContext:phase('AS6')})
  const weekly = plan.tests[0]
  assert.equal(weekly.role,'primary_outcome')
  assert.equal(weekly.comparison.length,8)
  assert.deepEqual(weekly.comparison.slice(0,4).map(row => row.key), [
    'weekly.functioning','weekly.connection','weekly.energy','weekly.recovery',
  ])
  assert.deepEqual(weekly.comparison[0], {
    key:'weekly.functioning',from:3,to:4,delta:1,min:0,max:10,direction:'higher',
    label:'Daily functioning',measureRole:'primary',
  })
  assert.equal(weekly.comparison.find(row => row.key === 'weekly.load').measureRole,'supplementary')
  assert.equal(weekly.timeframe,'past-7-days')
  assert.equal(weekly.hardMinimumDays,7)
  assert.deepEqual(input,original)
})

test('final report never labels a weekly questionnaire or dimension primary for F-primary phases', () => {
  for (const moduleId of ['AS1','AS3','AS5']) {
    // Even a legacy caller-supplied weekly primary must yield to the pinned
    // stored phase's actual F-primary contract.
    const plan = buildFinalCourseRetest({...retestFixture(),phaseContext:phase(moduleId)})
    const weekly = plan.tests[0]
    assert.equal(weekly.role,'supplementary',moduleId)
    assert.ok(weekly.comparison.every(row => row.measureRole === 'supplementary'),moduleId)
    assert.equal(weekly.comparison.find(row => row.key === 'weekly.load').from,8)
    assert.equal(weekly.comparison.find(row => row.key === 'weekly.load').to,7)
  }
})

test('final report AS2 uses its exact source secondary scales and AS4 has no public primary', () => {
  const as2 = buildFinalCourseRetest({...retestFixture(),phaseContext:phase('AS2')}).tests[0]
  assert.equal(as2.role,'primary_outcome')
  assert.deepEqual(as2.comparison.slice(0,4).map(row => [row.key,row.measureRole]), [
    ['weekly.load','primary'],['weekly.tension','secondary'],
    ['weekly.recovery','secondary'],['weekly.clarity','secondary'],
  ])
  assert.equal(as2.comparison.find(row => row.key === 'weekly.functioning').measureRole,'supplementary')
  const as4 = buildFinalCourseRetest({...retestFixture(),phaseContext:phase('AS4')}).tests[0]
  assert.equal(as4.role,'supplementary')
  assert.ok(as4.comparison.every(row => row.measureRole !== 'primary'))
})

test('legacy final-report serialized output remains unchanged when phase context is absent or not applicable', () => {
  const input = retestFixture(['weekly.functioning','weekly.load'])
  // Full expected pre-phase output, including legacy dimension order/roles,
  // exact dates and original units. This does not snapshot the new helper.
  const expected = {
    ready:true,
    tests:[{
      key:WEEKLY,title:'Weekly Pulse',definitionVersion:'v1',instrumentLocale:'en',
      baselineResultId:'baseline-weekly',baselineDate:'2026-10-01T09:00:00.000Z',
      afterResultId:'follow-weekly',afterDate:'2026-10-15T11:00:00.000Z',
      completed:true,canRepeat:false,role:'primary_outcome',
      repeatSuggestedLater:false,suggestedRepeatDays:7,nextSuggestedAt:'2026-10-08T09:00:00.000Z',
      hardMinimumDays:7,hardDueAt:'2026-10-08T09:00:00.000Z',hardBlocked:false,
      versionChanged:false,timeframe:'past-7-days',
      comparison:[
        {key:'weekly.load',from:8,to:7,delta:-1,min:0,max:10,direction:'lower',
          label:'Stress and overload',measureRole:'primary'},
        {key:'weekly.functioning',from:3,to:4,delta:1,min:0,max:10,direction:'higher',
          label:'Daily functioning',measureRole:'secondary'},
      ],
    }],
    completedCount:1,totalCount:1,fullyRetested:true,
  }
  const serialized = JSON.stringify(expected)
  assert.equal(JSON.stringify(buildFinalCourseRetest(input)),serialized)
  for (const phaseContext of [null, phaseOutcomeContext('AS6','opora-nav-2.0-20261014'),
    phaseOutcomeContext('AS6',undefined),phaseOutcomeContext('AS6','future-version')]) {
    assert.equal(JSON.stringify(buildFinalCourseRetest({...input,phaseContext})),serialized)
  }
})
