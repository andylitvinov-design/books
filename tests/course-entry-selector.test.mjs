import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const entry = read('components/app/course-entry-selector.jsx')
const wrapper = read('components/app/my-course.jsx')
const css = read('components/app/course-entry-selector.module.css')

test('My Course first renders the selection slide and keeps the existing course wizard', () => {
  assert.match(wrapper, /<CourseEntrySelector/)
  assert.match(wrapper, /if \(!showCourse && !testReturn && !programmeEntry && !personalEntry\) return/)
  assert.match(wrapper, /personalEntry = stage === 0 &&/)
  assert.match(wrapper, /onOpen=\{\(\) => setShowCourse\(true\)\}/)
  assert.match(wrapper, /stage === 0 && <header/)
  assert.match(wrapper, /programmeEntry = stage === 0 && Boolean\(requestedProgram\)/)
  assert.match(wrapper, /stage === 4 && <CourseToday/)
  assert.match(wrapper, /searchParams\.get\('tests'\) === 'complete'/)
  assert.match(wrapper, /searchParams\.get\('retest'\) === 'updated'/)
  assert.match(wrapper, /router\.replace\(root \+ '\/course'\)/)
})

test('an active current-course tile and dotted add button are both present', () => {
  assert.match(entry, /data-current-course-card/)
  assert.match(entry, /data-add-course/)
  assert.match(entry, /onClick=\{addCourse\}/)
  assert.match(entry, /if \(!hasCourse\) \{ onOpen\(\); return \}/)
  assert.match(entry, /dialogRef\.current\?\.showModal\(\)/)
  assert.match(css, /dashed/)
  assert.match(css, /@media\(max-width:690px\)/)
})

test('daily lesson number comes from saved lessons, not elapsed dates', () => {
  assert.match(entry, /course\/progress\?locale=/)
  assert.match(entry, /daily\.progress\.practiceCount/)
  assert.match(entry, /completed \+ 1/)
  assert.doesNotMatch(entry, /course\.today/)
  assert.match(entry, /completed \/ 14 \* 100/)
})

test('Free paywall is informational until verified server billing is live', () => {
  assert.match(entry, /data-course-subscription-dialog/)
  assert.match(entry, /PAID_PLAN_KEYS.map/)
  assert.match(entry, /SUBSCRIPTION_PLANS\[id\]/)
  assert.match(entry, /price: plan.amount \/ 100/)
  assert.match(entry, /plan.activeCourseLimit === 1/)
  assert.match(entry, /Subscription checkout is not available yet/)
  assert.match(entry, /Оформление подписки пока недоступно/)
  assert.doesNotMatch(entry, /checkout\/start|localStorage|sessionStorage|stripe\.redirect/)
})

test('dialog is accessible and does not hide existing course navigation', () => {
  assert.match(entry, /<dialog ref=\{dialogRef\}/)
  assert.match(entry, /aria-labelledby="course-upgrade-title"/)
  assert.match(entry, /dialogRef\.current\?\.close\(\)/)
  assert.match(css, /::backdrop/)
  assert.match(wrapper, /backToCourses/)
})

import { mount, nodes, textOf, findPart, findButton, account, course, courseView, access, deferred } from './helpers/course-ui-harness.mjs'

test('canonical landing passes authoritative scope and opens an additional course without mutating before consent', async () => {
  const h = mount('my-course', { props: { data: account('owner-a'), locale: 'en' }, fetcher: () => courseView(course('course-a', 4)) })
  await h.settle()
  const entry = findPart(h.tree, 'CourseEntrySelector')
  assert.ok(entry, 'ordinary entry retains the canonical selector')
  assert.equal(entry.props.accountId, 'owner-a')
  assert.equal(entry.props.course.id, 'course-a')
  assert.equal(entry.props.access.activeCourseLimit, 5)
  entry.props.onAdd(); await h.settle()
  assert.ok(findPart(h.tree, 'CoursePresetCatalog'))
  assert.equal(h.calls.filter(call => call.body).length, 0, 'opening a choice cannot create a course')
  findPart(h.tree, 'CoursePresetCatalog').props.onPersonal(); await h.settle()
  assert.equal(findButton(h.tree, 'Agree & start').props.disabled, true)
  assert.equal(h.calls.filter(call => call.body).length, 0)
  h.unmount()
})

test('entry selector uses verified capacity and preserves informational paywall at the limit', async () => {
  for (const [tier, limit, count, enabled, expected] of [
    ['advanced', 5, 2, true, 1], ['premium', 5, 4, true, 1],
    ['free', 1, 1, true, 0], ['start', 1, 1, true, 0],
    ['advanced', 5, 5, true, 0], ['premium', 5, 1, false, 0],
  ]) {
    let added = 0
    const h = mount('course-entry-selector', { props: { accountId: 'owner-a', course: course('course-a', 1),
      access: { ...access, tier, activeCourseLimit: limit, activeCourseCount: count, multiCourseEnabled: enabled },
      onOpen() {}, onAdd() { added++ } }, fetcher: () => { throw new Error('setup course must not read daily progress') } })
    await h.settle()
    nodes(h.tree).find(node => node.props['data-add-course'] !== undefined).props.onClick()
    assert.equal(added, expected)
    const dialog = nodes(h.tree).find(node => node.type === 'dialog')
    assert.equal(dialog.props.ref.current.open, !expected)
    assert.ok(textOf(h.tree).includes(count + ' / ' + limit))
    assert.equal(h.calls.length, 0)
    h.unmount()
  }
})

test('entry progress binds owner/course, rejects mismatches and cannot hydrate a later owner from a slow request', async () => {
  const slow = deferred()
  const h = mount('course-entry-selector', { props: { accountId: 'owner-a', course: course('course-a', 4), onOpen() {} },
    fetcher: (path, options) => options.accountId === 'owner-a' ? slow.promise : { courseId: 'course-b', progress: { practiceCount: 2 } } })
  await h.settle()
  assert.match(h.calls[0].path, /courseId=course-a/)
  assert.equal(h.calls[0].options.accountId, 'owner-a')
  h.render({ accountId: 'owner-b', course: course('course-b', 4), onOpen() {} }); await h.settle()
  assert.equal(h.calls[0].options.signal.aborted, true)
  slow.resolve({ courseId: 'course-a', progress: { practiceCount: 13 } }); await h.settle()
  assert.ok(textOf(h.tree).includes('2 / 14'))
  assert.ok(!textOf(h.tree).includes('13 / 14'))
  h.render({ accountId: 'owner-b', course: course('course-c', 4), onOpen() {} }); await h.settle()
  assert.ok(textOf(h.tree).includes('Progress temporarily unavailable'))
  assert.ok(!textOf(h.tree).includes('2 / 14'))
  h.unmount()
})

test('programme links preselect the flagship and still require checked consent', async () => {
  const h = mount('my-course', { props: { data: account('owner-a') }, search: '?program=stress',
    fetcher: () => ({ course: null, courses: [], assessments: {}, access: { ...access, activeCourseCount: 0 } }) })
  await h.settle()
  assert.equal(findPart(h.tree, 'CourseEntrySelector'), undefined)
  const suggested = nodes(h.tree).find(node => node.props['data-course-program-id'] === 'stress')
  assert.equal(suggested.props['data-recommended'], true)
  suggested.props.onClick(); await h.settle()
  assert.equal(findButton(h.tree, 'Agree & start').props.disabled, true)
  assert.equal(h.calls.filter(call => call.body).length, 0)
  h.unmount()
})


test('entry plan cards use the existing EUR catalogue and keep checkout unavailable', async () => {
  const h = mount('course-entry-selector', { props: { accountId: 'owner-a', course: course('course-a'), onOpen() {} }, fetcher() {} })
  await h.settle()
  const cards = nodes(h.tree).filter(node => node.type === 'article' && node.props.className === 'planCard')
  assert.equal(cards.length, 3)
  for (const [index, amount] of [10, 20, 100].entries()) assert.ok(textOf(cards[index]).includes(String(amount)))
  assert.ok(textOf(cards[0]).includes('1 active course'))
  assert.ok(textOf(cards[1]).includes('Up to 5 active courses'))
  assert.ok(textOf(cards[2]).includes('1 personal 60-minute session per month'))
  assert.ok(textOf(h.tree).includes('Subscription checkout is not available yet'))
  assert.equal(h.calls.length, 0)
  h.unmount()
})

test('public personal choices stay consent-gated, owner-bound and continue into the created wizard', async () => {
  let state={course:null,courses:[],assessments:{},access:{...access,activeCourseCount:0}}
  const entry={focus:['stress'],problems:[],testKeys:['hh-weekly-pulse']}
  const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},search:'?entry=personal',
    extraModules:{'@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>entry}},
    fetcher:(_path,options,body)=>{
      if(!body)return state
      assert.equal(options.headers['X-HH-Account-ID'],'owner-a')
      if(body.action==='start')state={...state,course:course(body.courseId,1),courses:[course(body.courseId,1)]}
      if(body.action==='intake')state={...state,course:{...state.course,stage:2,revision:2,focusTags:body.focusTags}}
      return state
    }})
  await h.settle()
  assert.equal(findPart(h.tree,'CourseEntrySelector'),undefined)
  assert.equal(h.calls.filter(x=>x.body).length,0)
  findButton(h.tree,'Start').props.onClick();await h.settle()
  assert.equal(findButton(h.tree,'Agree & start').props.disabled,true)
  nodes(h.tree).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}})
  await h.settle();await findButton(h.tree,'Agree & start').props.onClick();await h.settle()
  assert.deepEqual(h.calls.filter(x=>x.body).map(x=>x.body.action),['start','intake'])
  assert.deepEqual([...h.calls.find(x=>x.body?.action==='intake').body.focusTags],['stress'])
  assert.ok(findPart(h.tree,'CourseR3Steps'))
  assert.equal(findPart(h.tree,'CourseEntrySelector'),undefined)
  h.unmount()
})

test('back from a public personal entry dismisses the intent and returns to the selector without writes',async()=>{
  const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},search:'?entry=personal',
    extraModules:{'@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>({focus:['stress'],problems:[],testKeys:[]})}},
    fetcher:()=>({course:null,courses:[],assessments:{},access:{...access,activeCourseCount:0}})})
  await h.settle();findButton(h.tree,'My courses').props.onClick();await h.settle()
  assert.ok(findPart(h.tree,'CourseEntrySelector'))
  assert.equal(h.calls.filter(x=>x.body).length,0)
  assert.ok(h.navigations.includes('/en/app/course'))
  h.unmount()
})

test('a consumed personal entry cannot populate a second separately consented course',async()=>{
  let current=null,entry={focus:['stress'],problems:[],testKeys:['hh-weekly-pulse']},courses=[]
  const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},search:'?entry=personal',
    extraModules:{'@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>entry}},
    fetcher:(_path,_options,body)=>{
      if(body?.action==='start'){current={...course(body.courseId,1),status:'draft'};courses.push(current)}
      if(body?.action==='intake')current={...current,stage:2,focusTags:body.focusTags,concerns:body.concerns,revision:2}
      return {course:current,courses,assessments:{},access:{...access,activeCourseCount:courses.length}}
    }})
  async function agree(){
    await h.settle();nodes(h.tree).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}})
    await h.settle();await findButton(h.tree,'Agree & start').props.onClick();await h.settle()
  }
  await h.settle();findButton(h.tree,'Start course for free').props.onClick();await agree()
  entry=null
  findButton(h.tree,'Start another course').props.onClick();await h.settle();findPart(h.tree,'CoursePresetCatalog').props.onPersonal();await agree()
  const starts=h.calls.filter(c=>c.body?.action==='start'),intakes=h.calls.filter(c=>c.body?.action==='intake')
  assert.equal(starts.length,2);assert.equal(intakes.length,1)
  assert.notEqual(starts[0].body.courseId,starts[1].body.courseId)
  assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,1)
  h.unmount()
})
