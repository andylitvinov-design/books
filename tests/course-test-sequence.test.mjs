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
  assert.match(course, /data-course-testing-complete/)
  assert.match(course, /profile\.scales/)
  assert.match(account, /data-course-test-group/)
})
