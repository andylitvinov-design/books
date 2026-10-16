import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, findPart, findButton, nodes, deferred, account, courseA, courseB, courseView } from './helpers/course-ui-harness.mjs'
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

test('legacy closed course restarts its exact identity only after renewed consent',async()=>{
 const prior={...courseA,status:'closed',revision:8,stage:4}
 const view=course=>courseView(course,{courses:[course],access:{tier:'free',activeCourseCount:0,activeCourseLimit:1,multiCourseEnabled:false}})
 const h=mount('my-course',{props:{data:account('owner-a'),locale:'en'},fetcher:(_path,_options,body)=>body ? view({...prior,status:'active',stage:body.action==='start'?1:2,revision:9}) : view(prior)})
 await h.settle();findPart(h.tree,'CourseEntrySelector').props.onOpen();await h.settle()
 const dashboard=findPart(h.tree,'MyCoursesDashboard')
 assert.equal(dashboard.props.canAddCourse,true)
 dashboard.props.onNew();await h.settle()
 findPart(h.tree,'CoursePresetCatalog').props.onPersonal();await h.settle()
 assert.equal(h.calls.filter(c=>c.body).length,0);assert.equal(findButton(h.tree,'Agree & start').props.disabled,true)
 nodes(h.tree).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});await h.settle()
 await findButton(h.tree,'Agree & start').props.onClick();await h.settle()
 const start=h.calls.find(c=>c.body?.action==='start');assert.ok(start)
 assert.equal(start.body.courseId,prior.id);assert.equal(start.body.newCourse,false);assert.equal(start.body.expectedRevision,8);assert.equal(start.body.consent,true)
 assert.equal(start.options.headers['X-HH-Account-ID'],'owner-a');h.unmount()
})
