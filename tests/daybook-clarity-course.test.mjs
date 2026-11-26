import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CLARITY_COURSE_IDS,CLARITY_COURSE_SECONDS,CLARITY_COURSE_GROUP,clarityDay,clarityCourseDay,clarityCourseId,clarityCoachHref,clarityReturnHref,clarityHomeworkRows} from '../lib/coaching/clarity-course.mjs'
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
test('saved results and optional homework after timed ending',()=>{
 const record={id:'saved-1',courseSessionId:'clarity_day_2',provenance:'client_reviewed_dialogue',savedAt:'2026-11-26T12:00:00Z',turns:[],clientSummary:'Reflection',clientNextStep:'Next'}
 for(const locale of ['en','ru','es']){
  assert.equal(coachCourseProtocolRows(record.courseSessionId,[],null,locale).length,6)
  assert.deepEqual(clarityCourseResult(record,locale).homework,[])
  const result=clarityCourseResult({...record,clarityTimeLimitReached:true},locale)
  assert.equal(result.day,2);assert.equal(result.summary,'Reflection')
  assert.equal(result.homework.length,6);assert.ok(result.homework.every(r=>r.question))
 }
 assert.equal(clarityCourseResult({...record,courseSessionId:'clarity_support'}),null)
 assert.equal(clarityCourseResult({...record,savedAt:null}),null)
 assert.equal(clarityCourseResult({...record,provenance:'draft'}),null)
 const rows=['not_explored','needs_confirmation','confirmed','skipped_by_client'].map((status,id)=>({id,status,label:'L',question:'Q'}))
 assert.deepEqual(clarityHomeworkRows({...record,clarityTimeLimitReached:true},rows).map(r=>r.id),[0,1])
 assert.deepEqual(clarityHomeworkRows(record,rows),[])
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
