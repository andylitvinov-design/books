// Actual PostgreSQL execution is restricted by app-db-setup to an empty loopback CI database.
import test,{before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {getAppConfig} from '../lib/app/config.js'
import {createAppRepository} from '../lib/app/repository.js'
import {createCourse21Repository} from '../lib/app/course-21.js'
import {createGrowthCourseRepository} from '../lib/app/growth-course.js'
import {closeDatabase} from '../lib/app/database.js'
import {A,B,SB,actor,setup,adminClient,rawAs} from './helpers/app-db-setup.mjs'
import {syntheticPersonalRegistry} from './helpers/course-personal-registry-fixture.mjs'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
const config=getAppConfig(),accounts=createAppRepository(config),a=actor(),b=actor(B,SB),def=getAssessmentDefinition('hh-weekly-pulse')
// Synthetic prepared-content injection verifies storage only. The released DB
// interpretation loader and combined release CI remain a separate dependency.
const loadReports=async(_db,results)=>results.map(r=>({...r,interpretations:Object.fromEntries(['en','ru'].map(locale=>[locale,{
 status:'available',origin:'database',identity:provenance(getAssessmentDefinition(r.definitionKey,r.definitionVersion,r.instrumentLocale)),
 uiLocale:locale,interpretationVersion:'2026-10-12.v2',payloadHash:'sha256:'+(locale==='en'?'c':'d').repeat(64),
 sections:r.dimensions.map(d=>({...d,compact:{meaning:'Synthetic CI keyed meaning '+locale+' '+d.key}})),
}]))}))
const repo=createCourse21Repository(config,{enabled:true,loadReports})
let view,sourceA,sourceB
const command=(body,who=a)=>repo.command(who,{operationId:randomUUID(),...body})
before(async()=>{
 await setup()
 for(const who of [a,b]){await accounts.ensureAccount(who);await accounts.onboarding(who,{adult:true,necessary:true,marketing:false,displayName:'Synthetic course21 account',uiLocale:'en',timezone:'UTC',goal:'explore'})}
 assert.equal(await createCourse21Repository(config,{enabled:false}).exportData(a),null)
 const db=await adminClient()
 try{
  await db.query(await readFile(new URL('../supabase/migrations/20261012181823_hh_course_r3_daily_21.sql',import.meta.url),'utf8'))
  sourceA=(await db.query('insert into app_private.growth_courses(account_id,stage,test_keys,consented_at) values($1,3,$2,now()) returning id',[A,[def.key]])).rows[0].id
  sourceB=(await db.query('insert into app_private.growth_courses(account_id,stage,test_keys,consented_at) values($1,3,$2,now()) returning id',[B,[def.key]])).rows[0].id
  await db.query("insert into app_private.assessment_plans(account_id,definition_ids,operation_id,status) values($1,$2,$3,'completed')",[A,[def.id],randomUUID()])
 }finally{await db.end()}
 const run=await accounts.startRun(a,{definitionKey:def.key,definitionVersion:def.version,instrumentLocale:def.instrumentLocale,operationId:randomUUID()})
 const saved=await accounts.saveRun(a,run.id,{answers:Object.fromEntries(def.questions.map(q=>[q.id,5])),context:{},progress:def.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
 await accounts.submitRun(a,run.id,{expectedRevision:saved.revision})
})
after(closeDatabase)
test('owner activates a distinct21-day state with unchanged R3 stage, plan and legacy cycles',async()=>{
 const db=await adminClient();let before
 try{before=(await db.query('select row_to_json(c) as course from app_private.growth_courses c where account_id=$1',[A])).rows[0].course}finally{await db.end()}
 const p=await repo.preview(a);assert.equal(p.profile.rows.length,8)
 const body={action:'activate',operationId:randomUUID(),expectedSourceRevision:p.source.courseRevision,activationToken:p.activationToken,
  selectedR3ScaleKeys:p.profile.rows.filter(r=>r.canChoosePractice).slice(0,3).map(r=>r.r3ScaleKey),consent:true,consentVersion:p.consentVersion,timeZone:'UTC'}
 await assert.rejects(command({...body,consent:false}),{code:'NEW_COURSE_CONSENT_REQUIRED'})
 view=await command(body);assert.equal(view.course.durationDays,21);assert.equal(view.course.sourceCourseId,sourceA)
 assert.equal((await command(body)).course.revision,0)
 const read=await repo.read(a,'ru');assert.ok(read.profile.rows.every(r=>r.meaning.includes(' ru ')))
 const inspect=await adminClient();try{
  assert.deepEqual((await inspect.query('select row_to_json(c) as course from app_private.growth_courses c where account_id=$1',[A])).rows[0].course,before)
  assert.equal((await inspect.query('select count(*)::int as n from app_private.growth_cycles where account_id=$1',[A])).rows[0].n,0)
  const flags=(await inspect.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='app_private.growth_course_daily_21'::regclass")).rows[0]
  assert.equal(flags.relrowsecurity,true);assert.equal(flags.relforcerowsecurity,true)
 }finally{await inspect.end()}
})
test('second actor and NULL uid cannot read or mutate owner state',async()=>{
 assert.equal((await repo.read(b)).course,null)
 assert.equal((await rawAs(b,'hh_app_backend',db=>db.query('select id from app_private.growth_course_daily_21 where account_id=$1',[A]))).rowCount,0)
 const noUid={...a,claims:{...a.claims,sub:null}}
 assert.equal((await rawAs(noUid,'hh_app_backend',db=>db.query('select id from app_private.growth_course_daily_21'))).rowCount,0)
 assert.equal((await rawAs(noUid,'hh_app_backend',db=>db.query('update app_private.growth_course_daily_21 set updated_at=now() where account_id=$1',[A]))).rowCount,0)
 await assert.rejects(rawAs(noUid,'hh_app_backend',db=>db.query("insert into app_private.growth_course_daily_21(account_id,course_id,source_revision,model_version,content_version,state_ciphertext,consented_at) values($1,$2,0,'hh-course-strategy-21-v1','synthetic',repeat('x',20),now())",[B,sourceB])),{code:'42501'})
})
test('anon/authenticated/inbox have no four-operation access; backend cannot DELETE or change identity',async()=>{
 const statements=[['select id from app_private.growth_course_daily_21',[]],
  ["insert into app_private.growth_course_daily_21(account_id,course_id,source_revision,model_version,content_version,state_ciphertext,consented_at) values($1,$2,0,'hh-course-strategy-21-v1','synthetic',repeat('x',20),now())",[B,sourceB]],
  ['update app_private.growth_course_daily_21 set updated_at=now() where account_id=$1',[A]],
  ['delete from app_private.growth_course_daily_21 where account_id=$1',[A]]]
 for(const role of ['anon','authenticated','hh_app_inbox'])for(const [sql,args] of statements){const db=await adminClient();try{
  await db.query('begin');await db.query('set local role '+role);await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(a.claims)])
  await assert.rejects(db.query(sql,args),{code:'42501'})
 }finally{await db.query('rollback');await db.end()}}
 await assert.rejects(rawAs(a,'hh_app_backend',db=>db.query(statements[3][0],[A])),{code:'42501'})
 for(const sql of ['update app_private.growth_course_daily_21 set account_id=$1 where account_id=$2',
  'update app_private.growth_course_daily_21 set course_id=$1 where account_id=$2'])await assert.rejects(rawAs(a,'hh_app_backend',db=>db.query(sql,[B,A])),{code:'42501'})
 await assert.rejects(rawAs(a,'hh_app_backend',db=>db.query("update app_private.growth_course_daily_21 set content_version='changed' where account_id=$1",[A])),{code:'42501'})
})
test('composite FK rejects cross-owner source; ciphertext bounds are enforced without changing stored history',async()=>{
 const db=await adminClient();try{await assert.rejects(db.query("insert into app_private.growth_course_daily_21(account_id,course_id,source_revision,model_version,content_version,state_ciphertext,consented_at) values($1,$2,0,'hh-course-strategy-21-v1','synthetic',repeat('x',20),now())",[B,sourceA]),{code:'23503'})}finally{await db.end()}
 for(const size of [19,524289])await assert.rejects(rawAs(a,'hh_app_backend',db=>db.query("update app_private.growth_course_daily_21 set state_ciphertext=repeat('x',$1) where account_id=$2",[size,A])),{code:'23514'})
 for(const size of [20,524288]){const db=await adminClient();try{
  await db.query('begin');await db.query('set local role hh_app_backend');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(a.claims)])
  assert.equal((await db.query("update app_private.growth_course_daily_21 set state_ciphertext=repeat('x',$1) where account_id=$2",[size,A])).rowCount,1)
 }finally{await db.query('rollback');await db.end()}}
})
test('real row locks and revision CAS serialize double clicks, private notes need consent and are encrypted',async()=>{
 const race=await Promise.allSettled([command({action:'check-in',expectedRevision:view.course.revision,wellbeing:3,skip:false}),command({action:'check-in',expectedRevision:view.course.revision,wellbeing:3,skip:false})])
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.code,'REVISION_CONFLICT');view=race.find(r=>r.status==='fulfilled').value
 const body={action:'finish-day',expectedRevision:view.course.revision,operationId:randomUUID(),day:1,lessonId:view.today.lesson.id,status:'completed',applyFeedback:true,feedback:{difficulty:'too-hard',comment:'Synthetic confidential course journal'}}
 await assert.rejects(command({...body,savePrivateText:false}),{code:'PRIVATE_TEXT_CONSENT_REQUIRED'})
 view=await command({...body,savePrivateText:true});assert.equal(view.today.completedDays,1);assert.equal(view.preferences.length,'quick')
 assert.equal((await command({...body,savePrivateText:true})).course.revision,view.course.revision)
 const db=await adminClient();try{assert.ok(!(await db.query('select state_ciphertext from app_private.growth_course_daily_21 where account_id=$1',[A])).rows[0].state_ciphertext.includes('Synthetic confidential'))}finally{await db.end()}
 assert.equal((await repo.read(a,'en',{reviewDay:1})).reviewLesson.lesson.id,body.lessonId)
})
test('failed optional SQL report loading rolls back to a savepoint without aborting daily progress',async()=>{
 const unavailable=createCourse21Repository(config,{enabled:true,loadReports:async db=>{await db.query('select 1/0')}})
 const read=await unavailable.read(a);assert.equal(read.profile.status,'interpretations-unavailable');assert.equal(read.profile.rows.length,8)
 const paused=await unavailable.command(a,{action:'pause',operationId:randomUUID(),expectedRevision:view.course.revision})
 assert.equal(paused.course.status,'paused');assert.equal(paused.profile.status,'interpretations-unavailable')
 view=await repo.command(a,{action:'resume',operationId:randomUUID(),expectedRevision:paused.course.revision})
 assert.equal(view.course.status,'active');assert.equal(view.today.completedDays,1)
})
test('export preserves saved check-ins and notes while gate and content are unavailable',async()=>{
 const off=createCourse21Repository(config,{enabled:false,loadReports:()=>{throw Error('must not load reports for export')}})
 const exported=await off.exportData(a);assert.equal(exported.journey.checkins[1].wellbeing,3)
 assert.equal(exported.journey.sessions[1].feedback.comment,'Synthetic confidential course journal')
 assert.equal('operations' in exported,false);assert.equal('activationOperation' in exported,false)
 assert.equal(await off.exportData(b),null)
})
test('inactive account is denied by repository and restricted SQL; existing14-day activation is blocked after21-day consent',async()=>{
 const growth=createGrowthCourseRepository(config)
 await assert.rejects(growth.command(a,{action:'edit-intake',expectedRevision:0}),{code:'COURSE_21_ALREADY_STARTED'})
 await assert.rejects(growth.command(a,{action:'choose-goals',expectedRevision:0,consent:true,goals:['calm_regulation'],durationDays:14}),{code:'COURSE_21_ALREADY_STARTED'})
 const db=await adminClient();try{await db.query("update app.accounts set status='blocked' where id=$1",[A])}finally{await db.end()}
 try{
  await assert.rejects(repo.read(a),{code:'ACCOUNT_UNAVAILABLE'})
  assert.equal((await rawAs(a,'hh_app_backend',db=>db.query('select id from app_private.growth_course_daily_21 where account_id=$1',[A]))).rowCount,0)
 }finally{const restore=await adminClient();try{await restore.query("update app.accounts set status='active' where id=$1",[A])}finally{await restore.end()}}
})

test('actual21-day completion and consented continuation preserve encrypted archive and serialize repeated saves',async()=>{
 const archived=await repo.exportData(a),start=Date.parse(archived.journey.updatedAt)
 let timestamp=new Date(start+86400000).toISOString()
 const completing=createCourse21Repository(config,{enabled:true,loadReports,now:()=>timestamp})
 const send=body=>completing.command(a,{operationId:randomUUID(),...body})
 view=await completing.read(a)
 for(let day=view.today.day;day<=21;day++){
  timestamp=new Date(start+day*86400000).toISOString()
  view=await send({action:'check-in',expectedRevision:view.course.revision,skip:true})
  view=await send({action:'finish-day',expectedRevision:view.course.revision,day,lessonId:view.today.lesson.id,status:'completed',feedback:{},applyFeedback:false,savePrivateText:false})
 }
 assert.equal(view.course.status,'finished');assert.equal(view.completion.completedDays,21);assert.equal(view.completion.journal.entryDays,1)
 const snapshot=await completing.exportData(a)
 await assert.rejects(send({action:'continuation',expectedRevision:view.course.revision,practiceDays:[1],pace:'own-pace',consent:false}),{code:'CONTINUATION_CONSENT_REQUIRED'})
 const body={action:'continuation',operationId:randomUUID(),expectedRevision:view.course.revision,practiceDays:[1,21],pace:'occasional',consent:true}
 view=await send(body);assert.equal(view.completion.continuationPlan.pace,'occasional');assert.equal((await send(body)).course.revision,view.course.revision)
 const after=await completing.exportData(a);assert.deepEqual(after.source,snapshot.source);assert.deepEqual(after.journey.sessions,snapshot.journey.sessions)
 assert.equal(after.journey.continuationPlan.consent,true);assert.equal(view.completion.finishedAt,snapshot.journey.sessions[21].at)
 assert.equal((await completing.read(b)).course,null)
})


test('personal v2 exact history uses bounded encrypted storage through day21 with owner-only replay',async()=>{
 const db=await adminClient();try{
  await db.query("insert into app_private.assessment_plans(account_id,definition_ids,operation_id,status) values($1,$2,$3,'completed')",[B,[def.id],randomUUID()])
 }finally{await db.end()}
 const run=await accounts.startRun(b,{definitionKey:def.key,definitionVersion:def.version,instrumentLocale:def.instrumentLocale,operationId:randomUUID()})
 const saved=await accounts.saveRun(b,run.id,{answers:Object.fromEntries(def.questions.map(q=>[q.id,5])),context:{},progress:def.questions.length,expectedRevision:run.revision,operationId:randomUUID()})
 await accounts.submitRun(b,run.id,{expectedRevision:saved.revision})
 let timestamp=new Date(Date.now()+1000).toISOString();const start=Date.parse(timestamp)
 const personal=createCourse21Repository(config,{enabled:true,loadReports,personalRegistry:syntheticPersonalRegistry(),now:()=>timestamp})
 const send=body=>personal.command(b,{operationId:randomUUID(),...body},'ru')
 const p=await personal.preview(b,'ru');assert.equal(p.profile.rows.length,8);assert.equal(p.profile.availablePracticeCount,8)
 let current=await send({action:'activate',expectedSourceRevision:p.source.courseRevision,activationToken:p.activationToken,selectedR3ScaleKeys:p.profile.rows.filter(row=>row.canChoosePractice).slice(0,5).map(row=>row.r3ScaleKey),consent:true,consentVersion:p.consentVersion,timeZone:'Europe/London',loadMinutes:5})
 for(let day=1;day<=21;day++){
  timestamp=new Date(start+(day-1)*86400000).toISOString()
  current=await send({action:'check-in',expectedRevision:current.course.revision,skip:false,wellbeing:day%11,energy:day===1?'low':'usual',availableTime:'standard'})
  assert.equal(current.today.status,'ready')
  const body={action:'finish-day',operationId:randomUUID(),expectedRevision:current.course.revision,expectedPlanRevision:current.personalPlan.revision,day,lessonId:current.today.lesson.id,status:'completed',goalObservations:current.today.goalObservationSnapshot.rows.map(row=>({goalId:row.goalId,statementId:row.statementId,statementKey:row.statementKey,seriesId:row.seriesId,rating:day%5+1})),savePrivateText:true,applyFeedback:false,feedback:{comment:'я'.repeat(1000),reflectionAnswer:'z'.repeat(1000)}}
  current=await send(body)
  if(day===1)assert.equal((await send(body)).course.revision,current.course.revision)
 }
 assert.equal(current.completion.completedDays,21);assert.equal(current.history[0].checkin.energy,'low');assert.deepEqual(current.weeklyReports.map(report=>report.checkpointDay),[7,14,21]);assert.equal(current.history[0].goalObservations.rows[0].rating,2)
 const inspect=await adminClient();try{
  const row=(await inspect.query('select octet_length(state_ciphertext) as bytes,state_ciphertext from app_private.growth_course_daily_21 where account_id=$1',[B])).rows[0]
  assert.ok(row.bytes<524288);assert.equal(row.state_ciphertext.includes('я'.repeat(5)),false)
 }finally{await inspect.end()}
 const archived=await personal.exportData(b)
 assert.equal(archived.personal.plan.slots.length,21);assert.equal(archived.journey.sessions[21].feedback.comment.length,1000)
 const off=createCourse21Repository(config,{enabled:false})
 assert.equal((await off.exportData(b)).journey.sessions[21].feedback.comment.length,1000);assert.deepEqual((await off.exportData(b)).personal.weeklyReports,current.weeklyReports)
 current=await send({action:'continuation',expectedRevision:current.course.revision,practiceDays:[1,7,21],pace:'own-pace',consent:true})
 assert.equal(current.completion.continuationPlan.practiceRefs.length,3)
 assert.equal((await personal.read(b,'en',{reviewDay:7})).reviewLesson.lesson.contentLocale,'ru')
 assert.notEqual((await personal.exportData(a)).id,archived.id)
 await assert.rejects(send({action:'revise-plan',expectedRevision:current.course.revision,expectedPlanRevision:0,selectedR3ScaleKeys:current.course.selectedR3ScaleKeys,consent:true}),{code:'PAST_PLAN_SLOTS_IMMUTABLE'})
})
