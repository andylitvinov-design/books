import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createCourse21Repository} from '../lib/app/course-21.js'
import {getAssessmentDefinition,provenance} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {openSealed} from '../lib/app/crypto.js'
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222'
const actor=(id=A)=>({id,claims:{sub:id}})
const config={test:true,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic-only',course21Enabled:true}
function setup(){
 let timestamp='2026-10-12T12:00:00.000Z',tail=Promise.resolve(),reportMode='ready',schemaPresent=true
 const rows=new Map(),queries=[],accounts=new Map([A,B].map(id=>[id,{id,status:'active',onboarding_state:'active',timezone:'UTC'}]))
 const def=getAssessmentDefinition('hh-weekly-pulse'),scored=scoreAssessment(def,Object.fromEntries(def.questions.map(q=>[q.id,q.min])))
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
 const options={runTransaction,loadReports,now:()=>timestamp},repo=createCourse21Repository(config,options)
 const command=(body,who=actor(),locale='en')=>repo.command(who,{operationId:randomUUID(),...body},locale)
 const activation=p=>({action:'activate',expectedSourceRevision:p.source.courseRevision,activationToken:p.activationToken,
  selectedR3ScaleKeys:p.profile.rows.filter(r=>r.canChoosePractice).slice(0,3).map(r=>r.r3ScaleKey),consent:true,consentVersion:p.consentVersion,timeZone:'UTC'})
 const daily=async()=>command(activation(await repo.preview(actor())))
 const decrypt=()=>openSealed(rows.get(A).state_ciphertext,{accountId:A,recordId:rows.get(A).id,field:'course.daily_state'},config)
 return {repo,options,command,activation,daily,decrypt,rows,courses,plans,resultRows,queries,accounts,
  setNow:v=>timestamp=v,setReports:v=>reportMode=v,setSchema:v=>schemaPresent=v}
}
test('activation adds only a private daily state; R3 course, plan, results and14-day state stay unchanged',async()=>{
 const s=setup(),before={courses:structuredClone(s.courses),plans:structuredClone(s.plans),results:structuredClone(s.resultRows)}
 const v=await s.daily();assert.equal(v.course.durationDays,21);assert.equal(v.today.day,1);assert.equal(v.profile.rows.length,8)
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
