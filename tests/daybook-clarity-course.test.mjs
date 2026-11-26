import {createClarityCourseClock,advanceClarityCourseClock} from '../lib/coaching/clarity-course-clock.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CLARITY_COURSE_IDS,CLARITY_COURSE_SECONDS,CLARITY_COURSE_GROUP,clarityDay,clarityCourseDay,clarityCourseId,clarityCoachHref,clarityReturnHref,clarityHomeworkRows,clarityHomeworkCandidates,clarityHomeworkTags,clarityHomeworkNotes,clarityHomeworkEntryId} from '../lib/coaching/clarity-course.mjs'
import {clarityCourseResult} from '../lib/coaching/clarity-course-results.mjs'
import {coachCourseProtocolRows} from '../lib/coaching/coach-course-protocol-schema.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('three localized course days and bounded duration',()=>{
 assert.equal(CLARITY_COURSE_SECONDS,1200)
 assert.equal(CLARITY_COURSE_GROUP.sessions.length,3)
 for(const day of [1,2,3]){
  assert.equal(clarityDay(String(day)),day)
  assert.equal(clarityCourseDay(clarityCourseId(day)),day)
  assert.equal(clarityCourseId(day),CLARITY_COURSE_IDS[day-1])
  for(const locale of ['en','ru','es']){
   assert.ok(CLARITY_COURSE_GROUP.sessions[day-1].title[locale])
   assert.equal(clarityCoachHref('/'+locale+'/my-coach',day),'/'+locale+'/my-coach?clarityDay='+day)
   assert.equal(clarityReturnHref(locale,day),'/'+locale+'/app/daybook?program=clarity&clarityDay='+day)
  }
 }
 for(const invalid of [0,4,-1,'01','4','1.0',null,undefined,[],{}])assert.equal(clarityDay(invalid),null)
 assert.equal(clarityCourseDay('clarity_discover'),null)
 assert.equal(clarityCoachHref('//external.example',1),'//external.example')
})
test('first-day homework requires a matching server clock, reviewed ending and separate acceptance',()=>{
 const protocolId='00000000-0000-4000-8000-000000000001',segmentId='00000000-0000-4000-8000-000000000011',connectionId='00000000-0000-4000-8000-000000000021'
 let clock=createClarityCourseClock()
 const event={day:1,protocolId,segmentId,connectionId}
 clock=advanceClarityCourseClock(clock,{...event,type:'begin',expectedRevision:0,atMs:0,coachId:'mira',consent:{kind:'explicit_client_session_consent',decision:'start',protocolId,connectionId,coachId:'mira',atMs:0,turnId:'consent:1'}})
 for(let t=10000;t<=1200000;t+=10000)clock=advanceClarityCourseClock(clock,{...event,type:'observe',expectedRevision:clock.revision,atMs:t,evidence:'server_observed_connected'})
 const opening={completed:true,declined:false,checkmarks:{confirmation:true},confirmedQuote:'Yes'}
 const record={id:'00000000-0000-4000-8000-000000000001',courseSessionId:'clarity_day_1',provenance:'client_reviewed_dialogue',savedAt:'2026-11-26T12:00:00Z',turns:[],clientSummary:'Reflection',clientNextStep:'Next',durationSeconds:1200,opening}
 for(const locale of ['en','ru','es']){
  assert.equal(coachCourseProtocolRows(record.courseSessionId,[],null,locale).length,5)
  assert.deepEqual(clarityCourseResult(record,locale).homework,[])
  const timed={...record,clarityTimeLimitReached:true}
  assert.equal(clarityHomeworkCandidates(timed,coachCourseProtocolRows(record.courseSessionId,[],null,locale)).length,5)
  assert.deepEqual(clarityCourseResult(timed,locale).homework,[])
  assert.deepEqual(clarityCourseResult({...timed,clarityHomeworkAccepted:true},locale).homework,[])
  const result=clarityCourseResult({...timed,clarityHomeworkAccepted:true},locale,{clock})
  assert.equal(result.day,1);assert.equal(result.summary,'Reflection')
  assert.equal(result.homework.length,5);assert.ok(result.homework.every(r=>r.question))
 }
 const accepted={...record,clarityTimeLimitReached:true,clarityHomeworkAccepted:true}
 assert.equal(clarityCourseResult({...record,courseSessionId:'clarity_support'}),null)
 assert.equal(clarityCourseResult({...record,savedAt:null}),null)
 assert.equal(clarityCourseResult({...record,provenance:'draft'}),null)
 for(const bad of [{clarityTimeLimitReached:false},{durationSeconds:1199},{opening:null},{opening:{...opening,completed:false}},{courseSessionId:'clarity_day_2'},{clarityHomeworkAccepted:false},{turns:[{role:'assistant',mode:'safety'}]}]){
  assert.deepEqual(clarityCourseResult({...accepted,...bad},'en',{clock}).homework,[])
 }
 const rows=[['request','not_explored'],['life_balance','needs_confirmation'],['needs','confirmed'],['strengths','skipped_by_client'],['symptoms','not_explored']].map(([id,status])=>({id,status,label:'L',question:'Q'}))
 assert.deepEqual(clarityHomeworkRows(accepted,rows,clock).map(r=>r.id),['request'])
 assert.deepEqual(clarityHomeworkRows(accepted,rows),[])
 assert.deepEqual(clarityHomeworkRows({...accepted,id:'00000000-0000-4000-8000-000000000009'},rows,clock),[])
 assert.deepEqual(clarityHomeworkRows({...accepted,clarityHomeworkAccepted:false},rows,clock),[])
 assert.deepEqual(clarityHomeworkRows(record,rows),[])
})
test('homework answers are saved separately, scoped to the exact report and field',async()=>{
 const report='00000000-0000-4000-8000-000000000001',account='00000000-0000-4000-8000-000000000002'
 const tags=clarityHomeworkTags(report,'request')
 assert.deepEqual(tags,['hw:'+report,'hw-field:request'])
 assert.ok(tags.every(t=>t.length<=40))
 assert.equal(clarityHomeworkTags(report,'symptoms'),null)
 const note={kind:'note',goalId:null,revision:1,tags,text:'My reflection'}
 assert.deepEqual(clarityHomeworkNotes([note,{...note,revision:0},{...note,text:' '},{...note,goalId:account}],report,'request'),[note])
 assert.deepEqual(clarityHomeworkNotes([note],report,'needs'),[])
 const id=await clarityHomeworkEntryId(account,report,'request')
 assert.equal(await clarityHomeworkEntryId(account,report,'request'),id)
 assert.notEqual(await clarityHomeworkEntryId(account,report,'needs'),id)
 assert.notEqual(await clarityHomeworkEntryId(report,report,'request'),id)
 assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
 assert.match(read('components/app/clarity-program.jsx'),/homework=\{day===1\?<section data-clarity-personal-homework/)
 assert.match(read('components/my-coach-live-dialogue.jsx'),/clarityOpeningReady&&activeSessionSeconds>=CLARITY_COURSE_SECONDS/)
})
test('proposed voice grant is account and day scoped and feature gated',()=>{
 const sql=read('docs/coaching/clarity-course-voice-grants.proposal.sql')
 assert.match(sql,/primary key\(account_id,course_day\)/)
 assert.match(sql,/check\(course_day between 1 and 3\)/)
 assert.match(sql,/force row level security/)
 assert.match(sql,/account_id=\(select auth.uid\(\)\)/)
 assert.match(sql,/revoke all .* from public,anon,authenticated/)
 assert.match(read('lib/app/clarity-course-access.js'),/HH_CLARITY_FREE_COURSE_ENABLED/)
})
