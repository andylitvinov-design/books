import test from 'node:test'
import assert from 'node:assert/strict'
import * as programs from '../lib/inner-growth/course-programs.js'
import {mount,findPart,deferred,account,courseA,courseView} from './helpers/course-ui-harness.mjs'
const scales=['load','tension','functioning'].map(key=>({id:'hh-weekly-pulse::weekly.'+key,label:key}))
const extraModules={
 '@/lib/inner-growth/course-strategy':{courseMeasuredProfile:()=>({eligible:scales,scales}),courseRecommendedTests:()=>[],courseSuggestedFocus:()=>scales},
 '@/lib/inner-growth/course-programs':{...programs,suggestCourseProgramScales:()=>scales},
 './course-completion-review':{default:()=>null},'./course-focus-picker':{default:()=>null},
}
const current={...courseA,stage:3,focusTags:['stress','mood','energy'],presetId:null,testKeys:['hh-weekly-pulse']}
const selection={answers:{F1:null,F5:2},goal:'AS4',moduleId:'AS4'}
test('new module finder submits through the guarded command with duplicate-start locking',async()=>{
 const slow=deferred(),writes=[],errors=[]
 const h=mount('course-r3-steps',{props:{stage:3,locale:'en',data:account('owner-a'),state:courseView(current),busy:false,root:'/en/app',isCourseCurrent:()=>true,onError:e=>errors.push(e),onState(){},onCourseCommand:async(action,body)=>{writes.push({action,body});return slow.promise}},extraModules,fetcher:()=>assert.fail('must use parent guarded command')})
 await h.settle();const finder=findPart(h.tree,'AntiStressModuleFinder');assert.ok(finder)
 const first=finder.props.onStart(selection),second=finder.props.onStart(selection);await h.settle()
 assert.equal(writes.length,1);assert.equal(writes[0].action,'choose-goals');assert.equal(writes[0].body.moduleId,'AS4');assert.equal(writes[0].body.moduleGoal,'AS4');assert.deepEqual(writes[0].body.moduleAnswers,selection.answers);assert.equal(writes[0].body.expectedRevision,current.revision)
 slow.resolve(courseView({...current,stage:4}));await Promise.all([first,second]);assert.ok(!errors.some(Boolean));h.unmount()
})
test('stale module finder cannot send its answers after account lifetime changes',async()=>{
 const parent=mount('my-course',{enterCourse:true,props:{data:account('owner-a')},search:'?courseId=course-a',fetcher:()=>courseView(current)})
 await parent.settle();const guarded=findPart(parent.tree,'CourseR3Steps').props
 const child=mount('course-r3-steps',{props:{...guarded,stage:3},extraModules,fetcher:()=>assert.fail('direct request forbidden')})
 await child.settle();const finder=findPart(child.tree,'AntiStressModuleFinder');assert.ok(finder)
 parent.render({data:account('owner-b')});await parent.settle();const before=parent.calls.filter(c=>c.body).length
 await finder.props.onStart(selection);await child.settle()
 assert.equal(parent.calls.filter(c=>c.body).length,before)
 child.unmount();parent.unmount()
})
