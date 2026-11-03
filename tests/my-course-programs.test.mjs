import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  COURSE_PROGRAMS, getCourseProgram, courseProgramFromTopics,
  orderCourseProgramTests, suggestCourseProgramScales, courseProgramDay, COURSE_PROGRAM_ARCS,
} from '../lib/inner-growth/course-programs.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('three bilingual pain-led programmes map to existing, valid course topic tags', () => {
  assert.deepEqual(COURSE_PROGRAMS.map(program => program.id), ['stress', 'confidence', 'focus'])
  for (const programme of COURSE_PROGRAMS) {
    assert.equal(courseProgramFromTopics([...programme.focusTags].reverse())?.id, programme.id)
    assert.ok(programme.title.en && programme.title.ru && programme.promise.en && programme.promise.ru)
    assert.equal(programme.focusTags.length, 3)
    assert.equal(programme.starterKeys.length, new Set(programme.starterKeys).size)
  }
  assert.equal(courseProgramFromTopics(['stress', 'attention']), null)
  assert.equal(courseProgramFromTopics(['stress', 'mood', 'energy', 'relationships']), null)
  assert.equal(getCourseProgram('not-real'), null)
})

test('starter battery is deterministic and only reorders real rights-cleared recommendations', () => {
  const current = ['other', 'hh-resource-pulse', 'hh-weekly-pulse', 'hh-current-state', 'other-2', 'other-3']
    .map((key, i) => ({ key, title:key, completed:i%2===0 }))
  const result = orderCourseProgramTests(current, 'stress')
  assert.deepEqual(result.slice(0, 3).map(test => test.key),
    ['hh-weekly-pulse', 'hh-resource-pulse', 'other'])
  assert.deepEqual(result.map(test => test.key).sort(), current.map(test => test.key).sort())
  const withGad = orderCourseProgramTests([...current, {key:'gad-7', title:'GAD-7'}], 'stress')
  assert.deepEqual(withGad.slice(0, 3).map(test => test.key),
    ['hh-weekly-pulse', 'gad-7', 'hh-resource-pulse'])
  assert.equal(result.filter(test => test.recommended).length, 5)
  assert.deepEqual(orderCourseProgramTests(current, null), current)
  assert.equal(result.find(test => test.key === 'other').completed, true)
  const missing = orderCourseProgramTests([{ key:'hh-resource-pulse' }], 'confidence')
  assert.deepEqual(missing.map(test => test.key), ['hh-resource-pulse'])
})

test('track-aware three-scale suggestions use only eligible measured values', () => {
  const raw = [
    { id:'a',goal:'energy_agency',eligible:true,score:2,priorityPercent:91 },
    { id:'b',goal:'inner_support',eligible:true,score:4,priorityPercent:12 },
    { id:'c',goal:'connection_boundaries',eligible:true,score:4,priorityPercent:52 },
    { id:'d',goal:'calm_regulation',eligible:true,score:8,priorityPercent:72 },
    { id:'e',goal:'attention_clarity',eligible:true,score:3,priorityPercent:34 },
    { id:'unmeasured',goal:'inner_support',eligible:false,score:0,priorityPercent:99 },
  ]
  assert.deepEqual(suggestCourseProgramScales({eligible:raw},'confidence').map(s=>s.id), ['b','c','a'])
  assert.deepEqual(suggestCourseProgramScales({eligible:raw},'stress').map(s=>s.id), ['d','a','c'])
  assert.deepEqual(suggestCourseProgramScales({eligible:raw},'focus').map(s=>s.id), ['e','a','d'])
  assert.deepEqual(suggestCourseProgramScales({eligible:[]},'stress'),[])
})

test('the new UI uses one consented start and private existing test/lesson endpoints', () => {
  const shell = read('components/app/my-course.jsx')
  const wizard = read('components/app/course-r3-steps.jsx')
  const style = read('components/app/my-course.module.css')
  assert.match(shell, /data-course-program-selection/)
  assert.match(shell, /data-course-program-id=\{program.id\}/)
  assert.match(shell, /data-course-personal-program/)
  assert.match(shell, /function startSelectedCourse\(presetId = null, programId = null\)/)
  assert.match(shell, /const values = \{ consent: true,/)
  assert.match(shell, /request\(accountId, \{ action: 'start', consent: true, courseId: requestedCourseId,/)
  assert.match(shell, /newCourse: access\?\.multiCourseEnabled === true/)
  assert.match(shell, /action: 'intake'/)
  assert.match(shell, /expectedRevision: started.course.revision/)
  assert.match(wizard, /orderCourseProgramTests\(courseRecommendedTests/)
  assert.match(wizard, /suggestCourseProgramScales\(profile,programme.id,3\)/)
  assert.match(wizard, /data-course-selected-programme/)
  assert.match(style, /@media\(max-width:530px\)/)
  assert.doesNotMatch(shell, /localStorage|sessionStorage|dangerouslySetInnerHTML/)
})

test('each flagship has fourteen complete, distinct, bilingual self-help prompts', () => {
  for (const program of COURSE_PROGRAMS) {
    const days = COURSE_PROGRAM_ARCS[program.id]
    assert.equal(days.length,14)
    assert.equal(new Set(days.map(day => day.title.en)).size,14)
    for (let day = 1; day <= 14; day++) {
      const en = courseProgramDay(program.id,day,'en')
      const ru = courseProgramDay(program.id,day,'ru')
      assert.equal(en.day,day)
      assert.equal(ru.day,day)
      assert.ok(en.title.length > 5 && en.prompt.length > 15)
      assert.ok(ru.title.length > 5 && ru.prompt.length > 15)
    }
  }
  assert.equal(courseProgramDay('stress',15),null)
  assert.equal(courseProgramDay('unknown',1),null)
})

test('the authenticated daily API overlays curriculum without touching existing lesson validation', () => {
  const server = read('lib/app/growth-daily.js')
  const today = read('components/app/course-today.jsx')
  const quest = read('components/app/course-quest.jsx')
  assert.match(server,/programme:programme\?\{id:programme.id/)
  assert.match(server,/programmeDay:programme \? \(usesOporaOutcomeChecks/)
  assert.match(server,/const isOporaNav2=/)
  assert.match(today,/data.programme\?\.day\?\.prompt/)
  assert.match(quest,/item.programmeDay\?\.title/)
  assert.match(server,/const lessonGoal=currentFocus.goal/)
  assert.match(server,/lessonFor\(lessonGoal,dayInfo.day/)
})

import { mount, nodes, findButton, findPart, deferred, account, course, access } from './helpers/course-ui-harness.mjs'
import { COURSE_PRESETS } from '../lib/inner-growth/course-presets.js'
import * as courseStrategy from '../lib/inner-growth/course-strategy.js'
const view=current=>({course:current,courses:current?[current]:[],assessments:{},access:{...access,activeCourseCount:current?1:0}})
const chooseProgram=async(h,id='stress')=>{
 nodes(h.tree).find(node=>node.props['data-course-program-id']===id).props.onClick();await h.settle()
}
const writes=h=>h.calls.filter(call=>call.body)

test('flagship starts on one deliberate signed-in click, while double-taps and stale callbacks never duplicate enrolment',async()=>{
 const slow=deferred();let started
 const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
  if(!body)return view(null)
  if(body.action==='start'){started={...course(body.courseId),revision:7};return slow.promise}
  return view({...started,stage:2,revision:8,focusTags:body.focusTags})
 }})
 await h.settle()
 const card=nodes(h.tree).find(node=>node.props['data-course-program-id']==='stress')
 assert.ok(card)
 assert.equal(writes(h).length,0, 'viewing the programme alone does not create an enrolment')
 card.props.onClick()
 card.props.onClick()
 await h.settle()
 assert.equal(findButton(h.tree,'Agree & start'),undefined)
 assert.equal(writes(h).length,1,'two rapid clicks send one owner-bound start request')
 assert.equal(writes(h)[0].body.newCourse,true)
 assert.equal(writes(h)[0].body.consent,true)
 slow.resolve(view(started));await h.settle()
 assert.equal(writes(h).length,2)
 const intake=writes(h)[1]
 assert.equal(intake.body.action,'intake');assert.equal(intake.body.courseId,started.id);assert.equal(intake.body.expectedRevision,7)
 assert.deepEqual(intake.body.focusTags,[...getCourseProgram('stress').focusTags])
 assert.ok(writes(h).every(call=>call.options.headers['X-HH-Account-ID']==='owner-a'&&call.path.includes(encodeURIComponent(started.id))))
 assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2)
 card.props.onClick();await h.settle();assert.equal(writes(h).length,2,'an old start callback cannot allocate another course')
 h.unmount()
})

test('first-request quota/unknown failure never submits intake and retry retains the original new-course ID',async()=>{
 for(const failure of ['ACTIVE_COURSE_LIMIT_REACHED','SERVICE_UNAVAILABLE']){
  let attempt=0,created
  const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
   if(!body)return view(null)
   if(body.action==='start'){attempt++;if(attempt===1)return {error:failure};created=course(body.courseId);return view(created)}
   return view({...created,stage:2,focusTags:body.focusTags})
  }})
  await h.settle();await chooseProgram(h);await h.settle()
  assert.equal(writes(h).length,1);assert.equal(findPart(h.tree,'CourseR3Steps'),undefined)
  await chooseProgram(h);await h.settle()
  assert.equal(writes(h).filter(call=>call.body.action==='start').length,2)
  assert.equal(writes(h)[0].body.courseId,writes(h)[1].body.courseId)
  assert.equal(writes(h).filter(call=>call.body.action==='intake').length,1);h.unmount()
 }
})

test('failed or uncertain intake remains on the created course and explicit retry never creates a second course',async()=>{
 for(const committed of [false,true]){
  let current=null,attempt=0
  const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
   if(!body)return view(current)
   if(body.action==='start'){current={...course(body.courseId),revision:3};return view(current)}
   attempt++
   if(attempt===1){if(committed)current={...current,stage:2,revision:4,focusTags:body.focusTags};return {error:'SERVICE_UNAVAILABLE'}}
   current={...current,stage:2,revision:current.revision+1,focusTags:body.focusTags};return view(current)
  }})
  await h.settle();await chooseProgram(h,'stress');await h.settle()
  const createdId=writes(h)[0].body.courseId
  assert.equal(findPart(h.tree,'CourseR3Steps').props.state.course.id,createdId)
  assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,1)
  assert.ok(findButton(h.tree,'Retry programme setup'))
  // A generic refresh does not clear the user's retained programme choice.
  findButton(h.tree,'Check saved status').props.onClick();await h.settle();assert.ok(findButton(h.tree,'Retry programme setup'))
  findButton(h.tree,'Retry programme setup').props.onClick();await h.settle()
  assert.equal(writes(h).filter(call=>call.body.action==='start').length,1)
  assert.equal(writes(h).filter(call=>call.body.action==='intake').length,committed?1:2)
  assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2)
  assert.deepEqual(findPart(h.tree,'CourseR3Steps').props.state.course.focusTags,[...getCourseProgram('stress').focusTags])
  assert.equal(findButton(h.tree,'Retry programme setup'),undefined)
  assert.ok(writes(h).every(call=>call.body.courseId===createdId));h.unmount()
 }
})

test('account or selected-course changes during start prevent the second request and stale screen updates',async()=>{
 for(const change of ['owner','course','unmount']){
  const slow=deferred();let pendingId
  const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(path,_options,body)=>{
   if(body){pendingId=body.courseId;return slow.promise}
   return path.includes('course-other')?view(course('course-other')):view(null)
  }})
  await h.settle();await chooseProgram(h);await h.settle()
  if(change==='owner')h.render({data:account('owner-b')})
  else if(change==='course')await h.backTo('?courseId=course-other')
  else h.unmount()
  slow.resolve(view(course(pendingId)));await h.settle()
  assert.equal(writes(h).length,1)
  assert.ok(!h.navigations.some(path=>path.includes(pendingId)))
  h.unmount()
 }
})

test('selection changes during intake and before a retained retry cannot mutate or replace another course',async()=>{
 const slow=deferred();let created
 const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(path,_options,body)=>{
  if(!body)return path.includes('course-other')?view(course('course-other')):view(created||null)
  if(body.action==='start'){created=course(body.courseId);return view(created)}
  return slow.promise
 }})
 await h.settle();await chooseProgram(h);await h.settle()
 assert.equal(writes(h).length,2)
 await h.backTo('?courseId=course-other');slow.resolve(view({...created,stage:2,focusTags:getCourseProgram('stress').focusTags}));await h.settle()
 assert.equal(findPart(h.tree,'CourseR3Steps').props.state.course.id,'course-other')
 assert.equal(writes(h).length,2)
 await h.backTo('?courseId='+created.id)
 const retry=findButton(h.tree,'Retry programme setup').props.onClick
 await h.backTo('?courseId=course-other');retry();await h.settle()
 assert.equal(writes(h).length,2);assert.equal(findPart(h.tree,'CourseR3Steps').props.state.course.id,'course-other')
 h.unmount()
})

test('a delayed billing refresh cannot roll an accepted programme intake back to stage one',async()=>{
 const intake=deferred(),read=deferred();let current=null,background=false
 let billing={phase:'ready',status:{entitlement:{tier:'free'}}}
 const props={data:account('owner-a')}
 const h=mount('my-course', { enterCourse: true, props,extraModules:{'./subscription-access':{useSubscription:()=>billing}},fetcher:(_path,_options,body)=>{
  if(!body)return background?read.promise:view(current)
  if(body.action==='start'){current=course(body.courseId);return view(current)}
  return intake.promise
 }})
 await h.settle();await chooseProgram(h);await h.settle()
 background=true;billing={phase:'ready',status:{entitlement:{tier:'advanced'}}};h.render(props);await h.settle()
 const stageOne=view(current)
 intake.resolve(view({...current,stage:2,focusTags:[...getCourseProgram('stress').focusTags]}));await h.settle()
 assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2)
 read.resolve(stageOne);await h.settle();assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2)
 h.unmount()
})

test('switching an existing course keeps preset/personal actions and never starts a programme or a second course',async()=>{
 for(const presetId of ['confidence',null]){
  const selected=course('existing',1)
  const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},search:'?courseId=existing',fetcher:(_path,_options,body)=>view(body?{...selected,presetId:body.presetId||null}:selected)})
  await h.settle();findButton(h.tree,'Change course direction').props.onClick();await h.settle()
  assert.equal(nodes(h.tree).filter(node=>node.props['data-course-program-id']).length,0)
  const catalog=findPart(h.tree,'CoursePresetCatalog')
  if(presetId)catalog.props.onPreset(presetId);else catalog.props.onPersonal()
  await h.settle();await h.settle()
  assert.equal(writes(h).length,1);assert.equal(writes(h)[0].body.action,presetId?'select-preset':'select-personal')
  assert.equal(writes(h)[0].body.courseId,'existing');assert.equal(writes(h)[0].body.newCourse,undefined)
  h.unmount()
 }
})

test('flagship ordering cannot reorder or relabel a fixed preset, even for the shared confidence ID',async()=>{
 const allKeys=[...new Set(COURSE_PRESETS.flatMap(p=>p.testKeys))]
 const recommended=allKeys.slice().reverse().map(key=>({key,selectable:true,title:key,measurementAxes:[]}))
 for(const preset of COURSE_PRESETS){
  const h=mount('course-r3-steps',{props:{stage:2,data:account('owner-a'),state:{course:{...course('fixed',2),presetId:preset.id,focusTags:getCourseProgram('confidence').focusTags},assessments:{}},isCourseCurrent:()=>true},extraModules:{
   '@/lib/inner-growth/course-strategy':{...courseStrategy,courseRecommendedTests:()=>recommended,courseMeasuredProfile:()=>({eligible:[],all:[]})},
   './course-completion-review':{__esModule:true,default:()=>null},'./course-focus-picker':{__esModule:true,default:()=>null},
  }})
  await h.settle()
  const boxes=nodes(h.tree).filter(node=>node.type==='input'&&node.props.type==='checkbox')
  assert.equal(boxes.length,preset.testKeys.length)
  assert.ok(!nodes(h.tree).some(node=>node.props['data-course-selected-programme']!==undefined))
  const labels=nodes(h.tree).filter(node=>node.type==='label').map(node=>JSON.stringify(node.props.children)).join(' ')
  let previous=-1
  for(const key of preset.testKeys){const position=labels.indexOf(key);assert.ok(position>previous);previous=position}
  h.unmount()
 }
})

test('unknown fixed-preset start cannot be reinterpreted as a flagship even when confidence IDs match',async()=>{
 let stored=null,attempt=0
 const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
  if(!body)return view(null)
  assert.equal(body.action,'start','intake must never reach a fixed preset')
  attempt++
  if(attempt===1){stored={...course(body.courseId,2),presetId:'confidence',focusTags:[...COURSE_PRESETS.find(p=>p.id==='confidence').focusTags]};return {error:'SERVICE_UNAVAILABLE'}}
  return view(stored)
 }})
 await h.settle();findPart(h.tree,'CoursePresetCatalog').props.onPreset('confidence');await h.settle();await h.settle()
 await chooseProgram(h,'confidence');await h.settle()
 assert.equal(writes(h).length,1,'coming-soon programme cannot reinterpret an uncertain fixed-preset start')
 await chooseProgram(h,'stress');await h.settle()
 assert.equal(writes(h).length,2);assert.equal(writes(h)[0].body.courseId,writes(h)[1].body.courseId)
 assert.equal(findPart(h.tree,'CourseR3Steps').props.state.course.presetId,'confidence')
 assert.deepEqual(findPart(h.tree,'CourseR3Steps').props.state.course.focusTags,stored.focusTags)
 assert.equal(findButton(h.tree,'Retry programme setup'),undefined)
 const server=read('lib/app/growth-course.js')
 assert.match(server,/if \(currentPreset\?\.id !== preset.id\) \{\s*if \(row.stage !== 1\) reject\('COURSE_ALREADY_CONFIGURED',409\)/)
 assert.match(server,/if \(coursePresetForTags\(row.focus_tags\)\) reject\('COURSE_PRESET_TESTS_FIXED',409\)/)
 h.unmount()
})

test('successful explicit intake retry invalidates a concurrent pre-intake billing read',async()=>{
 const intake=deferred(),read=deferred();let current=null,attempt=0,background=false
 let billing={phase:'ready',status:{entitlement:{tier:'free'}}}
 const props={data:account('owner-a')}
 const h=mount('my-course', { enterCourse: true, props,extraModules:{'./subscription-access':{useSubscription:()=>billing}},fetcher:(_path,_options,body)=>{
  if(!body)return background?read.promise:view(current)
  if(body.action==='start'){current=course(body.courseId);return view(current)}
  return ++attempt===1?{error:'SERVICE_UNAVAILABLE'}:intake.promise
 }})
 await h.settle();await chooseProgram(h);await h.settle()
 findButton(h.tree,'Retry programme setup').props.onClick();await h.settle()
 background=true;billing={phase:'ready',status:{entitlement:{tier:'advanced'}}};h.render(props);await h.settle()
 const stageOne=view(current)
 intake.resolve(view({...current,stage:2,focusTags:[...getCourseProgram('stress').focusTags]}));await h.settle()
 assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2)
 read.resolve(stageOne);await h.settle();assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2)
 assert.equal(writes(h).filter(call=>call.body.action==='start').length,1)
 h.unmount()
})

test('Personal retry reports an already-created fixed preset as a changed contract rather than silent success',async()=>{
 let stored=null,attempt=0
 const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
  if(!body)return view(null)
  assert.equal(body.action,'start')
  if(++attempt===1){stored={...course(body.courseId,2),presetId:'calm_balance',focusTags:['stress','energy']};return {error:'SERVICE_UNAVAILABLE'}}
  return view(stored)
 }})
 await h.settle();findPart(h.tree,'CoursePresetCatalog').props.onPreset('calm_balance');await h.settle();await h.settle()
 findPart(h.tree,'CoursePresetCatalog').props.onPersonal();await h.settle();await h.settle()
 assert.equal(writes(h).length,2);assert.equal(writes(h)[0].body.courseId,writes(h)[1].body.courseId)
 assert.equal(findPart(h.tree,'CourseR3Steps').props.state.course.presetId,'calm_balance')
 assert.ok(nodes(h.tree).some(node=>node.props.role==='alert'&&JSON.stringify(node.props.children).includes('COURSE_START_SELECTION_CHANGED')))
 assert.equal(findButton(h.tree,'Retry programme setup'),undefined)
 h.unmount()
})

test('an explicit successful direction change clears an obsolete programme retry',async()=>{
 for(const presetId of [null,'business_focus']){
  let current=null
  const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
   if(!body)return view(current)
   if(body.action==='start'){current=course(body.courseId);return view(current)}
   if(body.action==='intake')return {error:'SERVICE_UNAVAILABLE'}
   current={...current,stage:presetId?2:1,presetId,revision:2};return view(current)
  }})
  await h.settle();await chooseProgram(h);await h.settle();assert.ok(findButton(h.tree,'Retry programme setup'))
  const staleRetry=findButton(h.tree,'Retry programme setup').props.onClick
  findButton(h.tree,'Change course direction').props.onClick();await h.settle()
  const catalog=findPart(h.tree,'CoursePresetCatalog')
  if(presetId)catalog.props.onPreset(presetId);else catalog.props.onPersonal()
  await h.settle();await h.settle()
  assert.equal(findButton(h.tree,'Retry programme setup'),undefined)
  const count=h.calls.length;staleRetry();await h.settle();assert.equal(h.calls.length,count)
  assert.equal(writes(h).filter(call=>call.body.action==='start').length,1)
  h.unmount()
 }
})

test('manual intake clears the live programme intent so a retained retry cannot revive it on the same course',async()=>{
 let current=null,intakes=0
 const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:(_path,_options,body)=>{
  if(!body)return view(current)
  if(body.action==='start'){current=course(body.courseId);return view(current)}
  if(body.action==='intake'&&++intakes===1)return {error:'SERVICE_UNAVAILABLE'}
  current={...current,stage:2,revision:2,focusTags:body.focusTags};return view(current)
 }})
 await h.settle();await chooseProgram(h);await h.settle()
 const retry=findButton(h.tree,'Retry programme setup').props.onClick
 await findPart(h.tree,'CourseR3Steps').props.onAct('intake',{concerns:'My different focus',focusTags:['sleep']});await h.settle()
 const count=h.calls.length;retry();await h.settle();assert.equal(h.calls.length,count)
 assert.equal(findButton(h.tree,'Retry programme setup'),undefined)
 assert.deepEqual(findPart(h.tree,'CourseR3Steps').props.state.course.focusTags,['sleep'])
 h.unmount()
})

test('plain hero defaults to Anti-Stress while guided concerns survive failed intake and explicit retry',async()=>{
 for(const guided of [false,true]) {
  let current=null,attempt=0
  const entry={focus:['stress'],problems:['stress-tension'],testKeys:[]}
  const h=mount('my-course',{enterCourse:true,props:{data:account('owner-a')},extraModules:{
   '@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>guided?entry:null},
   '@/lib/inner-growth/course-entry-intent':{courseTagsForExplorerFocus:()=>['stress'],courseConcernsFromIntent:value=>value?'Captured guided concern':''},
  },fetcher:(_path,options,body)=>{
   if(!body)return view(current)
   assert.equal(options.headers['X-HH-Account-ID'],'owner-a')
   if(body.action==='start'){current=course(body.courseId);return view(current)}
   assert.equal(body.action,'intake');assert.equal(body.concerns,guided?'Captured guided concern':'')
   assert.deepEqual(body.focusTags,[...getCourseProgram('stress').focusTags])
   if(++attempt===1)return {error:'SERVICE_UNAVAILABLE'}
   current={...current,stage:2,revision:2,focusTags:body.focusTags};return view(current)
  }})
  await h.settle();findButton(h.tree,'Start course for free').props.onClick();await h.settle();await h.settle()
  assert.equal(writes(h).filter(x=>x.body.action==='start').length,1)
  assert.ok(findButton(h.tree,'Retry programme setup'))
  findButton(h.tree,'Retry programme setup').props.onClick();await h.settle()
  assert.equal(writes(h).filter(x=>x.body.action==='start').length,1)
  assert.equal(writes(h).filter(x=>x.body.action==='intake').length,2)
  assert.equal(findPart(h.tree,'CourseR3Steps').props.stage,2);h.unmount()
 }
})

test('captured guided programme concerns cannot dispatch after owner or course changes during retry read',async()=>{
 for(const change of ['owner','course']){
  let current=null,retrying=false;const slow=deferred()
  const h=mount('my-course',{enterCourse:true,props:{data:account('owner-a')},extraModules:{
   '@/lib/inner-growth/course-entry-client':{readCourseEntryIntent:()=>({focus:['stress'],problems:[],testKeys:[]})},
   '@/lib/inner-growth/course-entry-intent':{courseTagsForExplorerFocus:()=>['stress'],courseConcernsFromIntent:()=> 'Captured guided concern'},
  },fetcher:(path,_options,body)=>{
   if(!body)return retrying&&!path.includes('other')?slow.promise:view(path.includes('other')?course('other'):current)
   if(body.action==='start'){current=course(body.courseId);return view(current)}
   return {error:'SERVICE_UNAVAILABLE'}
  }})
  await h.settle();await chooseProgram(h);await h.settle();retrying=true
  findButton(h.tree,'Retry programme setup').props.onClick();await h.settle()
  if(change==='owner')h.render({data:account('owner-b')});else await h.backTo('?courseId=other')
  slow.resolve(view(current));await h.settle()
  assert.equal(writes(h).length,2,'stale retry must not dispatch a second intake');h.unmount()
 }
})
