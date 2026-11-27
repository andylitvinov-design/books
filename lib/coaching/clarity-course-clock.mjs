// The server-owned logical course clock is independent of a voice transport.
// Events must be constructed by a verified server adapter, never from a
// browser-reported elapsed duration, checkbox, model reply or token mint.
// This is an internal domain contract, NOT a provider authorization.
import {PUBLIC_COACH_PERSONA_IDS} from './persona-registry.mjs'
export const CLARITY_CLOCK_VERSION='hh-clarity-clock-v1'
export const CLARITY_LOGICAL_SESSION_MS=20*60*1000
export const CLARITY_CLOCK_MAX_GAP_MS=15000
const MAX_SEGMENTS=128
// UTC is the provisional server calendar; the browser never selects a date.
const CALENDAR_DAY_MS=86400000
const calendarDay=stamp=>Math.floor(stamp/CALENDAR_DAY_MS)
// Reconstruct the daily slots from the one trusted segment ledger. No extra
// table or reset. Consent reserves the start date even at zero elapsed.
function occupiedCalendarSlots(state){
 const slots=new Map()
 // Paid course time never consumes a free calendar slot. Only the owner-
 // scoped run store may construct a paid clock from a settled entitlement.
 if(state.dailyPolicy==='paid')return slots
 for(const item of state.days)for(const segment of item.segments){
  const first=calendarDay(segment.startedAt)
  // The credited interval is half-open: an observation exactly at midnight
  // does not occupy the next date until positive time is credited there.
  const last=calendarDay(Math.max(segment.startedAt,segment.observedAt-1))
  for(let date=first;date<=last;date++){
   const prior=slots.get(date)
   if(prior&&prior!==item.protocolId)invalid()
   slots.set(date,item.protocolId)
  }
 }
 return slots
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const ref=/^[A-Za-z0-9:_-]{1,128}$/
const id=value=>typeof value==='string'&&uuid.test(value)
const time=value=>Number.isSafeInteger(value)&&value>=0&&value<=8640000000000000
const coach=value=>PUBLIC_COACH_PERSONA_IDS.includes(value)
const invalid=()=>{throw Error('CLARITY_CLOCK_INVALID')}
const conflict=()=>{throw Error('CLARITY_CLOCK_CONFLICT')}
const forbidden=()=>{throw Error('CLARITY_CLOCK_NOT_AUTHORIZED')}
const blank=day=>({day,protocolId:null,status:'not_started',elapsedMs:0,segments:[],endedAt:null})
export function createClarityCourseClock({dailyPolicy='free'}={}){
 if(!['free','paid'].includes(dailyPolicy))invalid()
 return {version:CLARITY_CLOCK_VERSION,...(dailyPolicy==='paid'?{dailyPolicy}:{}),revision:0,lastEventAt:null,days:[blank(1),blank(2),blank(3)]}
}
export function validateClarityCourseClock(state){
 if(!state||state.version!==CLARITY_CLOCK_VERSION||!(state.dailyPolicy===undefined||state.dailyPolicy==='paid')||!Number.isSafeInteger(state.revision)||state.revision<0||
  (state.lastEventAt!==null&&!time(state.lastEventAt))||!Array.isArray(state.days)||state.days.length!==3)invalid()
 const protocols=new Set(),segments=new Set(),consents=new Set()
 let blocked=false,latest=null,previousEnd=null
 for(const [i,d] of state.days.entries()){
  if(!d||d.day!==i+1||!['not_started','active','paused','time_limit'].includes(d.status)||
    !Number.isSafeInteger(d.elapsedMs)||d.elapsedMs<0||d.elapsedMs>CLARITY_LOGICAL_SESSION_MS||
    !Array.isArray(d.segments)||d.segments.length>MAX_SEGMENTS||(blocked&&d.status!=='not_started'))invalid()
  if(d.status==='not_started'){
   if(d.protocolId!==null||d.elapsedMs!==0||d.segments.length||d.endedAt!==null)invalid()
  }else{
   if(!id(d.protocolId)||protocols.has(d.protocolId)||!d.segments.length)invalid()
   protocols.add(d.protocolId)
   let sum=0
   for(const [j,s] of d.segments.entries()){
    if(!s||!id(s.segmentId)||segments.has(s.segmentId)||!id(s.connectionId)||!coach(s.coachId)||
      typeof s.consentTurnId!=='string'||!ref.test(s.consentTurnId)||consents.has(d.protocolId+':'+s.consentTurnId)||
      !time(s.startedAt)||!time(s.observedAt)||s.observedAt<s.startedAt||
      (previousEnd!==null&&s.startedAt<previousEnd)||
      !Number.isSafeInteger(s.elapsedMs)||s.elapsedMs!==s.observedAt-s.startedAt)invalid()
    segments.add(s.segmentId);consents.add(d.protocolId+':'+s.consentTurnId)
    const last=j===d.segments.length-1
    if(s.endedAt===null){
     if(!last||d.status!=='active'||s.reason!==null)invalid()
     latest=s.observedAt;previousEnd=s.observedAt
    }else{
     if(!time(s.endedAt)||s.endedAt<s.observedAt||
       !['pause','disconnect','coach_change','lost_observation','time_limit'].includes(s.reason)||
       (s.reason==='time_limit'&&(!last||d.status!=='time_limit'))||
       (last&&d.status==='active'))invalid()
     latest=s.endedAt;previousEnd=s.endedAt
    }
    sum+=s.elapsedMs
   }
   if(sum!==d.elapsedMs)invalid()
   const last=d.segments.at(-1)
   if(d.status==='time_limit'){
    if(d.elapsedMs!==CLARITY_LOGICAL_SESSION_MS||d.endedAt!==last.endedAt||last.reason!=='time_limit'||
      last.observedAt!==last.endedAt)invalid()
   }else if(d.endedAt!==null||d.elapsedMs>=CLARITY_LOGICAL_SESSION_MS||
     (d.status==='paused'&&last.endedAt===null))invalid()
  }
  if(d.status!=='time_limit')blocked=true
 }
 if((latest===null&&state.lastEventAt!==null)||(latest!==null&&(state.lastEventAt===null||state.lastEventAt<latest)))invalid()
 occupiedCalendarSlots(state)
 return state
}
// Compute new account-wide calendar claims from validated server-clock states.
// A start claims its day immediately; midnight is claimed only by positive
// credited time. Replays, pauses and paid courses never add a second claim.
export function clarityClockNewDailyClaims(before,after){
 validateClarityCourseClock(after)
 if(before)validateClarityCourseClock(before)
 if(before&&before.dailyPolicy!==after.dailyPolicy)invalid()
 const prior=before?occupiedCalendarSlots(before):new Map(),next=occupiedCalendarSlots(after)
 for(const [date,protocolId] of prior)if(next.get(date)!==protocolId)invalid()
 return [...next.entries()].filter(([date])=>!prior.has(date)).sort(([a],[b])=>a-b)
  .map(([date,protocolId])=>({calendarDay:new Date(date*CALENDAR_DAY_MS).toISOString().split('T')[0],protocolId}))
}
// Read-only status, never a grant or a provider authorization.
export function clarityClockDailySlot(state,atMs){
 validateClarityCourseClock(state)
 if(!time(atMs))invalid()
 const date=calendarDay(atMs),owner=occupiedCalendarSlots(state).get(date)||null
 const current=state.days.find(day=>day.status!=='time_limit')
 return {calendarDay:new Date(date*CALENDAR_DAY_MS).toISOString().split('T')[0],
  occupied:owner!==null,courseDay:state.days.find(day=>owner!==null&&day.protocolId===owner)?.day??null,
  newLogicalSessionBlocked:owner!==null&&Boolean(current)&&current.protocolId!==owner}
}
export function clarityClockSummary(state,atMs=null){
 validateClarityCourseClock(state)
 const next=state.days.find(day=>day.status!=='time_limit')
 return {revision:state.revision,currentDay:next?.day??null,complete:!next,
  totalElapsedMs:state.days.reduce((n,day)=>n+day.elapsedMs,0),
  ...(atMs===null?{}:{dailySlot:clarityClockDailySlot(state,atMs)}),
  days:state.days.map(day=>({day:day.day,protocolId:day.protocolId,status:day.status,
    elapsedMs:day.elapsedMs,remainingMs:CLARITY_LOGICAL_SESSION_MS-day.elapsedMs}))}
}
// Only trusted, server-observed events may reach this function. Persist the
// returned state under compare-and-swap; an old revision cannot spend time twice.
export function advanceClarityCourseClock(state,event){
 validateClarityCourseClock(state)
 if(!event||!Number.isSafeInteger(event.expectedRevision)||event.expectedRevision!==state.revision)conflict()
 if(!time(event.atMs)||(state.lastEventAt!==null&&event.atMs<state.lastEventAt)||!id(event.protocolId)||
   !id(event.segmentId)||!id(event.connectionId))invalid()
 const current=state.days.find(day=>day.status!=='time_limit')
 if(!current||event.day!==current.day)conflict()
 const next=structuredClone(state),day=next.days[current.day-1]
 if(event.type==='begin'){
  if(day.status==='active'||(day.protocolId&&day.protocolId!==event.protocolId)||
    next.days.some(d=>d.day!==day.day&&d.protocolId===event.protocolId)||
    next.days.some(d=>d.segments.some(s=>s.segmentId===event.segmentId)))conflict()
  if(day.segments.length>=MAX_SEGMENTS||!coach(event.coachId))invalid()
  const occupied=occupiedCalendarSlots(state).get(calendarDay(event.atMs))
  // A different coach/device never creates another free logical slot.
  if(occupied&&occupied!==event.protocolId)throw Error('CLARITY_DAILY_SESSION_LIMIT')
  const proof=event.consent,decision=day.status==='not_started'?'start':'continue'
  if(!proof||proof.kind!=='explicit_client_session_consent'||proof.decision!==decision||
    proof.protocolId!==event.protocolId||proof.connectionId!==event.connectionId||
    proof.coachId!==event.coachId||proof.atMs!==event.atMs||
    typeof proof.turnId!=='string'||!ref.test(proof.turnId)||
    day.segments.some(s=>s.consentTurnId===proof.turnId))forbidden()
  day.protocolId=event.protocolId;day.status='active'
  day.segments.push({segmentId:event.segmentId,connectionId:event.connectionId,coachId:event.coachId,
   consentTurnId:proof.turnId,startedAt:event.atMs,observedAt:event.atMs,elapsedMs:0,endedAt:null,reason:null})
 }else{
  const segment=day.segments.at(-1)
  if(day.status!=='active'||day.protocolId!==event.protocolId||segment.segmentId!==event.segmentId||
    segment.connectionId!==event.connectionId)conflict()
  function close(reason,at){
   segment.reason=reason;segment.endedAt=at
   day.status=reason==='time_limit'?'time_limit':'paused'
   day.endedAt=reason==='time_limit'?at:null
  }
  if(event.type==='observe'){
   if(event.evidence!=='server_observed_connected')forbidden()
   const delta=event.atMs-segment.observedAt
   if(delta<0)invalid()
   // No credit for an unobserved gap; require fresh consent to continue.
   if(delta>CLARITY_CLOCK_MAX_GAP_MS)close('lost_observation',event.atMs)
   else{
    const credit=Math.min(delta,CLARITY_LOGICAL_SESSION_MS-day.elapsedMs)
    segment.elapsedMs+=credit;segment.observedAt+=credit;day.elapsedMs+=credit
    if(day.elapsedMs===CLARITY_LOGICAL_SESSION_MS)close('time_limit',segment.observedAt)
   }
  }else if(['pause','disconnect','coach_change','lost_observation'].includes(event.type)){
   if(event.evidence!=='server_observed_stop')forbidden()
   // A loss/stop is not a completion and never credits an unobserved interval.
   close(event.type,event.atMs)
  }else invalid()
 }
 next.revision++;next.lastEventAt=event.atMs
 return validateClarityCourseClock(next)
}
// Resume metadata is projected only from the exact account-owned logical clock.
// No client-provided duration, other protocol or unstarted day can supply minutes.
export function clarityClockResumeTime(clock,day,protocolId){
 if(!clock||!id(protocolId)||!Number.isInteger(day)||day<1||day>3)return null
 try{
  validateClarityCourseClock(clock)
  const item=clock.days[day-1]
  if(item.protocolId!==protocolId||item.status==='not_started')return null
  const elapsedSeconds=Math.floor(item.elapsedMs/1000)
  return {elapsedSeconds,remainingSeconds:CLARITY_LOGICAL_SESSION_MS/1000-elapsedSeconds,status:item.status}
 }catch{return null}
}
// The caller MUST supply an authenticated server-owned persisted clock. This
// does not accept a client duration, browser time-limit annotation or proof by URL.
export function clarityClockTimedEnd(clock,day,protocolId){
 if(!clock||!id(protocolId)||!Number.isInteger(day)||day<1||day>3)return false
 try{
  validateClarityCourseClock(clock)
  const item=clock.days[day-1]
  return item.protocolId===protocolId&&item.status==='time_limit'&&item.elapsedMs===CLARITY_LOGICAL_SESSION_MS
 }catch{return false}
}
