import test from 'node:test'
import assert from 'node:assert/strict'
import * as programs from '../lib/inner-growth/course-programs.js'
import { mount, findPart, findButton, nodes, deferred, account, courseA, courseView } from './helpers/course-ui-harness.mjs'

const scales = ['load','tension','functioning'].map(key => ({id:'hh-weekly-pulse::weekly.'+key,label:key}))
const part = name => ({ default: Object.assign(() => null, { testName: name }) })
const extraModules = {
  './course-completion-review': part('CourseCompletionReview'),
  './course-focus-picker': part('CourseFocusPicker'),
  '@/lib/inner-growth/course-strategy': {
    courseMeasuredProfile:()=>({eligible:scales,scales}),courseRecommendedTests:()=>[],courseSuggestedFocus:()=>scales,
  },
  '@/lib/inner-growth/course-programs': {...programs,suggestCourseProgramScales:()=>scales},
}
const current = {...courseA,stage:3,focusTags:['stress','mood','energy'],presetId:null,testKeys:['hh-weekly-pulse']}
const selection = {answers:{F1:null,F5:2},goal:'AS5',moduleId:'AS5'}

test('explicit Lets go starts recommended module with saved measured focus in one step',async()=>{
  const slow=deferred(),writes=[],errors=[],snapshots=[]
  const h=mount('course-r3-steps',{props:{
    stage:3,locale:'en',data:account('owner-a'),state:courseView(current),busy:false,root:'/en/app',
    isCourseCurrent:()=>true,onError:e=>errors.push(e),onState:value=>snapshots.push(value),
    onCourseCommand:async(action,body)=>{writes.push({action,body});return slow.promise},
    onCourseRead:()=>assert.fail('No recovery needed'),
  },extraModules,fetcher:()=>assert.fail('must use parent guarded command')})
  await h.settle()
  const finder=findPart(h.tree,'AntiStressModuleFinder')
  assert.ok(finder)
  finder.props.onStart(selection)
  await h.settle()
  assert.equal(writes.length,1,'one explicit start click should send one server command')
  assert.equal(writes[0].action,'choose-goals')
  assert.deepEqual(Array.from(writes[0].body.scaleKeys),scales.map(s=>s.id))
  assert.equal(writes[0].body.moduleId,'AS5')
  assert.equal(writes[0].body.moduleGoal,'AS5')
  assert.equal(writes[0].body.expectedRevision,current.revision)
  assert.equal(writes[0].body.consent,true)
  assert.equal(JSON.stringify(writes[0].body.moduleAnswers),JSON.stringify(selection.answers))
  assert.equal(findPart(h.tree,'CourseCompletionReview'),undefined,'No redundant scale confirmation')
  slow.resolve(courseView({...current,stage:4}))
  await h.settle()
  assert.ok(!errors.some(Boolean))
  h.unmount()
})

test('AS4 clinician-only cannot launch and stale selection cannot write',async()=>{
  const writes=[],errors=[]
  let fresh=true
  const h=mount('course-r3-steps',{props:{
    stage:3,locale:'ru',data:account('owner-a'),state:courseView(current),busy:false,root:'/ru/app',
    isCourseCurrent:()=>fresh,onError:e=>errors.push(e),onState(){},
    onCourseCommand:async(...args)=>writes.push(args),
  },extraModules,fetcher:()=>assert.fail('direct request forbidden')})
  await h.settle()
  const finder=findPart(h.tree,'AntiStressModuleFinder')
  finder.props.onStart({...selection,moduleId:'AS4',goal:'AS4'})
  await h.settle()
  assert.equal(writes.length,0)
  assert.ok(errors.includes('COURSE_MODULE_FINDER_INVALID'))
  fresh=false
  finder.props.onStart(selection)
  await h.settle()
  assert.equal(writes.length,0)
  h.unmount()
})

for (const locale of ['en','ru','es']) test('actual '+locale+' welcome renders direct CTA and keeps clinical module protected',async()=>{
  const writes=[]
  const profile={scales:['load','tension','functioning'].map(key=>({
    id:'hh-weekly-pulse::weekly.'+key,testKey:'hh-weekly-pulse',score:4,
    min:0,max:10,recent:true,measuredAt:new Date().toISOString(),resultId:'synthetic-weekly',
  }))}
  const h=mount('antistress-module-finder',{props:{locale,profile,onStart:selection=>writes.push(selection)}})
  await h.settle()
  const label=({en:'Let’s go',ru:'Поехали!',es:'¡Vamos!'})[locale]
  const start=findButton(h.tree,label)
  assert.ok(start)
  assert.equal(start.props.disabled,false)
  const details=nodes(h.tree).find(node=>node.type==='details')
  assert.ok(details)
  assert.equal(details.props.open,undefined)
  findButton(h.tree,locale==='ru'?'Работа с травмой со специалистом':locale==='es'?'Atención del trauma con especialista':'Clinician-supported trauma care').props.onClick()
  await h.settle()
  const blocked=findButton(h.tree,label)
  assert.equal(blocked.props.disabled,true)
  blocked.props.onClick()
  assert.equal(writes.length,0)
  findButton(h.tree,locale==='ru'?'Стабилизация и саморегуляция':locale==='es'?'Estabilización y autorregulación':'Stabilization and self-regulation').props.onClick()
  await h.settle()
  findButton(h.tree,label).props.onClick()
  assert.equal(writes.length,1)
  assert.equal(writes[0].moduleId,'AS2')
  h.unmount()
})

test('course owner/session-bound launch is guarded by the parent',async()=>{
  const parent=mount('my-course',{enterCourse:true,props:{data:account('owner-a')},search:'?courseId=course-a',fetcher:()=>courseView(current)})
  await parent.settle()
  const guarded=findPart(parent.tree,'CourseR3Steps').props
  const child=mount('course-r3-steps',{props:{...guarded,stage:3},extraModules,fetcher:()=>assert.fail('direct request forbidden')})
  await child.settle()
  const finder=findPart(child.tree,'AntiStressModuleFinder')
  parent.render({data:account('owner-b')});await parent.settle()
  const before=parent.calls.filter(c=>c.body).length
  finder.props.onStart(selection);await child.settle()
  assert.equal(parent.calls.filter(c=>c.body).length,before)
  child.unmount();parent.unmount()
})
