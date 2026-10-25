import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, findPart, findButton, nodes, textOf, deferred, account, courseA, courseB, courseView } from './helpers/course-ui-harness.mjs'
const closed = course => courseView({ ...course, status: 'closed', revision: course.revision + 1 })
function fixture() {
 const pending=deferred()
 const h=mount('my-course',{props:{data:account('owner-a')},fetcher:(_path,_options,body)=>body ? pending.promise : courseView(courseA)})
 return {h,pending}
}
test('close uses exact owner/course/revision and duplicate confirmation sends one command',async()=>{
 const {h,pending}=fixture();await h.settle();const close=findPart(h.tree,'CourseEntrySelector').props.onCloseCourse
 const first=close();assert.equal(await close(),false);await h.settle();const writes=h.calls.filter(c=>c.body)
 assert.equal(writes.length,1);assert.deepEqual(writes[0].body,{action:'close',expectedRevision:courseA.revision,courseId:courseA.id});assert.equal(writes[0].options.headers['X-HH-Account-ID'],'owner-a')
 pending.resolve(closed(courseA));assert.equal(await first,true);await h.settle();assert.equal(findPart(h.tree,'CourseEntrySelector').props.course.status,'closed');h.unmount()
})
for(const change of ['owner','course','unmount'])test(`pending close cannot replace state after ${change} changes`,async()=>{
 const {h,pending}=fixture();await h.settle();const close=findPart(h.tree,'CourseEntrySelector').props.onCloseCourse;const first=close();await h.settle()
 if(change==='owner'){h.render({data:account('owner-b')});await h.settle()}
 if(change==='course')await h.backTo('?courseId=course-b')
 if(change==='unmount')h.unmount()
 pending.resolve(closed(courseA));assert.equal(await first,false);await h.settle()
 if(change!=='unmount')assert.notEqual(findPart(h.tree,'CourseEntrySelector')?.props.course?.status,'closed')
 assert.equal(h.calls.filter(c=>c.body).length,1);h.unmount()
})
test('close rejects a response identifying another course',async()=>{
 const {h,pending}=fixture();await h.settle();const promise=findPart(h.tree,'CourseEntrySelector').props.onCloseCourse();pending.resolve(closed(courseB));assert.equal(await promise,false);await h.settle();assert.equal(findPart(h.tree,'CourseEntrySelector').props.course.id,courseA.id);h.unmount()
})

// The original checkbox flow (d380df8a / #721) was explicitly replaced by
// #1118 (dbd20683): one signed-in Start click plus private-save disclosure.
// #1124 (4d699d2a) additionally invalidates retained callbacks after acceptance.
const legacyClosedCourse = { ...courseA, status: 'closed', revision: 8, stage: 4,
 consentedAt: '2026-10-01T00:00:00.000Z' }
function restartFixture(t, activeCourseCount = 0) {
 const prior = legacyClosedCourse, pending = deferred(), children = []
 const view = course => courseView(course, { courses: [course], access: {
  tier: 'free', activeCourseCount, activeCourseLimit: 1, multiCourseEnabled: false,
 } })
 const h = mount('my-course', { props: { data: account('owner-a'), locale: 'en' },
  fetcher: (_path, _options, body) => body ? pending.promise : view(prior) })
 const noWrites = label => assert.equal(h.calls.filter(call => call.body).length, 0, label)
 const child = (name, props) => {
  const mounted = mount(name, { props, fetcher: () => assert.fail('No private child read or write expected') })
  children.push(mounted); return mounted
 }
 t.after(() => { h.unmount(); for (const mounted of children) mounted.unmount() })
 return { h, prior, pending, view, noWrites, child }
}
async function openRestartDashboard(f) {
 const { h, child, noWrites } = f
 await h.settle(); noWrites('a prior consent timestamp must not restart a closed course on mount')
 const selectorPart = findPart(h.tree, 'CourseEntrySelector'); assert.ok(selectorPart)
 const selector = child('course-entry-selector', selectorPart.props)
 await selector.settle(); noWrites('rendering the actual course selector must not start a course')
 const open = nodes(selector.tree).find(node => node.type === 'button' && node.props?.['data-add-course'] !== undefined)
 assert.ok(open, 'the actual selector must offer the closed-course dashboard'); assert.equal(Boolean(open.props.disabled), false)
 open.props.onClick(); await h.settle(); noWrites('opening closed-course history is not consent to restart')
 const dashboardPart = findPart(h.tree, 'MyCoursesDashboard'); assert.ok(dashboardPart)
 const dashboard = child('my-courses-dashboard', dashboardPart.props)
 await dashboard.settle(); noWrites('rendering the actual dashboard must not start a course')
 const add = findButton(dashboard.tree, 'Start another course'); assert.ok(add)
 return { dashboardPart, add }
}
async function openPersonalRestart(f) {
 const { h, child, noWrites } = f
 const { dashboardPart, add } = await openRestartDashboard(f)
 assert.equal(dashboardPart.props.canAddCourse, true)
 assert.equal(Boolean(add.props.disabled), false)
 add.props.onClick(); await h.settle(); noWrites('Start another course opens choices, not enrollment')
 const notice = nodes(h.tree).find(node => node.type === 'p' &&
  textOf(node).includes('Your course choices, optional notes and practice progress are saved privately in your account when you start.'))
 assert.ok(notice, 'private-save disclosure must be rendered before the affirmative create button')
 assert.notEqual(notice.props.hidden, true); assert.notEqual(notice.props['aria-hidden'], true)
 assert.notEqual(notice.props['aria-hidden'], 'true')
 assert.notEqual(notice.props.style?.display, 'none'); assert.notEqual(notice.props.style?.visibility, 'hidden')
 const disclosure = nodes(h.tree).find(node => node.type === 'details' && node.props?.['data-course-fixed-presets'] !== undefined)
 assert.ok(disclosure); assert.equal(Boolean(disclosure.props.open), false)
 assert.match(textOf(nodes(disclosure).find(node => node.type === 'summary')), /Courses with fixed test sets/)
 // Native details expansion exposes this real child; it has no consent or
 // network event. This VM exercises its markup/callback, not browser layout.
 const catalogPart = findPart(disclosure, 'CoursePresetCatalog'); assert.ok(catalogPart)
 const catalog = child('course-preset-catalog', catalogPart.props)
 await catalog.settle(); noWrites('exposing and rendering course choices is not consent to restart')
 assert.match(textOf(catalog.tree), /Your test results remain in your private account\. No diagnosis or guaranteed outcome\./)
 const create = findButton(catalog.tree, 'Create my personal course'); assert.ok(create)
 assert.equal(Boolean(create.props.disabled), false)
 assert.equal(findButton(h.tree, 'Agree & start'), undefined, 'the approved flow has no second consent modal')
 return create
}

test('legacy closed course restarts its exact identity only after a renewed disclosed create click', async t => {
 const f = restartFixture(t), { h, prior, pending, view, noWrites } = f
 const create = await openPersonalRestart(f)
 noWrites('even an old consentedAt never replaces the new explicit click')
 create.props.onClick(); create.props.onClick(); await h.settle()
 const writes = h.calls.filter(call => call.body)
 assert.equal(writes.length, 1, 'a deliberate create click and its duplicate send exactly one start')
 const start = writes[0]; assert.equal(start.body.action, 'start')
 assert.equal(start.body.courseId,prior.id);assert.equal(start.body.newCourse,false);assert.equal(start.body.expectedRevision,8);assert.equal(start.body.consent,true)
 assert.equal(start.options.headers['X-HH-Account-ID'],'owner-a')
 assert.deepEqual(start.body, { action: 'start', consent: true, courseId: prior.id, newCourse: false, expectedRevision: prior.revision })
 pending.resolve(view({ ...prior, status: 'active', stage: 1, revision: 9 }))
 await h.settle()
 assert.equal(findPart(h.tree, 'CourseR3Steps')?.props.state.course.id, prior.id)
 create.props.onClick(); await h.settle()
 assert.equal(h.calls.filter(call => call.body).length, 1, 'accepted same-ID restart invalidates its retained create callback')
})

for (const change of ['owner', 'course', 'unmount']) test(`retained closed-course create callback cannot start after ${change} changes`, async t => {
 const f = restartFixture(t), create = await openPersonalRestart(f), { h, noWrites } = f
 if (change === 'owner') { h.render({ data: account('owner-b') }); await h.settle() }
 if (change === 'course') await h.backTo('?courseId=course-b')
 if (change === 'unmount') h.unmount()
 create.props.onClick(); await h.settle()
 noWrites('stale affirmative callbacks cannot authorize a different owner, selection or lifetime')
})

test('closed-course history and prior consent do not bypass authoritative full capacity', async t => {
 const f = restartFixture(t, 1), { dashboardPart, add } = await openRestartDashboard(f)
 assert.equal(dashboardPart.props.canAddCourse, false)
 assert.equal(add.props.disabled, true)
 add.props.onClick(); await f.h.settle() // Direct invocation must retain the parent guard too.
 f.noWrites('full capacity must not be bypassed by the closed row or its old consent')
 assert.equal(findPart(f.h.tree, 'CoursePresetCatalog'), undefined)
})
