import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, findPart, deferred, account, courseA, courseView } from './helpers/course-ui-harness.mjs'
import * as programs from '../lib/inner-growth/course-programs.js'
import * as recovery from '../lib/inner-growth/course-start-recovery.js'

const scales = ['load', 'tension', 'functioning'].map(key => ({ id: 'hh-weekly-pulse::weekly.' + key, label: key }))
const current = { ...courseA, revision: 6, stage: 3, focusTags: ['stress', 'mood', 'energy'], presetId: null, testKeys: ['hh-weekly-pulse'] }
const selection = { answers: { F1: null, F5: 2 }, goal: 'AS5', moduleId: 'AS5' }
const waiting = courseView(current)
const started = courseView({ ...current, stage: 4, revision: 7, moduleChoice: { id: 'AS5' } })
const failure = () => Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE', status: 503 })
const part = name => ({ default: Object.assign(() => null, { testName: name }) })
function modules(eligible = scales) {
  return {
    '@/lib/inner-growth/course-start-recovery': recovery,
    '@/lib/inner-growth/course-strategy': {
      courseMeasuredProfile: () => ({ eligible, scales: eligible }), courseRecommendedTests: () => [], courseSuggestedFocus: () => eligible,
    },
    '@/lib/inner-growth/course-programs': { ...programs, suggestCourseProgramScales: () => eligible },
    './course-completion-review': part('CourseCompletionReview'), './course-focus-picker': part('CourseFocusPicker'),
  }
}
function ui(respond, { eligible = scales, snapshot = waiting } = {}) {
  const calls = [], accepted = [], errors = []
  let active = true
  const h = mount('course-r3-steps', {
    props: {
      stage: snapshot.course.stage, locale: 'en', data: account('owner-a'), state: snapshot, busy: false, root: '/en/app',
      isCourseCurrent: () => active, onState: value => accepted.push(value), onError: value => errors.push(value),
      onCourseCommand: async (action, body) => { calls.push({ action, body }); return respond(calls.length - 1, action, body) },
      onCourseRead: async () => { calls.push({ action: 'read' }); return respond(calls.length - 1, 'read') },
    },
    extraModules: modules(eligible), fetcher: () => assert.fail('Recovery must use the guarded parent callbacks'),
  })
  // The course welcome CTA explicitly confirms the recommended module and
  // measured focus in one action, without an additional scale-review screen.
  const start = async () => {
    const finder = findPart(h.tree, 'AntiStressModuleFinder')
    return finder?.props.onStart(selection)
  }
  return { h, calls, accepted, errors, retire: () => { active = false }, start }
}
async function untilCalls(t, count) {
  // Allow guarded recovery microtasks to reach the relevant request boundary.
  for (let n = 0; n < 30 && t.calls.length < count; n++) await t.h.settle()
  assert.equal(t.calls.length, count, 'Expected recovery boundary before retirement')
}

 test('module start with no measured scales retains the explicit general-goal fallback and token lock', async () => {
  const slow = deferred(), t = ui(() => slow.promise, { eligible: [] })
  await t.h.settle()
  const first = t.start(), duplicate = t.start()
  await untilCalls(t, 1)
  assert.equal(t.calls[0].action, 'choose-goals')
  const payload = t.calls[0].body
  assert.deepEqual(Array.from(payload.goals), programs.getCourseProgram('stress').primaryGoals.slice(0, 1))
  assert.equal(payload.scaleKeys, undefined)
  assert.equal(payload.expectedRevision, 6)
  assert.equal(payload.moduleId, 'AS5')
  assert.equal(payload.consent, true)
  slow.resolve(started); await Promise.all([first, duplicate]); await t.h.settle()
  assert.deepEqual(t.accepted, [started]); assert.deepEqual(t.errors.filter(Boolean), [])
  assert.equal(t.h.calls.length, 0); t.h.unmount()
})

for (const [name, responses, actions, succeeds] of [
  ['lost committed response', [failure(), started], ['choose-goals', 'read'], true],
  ['one retry after matching revision', [failure(), waiting, started], ['choose-goals', 'read', 'choose-goals'], true],
  ['lost retry response', [failure(), waiting, failure(), started], ['choose-goals', 'read', 'choose-goals', 'read'], true],
  ['exhausted retry', [failure(), waiting, failure(), waiting], ['choose-goals', 'read', 'choose-goals', 'read'], false],
]) test('guarded UI reconciles ' + name + ' without an unscoped request or third POST', async () => {
  const t = ui(index => { const response = responses[index]; if (response instanceof Error) throw response; return response })
  await t.h.settle(); await t.start(); await t.h.settle()
  assert.deepEqual(t.calls.map(call => call.action), actions)
  for (const call of t.calls.filter(call => call.action === 'choose-goals')) {
    assert.equal(call.body.expectedRevision, 6); assert.equal(call.body.moduleId, 'AS5')
    assert.deepEqual(Array.from(call.body.scaleKeys), scales.map(scale => scale.id))
  }
  assert.deepEqual(t.accepted, succeeds ? [started] : [])
  assert.deepEqual(t.errors.filter(Boolean), succeeds ? [] : ['SERVICE_UNAVAILABLE'])
  assert.equal(t.h.calls.length, 0); t.h.unmount()
})

for (const delayedPhase of [0, 1, 2, 3]) test('retired selection stops after asynchronous recovery boundary ' + delayedPhase, async () => {
  const slow = deferred()
  const t = ui((index, action) => {
    if (index === delayedPhase) return slow.promise
    if (action === 'choose-goals') throw failure()
    return waiting
  })
  await t.h.settle(); const pending = t.start()
  await untilCalls(t, delayedPhase + 1)
  t.retire(); t.h.unmount()
  slow.resolve(delayedPhase % 2 ? waiting : started)
  await pending
  assert.equal(t.calls.length, delayedPhase + 1, 'No further read or retry after retirement')
  assert.deepEqual(t.accepted, []); assert.deepEqual(t.errors.filter(Boolean), [])
})

test('an already stale module callback cannot clear errors, acquire busy state or send answers', async () => {
  const t = ui(() => assert.fail('No stale request'))
  await t.h.settle(); t.retire(); await t.start()
  assert.deepEqual(t.calls, []); assert.deepEqual(t.accepted, []); assert.deepEqual(t.errors, [])
  t.h.unmount()
})

for (const wrongPhase of [0, 1, 2, 3]) test('response at recovery boundary ' + wrongPhase + ' must match the original exact course ID', async () => {
  const t = ui((index, action) => {
    if (index === wrongPhase) return courseView({ ...started.course, id: 'course-b' })
    if (action === 'choose-goals') throw failure()
    return waiting
  })
  await t.h.settle(); await t.start(); await t.h.settle()
  assert.deepEqual(t.accepted, [])
  assert.ok(t.errors.some(Boolean))
  assert.ok(t.calls.filter(call => call.action === 'choose-goals').length <= 2)
  if (wrongPhase < 2) assert.equal(t.calls.length, wrongPhase + 1)
  assert.equal(t.h.calls.length, 0); t.h.unmount()
})

for (const response of [
  courseView({ ...current, revision: 99 }),
  courseView({ ...started.course, moduleChoice: { id: 'AS3' } }),
]) test('changed revision or another committed module is never retried or accepted', async () => {
  const t = ui((index) => { if (index === 0) throw failure(); return response })
  await t.h.settle(); await t.start()
  assert.deepEqual(t.calls.map(call => call.action), ['choose-goals', 'read'])
  assert.deepEqual(t.accepted, []); assert.deepEqual(t.errors.filter(Boolean), ['COURSE_STATE_CHANGED'])
  t.h.unmount()
})

for (const reviewCase of ['valid', 'wrong-course', 'retired']) test('stage-two review is owner-bound before goal recovery: ' + reviewCase, async () => {
  let t
  const snapshot = courseView({ ...current, stage: 2, focusTags: ['sleep'] })
  t = ui((_index, action) => {
    if (action === 'review') {
      if (reviewCase === 'retired') t.retire()
      return courseView({ ...snapshot.course, stage: 3, revision: 9, id: reviewCase === 'wrong-course' ? 'course-b' : current.id })
    }
    return started
  }, { snapshot })
  await t.h.settle(); await findPart(t.h.tree, 'CourseCompletionReview').props.onSuggested(); await t.h.settle()
  assert.deepEqual(t.calls.map(call => call.action), reviewCase === 'valid' ? ['review', 'choose-goals'] : ['review'])
  if (reviewCase === 'valid') {
    assert.equal(t.calls[1].body.expectedRevision, 9); assert.equal(t.accepted.length, 2)
  } else assert.deepEqual(t.accepted, [])
  if (reviewCase === 'retired') assert.deepEqual(t.errors, [''])
  t.h.unmount()
})

for (const change of ['owner', 'course', 'unmount']) test('real parent guards bind recovery to owner/course and reject delayed ' + change, async () => {
  const slow = deferred(), accepted = [], errors = []
  let posts = 0, recoveryReads = 0
  const parent = mount('my-course', {
    enterCourse: true, search: '?courseId=course-a', props: { data: account('owner-a'), locale: 'en' },
    fetcher: (path, options, body) => {
      if (body) { posts++; return { error: 'SERVICE_UNAVAILABLE' } }
      if (posts && path.includes('courseId=course-a') && options.headers['X-HH-Account-ID'] === 'owner-a') {
        recoveryReads++; return slow.promise
      }
      return waiting
    },
  })
  await parent.settle()
  const guarded = findPart(parent.tree, 'CourseR3Steps').props
  const child = mount('course-r3-steps', {
    props: { ...guarded, onState: value => { accepted.push(value); guarded.onState(value) }, onError: value => { errors.push(value); guarded.onError(value) } },
    extraModules: modules(), fetcher: () => assert.fail('No raw fetch from the child'),
  })
  await child.settle()
  const pending = findPart(child.tree, 'AntiStressModuleFinder').props.onStart(selection)
  await child.settle(); await parent.settle()
  assert.equal(posts, 1); assert.equal(recoveryReads, 1)
  const initialCalls = parent.calls.slice()
  assert.ok(initialCalls.every(call => call.options.headers['X-HH-Account-ID'] === 'owner-a'))
  assert.ok(initialCalls.every(call => call.path.includes('courseId=course-a')))
  assert.equal(initialCalls.find(call => call.body).body.courseId, 'course-a')
  if (change === 'owner') { parent.render({ data: account('owner-b'), locale: 'en' }); await parent.settle() }
  else if (change === 'course') await parent.backTo('?courseId=course-b')
  else parent.unmount()
  slow.resolve(started); await pending; await child.settle(); await parent.settle()
  assert.equal(posts, 1); assert.deepEqual(accepted, []); assert.deepEqual(errors.filter(Boolean), [])
  child.unmount(); parent.unmount()
})
