import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import {
  courseTestKeys, coursePendingKeys, isCourseTest, groupCourseTestRows,
  startOrResumeCourseTest,
} from '../lib/app/course-test-flow.js'

const selection = {
  course: { stage: 2, testKeys: ['hh-resource', 'hh-weekly-pulse', 'phq-4'] },
  assessments: { selectedTests: [
    { key: 'hh-weekly-pulse', completed: false },
    { key: 'hh-resource', completed: true },
    { key: 'phq-4', completed: false },
  ] },
}

test('course progression follows confirmed test order and excludes already completed reports', () => {
  assert.deepEqual(coursePendingKeys(selection), ['hh-weekly-pulse', 'phq-4'])
  assert.equal(isCourseTest(selection, 'phq-4'), true)
  assert.equal(isCourseTest(selection, 'unselected'), false)
  assert.deepEqual(coursePendingKeys({ ...selection, course: { ...selection.course, stage: 3 } }), [])
  assert.deepEqual(courseTestKeys({ ...selection, course: { ...selection.course, stage: 3 } }),
    selection.course.testKeys)
})

test('course tests appear before other tests without deleting or changing their original order', () => {
  const rows = ['phq-4', 'unrelated', 'hh-resource', 'hh-weekly-pulse'].map(key => ({ key }))
  const groups = groupCourseTestRows(rows, selection)
  assert.deepEqual(groups.course.map(row => row.key), ['hh-resource', 'hh-weekly-pulse', 'phq-4'])
  assert.deepEqual(groups.other.map(row => row.key), ['unrelated'])
  assert.deepEqual(rows.map(row => row.key), ['phq-4', 'unrelated', 'hh-resource', 'hh-weekly-pulse'])
})

test('reopens the draft for the selected instrument instead of creating duplicate runs', async () => {
  const def = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')
  const draft = { id: 'draft-123', definitionId: def.id, status: 'in_progress' }
  const called = []
  const run = await startOrResumeCourseTest({
    courseState: selection, key: def.key, locale: 'en',
    request: async (path) => {
      called.push(path)
      if (path === 'bootstrap') return { activeTestPlan: { definitionIds: [def.id] }, runs: [draft] }
      throw new Error('DUPLICATE_RUN')
    },
  })
  assert.equal(run.id, draft.id)
  assert.deepEqual(called, ['bootstrap'])
})

test('only confirmed course tests can start, and a missing draft creates just one run', async () => {
  await assert.rejects(startOrResumeCourseTest({
    courseState: selection, key: 'not-in-course', request: async () => ({}),
  }), /COURSE_TEST_SELECTION_REQUIRED/)

  const definition = getAssessmentDefinition('phq-4', 'v1', 'en')
  const calls = []
  const newRun = await startOrResumeCourseTest({
    courseState: selection, key: definition.key, locale: 'en',
    request: async (path, body) => {
      calls.push([path, body])
      if (path === 'bootstrap') return { activeTestPlan: { definitionIds: [definition.id] }, runs: [] }
      if (path === 'runs') return { id: 'new-course-run' }
      throw new Error('UNEXPECTED_CALL')
    },
  })
  assert.equal(newRun.id, 'new-course-run')
  assert.deepEqual(calls.map(x => x[0]), ['bootstrap', 'runs'])
  assert.equal(calls[1][1].definitionKey, definition.key)
  assert.equal(calls[1][1].definitionVersion, definition.version)
  assert.match(calls[1][1].operationId, /^[a-f0-9-]{36}$/)
})

test('course finish overrides ordinary report buttons and ordinary account battery navigation', () => {
  const runner = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const finish = readFileSync(new URL('../components/app/test-finish-actions.jsx', import.meta.url), 'utf8')
  const course = readFileSync(new URL('../components/app/course-r3-steps.jsx', import.meta.url), 'utf8')
  const account = readFileSync(new URL('../components/app/account-test-battery.jsx', import.meta.url), 'utf8')
  assert.match(runner, /searchParams\.get\('course'\) === '1'/)
  assert.match(runner, /coursePendingKeys\(courseState\)/)
  assert.match(runner, /startOrResumeCourseTest/)
  assert.match(finish, /courseMode/)
  const completion = readFileSync(new URL('../components/app/course-completion-review.jsx', import.meta.url), 'utf8')
  assert.match(course, /<CourseCompletionReview/)
  assert.match(completion, /data-course-testing-complete/)
  assert.match(completion, /profile\.scales/)
  assert.match(account, /data-course-test-group/)
})

test('unfinished My Course makes the next test burgundy and test-list edits secondary', () => {
  const ui = readFileSync(new URL('../components/app/course-r3-steps.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../components/app/course-r3-steps.module.css', import.meta.url), 'utf8')
  assert.match(ui, /className=\{'hh-primary '\+styles\.ctaLink\}/)
  assert.match(ui, /confirmed \? styles\.editSelection : 'hh-primary '\+styles\.cta/)
  assert.match(ui, /\{pending\.length===0&&baselineConfirmed&&<button type="button"/)
  assert.match(css, /\.progress > button\.ctaLink \{[\s\S]*?background: #a53f34;[\s\S]*?color: #fff;/)
  assert.match(css, /\.selectionActions > button\.editSelection \{[\s\S]*?background: #fffefa;/)
  assert.match(css, /@media \(max-width: 530px\) \{\s*\.progress > button\.ctaLink/)
})

function continuationFixture() {
  const workspace = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  const source = workspace.slice(workspace.indexOf('  async function continueCoursePlan('), workspace.indexOf('  async function completePlan('))
  const original = { accountId: 'owner-a', courseId: 'course-a', cycleId: null, page: 'runs', recordId: 'run-a', courseMode: '1' }
  const scope = { current: { ...original } }, lifetime = { current: { mounted: true, epoch: 1 } }
  const definition = getAssessmentDefinition('hh-weekly-pulse', 'v1', 'en')
  const snapshot = { account: { id: 'owner-a' }, activeTestPlan: { id: 'plan-a', status: 'active', definitionIds: ['completed-definition', definition.id] }, runs: [] }
  const result = { id: 'result-a', runId: 'run-a', definitionKey: 'hh-resource', definitionId: 'completed-definition' }
  const courseState = { ...selection, course: { ...selection.course, id: 'course-a' } }
  const respond = path => path.startsWith('course') ? courseState : path === 'bootstrap' ? snapshot : path === 'runs' ? { id: 'next-run' } : { revision: 3 }
  const calls = [], updates = [], navigations = []
  let responder = respond
  const fn = new Function('renderedRetestScope', 'renderedRetestEpoch', 'retestScope', 'retestLifetime', 'appFetch', 'router', 'setData', 'setState', 'locale', 'root', 'isCourseTest', 'coursePendingKeys', 'startOrResumeCourseTest', source + ';return continueCoursePlan')(
    original, 1, scope, lifetime, async (...args) => { calls.push(args); return responder(...args) },
    { push: value => navigations.push(value) }, value => updates.push(value), () => {}, 'en', '/en/app', isCourseTest, coursePendingKeys, startOrResumeCourseTest)
  return { fn, result, scope, lifetime, calls, updates, navigations, respond, setResponder(value) { responder = value } }
}
const flushContinuation = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }

test('ordinary course completion binds every ledger, run and refresh request to its original owner', async () => {
  const f = continuationFixture()
  await f.fn(f.result)
  assert.deepEqual(f.calls.map(call => call[0]), ['course?courseId=course-a', 'bootstrap', 'test-plans/plan-a', 'test-plans/plan-a/advance', 'bootstrap', 'runs', 'bootstrap'])
  assert.ok(f.calls.every(call => call[3].accountId === 'owner-a'))
  assert.equal(f.updates.length, 1)
  assert.equal(f.navigations[0], '/en/app/runs/next-run?mode=guided&course=1&courseId=course-a')
})

test('OPORA completes all three free starter check-ins in order using quick mode and skips saved ones', async () => {
  const starterKeys=['hh-weekly-pulse','gad-7','hh-resource-pulse']
  for (const next of ['gad-7','hh-resource-pulse',null]) {
    const f=continuationFixture()
    const completed=next==='gad-7' ? ['hh-weekly-pulse'] :
      next==='hh-resource-pulse' ? ['hh-weekly-pulse','gad-7'] : starterKeys
    const updated={
      ...f.respond('course?courseId=course-a'),
      course:{...selection.course,id:'course-a',stage:2,testKeys:starterKeys},
      assessments:{selectedTests:starterKeys.map(key=>({key,completed:completed.includes(key)}))},
    }
    f.setResponder(path=>path.startsWith('course')?updated:f.respond(path))
    await f.fn({...f.result,definitionKey:'hh-weekly-pulse'})
    const target=next ? '/en/app/runs/next-run?mode=quick&course=1&courseId=course-a'
      : '/en/app/course?tests=complete&courseId=course-a'
    assert.equal(f.navigations[0],target)
    assert.equal(f.calls.filter(call=>call[0]==='runs').length,Number(Boolean(next)),
      'no new run is created when all three already have saved results')
  }
})

test('ordinary course completion checks every await before continuing after owner, course, route or lifetime switches', async () => {
  for (let holdAt = 0; holdAt < 7; holdAt++) {
    for (const change of [{ accountId: 'owner-b' }, { courseId: 'course-b' }, { recordId: 'run-b' }, { page: 'tests' }, { courseMode: null }, { epoch: 2 }]) {
      const f = continuationFixture(); let resolve; const slow = new Promise(done => { resolve = done }); let at = 0
      f.setResponder(path => at++ === holdAt ? slow : f.respond(path))
      const pending = f.fn(f.result); await flushContinuation()
      assert.equal(f.calls.length, holdAt + 1)
      if (change.epoch) f.lifetime.current.epoch = change.epoch
      else Object.assign(f.scope.current, change)
      resolve(f.respond(f.calls.at(-1)[0])); await pending
      assert.equal(f.calls.length, holdAt + 1, 'stale completion cannot issue another request')
      assert.equal(f.updates.length, 0, 'stale completion cannot replace current-owner data')
      assert.equal(f.navigations.length, 0, 'stale completion cannot navigate')
    }
  }
})

test('wrong-owner bootstrap or mismatched selected course cannot advance a plan or start a run', async () => {
  for (const mismatch of ['owner', 'course']) {
    const f = continuationFixture()
    f.setResponder(path => mismatch === 'owner' && path === 'bootstrap' ? { account: { id: 'owner-b' } }
      : mismatch === 'course' && path.startsWith('course') ? { ...f.respond(path), course: { ...selection.course, id: 'course-b' } } : f.respond(path))
    if (mismatch === 'owner') await assert.rejects(f.fn(f.result), /COURSE_SELECTION_CHANGED/)
    else await f.fn(f.result)
    assert.ok(!f.calls.some(call => call[1]))
    assert.equal(f.updates.length, 0); assert.equal(f.navigations.length, 0)
  }
  const f = continuationFixture(); await f.fn({ ...f.result, runId: 'different-run' }); assert.equal(f.calls.length, 0)
})
