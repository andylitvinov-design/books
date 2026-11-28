// Logical coaching time is independent from provider token lifetime.
// Only server time between confirmed, bounded observations is credited.
// Browser heartbeats report participation; they are NOT proof of audio usage.
export const CLARITY_CLOCK_LIMIT_MS=1200000
export const CLARITY_CLOCK_MAX_GAP_MS=20000
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const phases=new Set(['awaiting_consent','running','paused','review','closed'])
const validDay=day=>Number.isInteger(day)&&day>=1&&day<=3
const validTime=value=>Number.isSafeInteger(value)&&value>=0
const validPersona=value=>typeof value==='string'&&/^[a-z][a-z_]{1,28}$/.test(value)
const invalid=()=>{throw Error('CLARITY_CLOCK_INVALID')}
const conflict=()=>{throw Error('CLARITY_CLOCK_CONFLICT')}
export function newClarityClock(day,protocolId){
 if(!validDay(day)||!uuid.test(protocolId))invalid()
 return {version:1,day,protocolId,revision:0,phase:'awaiting_consent',activeMs:0,segmentId:null,personaId:null,lastSeenAt:null,lastAction:null}
}
export function validateClarityClock(s){
 if(!s||s.version!==1||!validDay(s.day)||!uuid.test(s.protocolId)||
  !Number.isSafeInteger(s.revision)||s.revision<0||!phases.has(s.phase)||
  !validTime(s.activeMs)||s.activeMs>CLARITY_CLOCK_LIMIT_MS)invalid()
 if(s.phase==='running'){
  if(!uuid.test(s.segmentId)||!validPersona(s.personaId)||!validTime(s.lastSeenAt)||s.activeMs===CLARITY_CLOCK_LIMIT_MS)invalid()
 }else if(s.lastSeenAt!==null||s.segmentId!==null)invalid()
 if((s.phase==='review'||s.phase==='closed')!==(s.activeMs===CLARITY_CLOCK_LIMIT_MS))invalid()
 if(s.phase==='awaiting_consent'&&(s.activeMs!==0||s.personaId!==null))invalid()
 if(s.personaId!==null&&!validPersona(s.personaId))invalid()
 if(s.lastAction!==null&&(typeof s.lastAction!=='object'||!uuid.test(s.lastAction.operationId)||typeof s.lastAction.fingerprint!=='string'))invalid()
 return s
}
export function clarityClockView(s){
 validateClarityClock(s)
 const {lastAction,...publicState}=s
 return {...publicState,remainingMs:CLARITY_CLOCK_LIMIT_MS-s.activeMs}
}
const stopped=(s,phase)=>({...s,phase,segmentId:null,lastSeenAt:null})
export function transitionClarityClock(state,event,now,newSegmentId=null){
 const s=validateClarityClock(state)
 if(!event||!uuid.test(event.operationId)||!Number.isSafeInteger(event.revision)||event.revision<0||
   !validTime(now)||!['start','pulse','pause','review'].includes(event.action))invalid()
 if(event.action==='start'){
  if(event.confirmed!==true||!validPersona(event.personaId)||event.segmentId!==undefined)invalid()
 }else if(event.action==='review'){
  if(event.confirmed!==true||event.segmentId!==undefined||event.personaId!==undefined)invalid()
 }else if(!uuid.test(event.segmentId)||event.confirmed!==undefined||event.personaId!==undefined)invalid()
 const fingerprint=JSON.stringify([event.action,event.revision,event.segmentId??null,event.personaId??null,event.confirmed??null])
 if(s.lastAction?.operationId===event.operationId){
  if(s.lastAction.fingerprint!==fingerprint)conflict()
  return s // lost response: never double credit
 }
 if(event.revision!==s.revision)conflict()
 let next
 if(event.action==='start'){
  if(s.phase==='review'||s.phase==='closed')conflict()
  if(s.phase==='running'){
   if(now<s.lastSeenAt||now-s.lastSeenAt<=CLARITY_CLOCK_MAX_GAP_MS)conflict()
   // stale lease: disconnected interval is never credited
  }
  if(!uuid.test(newSegmentId)||newSegmentId===s.segmentId)invalid()
  next={...s,phase:'running',personaId:event.personaId,segmentId:newSegmentId,lastSeenAt:now}
 }else if(event.action==='review'){
  if(s.phase!=='review')conflict()
  next=stopped(s,'closed')
 }else{
  if(s.phase!=='running'||event.segmentId!==s.segmentId||now<s.lastSeenAt)conflict()
  const delta=now-s.lastSeenAt
  if(delta>CLARITY_CLOCK_MAX_GAP_MS)next=stopped(s,'paused')
  else{
   // Only a live pulse credits time. A pause/disconnect never completes a day.
   const activeMs=event.action==='pulse'?Math.min(CLARITY_CLOCK_LIMIT_MS,s.activeMs+delta):s.activeMs
   next={...s,activeMs,lastSeenAt:now}
   if(activeMs===CLARITY_CLOCK_LIMIT_MS)next=stopped(next,'review')
   else if(event.action==='pause')next=stopped(next,'paused')
  }
 }
 return validateClarityClock({...next,revision:s.revision+1,lastAction:{operationId:event.operationId,fingerprint}})
}
