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
test('first-day homework requires a reviewed timed ending and separate acceptance',()=>{
 const opening={completed:true,declined:false,checkmarks:{confirmation:true},confirmedQuote:'Yes'}
 const record={id:'00000000-0000-4000-8000-000000000001',courseSessionId:'clarity_day_1',provenance:'client_reviewed_dialogue',savedAt:'2026-11-26T12:00:00Z',turns:[],clientSummary:'Reflection',clientNextStep:'Next',durationSeconds:1200,opening}
 for(const locale of ['en','ru','es']){
  assert.equal(coachCourseProtocolRows(record.courseSessionId,[],null,locale).length,5)
  assert.deepEqual(clarityCourseResult(record,locale).homework,[])
  const timed={...record,clarityTimeLimitReached:true}
  assert.equal(clarityHomeworkCandidates(timed,coachCourseProtocolRows(record.courseSessionId,[],null,locale)).length,5)
  assert.deepEqual(clarityCourseResult(timed,locale).homework,[])
  const result=clarityCourseResult({...timed,clarityHomeworkAccepted:true},locale)
  assert.equal(result.day,1);assert.equal(result.summary,'Reflection')
  assert.equal(result.homework.length,5);assert.ok(result.homework.every(r=>r.question))
 }
 const accepted={...record,clarityTimeLimitReached:true,clarityHomeworkAccepted:true}
 assert.equal(clarityCourseResult({...record,courseSessionId:'clarity_support'}),null)
 assert.equal(clarityCourseResult({...record,savedAt:null}),null)
 assert.equal(clarityCourseResult({...record,provenance:'draft'}),null)
 for(const bad of [{clarityTimeLimitReached:false},{durationSeconds:1199},{opening:null},{opening:{...opening,completed:false}},{courseSessionId:'clarity_day_2'},{clarityHomeworkAccepted:false},{turns:[{role:'assistant',mode:'safety'}]}]){
  assert.deepEqual(clarityCourseResult({...accepted,...bad}).homework,[])
 }
 const rows=[['request','not_explored'],['life_balance','needs_confirmation'],['needs','confirmed'],['strengths','skipped_by_client'],['symptoms','not_explored']].map(([id,status])=>({id,status,label:'L',question:'Q'}))
 assert.deepEqual(clarityHomeworkRows(accepted,rows).map(r=>r.id),['request'])
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
 assert.match(read('components/app/clarity-program.jsx'),/number===1&&<details[^\n]*data-clarity-personal-homework/)
 assert.match(read('components/my-coach-live-dialogue.jsx'),/isConnected\?\.\(\)===true/)
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

import {clarityNextDay,clarityClockAdvance,clarityReviewExtends,clarityTurnAttribution,clarityRecap} from '../lib/coaching/clarity-continuity.mjs'
test('course clock excludes first heartbeat, inactivity and lost connection; advances only at boundaries',()=>{
 const time=100000
 assert.deepEqual(clarityClockAdvance({active_ms:0,clock_at:null},time,true),{activeMs:0,clockAt:new Date(time).toISOString(),complete:false})
 assert.equal(clarityClockAdvance({active_ms:5000,clock_at:new Date(time)},time+5000,true).activeMs,10000)
 assert.equal(clarityClockAdvance({active_ms:5000,clock_at:new Date(time)},time+5000,false).activeMs,5000)
 assert.equal(clarityClockAdvance({active_ms:5000,clock_at:new Date(time)},time+20000,true).activeMs,5000)
 assert.equal(clarityClockAdvance({active_ms:1199000,clock_at:new Date(time)},time+5000,true).complete,true)
 assert.equal(clarityNextDay([]),1)
 assert.equal(clarityNextDay([{course_day:1,active_ms:1199999},{course_day:2,active_ms:1200000}]),1)
 assert.equal(clarityNextDay([{course_day:1,active_ms:1200000}]),2)
 assert.equal(clarityNextDay([1,2,3].map(course_day=>({course_day,active_ms:1200000}))),null)
})
test('course preserves previous reviewed events and author attribution; recap never asserts candidates',()=>{
 const visitId='6c2b0e55-90ee-4c31-9b32-64c3860b5f28'
 assert.deepEqual(clarityTurnAttribution({coachId:'caesar',visitId}),{coachId:'caesar',visitId})
 assert.throws(()=>clarityTurnAttribution({coachId:'unknown',visitId}))
 assert.throws(()=>clarityTurnAttribution({coachId:'mira'}))
 assert.equal(clarityReviewExtends({events:[{revision:1}]},{events:[{revision:1},{revision:2}]}),true)
 assert.equal(clarityReviewExtends({events:[{revision:1}]},{events:[]}),false)
 const recap=clarityRecap([{status:'confirmed',label:'Goal',quote:'Learn Spanish'},{status:'needs_confirmation',label:'Resources',quote:'Invented candidate'}],'en',480)
 assert.match(recap,/Learn Spanish/);assert.match(recap,/720/);assert.doesNotMatch(recap,/Invented candidate/)
})
