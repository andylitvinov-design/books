import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createCourse21Repository} from '../lib/app/course-21.js'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {decodeCourseState} from '../lib/app/course-state-codec.js'
import {openSealed,seal} from '../lib/app/crypto.js'
import {syntheticPersonalRegistry} from './helpers/course-personal-registry-fixture.mjs'
import {lessonFor21} from '../lib/inner-growth/lesson-library-21.js'
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222'
const actor=(id=A)=>({id,claims:{sub:id}})
const goalChoices=(snapshot,rating=3)=>snapshot.rows.map(row=>({goalId:row.goalId,statementId:row.statementId,statementKey:row.statementKey,seriesId:row.seriesId,rating}))
const config={test:true,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic-only',course21Enabled:true}
function setup({personal=false,instrumentLocale='en',displayLocale='en'}={}){
 let timestamp='2026-10-12T12:00:00.000Z',tail=Promise.resolve(),reportMode='ready',schemaPresent=true
 const rows=new Map(),queries=[],accounts=new Map([A,B].map(id=>[id,{id,status:'active',onboarding_state:'active',timezone:'UTC'}]))
 const def=getAssessmentDefinition('hh-weekly-pulse','v1',instrumentLocale),scored=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.min])))
 const courses=new Map([[A,{id:'44444444-4444-4444-8444-444444444444',account_id:A,stage:3,revision:4,test_keys:[def.key]}]])
 const plans=new Map([[A,{id:'55555555-5555-4555-8555-555555555555',revision:2,definition_ids:[def.id]}]])
 const resultRows=new Map([[A,[{id:'33333333-3333-4333-8333-333333333333',provenance:provenance(def),dimensions:scored.dimensions,measurement_at:'2026-10-10T12:00:00.000Z'}]]])
 const client=who=>({async query(sql,p=[]){queries.push({sql,p})
  if(/^(savepoint|rollback to savepoint|release savepoint) course21_content$/.test(sql))return {rows:[]}
  if(sql.startsWith('select to_regclass'))return {rows:[{relation:schemaPresent?'app_private.growth_course_daily_21':null}]}
  if(sql.startsWith('select id,status,onboarding_state,timezone'))return {rows:p[0]===who.id&&accounts.has(who.id)?[structuredClone(accounts.get(who.id))]:[]}
  if(sql.startsWith('select id,account_id,stage,revision,test_keys'))return {rows:p[0]===who.id&&courses.has(who.id)?[structuredClone(courses.get(who.id))]:[]}
  if(sql.startsWith('select id,revision,definition_ids'))return {rows:p[0]===who.id&&plans.has(who.id)?[structuredClone(plans.get(who.id))]:[]}
  if(sql.startsWith('select * from app_private.growth_course_daily_21'))return {rows:p[0]===who.id&&rows.has(who.id)?[structuredClone(rows.get(who.id))]:[]}
  if(sql.startsWith('select id,provenance,dimensions,measurement_at'))return {rows:structuredClone((resultRows.get(who.id)||[]).filter(r=>p[1].includes(r.id)))}
  if(sql.startsWith('select distinct on (source_version_id)')){
   const sorted=(resultRows.get(who.id)||[]).filter(r=>p[1].includes(r.provenance.definitionId)).sort((a,b)=>Date.parse(b.measurement_at)-Date.parse(a.measurement_at))
   return {rows:structuredClone(sorted.filter((r,i)=>sorted.findIndex(x=>x.provenance.definitionId===r.provenance.definitionId)===i))}
  }
  if(sql.startsWith('insert into app_private.growth_course_daily_21')){
   assert.equal(p[1],who.id);const row={id:p[0],account_id:p[1],course_id:p[2],source_revision:p[3],model_version:p[4],content_version:p[5],duration_days:21,revision:0,status:'active',state_ciphertext:p[6],consented_at:p[7],created_at:p[7],updated_at:p[7]}
   rows.set(who.id,row);return {rows:[structuredClone(row)]}
  }
  if(sql.startsWith('update app_private.growth_course_daily_21')){
   const row=rows.get(who.id);if(!row||row.id!==p[0]||p[1]!==who.id||row.revision!==p[5])return {rows:[]}
   Object.assign(row,{state_ciphertext:p[2],status:p[3],updated_at:p[4],revision:row.revision+1});return {rows:[structuredClone(row)]}
  }
  throw Error('UNEXPECTED_SYNTHETIC_QUERY')
 }})
 const runTransaction=(_config,who,fn)=>{const task=tail.then(async()=>{const backup=structuredClone(rows);try{return await fn(client(who))}catch(e){rows.clear();for(const [k,v] of backup)rows.set(k,v);throw e}});tail=task.catch(()=>{});return task}
 const loadReports=async(_db,owned)=>{
  if(reportMode==='error')throw Error('CONTENT_OFFLINE')
  if(reportMode==='denied')throw Object.assign(Error('permission denied'),{code:'42501'})
  if(reportMode==='missing')return owned
  for(const r of owned)r.interpretations=Object.fromEntries(['en','ru'].map(locale=>[locale,{status:'available',origin:'database',identity:provenance(def),uiLocale:locale,
   interpretationVersion:'2026-10-12.v2',payloadHash:'sha256:'+(locale==='en'?'a':'b').repeat(64),sections:r.dimensions.map(d=>({...d,compact:{meaning:'Synthetic DB meaning '+locale+' '+d.key}}))}]))
  if(reportMode==='tamper'&&owned[0])owned[0].dimensions[0].value++
  if(reportMode==='changed'&&owned[0])owned[0].interpretations.en.payloadHash='sha256:'+'c'.repeat(64)
  return owned
 }
 const options={runTransaction,loadReports,now:()=>timestamp,...(personal?{personalRegistry:syntheticPersonalRegistry()}:{})},repo=createCourse21Repository(config,options)
 const command=(body,who=actor(),locale=displayLocale)=>repo.command(who,{operationId:randomUUID(),...body},locale)
 const activation=p=>({action:'activate',expectedSourceRevision:p.source.courseRevision,activationToken:p.activationToken,
  selectedR3ScaleKeys:p.profile.rows.filter(r=>r.canChoosePractice).slice(0,3).map(r=>r.r3ScaleKey),consent:true,consentVersion:p.consentVersion,timeZone:'UTC'})
 const daily=async()=>command(activation(await repo.preview(actor(),displayLocale)))
 const decrypt=()=>decodeCourseState(openSealed(rows.get(A).state_ciphertext,{accountId:A,recordId:rows.get(A).id,field:'course.daily_state'},config))
 return {repo,options,command,activation,daily,decrypt,rows,courses,plans,resultRows,queries,accounts,
  setNow:v=>timestamp=v,setReports:v=>reportMode=v,setSchema:v=>schemaPresent=v}
}
test('activation adds only a private daily state; R3 course, plan, results and14-day state stay unchanged',async()=>{
 const s=setup(),before={courses:structuredClone(s.courses),plans:structuredClone(s.plans),results:structuredClone(s.resultRows)}
 const v=await s.daily();assert.equal(v.course.durationDays,21);assert.equal(v.today.day,1);assert.equal(v.profile.rows.length,8)
 assert.equal(v.outline.mode,'personal');assert.equal(v.outline.weeks.flatMap(w=>w.days).length,21)
 for(const day of v.outline.weeks.flatMap(w=>w.days)){const card=lessonFor21(day.track,day.day,'en');assert.equal(day.skill,card.title);assert.equal(day.learningOutcome,card.curriculum.learningOutcome);assert.equal(day.lessonId,card.id)}
 assert.equal(v.profile.status,'ready-to-review');assert.ok(v.profile.rows.every(r=>r.meaning.startsWith('Synthetic DB')))
 assert.deepEqual(s.courses,before.courses);assert.deepEqual(s.plans,before.plans);assert.deepEqual(s.resultRows,before.results)
 assert.ok(s.queries.filter(q=>/^(insert|update)/.test(q.sql)).every(q=>q.sql.includes('growth_course_daily_21')))
 assert.equal(s.decrypt().source.courseId,before.courses.get(A).id)
 assert.equal(s.rows.get(A).state_ciphertext.includes('weekly.mood'),false)
 const ru=await s.repo.read(actor(),'ru');assert.ok(ru.profile.rows.every(r=>r.meaning.startsWith('Synthetic DB meaning ru')))
})
test('owner/sub, active account, new consent and opaque token fail closed without writes',async()=>{
 const s=setup(),p=await s.repo.preview(actor()),args=s.activation(p)
 await assert.rejects(s.command({...args,consent:false}),{code:'NEW_COURSE_CONSENT_REQUIRED'})
 await assert.rejects(s.command({...args,consentVersion:'old'}),{code:'NEW_COURSE_CONSENT_REQUIRED'})
 await assert.rejects(s.command({...args,activationToken:p.activationToken.slice(0,-1)+(p.activationToken.endsWith('0')?'1':'0')}),{code:'COURSE_PREVIEW_CHANGED'})
 await assert.rejects(s.command(args,{id:A,claims:{sub:B}}),{code:'SIGN_IN_REQUIRED'})
 await assert.rejects(s.command({...args,accountId:B}),{code:'UNKNOWN_FIELD'})
 s.accounts.get(A).status='blocked';await assert.rejects(s.command(args),{code:'ACCOUNT_UNAVAILABLE'})
 assert.equal(s.rows.size,0)
 const off=createCourse21Repository(config,{enabled:false,runTransaction:()=>assert.fail('disabled enrolment must not query')})
 assert.equal((await off.preview(actor())).available,false);assert.equal((await off.read(actor())).available,false)
})
test('preview expires and binds plan revision, R3 revision, exact result and interpretation payload',async()=>{
 for(const change of [s=>s.plans.get(A).revision++,s=>s.courses.get(A).revision++,s=>s.setReports('changed'),
  s=>{const n=structuredClone(s.resultRows.get(A)[0]);n.id=randomUUID();n.measurement_at='2026-10-12T11:00:00.000Z';s.resultRows.get(A).push(n)},
  s=>s.setNow('2026-10-12T12:11:00.000Z')]){
  const s=setup(),p=await s.repo.preview(actor());change(s)
  await assert.rejects(s.command(s.activation(p)),{code:'COURSE_PREVIEW_CHANGED'});assert.equal(s.rows.size,0)
 }
})
test('missing DB meanings prevent activation; a loader cannot substitute identity or scores',async()=>{
 const s=setup();s.setReports('missing');const p=await s.repo.preview(actor())
 assert.equal(p.status,'interpretations-unavailable');assert.equal(p.activationToken,null)
 await assert.rejects(s.command(s.activation(p)),{code:'COURSE_PREVIEW_CHANGED'});assert.equal(s.rows.size,0)
 s.setReports('tamper');await assert.rejects(s.repo.preview(actor()),{code:'COURSE_INTERPRETATIONS_UNAVAILABLE'})
})
test('activation replay and concurrent daily CAS never double-write or alter completed lessons',async()=>{
 const s=setup(),p=await s.repo.preview(actor()),activate={...s.activation(p),operationId:randomUUID()}
 const a=await s.command(activate),again=await s.command(activate);assert.equal(a.course.id,again.course.id);assert.equal(again.course.revision,0)
 await assert.rejects(s.command({...activate,timeZone:'Europe/London'}),{code:'OPERATION_ID_REUSED'})
 const pair=await Promise.allSettled([s.command({action:'check-in',expectedRevision:0,skip:true}),s.command({action:'check-in',expectedRevision:0,skip:true})])
 assert.equal(pair.filter(r=>r.status==='fulfilled').length,1);assert.equal(pair.find(r=>r.status==='rejected').reason.code,'REVISION_CONFLICT')
 const v=pair.find(r=>r.status==='fulfilled').value,finish={action:'finish-day',expectedRevision:v.course.revision,operationId:randomUUID(),day:1,lessonId:v.today.lesson.id,status:'completed',savePrivateText:false,feedback:{},applyFeedback:false}
 const saved=await s.command(finish),replay=await s.command(finish);assert.equal(saved.course.revision,replay.course.revision)
 const review=await s.repo.read(actor(),'en',{reviewDay:1});assert.equal(review.reviewLesson.lesson.id,finish.lessonId)
 assert.equal((await s.repo.read(actor(B))).course,null)
})
test('optional feedback text needs explicit storage opt-in, remains encrypted, and is not inferred into preferences',async()=>{
 const s=setup();let v=await s.daily();v=await s.command({action:'check-in',expectedRevision:v.course.revision,wellbeing:3,skip:false})
 const finish={action:'finish-day',expectedRevision:v.course.revision,day:1,lessonId:v.today.lesson.id,status:'completed',feedback:{comment:'Synthetic private note',reflectionAnswer:'Synthetic answer'},applyFeedback:false}
 await assert.rejects(s.command({...finish,savePrivateText:false}),{code:'PRIVATE_TEXT_CONSENT_REQUIRED'})
 await assert.rejects(s.command({...finish,savePrivateText:true,feedback:{comment:'x'.repeat(1001)}}),{code:'INVALID_PRIVATE_COMMENT'})
 v=await s.command({...finish,savePrivateText:true});assert.equal(v.history[0].feedback.comment,'Synthetic private note')
 assert.equal(v.preferences.alternativeRequested,false);assert.equal(v.preferences.length,'standard')
 assert.equal(s.rows.get(A).state_ciphertext.includes('Synthetic private note'),false)
 assert.equal(s.decrypt().journey.checkins[1].wellbeing,3)
})
test('owner export includes saved check-ins and notes despite gate or interpretation outage; absent table alone yields null',async()=>{
 const s=setup();let v=await s.daily();v=await s.command({action:'check-in',expectedRevision:v.course.revision,wellbeing:3,skip:false})
 await s.command({action:'finish-day',expectedRevision:v.course.revision,day:1,lessonId:v.today.lesson.id,status:'completed',savePrivateText:true,feedback:{comment:'Synthetic private note'},applyFeedback:false})
 s.setReports('error');const off=createCourse21Repository(config,{...s.options,enabled:false})
 const exported=await off.exportData(actor());assert.equal(exported.journey.checkins[1].wellbeing,3);assert.equal(exported.journey.sessions[1].feedback.comment,'Synthetic private note')
 assert.equal('operations' in exported,false);assert.equal('activationOperation' in exported,false)
 assert.equal(await off.exportData(actor(B)),null)
 s.setSchema(false);assert.equal(await off.exportData(actor()),null)
 const broken=createCourse21Repository(config,{enabled:false,runTransaction:async()=>{throw Error('permission denied')}})
 await assert.rejects(broken.exportData(actor()),{code:'COURSE_UNAVAILABLE'})
})
test('retakes never replace pinned initial measurements, changed meaning version is visibly unavailable',async()=>{
 const s=setup(),v=await s.daily(),id=v.profile.rows[0].resultId
 const newer=structuredClone(s.resultRows.get(A)[0]);newer.id=randomUUID();newer.measurement_at='2026-10-12T12:00:00.000Z';s.resultRows.get(A).push(newer)
 assert.ok((await s.repo.read(actor())).profile.rows.every(r=>r.resultId===id))
 s.setReports('changed');const changed=await s.repo.read(actor());assert.equal(changed.profile.status,'interpretations-unavailable');assert.ok(changed.profile.rows.every(r=>r.meaning===null))
})
test('stored source/model/duration/revision/consent metadata must agree with authenticated ciphertext',async()=>{
 for(const [field,value] of [['source_revision',99],['model_version','other'],['duration_days',14],['revision',99],['consented_at','2020-01-01T00:00:00.000Z']]){
  const s=setup();await s.daily();s.rows.get(A)[field]=value
  await assert.rejects(s.repo.read(actor()),{code:'COURSE_STATE_UNAVAILABLE'})
  await assert.rejects(s.repo.exportData(actor()),{code:'COURSE_STATE_UNAVAILABLE'})
 }
})
test('missing released loader is explicit release pending, never a ready or empty activation profile',async()=>{
 const s=setup(),repo=createCourse21Repository(config,{...s.options,loadReports:null})
 assert.deepEqual(await repo.preview(actor()),{available:false,reason:'COURSE_INTERPRETATIONS_RELEASE_PENDING',profile:null})
 const read=await repo.read(actor());assert.equal(read.course,null);assert.equal(read.enrollmentReady,false)
 await assert.rejects(repo.command(actor(),{action:'activate',operationId:randomUUID(),consent:true}),{code:'COURSE_INTERPRETATIONS_RELEASE_PENDING'})
 assert.equal(s.rows.size,0)
})
test('evicting an operation from the last50 cache cannot complete the same learning day twice',async()=>{
 const s=setup();let v=await s.daily();v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:true})
 const body={action:'finish-day',operationId:randomUUID(),expectedRevision:v.course.revision,day:1,lessonId:v.today.lesson.id,status:'completed',savePrivateText:false,feedback:{},applyFeedback:false}
 v=await s.command(body)
 for(let n=0;n<51;n++)v=await s.command({action:'preferences',expectedRevision:v.course.revision,length:n%2?'quick':'standard',alternativeRequested:false,stopOffer:false})
 assert.equal(s.decrypt().operations.some(op=>op.id===body.operationId),false)
 await assert.rejects(s.command(body),{code:'REVISION_CONFLICT'})
 await assert.rejects(s.command({...body,expectedRevision:v.course.revision}),{code:'DAY_NOT_AVAILABLE'})
 assert.equal((await s.repo.read(actor())).today.completedDays,1)
 assert.equal(Object.keys(s.decrypt().journey.sessions).length,1)
})
test('PostgreSQL consent timestamp formatting preserves the same instant without losing microsecond checks',async()=>{
 const s=setup();await s.daily();s.rows.get(A).consented_at='2026-10-12T12:00:00Z'
 assert.equal((await s.repo.read(actor())).course.durationDays,21)
 s.rows.get(A).consented_at='2026-10-12T12:00:00.000001Z'
 await assert.rejects(s.repo.read(actor()),{code:'COURSE_STATE_UNAVAILABLE'})
})
test('optional report outage cannot undo daily save/pause; profile is visibly unavailable and activation stays strict',async()=>{
 const s=setup();let v=await s.daily();v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:true})
 const lessonId=v.today.lesson.id;s.setReports('error')
 const read=await s.repo.read(actor());assert.equal(read.profile.status,'interpretations-unavailable');assert.equal(read.profile.rows.length,8);assert.ok(read.profile.rows.every(r=>r.meaning===null))
 v=await s.command({action:'finish-day',expectedRevision:v.course.revision,day:1,lessonId,status:'completed',savePrivateText:false,feedback:{},applyFeedback:false})
 assert.equal(v.today.completedDays,1);assert.equal(v.profile.status,'interpretations-unavailable')
 v=await s.command({action:'pause',expectedRevision:v.course.revision});assert.equal(v.course.status,'paused')
 assert.ok(s.queries.some(q=>q.sql==='rollback to savepoint course21_content'))
 const fresh=setup();fresh.setReports('error');await assert.rejects(fresh.repo.preview(actor()),{code:'CONTENT_OFFLINE'});assert.equal(fresh.rows.size,0)
})
test('permission and loader identity/value tampering are hard failures, not classified as content outages',async()=>{
 for(const mode of ['denied','tamper']){
  const s=setup();const v=await s.daily();s.setReports(mode)
  await assert.rejects(s.command({action:'pause',expectedRevision:v.course.revision}))
  assert.equal(s.rows.get(A).revision,v.course.revision);assert.equal(s.decrypt().journey.status,'active')
 }
})

test('current-date check-in survives read/edit; prior local date is not presented as current',async()=>{
 const s=setup();let v=await s.daily();v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:false,wellbeing:0,energy:'low',feelingChange:'worse',availableTime:'quick'})
 v=await s.repo.read(actor());assert.equal(v.today.checkin.wellbeing,0);assert.equal(v.today.checkin.energy,'low');assert.equal(v.today.checkin.availableTime,'quick')
 assert.equal(v.today.lesson.variant,'quick');s.setNow('2026-10-13T12:00:00.000Z');v=await s.repo.read(actor());assert.equal(v.today.status,'check-in-required');assert.equal(v.today.checkin,null);assert.equal(v.today.localDate,'2026-10-13')
})
async function finishAll(s,{skip=false}={}){
 let v=await s.daily()
 for(let day=1;day<=21;day++){
  s.setNow(new Date(Date.parse('2026-10-12T12:00:00.000Z')+(day-1)*86400000).toISOString())
  v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:false,wellbeing:day===1?0:6,energy:'usual'})
  v=await s.command({action:'finish-day',expectedRevision:v.course.revision,day,lessonId:skip?null:v.today.lesson.id,status:skip?'skipped':'completed',feedback:skip?{}:{helpfulness:day===1?'helpful':'neutral'},savePrivateText:false,applyFeedback:false})
 }
 return v
}
test('day21 summary, explicit continuation and later exact-form comparison preserve pinned baseline and history',async()=>{
 const s=setup();let v=await finishAll(s);assert.equal(v.course.status,'finished');assert.equal(v.completion.completedDays,21);assert.equal(v.completion.subjectiveCheckins.initial.wellbeing,0)
 assert.equal(v.history[0].checkin.wellbeing,0);assert.equal(v.completion.helpfulLessons[0].day,1);assert.equal(v.reassessment.forms[0].status,'not-repeated')
 const baseline=s.decrypt().source,history=s.decrypt().journey.sessions,finishedAt=v.completion.finishedAt
 await assert.rejects(s.command({action:'continuation',expectedRevision:v.course.revision,practiceDays:[1],pace:'own-pace',consent:false}),{code:'CONTINUATION_CONSENT_REQUIRED'})
 const command={action:'continuation',operationId:randomUUID(),expectedRevision:v.course.revision,practiceDays:[1,21],pace:'own-pace',consent:true}
 v=await s.command(command);assert.equal(v.completion.continuationPlan.practiceRefs.length,2);assert.equal(v.completion.continuationPlan.consent,true)
 assert.equal((await s.command(command)).course.revision,v.course.revision);assert.deepEqual(s.decrypt().source,baseline);assert.deepEqual(s.decrypt().journey.sessions,history)
 s.setNow('2026-11-03T12:00:00.000Z');const next=structuredClone(s.resultRows.get(A)[0]);next.id=randomUUID();next.measurement_at='2026-11-02T12:00:00.000Z'
 const d=getAssessmentDefinition('hh-weekly-pulse');next.dimensions=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,q.max]))).dimensions;s.resultRows.get(A).push(next)
 v=await s.repo.read(actor());assert.equal(v.completion.finishedAt,finishedAt);assert.equal(v.reassessment.forms[0].status,'ready');assert.equal(v.reassessment.forms[0].latestResultId,next.id)
 assert.equal(v.profile.rows[0].resultId,baseline.bindings[0].resultId);assert.equal(v.reassessment.forms[0].initialResultId,baseline.bindings[0].resultId)
 s.setReports('error');v=await s.repo.read(actor());assert.equal(v.completion.completedDays,21);assert.equal(v.reassessment.forms[0].status,'interpretations-unavailable');assert.ok(v.reassessment.forms[0].scales.every(r=>r.change===null))
})
test('all-skipped course remains distinct from completed practice; rest is an explicit continuation choice',async()=>{
 const s=setup();let v=await finishAll(s,{skip:true});assert.equal(v.completion.completedDays,0);assert.equal(v.completion.skippedDays,21);assert.equal(v.completion.completedLessons.length,0)
 await assert.rejects(s.command({action:'continuation',expectedRevision:v.course.revision,practiceDays:[1],pace:'occasional',consent:true}),{code:'EXACT_COMPLETED_LESSON_REQUIRED'})
 v=await s.command({action:'continuation',expectedRevision:v.course.revision,practiceDays:[],pace:'pause',consent:true});assert.equal(v.completion.continuationPlan.pace,'pause');assert.equal(v.course.status,'finished')
 await assert.rejects(s.command({action:'check-in',expectedRevision:v.course.revision,skip:true}),{code:'DAY_NOT_AVAILABLE'})
})


test('personal v2 enrollment persists exact plan, chosen lower load and factual checkins while v1 stays readable',async()=>{
 const s=setup({personal:true}),p=await s.repo.preview(actor())
 assert.equal(p.personalization,'exact-reviewed-scale-objective-practice');assert.equal(p.profile.rows.length,8)
 assert.equal(p.profile.rows.find(row=>row.dimensionKey==='weekly.recovery').canChoosePractice,true)
 let v=await s.command({...s.activation(p),loadMinutes:2})
 assert.equal(v.personalPlan.loadMinutes,2);assert.equal(v.outline.mode,'personal-exact');assert.equal(v.course.contentVersion,'hh-personal-practices-21-v2-pilot-2026-10-12')
 v=await s.command({action:'check-in',expectedRevision:v.course.revision,wellbeing:3,energy:'low',feelingChange:'worse',availableTime:'quick',skip:false})
 assert.equal(v.today.status,'ready');assert.equal(v.today.lesson.contentLocale,'en');assert.equal(v.today.lesson.preparedVariant,'short')
 const originalId=v.today.lesson.id
 v=await s.command({action:'finish-day',day:1,lessonId:originalId,expectedRevision:v.course.revision,expectedPlanRevision:v.personalPlan.revision,status:'completed',savePrivateText:false,feedback:{},applyFeedback:false})
 assert.equal(v.history[0].checkin.energy,'low');assert.equal(v.history[0].checkin.feelingChange,'worse');assert.equal(v.history[0].checkin.availableTime,'quick');assert.equal('preparedContent' in v.history[0],false);assert.equal('lessonSnapshot' in v.history[0],false)
 const readViaOldComposition=createCourse21Repository(config,{...s.options,personalRegistry:null})
 const archived=await readViaOldComposition.read(actor(),'ru',{reviewDay:1})
 assert.equal(archived.reviewLesson.lesson.id,originalId);assert.equal(archived.reviewLesson.lesson.contentLocale,'en')
 assert.equal(archived.profile.rows.length,8);assert.equal(archived.profile.availablePracticeCount,0)
 const exported=await readViaOldComposition.exportData(actor());assert.equal(exported.personal.plan.slots.length,21)
})
test('personal v2 exact future revision requires fresh evidence and consent and preserves completed slot',async()=>{
 const s=setup({personal:true});let v=await s.daily()
 v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:true})
 const lessonId=v.today.lesson.id
 await assert.rejects(s.command({action:'finish-day',day:1,lessonId,expectedRevision:v.course.revision,expectedPlanRevision:99,status:'completed',savePrivateText:false}),{code:'STALE_PLAN_REVISION'})
 v=await s.command({action:'finish-day',day:1,lessonId,expectedRevision:v.course.revision,expectedPlanRevision:0,status:'completed',savePrivateText:false,feedback:{},applyFeedback:false})
 const old=s.decrypt().journey.sessions[1]
 const change={action:'revise-plan',expectedRevision:v.course.revision,expectedPlanRevision:0,selectedR3ScaleKeys:v.course.selectedR3ScaleKeys,contentLocale:'ru',loadMinutes:2,consent:true}
 await assert.rejects(s.command({...change,consent:false}),{code:'EXPLICIT_REVISION_CONSENT_REQUIRED'})
 await assert.rejects(s.command({...change,loadMinutes:8}),{code:'INVALID_CHOSEN_LOAD'})
 s.setReports('changed');await assert.rejects(s.command({...change,contentLocale:'en'}),{code:'PERSONAL_PROFILE_UNAVAILABLE'})
 s.setReports('ready');v=await s.command(change)
 assert.equal(v.personalPlan.contentLocale,'ru');assert.equal(v.personalPlan.revision,1);assert.deepEqual(s.decrypt().journey.sessions[1],old)
 s.setNow('2026-10-13T12:00:00.000Z');v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:true})
 assert.equal(v.today.lesson.contentLocale,'ru')
 assert.equal((await s.repo.read(actor(),'ru',{reviewDay:1})).reviewLesson.lesson.contentLocale,'en')
})

for(const locale of ['en','ru'])test('personal v2 maximum journal history fits ciphertext limit '+locale,async(t)=>{
 const s=setup({personal:true,instrumentLocale:locale,displayLocale:locale}),p=await s.repo.preview(actor(),locale)
 let v=await s.command({...s.activation(p),selectedR3ScaleKeys:p.profile.rows.filter(row=>row.canChoosePractice).slice(0,5).map(row=>row.r3ScaleKey)})
 // RU history uses high-entropy three-byte Unicode per allowed JS code unit.
 const journal=seed=>{let value=seed;return Array.from({length:1000},()=>{value=(value*1664525+1013904223)>>>0;return String.fromCharCode((locale==='ru'?0x4e00:0x21)+value%(locale==='ru'?20000:90))}).join('')}
 for(let day=1;day<=21;day++){
  s.setNow(new Date(Date.parse('2026-10-12T12:00:00.000Z')+(day-1)*86400000).toISOString())
  v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:false,wellbeing:day%11,energy:'usual',availableTime:'standard'})
  assert.equal(v.today.status,'ready')
  const finish={action:'finish-day',expectedRevision:v.course.revision,expectedPlanRevision:v.personalPlan.revision,day,lessonId:v.today.lesson.id,status:'completed',goalObservations:goalChoices(v.today.goalObservationSnapshot,day%5+1),savePrivateText:true,feedback:{comment:journal(day),reflectionAnswer:journal(day+100)},applyFeedback:false}
  v=await s.command(finish)
  assert.ok(Buffer.byteLength(s.rows.get(A).state_ciphertext)<=524288,'encrypted full state exceeds existing table limit on day '+day)
 }
 assert.equal(v.course.status,'finished');assert.equal(v.completion.resolvedDays,21);assert.equal(v.history.length,21)
 assert.equal(v.completion.subjectiveCheckins.count,21)
 assert.deepEqual(v.weeklyReports.map(report=>report.checkpointDay),[7,14,21]);assert.ok(v.weeklyReports[2].cumulativeSeries.every(series=>series.count>=1))
 assert.equal(v.history[0].goalObservations.rows[0].rating,2)
 assert.equal(v.reassessment.forms.length,1);assert.equal(v.reassessment.forms[0].status,'not-repeated')
 v=await s.command({action:'continuation',expectedRevision:v.course.revision,practiceDays:[1,7,21],pace:'own-pace',consent:true})
 assert.equal(v.completion.continuationPlan.practiceRefs.length,3)
 t.diagnostic('21 days / 5 goals / 42 maximum journal fields / continuation: '+Buffer.byteLength(s.rows.get(A).state_ciphertext)+' ciphertext bytes')
 s.setNow('2026-11-03T12:00:00.000Z');const later=structuredClone(s.resultRows.get(A)[0]);later.id=randomUUID();later.measurement_at='2026-11-02T12:00:00.000Z';s.resultRows.get(A).push(later)
 v=await s.repo.read(actor(),locale);assert.equal(v.reassessment.forms[0].status,'ready')
 for(const day of [1,7,21])assert.equal((await s.repo.read(actor(),'ru',{reviewDay:day})).reviewLesson.status,'ready')
})


test('personal suggestions reuse only explicitly saved R3 focus tags without reading concern text',async()=>{
 const s=setup({personal:true});s.courses.get(A).focus_tags=['attention','relationships']
 const p=await s.repo.preview(actor())
 assert.match(p.profile.priorityScaleIds[0],/weekly.clarity$/);assert.match(p.profile.priorityScaleIds[1],/weekly.connection$/)
 assert.deepEqual(p.source.confirmedFocusTopicIds,['attention_clarity','connection_boundaries'])
 assert.ok(s.queries.every(query=>!query.sql.includes('concerns_ciphertext')))
 s.courses.get(A).focus_tags=['energy'];await assert.rejects(s.command(s.activation(p)),{code:'COURSE_PREVIEW_CHANGED'})
})


test('personal weekly accents cannot bypass optional private-text consent',async()=>{
 for(const weeklyAccents of ['synthetic private text',[],{privateNote:'synthetic'},{1:{comment:'synthetic'}}]){
  const s=setup({personal:true}),p=await s.repo.preview(actor())
  await assert.rejects(s.command({...s.activation(p),weeklyAccents}),{code:'INVALID_WEEKLY_ACCENTS'});assert.equal(s.rows.size,0)
 }
 const s=setup({personal:true}),v=await s.daily()
 await assert.rejects(s.command({action:'revise-plan',expectedRevision:v.course.revision,expectedPlanRevision:0,selectedR3ScaleKeys:v.course.selectedR3ScaleKeys,consent:true,weeklyAccents:{1:{privateNote:'synthetic'}}}),{code:'INVALID_WEEKLY_ACCENTS'})
 assert.deepEqual(s.decrypt().personal.plan.weeklyAccents,{})
})


test('authenticated malformed compressed state is a service error, never a retryable revision conflict',async()=>{
 const s=setup({personal:true});await s.daily();const row=s.rows.get(A)
 row.state_ciphertext=seal({format:'hh-course-state-gzip-v1',encoding:'gzip+base64',uncompressedBytes:3,payload:'bm9wZQ=='},{accountId:A,recordId:row.id,field:'course.daily_state'},config)
 await assert.rejects(s.repo.read(actor()),error=>error.code==='COURSE_STATE_UNAVAILABLE'&&error.status===503)
})

test('goal observations bind the exact shown variant and chosen goal and cannot store free text or invalid ratings',async()=>{
 const s=setup({personal:true});let v=await s.daily()
 v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:true})
 const snapshot=v.today.goalObservationSnapshot,valid=goalChoices(snapshot,4),initial=s.decrypt(),revision=v.course.revision
 assert.equal(snapshot.optional,true);assert.equal(snapshot.recoveryMeasure,false)
 const base={action:'finish-day',expectedRevision:revision,expectedPlanRevision:v.personalPlan.revision,day:1,lessonId:v.today.lesson.id,status:'completed',savePrivateText:false,feedback:{},applyFeedback:false}
 for(const invalid of [[{...valid[0],rating:0}],[{...valid[0],rating:6}],[{...valid[0],rating:'4'}],[{...valid[0],statementKey:'stale-variant'}],[{...valid[0],goalId:'other-goal'}],[{...valid[0],comment:'PRIVATE TEXT'}],[valid[0],valid[0]]]){
  await assert.rejects(s.command({...base,goalObservations:invalid}));assert.deepEqual(s.decrypt(),initial)
 }
 await assert.rejects(s.command({...base,status:'skipped',lessonId:null,goalObservations:valid}),{code:'SKIPPED_LESSON_HAS_NO_GOAL_RATINGS'})
 const operationId=randomUUID();v=await s.command({...base,operationId,goalObservations:valid})
 assert.equal((await s.command({...base,operationId,goalObservations:valid})).course.revision,v.course.revision)
 assert.equal(v.history[0].goalObservations.rows[0].rating,4);assert.equal(v.history[0].goalObservations.rows[0].statementText,snapshot.rows[0].statementText)
 assert.equal(v.weeklyReports.length,0)
 const exported=await createCourse21Repository(config,{...s.options,enabled:false,loadReports:null,personalRegistry:null}).exportData(actor())
 assert.equal(exported.journey.sessions[1].goalObservations.rows[0].rating,4);assert.equal(exported.operations,undefined)
 const other=await s.repo.read(actor(B));assert.equal(other.course,null)
})
test('weekly reports become private immutable snapshots only after resolved learning checkpoints',async()=>{
 const s=setup({personal:true});let v=await s.daily(),weekOne
 // Prepared statement bytes are pinned at activation, not taken from a later provider.
 s.options.personalRegistry.goalStatements=[]
 for(let day=1;day<=14;day++){
  s.setNow(new Date(Date.parse('2026-10-12T12:00:00Z')+(day-1)*86400000).toISOString())
  v=await s.command({action:'check-in',expectedRevision:v.course.revision,skip:true})
  const snapshot=v.today.goalObservationSnapshot;assert.ok(snapshot.rows.length>=1)
  const skipped=day===3
  v=await s.command({action:'finish-day',expectedRevision:v.course.revision,expectedPlanRevision:v.personalPlan.revision,day,lessonId:skipped?null:v.today.lesson.id,status:skipped?'skipped':'completed',goalObservations:skipped?[]:day===2?[]:goalChoices(snapshot,day===4?'skip':day%5+1),savePrivateText:false,feedback:{},applyFeedback:false})
  if(day<7)assert.equal(v.weeklyReports.length,0)
  if(day===7){assert.equal(v.weeklyReports.length,1);weekOne=structuredClone(v.weeklyReports[0]);assert.deepEqual(weekOne.coverage.skippedLessonDays,[3]);assert.ok(weekOne.series.some(series=>series.missingCount>0));assert.ok(weekOne.series.some(series=>series.skippedCount>0))}
 }
 assert.equal(v.weeklyReports.length,2);assert.deepEqual(v.weeklyReports[0],weekOne)
 assert.ok(v.weeklyReports[1].cumulativeSeries.some(series=>new Set(series.observations.map(point=>point.statementId)).size>1))
 assert.equal(s.decrypt().journey.sessions[3].goalObservations,undefined)
 s.setReports('error');const reread=await s.repo.read(actor(),'ru');assert.deepEqual(reread.weeklyReports,v.weeklyReports)
 const exported=await createCourse21Repository(config,{...s.options,enabled:false,loadReports:null,personalRegistry:null}).exportData(actor());assert.deepEqual(exported.personal.weeklyReports,v.weeklyReports)
 assert.ok(exported.personal.weeklyReports.every(report=>report.privateCabinetOnly&&report.externalTransmission===false))
})

test('required personal registry cannot silently fall back to legacy enrollment when its receipt is unavailable',async()=>{
 const s=setup(),p=await s.repo.preview(actor()),required=createCourse21Repository(config,{...s.options,requirePersonalRegistry:true,personalRegistry:null})
 assert.equal((await required.preview(actor())).reason,'COURSE_REVIEWED_MATERIAL_UNAVAILABLE')
 const absent=await required.read(actor());assert.equal(absent.enrollmentReady,false);assert.equal(absent.reason,'COURSE_REVIEWED_MATERIAL_UNAVAILABLE')
 await assert.rejects(required.command(actor(),{operationId:randomUUID(),...s.activation(p)}),{code:'COURSE_REVIEWED_MATERIAL_UNAVAILABLE'});assert.equal(s.rows.size,0)
 await s.daily();const legacy=await required.read(actor());assert.equal(legacy.course.personalization,null);assert.equal(legacy.course.contentVersion,s.decrypt().journey.contentVersion)
 assert.equal((await required.exportData(actor())).personal,undefined)
})
