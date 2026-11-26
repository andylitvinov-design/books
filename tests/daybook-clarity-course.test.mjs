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
test('saved results never grant homework from a client-only timed ending',()=>{
 const record={id:'saved-1',courseSessionId:'clarity_day_2',provenance:'client_reviewed_dialogue',savedAt:'2026-11-26T12:00:00Z',turns:[],clientSummary:'Reflection',clientNextStep:'Next'}
 for(const locale of ['en','ru','es']){
  assert.equal(coachCourseProtocolRows(record.courseSessionId,[],null,locale).length,6)
  assert.deepEqual(clarityCourseResult(record,locale).homework,[])
  const result=clarityCourseResult({...record,clarityTimeLimitReached:true},locale)
  assert.equal(result.day,2);assert.equal(result.summary,'Reflection')
  assert.deepEqual(result.homework,[])
 }
 assert.equal(clarityCourseResult({...record,courseSessionId:'clarity_support'}),null)
 assert.equal(clarityCourseResult({...record,savedAt:null}),null)
 assert.equal(clarityCourseResult({...record,provenance:'draft'}),null)
 const rows=['not_explored','needs_confirmation','confirmed','skipped_by_client'].map((status,id)=>({id,status,label:'L',question:'Q'}))
 assert.deepEqual(clarityHomeworkRows({...record,clarityTimeLimitReached:true},rows),[])
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
