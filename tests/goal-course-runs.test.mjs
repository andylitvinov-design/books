import './goal-course-result-document.test.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {createClarityCourseClock,validateClarityCourseClock,createGoalCourseClock,validateGoalCourseClock,GOAL_LOGICAL_SESSION_MS} from '../lib/coaching/clarity-course-clock.mjs'
import {createGoalRun,advanceGoalRun,expireGoalRunObservation,goalRunSummary,goalRunResumeMetadata,goalRunResultBinding,GOAL_RUN_TOPICS} from '../lib/coaching/goal-course-runs.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const fresh=(offset=0)=>createGoalRun({id:id(100+offset),goalId:id(200),entitlementId:id(300+offset),protocolIds:Array.from({length:8},(_,i)=>id(1+i+offset)),createdAt:0})
function event(run,day,type,atMs,options={}){
 const protocolId=run.protocolIds[day-1],connectionId=options.connectionId||id(20+day),segmentId=options.segmentId||id(40+day),coachId=options.coachId||'mira'
 return {courseRunId:run.id,courseSessionId:GOAL_RUN_TOPICS[day-1],expectedRevision:run.clock.revision,day,type,atMs,protocolId,connectionId,segmentId,coachId,...(type==='begin'?{consent:{kind:'explicit_client_session_consent',decision:options.decision||'start',protocolId,connectionId,coachId,atMs,turnId:options.turnId||'start:'+day}}:{evidence:type==='observe'?'server_observed_connected':'server_observed_stop'}),...options}
}
test('Goal and Clarity use distinct versions and exact independent counts',()=>{
 assert.equal(createClarityCourseClock().days.length,3)
 assert.equal(createGoalCourseClock().days.length,8)
 assert.throws(()=>validateClarityCourseClock(createGoalCourseClock()),/CLARITY_CLOCK_INVALID/)
 assert.throws(()=>validateGoalCourseClock(createClarityCourseClock()),/GOAL_CLOCK_INVALID/)
 assert.throws(()=>validateGoalCourseClock({...createGoalCourseClock(),dailyPolicy:undefined}),/GOAL_CLOCK_INVALID/)
})
test('eight verified twenty-minute windows, consent on each start and no automatic course success',()=>{
 let run=fresh(),now=0
 assert.equal(goalRunSummary(run).totalElapsedMs,0)
 assert.throws(()=>advanceGoalRun(run,event(run,2,'begin',now)),/CONFLICT/)
 for(let day=1;day<=8;day++){
  run=advanceGoalRun(run,event(run,day,'begin',now))
  for(let delta=10000;delta<=GOAL_LOGICAL_SESSION_MS;delta+=10000)run=advanceGoalRun(run,event(run,day,'observe',now+delta))
  assert.equal(goalRunResumeMetadata(run,day,run.protocolIds[day-1]).time.remainingSeconds,0)
  const protocol={id:run.protocolIds[day-1],courseSessionId:GOAL_RUN_TOPICS[day-1],durationSeconds:1200,provenance:'client_reviewed_dialogue'}
  assert.equal(goalRunResultBinding(run,day,protocol).courseRunId,run.id)
  assert.throws(()=>goalRunResultBinding(run,day,{...protocol,provenance:'client_autosaved_unreviewed_draft'}),/STILL_OPEN/)
  if(day<8)assert.equal(goalRunSummary(run).sessions[day].status,'not_started')
  now+=GOAL_LOGICAL_SESSION_MS+1000
 }
 assert.equal(goalRunSummary(run).totalElapsedMs,9600000)
 assert.equal(goalRunSummary(run).timeBudgetExhausted,true)
 assert.equal(Object.hasOwn(goalRunSummary(run),'goalAchieved'),false)
})
test('pause, loss, fresh consent, cross-coach and run binding are conservative',()=>{
 let run=fresh()
 const other=fresh(1000)
 assert.throws(()=>advanceGoalRun(run,{...event(run,1,'begin',0),courseRunId:other.id}),/CONFLICT/)
 assert.throws(()=>advanceGoalRun(run,{...event(run,1,'begin',0),consent:true}),/NOT_AUTHORIZED/)
 run=advanceGoalRun(run,event(run,1,'begin',0))
 const before=run
 run=advanceGoalRun(run,event(run,1,'observe',10000))
 assert.throws(()=>advanceGoalRun(run,event(before,1,'observe',10000)),/CONFLICT/)
 assert.throws(()=>advanceGoalRun(run,{...event(run,1,'observe',11000),evidence:'browser'}),/NOT_AUTHORIZED/)
 run=expireGoalRunObservation(run,30000)
 assert.equal(goalRunResumeMetadata(run,1,id(1)).time.remainingSeconds,1190)
 assert.throws(()=>goalRunResultBinding(run,1,{id:id(1),courseSessionId:'goal_result',durationSeconds:1200,provenance:'client_reviewed_dialogue'}),/STILL_OPEN/)
 const options={segmentId:id(99),connectionId:id(98),coachId:'caesar',decision:'continue',turnId:'new'}
 run=advanceGoalRun(run,event(run,1,'begin',40000,options))
 run=advanceGoalRun(run,event(run,1,'observe',50000,options))
 assert.equal(run.clock.days[0].elapsedMs,20000)
 assert.equal(run.clock.days[0].segments[1].coachId,'caesar')
 assert.throws(()=>goalRunResumeMetadata(run,1,other.protocolIds[0]),/CONFLICT/)
 assert.equal(goalRunSummary(other).totalElapsedMs,0)
})
