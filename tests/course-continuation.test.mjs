// Actual repository logic with synthetic transaction and crypto adapters only.
// No database, network, real account records or encryption verification.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {courseNextCycleScaleKeys,courseContinuationGoals} from '../lib/inner-growth/course-strategy.js'
import {localDateKey,addCalendarDays} from '../lib/inner-growth/course-progress.js'
import {COURSE_CONTENT_V3} from '../lib/inner-growth/course-v3.js'
import {COURSE_CONTENT_V4} from '../lib/inner-growth/course-v4.js'
import {COURSE_CONTENT_VERSION,lessonFor} from '../lib/inner-growth/lesson-library.js'
let sequence=0
async function fixture({legacy=false,locale='en',version=COURSE_CONTENT_V3,courseStatus='completed',otherActive=0,tier='free',multiCourseEnabled=false,failActivation=false}={}){
const actor={id:'11111111-1111-4111-8111-111111111111'}
const course={id:'22222222-2222-4222-8222-222222222222',account_id:actor.id,status:courseStatus,stage:4,goals:['calm_regulation','energy_agency','connection_boundaries'],scale_keys:['hh-weekly-pulse::weekly.tension','hh-weekly-pulse::weekly.recovery','hh-weekly-pulse::weekly.connection']}
if(legacy)course.scale_keys=[]
const originalScales=[...course.scale_keys]
let cycle={id:'33333333-3333-4333-8333-333333333333',status:'completed',cycle_number:1,primary_domain:'calm_regulation',content_version:version,start_local_date:addCalendarDays(localDateKey(Date.now(),'UTC'),-13),time_zone:'UTC',duration_days:14,preferences:{}}
const originalCycle=structuredClone(cycle)
let target={id:'44444444-4444-4444-8444-444444444444',problem_label_ciphertext:'Synthetic old target'}
const queries=[]
const db={async query(sql,args=[]){
 queries.push(sql)
 if(sql==='select status,onboarding_state from app.accounts where id=$1 for update')return {rows:args[0]===actor.id?[{status:'active',onboarding_state:'active'}]:[]}
 if(sql==='select * from app_private.course_access($1)'){assert.equal(args[0],'sandbox');return {rows:[{tier,active_course_limit:['advanced','premium'].includes(tier)?5:1,active_course_count:otherActive+(course.status==='active'&&(course.stage<4||cycle.status==='active')?1:0)}]}}
 if(sql.startsWith('select count(*)::integer as count from app_private.growth_courses')){assert.equal(args[0],actor.id);return {rows:[{count:otherActive+(course.status==='active'?1:0)}]}}
 if(sql.startsWith('select status from app_private.growth_cycles where account_id=')){assert.equal(args[0],actor.id);assert.equal(args[1],course.id);return {rows:[{status:cycle.status}]}}
 if(sql.startsWith("update app_private.growth_courses set status='active',")){assert.equal(args[0],course.id);assert.equal(args[1],actor.id);if(failActivation)throw new Error('SYNTHETIC_ACTIVATION_FAILURE');course.status='active';return {rows:[]}}
 if(sql.startsWith('select status,onboarding_state,timezone'))return {rows:[{status:'active',onboarding_state:'active',timezone:'UTC'}]}
 if(sql.startsWith('select * from app_private.growth_courses')){assert.equal(args[0],actor.id);return {rows:args[1]&&args[1]!==course.id?[]:[course]}}
 if(sql.startsWith('select * from app_private.growth_cycles'))return {rows:[cycle]}
 if(sql.startsWith('update app_private.growth_courses set goals=')){course.goals=[args[1],...course.goals.filter(g=>g!==args[1])];if(args.length===3)course.scale_keys=args[2];return {rows:[]}}
 if(sql.startsWith("update app_private.growth_cycles set status='archived'")){cycle.status='archived';return {rows:[]}}
 if(sql.startsWith('select id from app_private.growth_cycles'))return {rows:[]}
 if(sql.startsWith('select coalesce(max(cycle_number)'))return {rows:[{max:1}]}
 if(sql.startsWith('insert into app_private.growth_cycles')){cycle={id:args[0],status:'active',cycle_number:args[3],primary_domain:args[4],content_version:args[5],start_local_date:args[6],time_zone:args[7],duration_days:14,preferences:{}};return {rows:[]}}
 if(sql.startsWith('insert into app_private.growth_targets')){target={id:args[0],problem_label_ciphertext:args[3],intention_ciphertext:args[4]};return {rows:[]}}
 if(sql.startsWith('select * from app_private.growth_targets'))return {rows:[target]}
 if(sql.startsWith('select * from app_private.growth_checkins')||sql.startsWith('select * from app_private.growth_sessions')||sql.startsWith('select measurement_at')||sql.startsWith('select day_number,next_preference'))return {rows:[]}
 throw new Error('Unhandled synthetic query: '+sql)
}}
const key='__courseSyntheticTransaction'+(++sequence)
globalThis[key]=async(_config,_actor,fn)=>{
 const before=structuredClone({course,cycle,target})
 try{return await fn(db)}catch(error){Object.assign(course,before.course);cycle=before.cycle;target=before.target;throw error}
}
let source=readFileSync(new URL('../lib/app/growth-daily.js',import.meta.url),'utf8')
source=source.replace("import 'server-only'",'')
 .replace("import { transaction } from './database.js'",'const transaction=globalThis['+JSON.stringify(key)+']')
 .replace("import { seal, openSealed } from './crypto.js'",'const seal=value=>value,openSealed=value=>value')
 .replace(/from '([.][^']+)'/g,(_,path)=>`from '${new URL(path,new URL('../lib/app/growth-daily.js',import.meta.url)).href}'`)
const {createDailyCourseRepository}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
delete globalThis[key]

return {actor,course,originalScales,originalCycle,queries,getCycle:()=>cycle,service:createDailyCourseRepository({multiCourseEnabled,billingEnvironment:'sandbox'}),locale}
}

test('new measured cycle honors a changed approved primary direction, preserving the full chosen set and old version',async()=>{
 for(const locale of ['en','ru']){
  const f=await fixture({locale})
  const result=await f.service.command(f.actor,'new-cycle',{problemLabel:'Synthetic communication practice',goal:'connection_boundaries',timeZone:'UTC'},locale)
  assert.equal(result.cycle.primaryGoal,'connection_boundaries')
  assert.equal(result.cycle.activeGoal,'connection_boundaries')
  assert.equal(f.getCycle().primary_domain,'connection_boundaries')
  assert.equal(f.course.scale_keys[0],'hh-weekly-pulse::weekly.connection')
  assert.deepEqual([...f.course.scale_keys].sort(),[...f.originalScales].sort())
  assert.equal(f.originalCycle.content_version,COURSE_CONTENT_V3)
  assert.equal(result.cycle.contentVersion,COURSE_CONTENT_V4)
  assert.ok(result.lesson.id.includes('connection_boundaries'))
  assert.equal(result.roadmap.filter(d=>d.focusRole==='primary').length,6)
  assert.deepEqual(result.continuationGoals,['connection_boundaries','calm_regulation','energy_agency'])
  assert.equal(result.continuationRequiresMeasuredChoice,true)
  const oldMutations=f.queries.filter(sql=>sql.startsWith('update app_private.growth_cycles'))
  assert.equal(oldMutations.length,1)
  assert.match(oldMutations[0],/status='archived',finished_at=now\(\),updated_at=now\(\)/)
  assert.doesNotMatch(oldMutations[0],/content_version|primary_domain|start_local_date|preferences/)
  assert.ok(!f.queries.some(sql=>/^(update|delete|insert).*growth_(sessions|checkins|reviews)/.test(sql)))
 }
})
test('reading existing V2, V3 and V4 cycles preserves pinned lesson identities and performs no mutation',async()=>{
 for(const version of [COURSE_CONTENT_VERSION,COURSE_CONTENT_V3,COURSE_CONTENT_V4])for(const locale of ['en','ru']){
  const f=await fixture({version,locale})
  const result=await f.service.read(f.actor,locale)
  assert.equal(result.cycle.contentVersion,version)
  assert.equal(result.lesson.id,lessonFor(result.cycle.activeGoal,14,locale,'standard',version).id)
  assert.deepEqual(f.course.scale_keys,f.originalScales)
  assert.deepEqual(f.getCycle(),f.originalCycle)
  assert.ok(!f.queries.some(sql=>/^(insert|update|delete)/.test(sql)))
 }
})
test('unapproved next direction fails before any mutation and leaves the previous cycle intact',async()=>{
 const f=await fixture()
 await assert.rejects(()=>f.service.command(f.actor,'new-cycle',{problemLabel:'Synthetic focus practice',goal:'attention_clarity',timeZone:'UTC'}),/COURSE_SCALE_SELECTION_REQUIRED/)
 assert.equal(f.getCycle().id,f.originalCycle.id)
 assert.equal(f.getCycle().status,'completed')
 assert.deepEqual(f.course.scale_keys,f.originalScales)
 assert.ok(!f.queries.some(sql=>/^(insert|update|delete)/.test(sql)))
})
test('legacy unmeasured cycles retain all six directions and can choose a new one',async()=>{
 const f=await fixture({legacy:true})
 const before=await f.service.read(f.actor)
 assert.equal(before.continuationGoals.length,6)
 assert.equal(before.continuationRequiresMeasuredChoice,false)
 const result=await f.service.command(f.actor,'new-cycle',{problemLabel:'Synthetic focus practice',goal:'attention_clarity',timeZone:'UTC'})
 assert.equal(result.cycle.primaryGoal,'attention_clarity')
 assert.deepEqual(f.course.scale_keys,[])
 assert.equal(result.continuationGoals.length,6)
})
test('repeat new-cycle submission cannot archive or replace the newly started cycle',async()=>{
 const f=await fixture()
 const body={problemLabel:'Synthetic communication practice',goal:'connection_boundaries',timeZone:'UTC'}
 await f.service.command(f.actor,'new-cycle',body)
 const id=f.getCycle().id, count=f.queries.filter(sql=>/^(insert|update|delete)/.test(sql)).length
 await assert.rejects(()=>f.service.command(f.actor,'new-cycle',body),/COURSE_NOT_FINISHED/)
 assert.equal(f.getCycle().id,id)
 assert.equal(f.queries.filter(sql=>/^(insert|update|delete)/.test(sql)).length,count)
})
test('scale reorder retains every key and relative order, never mutates its input or creates eligibility',()=>{
 const keys=['hh-weekly-pulse::weekly.tension','hh-weekly-pulse::weekly.recovery','hh-weekly-pulse::weekly.connection']
 const snapshot=[...keys]
 assert.deepEqual(courseNextCycleScaleKeys(keys,'connection_boundaries'),[keys[2],keys[0],keys[1]])
 assert.deepEqual(courseNextCycleScaleKeys(keys,'calm_regulation'),keys)
 assert.equal(courseNextCycleScaleKeys(keys,'attention_clarity'),null)
 assert.equal(courseNextCycleScaleKeys(['unknown'], 'calm_regulation'),null)
 assert.deepEqual(keys,snapshot)
 assert.deepEqual(courseContinuationGoals(keys),['calm_regulation','energy_agency','connection_boundaries'])
})
test('continuation UI is server-limited, explains the measured-choice boundary and localizes completion labels',()=>{
 const ui=readFileSync(new URL('../components/app/course-today.jsx',import.meta.url),'utf8')
 assert.match(ui,/continuationGoals.map\(id=>/)
 assert.match(ui,/goal:nextGoal/)
 assert.match(ui,/disabled=\{busy\|\|!nextGoal\|\|targetLabel/)
 assert.match(ui,/directions represented by your confirmed scales/)
 assert.match(ui,/направление среди подтверждённых шкал/)
 assert.equal((ui.match(/completedLabel=\{t.doneDay\}/g)||[]).length,2)
 assert.doesNotMatch(ui,/aria-label="Completed"/)
})


test('continuation retains owner lock and explicit selected-course isolation',async()=>{
 const f=await fixture()
 const body={courseId:f.course.id,problemLabel:'Synthetic chosen direction',goal:'connection_boundaries',timeZone:'UTC'}
 const result=await f.service.command(f.actor,'new-cycle',body)
 assert.equal(result.courseId,f.course.id)
 assert.equal(result.cycle.primaryGoal,'connection_boundaries')
 assert.equal(f.queries[0],'select status,onboarding_state from app.accounts where id=$1 for update')
 assert.ok(f.queries.some(sql=>sql.startsWith('select count(*)::integer as count')))
 const writes=f.queries.filter(sql=>/^(insert|update|delete)/.test(sql)).length
 await assert.rejects(()=>f.service.command({id:'55555555-5555-4555-8555-555555555555'},'new-cycle',body),/ACCOUNT_UNAVAILABLE/)
 await assert.rejects(()=>f.service.command(f.actor,'new-cycle',{...body,courseId:'66666666-6666-4666-8666-666666666666'}),/COURSE_NOT_FOUND/)
 assert.equal(f.queries.filter(sql=>/^(insert|update|delete)/.test(sql)).length,writes)
})


test('continuation reuses the last occupied legacy slot without permitting an extra active course',async()=>{
 const f=await fixture({legacy:true,courseStatus:'active'})
 const result=await f.service.command(f.actor,'new-cycle',{courseId:f.course.id,problemLabel:'Synthetic legacy continuation',goal:'attention_clarity'})
 assert.equal(result.access.activeCourseCount,1)
 assert.equal(result.cycle.primaryGoal,'attention_clarity')
 const blocked=await fixture({legacy:true,courseStatus:'active',otherActive:1})
 await assert.rejects(()=>blocked.service.command(blocked.actor,'new-cycle',{courseId:blocked.course.id,problemLabel:'Synthetic blocked continuation',goal:'attention_clarity'}),/COURSE_ACTIVE_LIMIT/)
 assert.deepEqual(blocked.getCycle(),blocked.originalCycle)
})

test('new measured cycle claims one free slot in each EUR tier and rolls back when full',async()=>{
 for(const tier of ['free','start','advanced','premium']){
  const limit=['advanced','premium'].includes(tier)?5:1
  const f=await fixture({tier,multiCourseEnabled:true,otherActive:limit-1})
  const body={courseId:f.course.id,cycleId:f.originalCycle.id,problemLabel:'Synthetic next direction',goal:'connection_boundaries'}
  const result=await f.service.command(f.actor,'new-cycle',body)
  assert.equal(result.access.activeCourseCount,limit)
  assert.equal(result.cycle.primaryGoal,'connection_boundaries')
  assert.equal(f.course.status,'active')
  const createIndex=f.queries.findIndex(sql=>sql.startsWith('insert into app_private.growth_cycles'))
  const activateIndex=f.queries.findIndex(sql=>sql.startsWith("update app_private.growth_courses set status='active',"))
  assert.ok(createIndex>=0&&activateIndex>createIndex,'activation must not cause its own quota check to count twice')
  const blocked=await fixture({tier,multiCourseEnabled:true,otherActive:limit})
  await assert.rejects(()=>blocked.service.command(blocked.actor,'new-cycle',{...body,cycleId:blocked.originalCycle.id}),/COURSE_ACTIVE_LIMIT/)
  assert.deepEqual(blocked.getCycle(),blocked.originalCycle)
  assert.deepEqual(blocked.course.scale_keys,blocked.originalScales)
  assert.equal(blocked.course.status,'completed')
 }
})


test('inactive paused continuation needs capacity and activation failure restores the prior cycle',async()=>{
 for(const courseStatus of ['completed','paused']){
  const full=await fixture({courseStatus,multiCourseEnabled:true,otherActive:1})
  const input={courseId:full.course.id,cycleId:full.originalCycle.id,problemLabel:'Synthetic paused continuation',goal:'connection_boundaries'}
  await assert.rejects(()=>full.service.command(full.actor,'new-cycle',input),/COURSE_ACTIVE_LIMIT/)
  assert.equal(full.course.status,courseStatus)
  assert.deepEqual(full.getCycle(),full.originalCycle)
  assert.deepEqual(full.course.scale_keys,full.originalScales)
  const failed=await fixture({courseStatus,multiCourseEnabled:true,failActivation:true})
  await assert.rejects(()=>failed.service.command(failed.actor,'new-cycle',input),/SYNTHETIC_ACTIVATION_FAILURE/)
  assert.ok(failed.queries.some(sql=>sql.startsWith('insert into app_private.growth_cycles')))
  assert.equal(failed.course.status,courseStatus)
  assert.deepEqual(failed.getCycle(),failed.originalCycle)
  assert.deepEqual(failed.course.scale_keys,failed.originalScales)
 }
})


test('multi-course completed active rows require capacity because SQL excludes their old cycles',async()=>{
 for(const tier of ['free','start','advanced','premium']){
  const limit=['advanced','premium'].includes(tier)?5:1
  for(const otherActive of [limit,limit+1]){
   const f=await fixture({tier,courseStatus:'active',multiCourseEnabled:true,otherActive})
   await assert.rejects(()=>f.service.command(f.actor,'new-cycle',{courseId:f.course.id,cycleId:f.originalCycle.id,problemLabel:'Synthetic quota boundary',goal:'connection_boundaries'}),/COURSE_ACTIVE_LIMIT/)
   assert.deepEqual(f.getCycle(),f.originalCycle)
   assert.deepEqual(f.course.scale_keys,f.originalScales)
   assert.ok(!f.queries.some(sql=>sql.startsWith('insert into app_private.growth_cycles')))
  }
 }
})
