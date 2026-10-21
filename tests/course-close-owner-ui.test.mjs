import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, findPart, findButton, nodes, deferred, account, courseA, courseB, courseView, textOf } from './helpers/course-ui-harness.mjs'
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

const restartDisclosure = {
 en: 'Your course choices, optional notes and practice progress are saved privately in your account when you start.',
 ru: 'После начала курса ваш выбор, добровольные заметки и прогресс сохраняются приватно в личном кабинете.',
}
for(const locale of ['en','ru'])test(`legacy closed course restarts its exact identity after one disclosed deliberate click (${locale})`,async t=>{
 const prior={...courseA,status:'closed',revision:8,stage:4}
 const restarted={...prior,status:'active',stage:1,revision:9}
 const pending=deferred()
 const view=course=>courseView(course,{courses:[course],access:{tier:'free',activeCourseCount:course.status==='closed'?0:1,activeCourseLimit:1,multiCourseEnabled:false}})
 const h=mount('my-course',{props:{data:account('owner-a'),locale},fetcher:(_path,_options,body)=>body ? pending.promise : view(prior)})
 t.after(()=>h.unmount())
 const writes=()=>h.calls.filter(c=>c.body)
 await h.settle();assert.equal(writes().length,0,'loading the closed course must not write')
 findPart(h.tree,'CourseEntrySelector').props.onOpen();await h.settle()
 const dashboard=findPart(h.tree,'MyCoursesDashboard')
 assert.equal(dashboard.props.canAddCourse,true)
 assert.equal(writes().length,0,'opening course history must not write')
 dashboard.props.onNew();await h.settle()
 const catalog=findPart(h.tree,'CoursePresetCatalog')
 assert.ok(catalog,'the owner must see the course selection before starting')
 // Check actual rendered disclosure, not translation source or stubbed child props.
 const disclosure=nodes(h.tree).find(n=>n.type==='p'&&n.props.className==='privacy')
 assert.ok(disclosure,'private saving must be disclosed before the start action')
 assert.equal(textOf(disclosure).trim(),restartDisclosure[locale])
 assert.notEqual(disclosure.props.hidden,true)
 assert.notEqual(disclosure.props['aria-hidden'],true)
 assert.notEqual(disclosure.props['aria-hidden'],'true')
 assert.equal(writes().length,0,'viewing the selection and disclosure must not write')
 const startPersonal=catalog.props.onPersonal
 startPersonal();startPersonal();await h.settle()
 assert.equal(writes().length,1,'rapid double-clicks must send only one restart command')
 assert.equal(findButton(h.tree,locale==='ru'?'Согласен(на), начать':'Agree & start'),undefined,'one deliberate start must not open a second consent modal')
 assert.equal(nodes(h.tree).some(n=>n.type==='input'&&n.props.type==='checkbox'),false,'a second consent checkbox is not required')
 const start=writes()[0];assert.equal(start.body.action,'start')
 assert.equal(start.body.courseId,prior.id);assert.equal(start.body.newCourse,false);assert.equal(start.body.expectedRevision,8);assert.equal(start.body.consent,true)
 assert.equal(start.options.headers['X-HH-Account-ID'],'owner-a')
 pending.resolve(view(restarted));await h.settle()
 const active=findPart(h.tree,'CourseR3Steps')
 assert.equal(active.props.state.course.id,prior.id);assert.equal(active.props.state.course.status,'active');assert.equal(active.props.state.course.revision,9)
 startPersonal();await h.settle()
 assert.equal(writes().length,1,'an accepted same-ID restart must invalidate its retained callback')
 assert.equal(findPart(h.tree,'CourseR3Steps').props.state.course.id,prior.id)
})
