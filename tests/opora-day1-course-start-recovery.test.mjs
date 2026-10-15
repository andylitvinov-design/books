import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { startCourseWithRecovery } from '../lib/inner-growth/course-start-recovery.js'

const serviceError = () => Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE', status: 503 })
const payload = Object.freeze({
  action: 'choose-goals', expectedRevision: 6, moduleId: 'AS5',
  consent: true, durationDays: 14, scaleKeys: ['hh-weekly-pulse::weekly.load'],
})
const success = {course: {stage: 4, revision: 7, moduleChoice: {id: 'AS5'}}}
const waiting = {course: {stage: 3, revision: 6}}

test('successful Day 1 consent has exactly one POST and no extra GET', async () => {
  const calls = []
  assert.equal(await startCourseWithRecovery(async body => {
    calls.push(body)
    return success
  }, payload), success)
  assert.deepEqual(calls, [payload])
})

test('if the HTTP response was lost after a commit, use the server-confirmed course without duplicate enrollment', async () => {
  const calls = []
  const result = await startCourseWithRecovery(async body => {
    calls.push(body)
    if (body) throw serviceError()
    return success
  }, payload)
  assert.equal(result.course.moduleChoice.id, 'AS5')
  assert.deepEqual(calls, [payload, undefined])
})

test('on a transient failed transaction, retry exactly once after a matching owner-scoped read', async () => {
  const calls = []
  const result = await startCourseWithRecovery(async body => {
    calls.push(body)
    if (calls.length === 1) throw serviceError()
    if (calls.length === 2) return waiting
    return success
  }, payload)
  assert.equal(result.course.stage, 4)
  assert.deepEqual(calls, [payload, undefined, payload])
})

test('a second failure remains visible after one final reconciliation, never a third POST', async () => {
  const calls = []
  await assert.rejects(startCourseWithRecovery(async body => {
    calls.push(body)
    if (!body) return waiting
    throw serviceError()
  }, payload), {code: 'SERVICE_UNAVAILABLE'})
  assert.deepEqual(calls, [payload, undefined, payload, undefined])
})

test('a lost response from the retry is recovered without a third POST', async () => {
  const calls = []
  const result = await startCourseWithRecovery(async body => {
    calls.push(body)
    if (!body) return calls.length === 2 ? waiting : success
    throw serviceError()
  }, payload)
  assert.equal(result.course.stage, 4)
  assert.deepEqual(calls, [payload, undefined, payload, undefined])
})

test('a final read must not claim another module has started', async () => {
  const calls = []
  await assert.rejects(startCourseWithRecovery(async body => {
    calls.push(body)
    if (!body) return calls.length === 2 ? waiting :
      {course:{stage:4,revision:7,moduleChoice:{id:'AS3'}}}
    throw serviceError()
  }, payload), {code:'COURSE_STATE_CHANGED'})
  assert.deepEqual(calls, [payload, undefined, payload, undefined])
})

test('do not retry if another tab has changed the course revision', async () => {
  let posts = 0
  await assert.rejects(startCourseWithRecovery(async body => {
    if (body) {posts++;throw serviceError()}
    return {course:{stage:3,revision:7}}
  }, payload), {code: 'COURSE_STATE_CHANGED'})
  assert.equal(posts, 1)
})

test('do not replace an already started different module', async () => {
  let posts = 0
  await assert.rejects(startCourseWithRecovery(async body => {
    if (body) {posts++;throw serviceError()}
    return {course:{stage:4,revision:7,moduleChoice:{id:'AS3'}}}
  }, payload), {code: 'COURSE_STATE_CHANGED'})
  assert.equal(posts, 1)
})

test('validation errors are not replayed as network failures', async () => {
  const errors = []
  await assert.rejects(startCourseWithRecovery(async body => {
    errors.push(body)
    throw Object.assign(new Error('COURSE_TESTS_REMAIN'),{code:'COURSE_TESTS_REMAIN',status:409})
  }, payload), {code:'COURSE_TESTS_REMAIN'})
  assert.equal(errors.length,1)
})

test('readback failure preserves the original error', async () => {
  const initial = serviceError()
  await assert.rejects(startCourseWithRecovery(async body => {
    if (body) throw initial
    throw new Error('temporary GET failure')
  }, payload), error => error === initial)
})

test('the UI clearly distinguishes saved test reports from an unconfirmed course start', () => {
  const base = readFileSync(new URL('../components/app/my-course.jsx',import.meta.url),'utf8')
  const step = readFileSync(new URL('../components/app/course-r3-steps.jsx',import.meta.url),'utf8')
  const route = readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
  assert.match(base,/previously completed tests remain saved in My Tests/)
  assert.match(base,/Ранее пройденные тесты остаются/)
  assert.doesNotMatch(base,/No personal information has been saved by this page/)
  assert.match(step,/startCourseWithRecovery\(body=>appFetch\('course',body\),payload\)/)
  assert.match(route,/HH_COURSE_START_UNEXPECTED/)
  assert.doesNotMatch(route,/console\.error\('HH_COURSE_START_UNEXPECTED', error\)/)
})

test('new Anti-Stress cycles keep default practice and tracking preferences', () => {
  const server = readFileSync(new URL('../lib/app/growth-daily.js',import.meta.url),'utf8')
  assert.match(server, /length:'standard',imagery:'optional',checkinFrequency:'daily'/)
  assert.match(server, /oporaModuleId:selected,oporaModuleRouter:ANTISTRESS_ROUTER_VERSION/)
  assert.match(server, /JSON\.stringify\(preferences\)/)
})
