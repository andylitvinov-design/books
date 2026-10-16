import test from 'node:test'
import assert from 'node:assert/strict'
import { account, course, courseView, findButton, findPart, mount, nodes } from './helpers/course-ui-harness.mjs'

const free = {
  tier: 'free',
  activeCourseCount: 0,
  activeCourseLimit: 1,
  overLimit: false,
  multiCourseEnabled: false,
}

function snapshot(selected, access = free) {
  return courseView(selected, { courses: selected ? [selected] : [], access })
}

async function approveStart(h) {
  const catalog = findPart(h.tree, 'CoursePresetCatalog')
  assert.ok(catalog, 'new course selection must open')
  catalog.props.onPersonal()
  await h.settle()
  const button = findButton(h.tree, 'Agree & start')
  assert.equal(button?.props.disabled, true, 'a new course still needs explicit consent')
  const input = nodes(h.tree).find(node => node.type === 'input' && node.props.type === 'checkbox')
  input.props.onChange({ target: { checked: true } })
  await h.settle()
  await findButton(h.tree, 'Agree & start').props.onClick()
  await h.settle()
}

test('closing the only free course frees its slot and starts another without parallel-course entitlement', async () => {
  const archived = { ...course('course-a', 4), status: 'closed', revision: 8 }
  const started = { ...archived, status: 'active', stage: 1, revision: 9 }
  const h = mount('my-course', {
    enterCourse: true,
    props: { data: account('owner-a'), locale: 'en' },
    fetcher: (_path, _options, body) => body
      ? snapshot(started, { ...free, activeCourseCount: 1 })
      : snapshot(archived),
  })
  await h.settle()
  const dashboard = findPart(h.tree, 'MyCoursesDashboard')
  assert.ok(dashboard, 'closed course stays in the learner history')
  assert.equal(dashboard.props.canAddCourse, true, '0/1 must enable Start another course')
  dashboard.props.onNew()
  await h.settle()
  await approveStart(h)
  const writes = h.calls.filter(call => call.body)
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].body, {
    action: 'start', consent: true, courseId: archived.id,
    newCourse: false, expectedRevision: 8,
  })
  assert.equal(writes[0].options.headers['X-HH-Account-ID'], 'owner-a')
  assert.equal(findPart(h.tree, 'CourseR3Steps')?.props.state.course.id, archived.id)
  h.unmount()
})

test('a free account can start its first course, but cannot start a parallel second course', async () => {
  const started = course('new-course')
  const empty = { course: null, courses: [], access: free, assessments: {} }
  const h = mount('my-course', {
    enterCourse: true,
    props: { data: account('owner-a'), locale: 'en' },
    fetcher: (_path, _options, body) => body
      ? snapshot({ ...started, id: body.courseId }, { ...free, activeCourseCount: 1 })
      : empty,
  })
  await h.settle()
  await approveStart(h)
  const firstWrite = h.calls.find(call => call.body)
  assert.ok(firstWrite)
  assert.equal(firstWrite.body.action, 'start')
  assert.equal(firstWrite.body.newCourse, false, 'legacy account uses its one owner row')
  assert.match(firstWrite.body.courseId, /^[0-9a-f-]{36}$/)
  h.unmount()

  const active = course('active-course', 4)
  const full = mount('my-course', {
    enterCourse: true,
    props: { data: account('owner-a'), locale: 'en' },
    fetcher: () => snapshot(active, { ...free, activeCourseCount: 1 }),
  })
  await full.settle()
  const dashboard = findPart(full.tree, 'MyCoursesDashboard')
  assert.equal(dashboard.props.canAddCourse, false)
  assert.equal(dashboard.props.canManageCourses, true, 'free users must still be able to close their course')
  dashboard.props.onNew()
  await full.settle()
  assert.equal(full.calls.filter(call => call.body).length, 0, 'full capacity cannot be bypassed')
  full.unmount()
})
