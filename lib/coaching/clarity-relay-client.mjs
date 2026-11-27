// Browser-side control protocol for the existing owner-authenticated relay.
// No provider credentials, persistence, auto-reconnect or microphone access.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const id=v=>typeof v==='string'&&UUID.test(v)
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const exact=(v,keys)=>obj(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
const invalid=()=>{throw Error('CLARITY_RELAY_CLIENT_INVALID')}
export function createClarityRelayClient({accountId,runId=null,protocolId=null,day,body,minimumElapsedMs=0}){
 if(!id(accountId)||!(runId===null||id(runId))||!(protocolId===null||id(protocolId))||
    (runId===null&&(day!==1||protocolId!==null||minimumElapsedMs!==0))||
    ![1,2,3].includes(day)||!Number.isSafeInteger(minimumElapsedMs)||minimumElapsedMs<0||minimumElapsedMs>=1200000||
    !obj(body)||body.courseSessionId!=='clarity_day_'+day||body.consent!==true||body.voiceConsent!==true||
    body.trainingUseConsent!==true)invalid()
 const entry=JSON.stringify({type:'hh_clarity_enter',accountId,runId,day,body})
 if(entry.length>4096)invalid()
 let phase='entry',binding=null,decision=null,elapsedMs=minimumElapsedMs,committed=false
 function receive(raw){
  if(phase==='closed'||phase==='paused'||phase==='time_limit')invalid()
  if(typeof raw!=='string'||raw.length>400000)invalid()
  let msg;try{msg=JSON.parse(raw)}catch{invalid()}
  if(exact(msg,['type'])&&msg.type==='hh_clarity_unavailable'){phase='closed';return {kind:'unavailable'}}
  if(phase==='entry'&&exact(msg,['type','runId','day','protocolId'])&&msg.type==='hh_clarity_selection'){
   if(!id(msg.runId)||!id(msg.protocolId)||msg.runId===msg.protocolId||msg.day!==day||
      (runId!==null&&msg.runId!==runId)||(protocolId!==null&&msg.protocolId!==protocolId))invalid()
   binding=Object.freeze({runId:msg.runId,day,protocolId:msg.protocolId});phase='selected'
   return {kind:'selection',binding} // candidate, not durable enrollment
  }
  if(phase==='selected'&&exact(msg,['type','decision'])&&msg.type==='hh_clarity_ready'){
   if(!['start','continue'].includes(msg.decision)||(runId===null&&msg.decision!=='start')||
      (minimumElapsedMs>0&&msg.decision!=='continue'))invalid()
   decision=msg.decision;phase='ready';return {kind:'ready',decision}
  }
  if(['consenting','active','pausing'].includes(phase)&&exact(msg,['type','day','elapsedMs','status'])&&msg.type==='hh_clarity_clock'){
   if(msg.day!==day||!Number.isSafeInteger(msg.elapsedMs)||msg.elapsedMs<elapsedMs||msg.elapsedMs>1200000||
      !['active','paused','time_limit'].includes(msg.status)||(msg.status==='time_limit')!==(msg.elapsedMs===1200000)||
      (phase==='consenting'&&(msg.status!=='active'||(runId===null&&msg.elapsedMs!==0))))invalid()
   // A durable begin ACK may race a local pause. Accept its time without
   // reopening capture; only a terminal pause ACK releases this interlock.
   elapsedMs=msg.elapsedMs;committed=true
   if(phase==='pausing'&&msg.status==='active')return {kind:'clock',binding,elapsedMs,status:'pausing'}
   phase=msg.status
   return {kind:'clock',binding,elapsedMs,status:phase}
  }
  if(exact(msg,['serverContent'])&&obj(msg.serverContent)){
   if(phase==='active')return {kind:'provider',packet:raw}
   // A packet already in flight may arrive before the durable stop ACK.
   // Keep it distinguishable for private transcript handling, but never
   // feed it into live playback or treat it as a completed/confirmed turn.
   if(phase==='pausing')return {kind:'draining-provider',packet:raw,playAudio:false}
  }
  invalid()
 }
 function consent({foreground,explicitPlay}={}){
  if(phase!=='ready'||foreground!==true||explicitPlay!==true)invalid()
  phase='consenting';return JSON.stringify({type:'hh_clarity_consent',decision})
 }
 function requestStop(type){
  if(!['active','consenting'].includes(phase))invalid()
  phase='pausing';return JSON.stringify({type})
 }
 function pause(){return requestStop('hh_clarity_pause')}
 function changeCoach(){return requestStop('hh_clarity_change_coach')}
 function close(){phase='closed'}
 return Object.freeze({entry,receive,consent,pause,changeCoach,close,
  snapshot:()=>({phase,binding,elapsedMs,committed,canSendAudio:phase==='active'})})
}
