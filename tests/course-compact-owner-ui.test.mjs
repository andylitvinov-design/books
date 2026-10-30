import test from 'node:test'
import assert from 'node:assert/strict'
import {mount,nodes,findPart,account,courseA,courseView,deferred} from './helpers/course-ui-harness.mjs'
import * as programs from '../lib/inner-growth/course-programs.js'
const weekly={key:'hh-weekly-pulse',definitionVersion:1,instrumentLocale:'en',title:'Weekly Pulse',completed:false}
const current={...courseA,stage:2,presetId:null,focusTags:['stress','mood','energy'],testKeys:['hh-weekly-pulse']}
const snapshot=courseView(current,{assessments:{selectedTests:[{key:weekly.key,completed:false}],planKeys:[weekly.key]}})
const extraModules={
 '@/lib/inner-growth/course-strategy':{courseMeasuredProfile:()=>({eligible:[],scales:[]}),courseRecommendedTests:()=>[weekly],courseSuggestedFocus:()=>[]},
 '@/lib/inner-growth/course-programs':{...programs,suggestCourseProgramScales:()=>[]},
 './course-completion-review':{default:()=>null},'./course-focus-picker':{default:()=>null},
}
const button=h=>nodes(h.tree).find(n=>n.props?.['data-antistress-start-first-test']!==undefined)
for(const change of ['owner','course','unmount'])test('compact test launch rejects delayed '+change+' lifetime and duplicate click',async()=>{
 const slow=deferred();let active=true,reads=0;const errors=[]
 const h=mount('course-r3-steps',{props:{stage:2,data:account('owner-a'),state:snapshot,busy:false,root:'/en/app',quickEntry:true,
  isCourseCurrent:()=>active,onCourseRead:()=>{reads++;return slow.promise},onCourseCommand:()=>assert.fail('No stale command'),onState:()=>assert.fail('No stale state'),onError:e=>errors.push(e)},extraModules,
  fetcher:()=>assert.fail('No unscoped network')})
 await h.settle();assert.ok(button(h));const first=button(h).props.onClick(),second=button(h).props.onClick();assert.equal(reads,1)
 active=false;if(change==='unmount')h.unmount();slow.resolve(snapshot);await Promise.all([first,second]);await h.settle()
 assert.equal(h.navigations.length,0);assert.equal(h.calls.length,0);assert.ok(!errors.some(Boolean));h.unmount()
})
for(const change of ['owner','unmount'])test('fast consent captures lifetime before creation and cannot intake after '+change,async()=>{
 const slow=deferred(),writes=[];let requested
 const empty={course:null,courses:[],assessments:{},access:{multiCourseEnabled:true,activeCourseLimit:5,activeCourseCount:0}}
 const h=mount('my-course',{search:'?program=stress&entry=quick',props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
  if(!body)return empty;writes.push(body);requested=body.courseId;return slow.promise
 }})
 await h.settle();const start=findPart(h.tree,'OporaFirstWeekInvite');assert.ok(start)
 const first=start.props.onAccept(),second=start.props.onAccept();await h.settle();assert.equal(writes.length,1);assert.equal(writes[0].newCourse,true)
 if(change==='owner'){h.render({data:account('owner-b')});await h.settle()}else h.unmount()
 slow.resolve({...empty,course:{...courseA,id:requested,stage:1,presetId:null}});await Promise.all([first,second]);await h.settle();assert.equal(writes.length,1);h.unmount()
})
test('fast consent preserves capacity and preset exclusions',async()=>{
 const h=mount('my-course',{search:'?program=stress&entry=quick',props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
  assert.equal(body,null);return {course:null,courses:[],assessments:{},access:{multiCourseEnabled:true,activeCourseLimit:1,activeCourseCount:1}}
 }})
 await h.settle();const start=findPart(h.tree,'OporaFirstWeekInvite');assert.ok(start);assert.equal(start.props.disabled,true)
 await start.props.onAccept();assert.equal(h.calls.filter(c=>c.body).length,0);h.unmount()
})
test('compact plan save carries owner and cannot confirm after selection changes',async()=>{
 const slow=deferred();let active=true,confirmed=0
 const unselected=courseView({...current,testKeys:[]},{assessments:{selectedTests:[],planKeys:[]}})
 const h=mount('course-r3-steps',{props:{stage:2,data:account('owner-a'),state:unselected,busy:false,root:'/en/app',quickEntry:true,
  isCourseCurrent:()=>active,onCourseRead:()=>assert.fail('No unselected read'),onCourseCommand:()=>{confirmed++;throw Error('Must not confirm')},onState:()=>assert.fail('No stale state'),onError(){}},extraModules,
  fetcher:(path,options,body)=>{assert.equal(path,'/api/app/test-plans');assert.equal(options.headers['X-HH-Account-ID'],'owner-a');assert.equal(body.items.length,1);return slow.promise}})
 await h.settle();const pending=button(h).props.onClick();await h.settle();assert.equal(h.calls.length,1);active=false;slow.resolve({ok:true});await pending;await h.settle();assert.equal(confirmed,0);assert.equal(h.navigations.length,0);h.unmount()
})
