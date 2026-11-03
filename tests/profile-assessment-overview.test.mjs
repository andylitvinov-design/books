import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildProfileAssessmentView, isProfessionalProfileTest } from '../lib/profile/profile-assessment-view.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const state = getAssessmentDefinition('hh-current-state', 'v2', 'en')
const weekly = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')
const cbi = getAssessmentDefinition('cbi-personal', 'v1', 'en')
const id1 = '10000000-0000-4000-8000-000000000001'
const id2 = '10000000-0000-4000-8000-000000000002'
const cbiResultId = '10000000-0000-4000-8000-000000000007'
const cbiDimension = (value) => ({
  key: 'symptoms.cbi_personal.total',
  sourceConstruct: 'Copenhagen Burnout Inventory (CBI): Personal Burnout',
  value, min: 0, max: 100, unit: 'points', dimensionClass: 'symptoms',
})
const sample = {
  activeTestPlan: {
    id: '10000000-0000-4000-8000-000000000003',
    status: 'active', definitionIds: [state.id, weekly.id], completedRunIds: [id1],
  },
  results: [
    {
      id: '10000000-0000-4000-8000-000000000004', runId: id1,
      definitionId: state.id, definitionKey: state.key,
      measurementAt: '2026-10-08T11:00:00Z',
      dimensions: [{key: 'state.resource', value: 7, min: 0, max: 10}],
    },
    {
      id: '10000000-0000-4000-8000-000000000005', runId: id2,
      definitionId: weekly.id, definitionKey: weekly.key,
      measurementAt: '2026-10-04T12:00:00Z',
      dimensions: [{key: 'weekly.mood', value: 4, min: 0, max: 10}],
    },
    {
      id: cbiResultId, runId: '10000000-0000-4000-8000-000000000008',
      definitionId: cbi.id, definitionKey: cbi.key,
      measurementAt: '2026-10-11T18:00:00Z', dimensions: [cbiDimension(45.83)],
    },
  ],
  runs: [{
    id: '10000000-0000-4000-8000-000000000006',
    status: 'in_progress', definitionId: weekly.id,
    answers: { [weekly.questions[0].id]: 3 },
  }],
  // A historical snapshot may still include informal state measurements;
  // these must not leak into the professional result card section.
  snapshot: { dimensions: [
    {key: 'state.resource', sourceConstruct: 'Resource', value: 7, min: 0, max: 10, sourceDefinitionId: state.id},
    {key: 'weekly.mood', sourceConstruct: 'Mood', value: 4, min: 0, max: 10, sourceDefinitionId: weekly.id},
    {key: 'symptoms.cbi_personal.total', value: 99, min: 0, max: 100, sourceDefinitionId: cbi.id, sourceResultId: cbiResultId},
  ] },
}

test('Profile distinguishes professional test results from informal state checks', () => {
  assert.equal(isProfessionalProfileTest(sample.results[0]), false)
  assert.equal(isProfessionalProfileTest(sample.results[1]), false)
  assert.equal(isProfessionalProfileTest(sample.results[2]), true)
  const vm = buildProfileAssessmentView(sample, 'en')
  assert.equal(vm.measured.length, 1)
  assert.equal(vm.measured[0].value, 45.83)
  assert.equal(vm.measured[0].max, 100)
  assert.equal(vm.measured[0].sourceResultId, cbiResultId)
  assert.equal(vm.measured[0].testTitle.length > 10, true)
  assert.equal(vm.measured[0].date, '2026-10-11T18:00:00Z')
  assert.ok(Math.abs(vm.measured[0].ratio - 0.4583) < 0.00001)
  assert.ok(vm.measured.every((d) => d.value >= d.min && d.value <= d.max))
  assert.equal(vm.completedCount, 3, 'informal tests remain available in history')
})

test('the Profile uses the latest completed attempt for each professional test', () => {
  const earlier = { ...sample.results[2], id: '10000000-0000-4000-8000-000000000009',
    measurementAt: '2026-10-01T18:00:00Z', dimensions: [cbiDimension(82)] }
  const vm = buildProfileAssessmentView({ ...sample, results: [sample.results[0], sample.results[2], earlier] })
  assert.equal(vm.measured.length, 1)
  assert.equal(vm.measured[0].sourceResultId, cbiResultId)
  assert.equal(vm.measured[0].value, 45.83)
  assert.equal(buildProfileAssessmentView({
    ...sample, results: [sample.results[0], sample.results[1]],
  }).measured.length, 0)
})

test('missing or invalid values must not become made-up Profile measurements', () => {
  for (const value of [null, undefined, NaN, -1, 101]) {
    const vm = buildProfileAssessmentView({
      ...sample, results: [{ ...sample.results[2], dimensions: [cbiDimension(value)] }],
    })
    assert.deepEqual(vm.measured, [], 'invalid CBI value: ' + String(value))
  }
  assert.equal(isProfessionalProfileTest({ id: cbiResultId, definitionKey: 'unknown' }), false)
  assert.equal(isProfessionalProfileTest(null), false)
})

test('grey pending tests are based on the active selection, not old results', () => {
  const vm = buildProfileAssessmentView(sample, 'en')
  assert.equal(vm.selectedCount, 2)
  assert.equal(vm.completedInPlanCount, 1)
  assert.equal(vm.pending.length, 1)
  assert.equal(vm.pending[0].id, weekly.id)
  assert.ok(vm.pending[0].expectedScales.length >= 1)
  assert.equal(vm.pending[0].runId, sample.runs[0].id)
  assert.ok(vm.pending[0].progress > 0 && vm.pending[0].progress < 100)
  assert.deepEqual(buildProfileAssessmentView({
    ...sample, activeTestPlan: { ...sample.activeTestPlan, completedRunIds: [id1, id2] },
  }).pending, [])
})

test('cancelled selection does not reappear, but professional saved results remain', () => {
  const cancelled = { ...sample, activeTestPlan: null,
    latestTestPlan: { ...sample.activeTestPlan, status: 'cancelled' } }
  const vm = buildProfileAssessmentView(cancelled, 'en')
  assert.equal(vm.selectedCount, 0)
  assert.deepEqual(vm.pending, [])
  assert.equal(vm.measured.length, 1)
})

test('no test data means no fabricated professional scales', () => {
  const vm = buildProfileAssessmentView({results: [], runs: [], snapshot: null}, 'ru')
  assert.deepEqual(vm.measured, [])
  assert.deepEqual(vm.pending, [])
  assert.equal(vm.selectedCount, 0)
  assert.equal(vm.completedCount, 0)
})

test('Profile result cards open the exact private analysis and recommendations page', () => {
  const workspace = read('components/app/app-workspace.jsx')
  const overview = read('components/app/profile-assessment-overview.jsx')
  const report = read('components/app/client-report-actions.jsx')
  const battery = read('components/app/account-test-battery.jsx')
  const css = read('components/app/profile-assessment-overview.module.css')
  const head = overview.indexOf('data-profile-head')
  const measured = overview.indexOf('data-measured-scale')
  const grey = overview.indexOf('data-unfinished-test')
  const more = overview.indexOf('data-profile-extra-tools')
  const actions = overview.indexOf('data-profile-actions')
  assert.ok(head > 0 && measured > head && grey > measured && more > grey && actions > more)
  assert.match(workspace, /<ProfileAssessmentOverview data=\{data\} locale=\{locale\} onBeginTest=\{beginSelectedTest\} showPortrait=\{false\}>/)
  assert.match(overview, /buildPsychPortrait\(\(data.results \|\| \[\]\)\.filter\(isProfessionalProfileTest\)\)/)
  assert.match(overview, /href=\{\`\$\{root\}\/results\/\$\{encodeURIComponent\(row.sourceResultId\)\}\`\}/)
  assert.match(overview, /data-measured-scale aria-label=/)
  assert.match(overview, /c.openReport/)
  assert.match(overview, /<TestExplorerVisual compact locale=\{locale\}/)
  assert.match(overview, /greyBar/)
  assert.match(overview, /<ClientReportActions data=\{data\} locale=\{locale\} singleAction/)
  assert.match(overview, /source=test-results/)
  assert.match(overview, /tests\?filter=completed/)
  assert.match(overview, /tests\?filter=remaining/)
  assert.match(report, /generateClientPdf/)
  assert.match(workspace, /<PersonalResultReport result=\{result\} locale=\{locale\} previous=\{previous\} focusScaleKey=\{focusScaleKey\} \/>/)
  assert.match(workspace, /initialStatusFilter=\{searchParams\.get\('filter'\)\}/)
  assert.match(battery, /const completedRuns = new Set\(plan\?\.completedRunIds \|\| \[\]\)/)
  assert.match(battery, /statusFilter === 'remaining'/)
  assert.match(css, /\.openReport/)
  assert.doesNotMatch(overview, /localStorage|sessionStorage|analytics\.track/)
})
