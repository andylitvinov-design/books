// Goal enrollment domain. Internal use only: the authenticated server must
// resolve the existing settled order, account lock and verified connection.
// A validated shape, clock or client checkbox is never payment/consent proof.
import {createGoalCourseClock,validateGoalCourseClock,advanceGoalCourseClock,goalClockSummary,goalClockResumeTime,goalClockTimedEnd,GOAL_CLOCK_MAX_GAP_MS} from './clarity-course-clock.mjs'
export const GOAL_RUN_VERSION='hh-goal-run-v1'
export const GOAL_RUN_TOPICS=Object.freeze(['goal_result','goal_motivation','goal_plan','goal_resources','goal_obstacles','goal_possibilities','goal_acceleration','goal_integration'])
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)
const ms=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000
const fail=(code='GOAL_RUN_INVALID')=>{throw Error(code)}
export function createGoalRun({id,goalId,entitlementId,protocolIds,createdAt}){
 return validateGoalRun({version:GOAL_RUN_VERSION,id,goalId,entitlementId,protocolIds:[...protocolIds],createdAt,clock:createGoalCourseClock()})
}
export function validateGoalRun(run){
 if(!run||run.version!==GOAL_RUN_VERSION||!uuid(run.id)||!uuid(run.goalId)||!uuid(run.entitlementId)||!ms(run.createdAt)||
  !Array.isArray(run.protocolIds)||run.protocolIds.length!==GOAL_RUN_TOPICS.length||
  run.protocolIds.some(v=>!uuid(v)||v===run.id)||new Set(run.protocolIds).size!==run.protocolIds.length)fail()
 validateGoalCourseClock(run.clock)
 for(const d of run.clock.days)if((d.protocolId!==null&&d.protocolId!==run.protocolIds[d.day-1])||d.segments.some(s=>s.startedAt<run.createdAt))fail()
 return run
}
export function advanceGoalRun(run,event){
 validateGoalRun(run)
 if(!event||event.courseRunId!==run.id||event.courseSessionId!==GOAL_RUN_TOPICS[event.day-1]||
  event.protocolId!==run.protocolIds[event.day-1]||event.atMs<run.createdAt)fail('GOAL_RUN_CONFLICT')
 return validateGoalRun({...run,clock:advanceGoalCourseClock(run.clock,event)})
}
export function expireGoalRunObservation(run,atMs){
 validateGoalRun(run)
 if(!ms(atMs)||atMs<run.createdAt||(run.clock.lastEventAt!==null&&atMs<run.clock.lastEventAt))fail('GOAL_RUN_CONFLICT')
 const day=run.clock.days.find(d=>d.status==='active')
 if(!day)return run
 const segment=day.segments.at(-1)
 if(atMs-segment.observedAt<=GOAL_CLOCK_MAX_GAP_MS)return run
 return advanceGoalRun(run,{courseRunId:run.id,courseSessionId:GOAL_RUN_TOPICS[day.day-1],expectedRevision:run.clock.revision,
  day:day.day,protocolId:day.protocolId,segmentId:segment.segmentId,connectionId:segment.connectionId,type:'lost_observation',atMs,evidence:'server_observed_stop'})
}
export function goalRunSummary(run){
 validateGoalRun(run)
 const summary=goalClockSummary(run.clock)
 return {id:run.id,goalId:run.goalId,revision:summary.revision,currentDay:summary.currentDay,
  totalElapsedMs:summary.totalElapsedMs,timeBudgetExhausted:summary.complete,
  sessions:summary.days.map(d=>({...d,courseSessionId:GOAL_RUN_TOPICS[d.day-1],protocolId:run.protocolIds[d.day-1]}))}
}
export function goalRunResumeMetadata(run,day,protocolId){
 validateGoalRun(run)
 if(!Number.isInteger(day)||day<1||day>8||run.protocolIds[day-1]!==protocolId)fail('GOAL_RUN_CONFLICT')
 return {courseRunId:run.id,goalId:run.goalId,courseSessionId:GOAL_RUN_TOPICS[day-1],day,
  time:goalClockResumeTime(run.clock,day,protocolId)}
}
// Internal exact binding only. The server must separately enforce account
// ownership, current entitlement and approved durable result revision.
export function goalRunResultBinding(run,day,protocol){
 const metadata=goalRunResumeMetadata(run,day,protocol?.id)
 if(protocol.courseSessionId!==metadata.courseSessionId||protocol.provenance!=='client_reviewed_dialogue'||
  protocol.durationSeconds!==1200||!goalClockTimedEnd(run.clock,day,protocol.id))fail('GOAL_SESSION_STILL_OPEN')
 return {courseRunId:run.id,goalId:run.goalId,day,courseSessionId:metadata.courseSessionId,protocolId:protocol.id}
}
