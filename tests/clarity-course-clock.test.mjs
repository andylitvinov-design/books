import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createClarityCourseClock,advanceClarityCourseClock,clarityClockSummary,clarityClockDailySlot,clarityClockTimedEnd,clarityClockResumeTime,validateClarityCourseClock,CLARITY_LOGICAL_SESSION_MS,CLARITY_CLOCK_MAX_GAP_MS} from '../lib/coaching/clarity-course-clock.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const e=(clock,day,type,atMs,{protocolId=id(day),segmentId=id(day+10),connectionId=id(day+20),...extra}={})=>
 ({expectedRevision:clock.revision,day,type,atMs,protocolId,segmentId,connectionId,...extra})
function begin(clock,day,atMs,{segmentId=id(day+10),connectionId=id(day+20),coachId='mira',turnId='consent:'+day,decision='start'}={}){
 return advanceClarityCourseClock(clock,e(clock,day,'begin',atMs,{segmentId,connectionId,coachId,
  consent:{kind:'explicit_client_session_consent',decision,protocolId:id(day),connectionId,coachId,atMs,turnId}}))
}
function observe(clock,day,atMs,extra={}){
 return advanceClarityCourseClock(clock,e(clock,day,'observe',atMs,{evidence:'server_observed_connected',...extra}))
}
function stop(clock,day,atMs,type,extra={}){
 return advanceClarityCourseClock(clock,e(clock,day,type,atMs,{evidence:'server_observed_stop',...extra}))
}
function tickUntil(clock,day,start,duration,extra={}){
 for(let delta=10000;delta<=duration;delta+=10000)clock=observe(clock,day,start+delta,extra)
 return clock
}
test('mint/greeting/checkbox are not consent, days cannot be skipped',()=>{
 const clock=createClarityCourseClock()
 assert.equal(clarityClockSummary(clock).totalElapsedMs,0)
 assert.throws(()=>advanceClarityCourseClock(clock,e(clock,1,'begin',0,{coachId:'mira',consent:true})),/NOT_AUTHORIZED/)
 assert.throws(()=>advanceClarityCourseClock(clock,e(clock,1,'observe',1000,{evidence:'server_observed_connected'})),/CONFLICT/)
 assert.throws(()=>begin(clock,2,0),/CONFLICT/)
 assert.throws(()=>advanceClarityCourseClock(clock,e(clock,1,'begin',0,{coachId:'mira',consent:{kind:'explicit_client_session_consent',decision:'start',protocolId:id(2),connectionId:id(21),coachId:'mira',atMs:0,turnId:'a'}})),/NOT_AUTHORIZED/)
 assert.equal(clock.revision,0)
})
test('disconnect and coach change preserve exact remaining time, same logical protocol and attribution',()=>{
 let clock=begin(createClarityCourseClock(),1,1000)
 clock=tickUntil(clock,1,1000,300000)
 clock=stop(clock,1,301500,'disconnect')
 assert.equal(clock.days[0].status,'paused');assert.equal(clock.days[0].elapsedMs,300000)
 assert.equal(clarityClockTimedEnd(clock,1,id(1)),false)
 assert.throws(()=>begin(clock,1,900000,{segmentId:id(90),connectionId:id(91)}),/NOT_AUTHORIZED/)
 const previous=clock
 clock=begin(clock,1,900000,{segmentId:id(90),connectionId:id(91),coachId:'caesar',turnId:'consent:continue',decision:'continue'})
 assert.equal(clock.days[0].protocolId,id(1));assert.equal(clock.days[0].elapsedMs,300000)
 assert.throws(()=>advanceClarityCourseClock(clock,e(previous,1,'observe',910000,{evidence:'server_observed_connected'})),/CONFLICT/)
 assert.throws(()=>observe(clock,1,910000),/CONFLICT/)
 clock=tickUntil(clock,1,900000,900000,{segmentId:id(90),connectionId:id(91)})
 assert.equal(clock.days[0].elapsedMs,CLARITY_LOGICAL_SESSION_MS)
 assert.equal(clock.days[0].status,'time_limit')
 assert.equal(clock.days[0].segments[0].coachId,'mira');assert.equal(clock.days[0].segments[1].coachId,'caesar')
 assert.equal(clarityClockSummary(clock).currentDay,2)
 assert.equal(clock.days[1].status,'not_started')
 assert.equal(clarityClockTimedEnd(clock,1,id(1)),true)
 assert.equal(clarityClockTimedEnd(clock,1,id(2)),false)
 assert.equal(clarityClockTimedEnd(clock,2,id(1)),false)
 assert.equal(previous.days[0].status,'paused')
})
test('gap and explicit pause never create timed homework or count unknown time',()=>{
 let clock=begin(createClarityCourseClock(),1,0)
 clock=observe(clock,1,10000)
 clock=observe(clock,1,10000+CLARITY_CLOCK_MAX_GAP_MS+1)
 assert.equal(clock.days[0].status,'paused')
 assert.equal(clock.days[0].elapsedMs,10000)
 assert.equal(clock.days[0].segments[0].reason,'lost_observation')
 assert.equal(clarityClockTimedEnd(clock,1,id(1)),false)
 assert.throws(()=>begin(clock,1,90000,{segmentId:id(80),connectionId:id(81),decision:'continue',turnId:'consent:1'}),/NOT_AUTHORIZED/)
 clock=begin(clock,1,90000,{segmentId:id(80),connectionId:id(81),decision:'continue',turnId:'new-consent'})
 assert.throws(()=>observe(clock,1,95000,{segmentId:id(80),connectionId:id(81),evidence:'browser'}),/NOT_AUTHORIZED/)
 clock=stop(clock,1,95000,'pause',{segmentId:id(80),connectionId:id(81)})
 assert.equal(clock.days[0].elapsedMs,10000)
 assert.equal(clarityClockTimedEnd(clock,1,id(1)),false)
})
test('three logical windows of twenty minutes; no automatic day start or overrun',()=>{
 let clock=createClarityCourseClock(),now=0
 for(let day=1;day<=3;day++){
  clock=begin(clock,day,now)
  clock=tickUntil(clock,day,now,1190000)
  clock=observe(clock,day,now+1201000)
  assert.equal(clock.days[day-1].elapsedMs,1200000)
  assert.equal(clock.days[day-1].endedAt,now+1200000)
  assert.equal(clarityClockTimedEnd(clock,day,id(day)),true)
  if(day<3)assert.equal(clock.days[day].status,'not_started')
  now+=86400000
 }
 assert.equal(clarityClockSummary(clock).totalElapsedMs,3600000)
 assert.equal(clarityClockSummary(clock).complete,true)
 assert.throws(()=>begin(clock,3,now),/CONFLICT/)
 const corrupt=structuredClone(clock);corrupt.days[0].elapsedMs=1
 assert.throws(()=>validateClarityCourseClock(corrupt),/INVALID/)
 assert.equal(clarityClockTimedEnd(corrupt,1,id(1)),false)
})

test('only the canonical server clock is readable; prototype browser mutations are retired',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const route=read('app/api/app/clarity-course/clock/route.js')
 assert.match(route,/await auth\.verified\(\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
 assert.match(route,/clarityClockSummary\(clock,Date\.now\(\)\)/)
 assert.doesNotMatch(route,/export (?:const|async function|function) POST|writeClarityClock|applyTrustedClarityClockEvent|readBody/)
 assert.match(read('lib/app/clarity-logical-clock-store.js'),/clarityLogicalClockEnabled=\(\)=>false/)
 assert.match(read('lib/app/clarity-course-access.js'),/CLARITY_TRUSTED_TRANSPORT_ADAPTER_READY=false/)
})

test('one free logical session per UTC date regardless of coach; same-day continuation retains remainder',()=>{
 const dayMs=86400000
 let clock=begin(createClarityCourseClock(),1,0)
 clock=tickUntil(clock,1,0,300000)
 clock=stop(clock,1,300100,'disconnect')
 assert.equal(clarityClockDailySlot(clock,400000).occupied,true)
 assert.equal(clarityClockDailySlot(clock,400000).newLogicalSessionBlocked,false)
 const segmentId=id(91),connectionId=id(92)
 clock=begin(clock,1,400000,{segmentId,connectionId,coachId:'caesar',turnId:'resume:1',decision:'continue'})
 clock=tickUntil(clock,1,400000,900000,{segmentId,connectionId})
 assert.equal(clarityClockDailySlot(clock,1300000).newLogicalSessionBlocked,true)
 assert.throws(()=>begin(clock,2,1300001,{coachId:'sofia'}),/CLARITY_DAILY_SESSION_LIMIT/)
 assert.equal(clarityClockSummary(clock,dayMs).dailySlot.occupied,false)
 clock=begin(clock,2,dayMs,{coachId:'sofia'})
 assert.equal(clock.days[1].elapsedMs,0)
 assert.equal(clarityClockDailySlot(clock,dayMs).courseDay,2)
})
test('credited time across midnight occupies both dates; disconnect does not',()=>{
 const midnight=86400000
 let clock=begin(createClarityCourseClock(),1,midnight-10000)
 clock=observe(clock,1,midnight)
 assert.equal(clarityClockDailySlot(clock,midnight).occupied,false)
 clock=observe(clock,1,midnight+10000)
 assert.equal(clarityClockDailySlot(clock,midnight).courseDay,1)
 clock=tickUntil(clock,1,midnight+10000,1180000)
 assert.equal(clock.days[0].status,'time_limit')
 assert.throws(()=>begin(clock,2,midnight+1200001),/CLARITY_DAILY_SESSION_LIMIT/)
 let interrupted=begin(createClarityCourseClock(),1,midnight-10000)
 interrupted=stop(interrupted,1,midnight+10000,'disconnect')
 assert.equal(clarityClockDailySlot(interrupted,midnight+10000).occupied,false)
 assert.equal(interrupted.days[0].elapsedMs,0)
})
test('corrupt persisted ledger cannot assign the same date to distinct protocols',()=>{
 let clock=begin(createClarityCourseClock(),1,0)
 clock=tickUntil(clock,1,0,1200000)
 clock=begin(clock,2,86400000)
 const corrupt=structuredClone(clock)
 const segment=corrupt.days[1].segments[0]
 segment.startedAt=segment.observedAt=1300000
 corrupt.lastEventAt=1300000
 assert.throws(()=>validateClarityCourseClock(corrupt),/CLARITY_CLOCK_INVALID/)
})

test('resume time is exact-protocol, bounded, read-only, and rejects unknown or corrupt ledgers',()=>{
 let clock=createClarityCourseClock()
 assert.equal(clarityClockResumeTime(clock,1,id(1)),null)
 assert.equal(clarityClockResumeTime(null,1,id(1)),null)
 clock=begin(clock,1,1000)
 assert.deepEqual(clarityClockResumeTime(clock,1,id(1)),{elapsedSeconds:0,remainingSeconds:1200,status:'active'})
 clock=tickUntil(clock,1,1000,300000)
 clock=stop(clock,1,301500,'disconnect')
 assert.deepEqual(clarityClockResumeTime(clock,1,id(1)),{elapsedSeconds:300,remainingSeconds:900,status:'paused'})
 assert.equal(clarityClockResumeTime(clock,1,id(2)),null)
 assert.equal(clarityClockResumeTime(clock,2,id(1)),null)
 assert.equal(clarityClockResumeTime(clock,0,id(1)),null)
 assert.equal(clarityClockResumeTime(clock,1,'bad'),null)
 const corrupt=structuredClone(clock);corrupt.days[0].elapsedMs=0
 assert.equal(clarityClockResumeTime(corrupt,1,id(1)),null)
 assert.equal(clarityClockTimedEnd(clock,1,id(1)),false)
})
