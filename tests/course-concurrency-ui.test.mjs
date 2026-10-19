import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nodes, textOf, findButton, findPart, deferred, account, course, courseA, courseB, access, courseView, dailyView, mount } from './helpers/course-ui-harness.mjs'
const sources = Object.fromEntries(['my-course', 'course-today', 'course-r3-steps', 'account-test-battery'].map(name => [name, readFileSync(new URL('../components/app/' + name + '.jsx', import.meta.url), 'utf8')]))

test('course selector binds owner/id and discards a delayed response from a previously selected course', async () => {
  const slow = deferred()
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a'), locale: 'en' }, search: '?courseId=course-a',
    fetcher: path => path.includes('courseId=course-b') ? slow.promise : courseView() })
  await h.settle()
  const oldSteps = findPart(h.tree, 'CourseR3Steps')
  assert.equal(oldSteps.props.state.course.id, 'course-a')
  nodes(h.tree).find(node => node.type === 'select').props.onChange({ target: { value: 'course-b' } })
  await h.settle()
  await h.backTo('?courseId=course-a')
  slow.resolve(courseView(courseB)); await h.settle()
  assert.equal(findPart(h.tree, 'CourseR3Steps').props.state.course.id, 'course-a')
  assert.ok(h.calls.every(call => call.options.headers['X-HH-Account-ID'] === 'owner-a'))
  const count = h.calls.length
  await assert.rejects(oldSteps.props.onCourseCommand('intake', { concerns: 'stale private note' }), /COURSE_SELECTION_CHANGED/)
  assert.equal(h.calls.length, count, 'an old callback cannot mutate after leaving and returning to the same course')
  h.unmount()
})

test('course command ignores a delayed mutation and old child updates after an account change', async () => {
  const slow = deferred()
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?courseId=course-a', fetcher: (_path, options, body) => body ? slow.promise : courseView(options.headers['X-HH-Account-ID'] === 'owner-b' ? courseB : courseA) })
  await h.settle()
  const oldSteps = findPart(h.tree, 'CourseR3Steps')
  const request = oldSteps.props.onCourseCommand('intake', { concerns: 'synthetic note' })
  h.render({ data: account('owner-b') }); await h.settle()
  slow.resolve(courseView({ ...courseA, stage: 2 }))
  await assert.rejects(request, /COURSE_SELECTION_CHANGED/)
  oldSteps.props.onState(courseView(courseA)); await h.settle()
  assert.equal(findPart(h.tree, 'CourseR3Steps')?.props.state.course.id, undefined, 'old account URL cannot silently become a different course')
  const post = h.calls.find(call => call.body)
  assert.equal(post.body.courseId, 'course-a')
  assert.equal(post.options.headers['X-HH-Account-ID'], 'owner-a')
  h.unmount()
})

test('additional-course start takes one explicit click and keeps a stable course ID after an uncertain result', async () => {
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?courseId=course-a', fetcher: (_path, _options, body) => body ? { error: 'SERVICE_UNAVAILABLE' } : courseView() })
  await h.settle()
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 0) {
      // Inside an existing course, manage additional enrollments from My courses.
      findButton(h.tree, 'My courses').props.onClick(); await h.settle()
      findPart(h.tree, 'MyCoursesDashboard').props.onNew(); await h.settle()
    }
    // A signed-in learner already chose Start: no repeated modal or checkbox.
    findPart(h.tree, 'CoursePresetCatalog').props.onPersonal(); await h.settle()
    assert.equal(findButton(h.tree, 'Agree & start'), undefined)
    assert.equal(h.calls.filter(call => call.body).length, attempt + 1)
  }
  const writes = h.calls.filter(call => call.body)
  assert.equal(writes.length, 2)
  assert.equal(writes[0].body.newCourse, true)
  assert.equal(writes[0].body.consent, true)
  assert.equal(writes[0].body.courseId, writes[1].body.courseId)
  assert.match(writes[0].path, /courseId=/)
  assert.equal(findPart(h.tree, 'CourseR3Steps'), undefined, 'failed new-course creation stays in the explicit chooser')
  h.unmount()
})

test('downgrade preserves active course/history and disables only additional creation at the current limit', async () => {
  for (const locale of ['en', 'ru']) {
    const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a'), locale }, search: '?courseId=course-a', fetcher: () => courseView(course('course-a', 4), {
      access: { ...access, tier: 'free', activeCourseLimit: 1, overLimit: true },
    }) })
    await h.settle()
    assert.equal(nodes(h.tree).filter(node => node.type === 'option').length, 0, 'Today has no stacked management panel')
    const daily = findPart(h.tree, 'CourseToday')
    assert.equal(daily.props.courseId, 'course-a')
    assert.equal(daily.props.accountId, 'owner-a')
    assert.equal(daily.key, 'course-a')
    findButton(h.tree, locale === 'ru' ? 'Мои курсы' : 'My courses').props.onClick();await h.settle()
    const dashboard=findPart(h.tree,'MyCoursesDashboard')
    assert.equal(dashboard.props.courses.length,2)
    assert.equal(dashboard.props.canAddCourse,false)
    assert.equal(dashboard.props.overLimit,true)
    h.unmount()
  }
})

test('daily mutations carry the selected course/current cycle and a double click submits once', async () => {
  const slow = deferred()
  const h = mount('course-today', { props: { courseId: 'course-a', accountId: 'owner-a' },
    fetcher: (_path, _options, body) => body ? slow.promise : dailyView() })
  await h.settle()
  findButton(h.tree, 'Details').props.onClick();await h.settle()
  const pause = findButton(h.tree, 'Pause course')
  const pending = pause.props.onClick()
  assert.equal(await pause.props.onClick(), null)
  assert.equal(h.calls.filter(call => call.body).length, 1)
  const post = h.calls.find(call => call.body)
  assert.equal(post.body.courseId, 'course-a')
  assert.equal(post.body.cycleId, 'cycle-a')
  assert.equal(post.options.headers['X-HH-Account-ID'], 'owner-a')
  assert.match(post.path, /courseId=course-a/)
  slow.resolve(dailyView('course-a', 'cycle-a', { cycle: { ...dailyView().cycle, status: 'paused' } }))
  await pending; await h.settle()
  assert.ok(findButton(h.tree, 'Resume course'))
  h.unmount()
})

test('daily private drafts and delayed mutation results never move to another selected course', async () => {
  const slow = deferred()
  const h = mount('course-today', { props: { courseId: 'course-a', accountId: 'owner-a' }, fetcher: (path, _options, body) => body ? slow.promise : path.includes('course-b') ? dailyView('course-b', 'cycle-b') : dailyView() })
  await h.settle()
  findButton(h.tree, 'Details').props.onClick();await h.settle()
  const pending = findButton(h.tree, 'Pause course').props.onClick()
  h.render({ courseId: 'course-b', accountId: 'owner-a' }); await h.settle()
  slow.resolve(dailyView('course-a', 'cycle-a', { cycle: { ...dailyView().cycle, status: 'paused' } }))
  assert.equal(await pending, null); await h.settle()
  assert.equal(findButton(h.tree, 'Resume course'), undefined)
  findButton(h.tree, 'Details').props.onClick();await h.settle()
  assert.ok(findButton(h.tree, 'Pause course'))
  assert.equal(h.notified.length, 0)
  h.unmount()
})

test('daily read is cancelled on account/course switch and cannot hydrate the new view late', async () => {
  const slow = deferred()
  const h = mount('course-today', { props: { courseId: 'course-a', accountId: 'owner-a' }, fetcher: path => path.includes('course-a') ? slow.promise : dailyView('course-b', 'cycle-b') })
  await h.settle()
  h.render({ courseId: 'course-b', accountId: 'owner-b' }); await h.settle()
  slow.resolve(dailyView('course-a', 'cycle-a', { target: { label: 'old private target' } })); await h.settle()
  assert.equal(h.calls[0].options.signal.aborted, true)
  assert.equal(textOf(h.tree).includes('old private target'), false)
  const writes = h.calls.filter(call => call.body)
  assert.equal(writes.length, 0)
  h.unmount()
})

test('a paused daily course cannot resume when all active places are occupied', async () => {
  const h = mount('course-today', { props: { courseId: 'course-a', accountId: 'owner-a' }, fetcher: () => dailyView('course-a', 'cycle-a', {
    cycle: { ...dailyView().cycle, status: 'paused' }, access: { ...access, activeCourseLimit: 1, activeCourseCount: 1 },
  }) })
  await h.settle()
  assert.equal(findButton(h.tree, 'Resume course').props.disabled, true)
  assert.match(textOf(h.tree), /Pause another course before resuming/)
  h.unmount()
})

test('test selection and navigation preserve explicit owner/course scope throughout both clients', () => {
  assert.match(sources['course-r3-steps'], /const fresh=await onCourseRead\(\)/)
  assert.match(sources['course-r3-steps'], /onCourseCommand\('choose-goals'/)
  assert.match(sources['course-r3-steps'], /ensureCurrent\(\)\s+router\.push/)
  assert.match(sources['course-r3-steps'], /course=1&courseId='\+encodeURIComponent\(fresh.course.id\)/)
  assert.match(sources['course-r3-steps'], /filters=topics&courseId='\+encodeURIComponent\(current.id\)/)
  assert.match(sources['account-test-battery'], /accountId \}\)/)
  assert.match(sources['account-test-battery'], /action: 'confirm-tests', courseId: current.course.id/)
  assert.match(sources['account-test-battery'], /courseHref\(\{\}, returnCourseId\)/)
  assert.match(sources['account-test-battery'], /if \(!isCurrent\(\)\) return\s+router.push/)
  assert.doesNotMatch(sources['my-course'] + sources['course-today'], /localStorage|sessionStorage/)
})

const lessonFixture={id:'lesson-a',title:'Synthetic lesson',journey:{purpose:'Practice'},aphorism:'Take a small step'}
const lessonState=(extra={})=>dailyView('course-a','cycle-a',{lesson:lessonFixture,...extra})
const savedLesson=()=>lessonState({currentSession:{completedAt:'2026-10-13T22:00:00Z',feedback:'skip'}})
const sessionBody={day:1,lessonId:'lesson-a',operationId:'save-lesson-a',feedback:'skip'}
async function openLesson(h){
 await h.settle()
 const button=nodes(h.tree).find(n=>n.props?.['data-course-today-primary']);assert.ok(button)
 button.props.onClick();await h.settle()
 const player=findPart(h.tree,'CourseSlidePlayer');assert.ok(player);return player
}
function lessonUi(fetcher){return mount('course-today',{props:{accountId:'owner-a',courseId:'course-a'},fetcher})}

test('V6 default lesson offers once only after confirmed save, preserving success result and replay idempotency',async()=>{
 const pending=deferred();let saves=0
 const h=lessonUi((_path,_options,body)=>{if(!body)return lessonState();saves++;return saves===1?pending.promise:savedLesson()})
 const player=await openLesson(h)
 const first=player.props.onSession(sessionBody)
 assert.equal(h.notified.length,0)
 assert.equal(await player.props.onSession(sessionBody),null)
 assert.equal(saves,1)
 pending.resolve(savedLesson());const result=await first;await h.settle()
 assert.equal(result.currentSession.completedAt,'2026-10-13T22:00:00Z')
 assert.deepEqual(JSON.parse(JSON.stringify(h.notified)),[{cycleId:'cycle-a',day:1,lessonId:'lesson-a'}])
 // A repeated callback from the prior render is harmless even after the lock releases.
 await player.props.onSession(sessionBody);await h.settle();assert.equal(h.notified.length,1)
 assert.ok(findPart(h.tree,'CourseSlidePlayer').props.data.currentSession)
 h.unmount()
})

test('failed/unconfirmed V6 saves never offer; eventual confirmed retry offers exactly once',async()=>{
 for(const failure of [{error:'SERVICE_UNAVAILABLE'},lessonState(),lessonState({currentSession:{completedAt:'invalid'}})]){
  let failed=true
  const h=lessonUi((_path,_options,body)=>body?(failed?failure:savedLesson()):lessonState())
  const player=await openLesson(h)
  assert.equal(await player.props.onSession(sessionBody),null);await h.settle();assert.equal(h.notified.length,0)
  failed=false
  assert.ok(await player.props.onSession(sessionBody));await h.settle();assert.equal(h.notified.length,1)
  await player.props.onSession(sessionBody);await h.settle();assert.equal(h.notified.length,1);h.unmount()
 }
})

test('V6 close, already-completed replay and owner/course changes do not generate a lesson offer',async()=>{
 const closed=lessonUi(()=>lessonState());const player=await openLesson(closed)
 player.props.onClose();await closed.settle();assert.equal(closed.notified.length,0);assert.equal(closed.calls.filter(x=>x.body).length,0);closed.unmount()
 const completed=lessonUi(()=>savedLesson());const replay=await openLesson(completed)
 await replay.props.onSession(sessionBody);await completed.settle();assert.equal(completed.notified.length,0);completed.unmount()
 for(const change of [{accountId:'owner-b',courseId:'course-a'},{accountId:'owner-a',courseId:'course-b'},null]){
  const pending=deferred(),h=lessonUi((_p,_o,body)=>body?pending.promise:lessonState());const current=await openLesson(h)
  const saving=current.props.onSession(sessionBody)
  if(change){h.render(change);await h.settle()}else h.unmount()
  pending.resolve(savedLesson());assert.equal(await saving,null);await h.settle();assert.equal(h.notified.length,0);if(change)h.unmount()
 }
})

test('focus entry uses saved progress, opens lessons without writes and blocks stale scope callbacks',async()=>{
 const h=mount('course-today',{props:{accountId:'owner-a',courseId:'course-a'},fetcher:path=>path.includes('course-b')?dailyView('course-b','cycle-b'):dailyView()})
 await h.settle();const focus=findPart(h.tree,'CourseFocusEntry');assert.ok(focus)
 assert.equal(focus.props.cycle.id,'cycle-a')
 const oldStart=focus.props.onStart
 h.render({accountId:'owner-b',courseId:'course-b'});await h.settle()
 const count=h.calls.length;oldStart();await h.settle()
 assert.ok(findPart(h.tree,'CourseFocusEntry'));assert.equal(findPart(h.tree,'CourseSlidePlayer'),undefined)
 assert.equal(h.calls.length,count)
 findPart(h.tree,'CourseFocusEntry').props.onStart();await h.settle()
 assert.ok(findPart(h.tree,'CourseSlidePlayer'));assert.equal(h.calls.filter(c=>c.body).length,0)
 h.unmount();oldStart();assert.equal(h.calls.length,count)
})

test('focus entry cannot bypass paused capacity or readonly history',async()=>{
 for(const readOnly of [false,true]){
  const h=mount('course-today',{props:{accountId:'owner-a',courseId:'course-a'},fetcher:()=>dailyView('course-a','cycle-a',{
   readOnly,cycle:{...dailyView().cycle,status:'paused'},access:{...access,activeCourseLimit:1,activeCourseCount:1},
  })})
  await h.settle();const focus=findPart(h.tree,'CourseFocusEntry')
  assert.equal(focus,undefined)
  if(!readOnly)assert.ok(textOf(h.tree).includes('Pause another course before resuming'))
  assert.equal(h.calls.filter(c=>c.body).length,0);h.unmount()
 }
})
