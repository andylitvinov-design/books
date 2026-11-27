// Browser-side control protocol for the existing owner-authenticated relay.
// No provider credentials, persistence, auto-reconnect or microphone access.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const id=v=>typeof v==='string'&&UUID.test(v)
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const exact=(v,keys)=>obj(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
const invalid=()=>{throw Error('CLARITY_RELAY_CLIENT_INVALID')}
const MAX_BUFFERED_SOCKET_BYTES=200000
const canSend=s=>Number.isSafeInteger(s.bufferedAmount)&&s.bufferedAmount>=0&&s.bufferedAmount<=MAX_BUFFERED_SOCKET_BYTES
export function createClarityRelayClient({accountId,runId=null,protocolId=null,day,body,minimumElapsedMs=0}){
 if(!id(accountId)||!(runId===null||id(runId))||!(protocolId===null||id(protocolId))||
    (runId===null&&(day!==1||protocolId!==null||minimumElapsedMs!==0))||
    ![1,2,3].includes(day)||!Number.isSafeInteger(minimumElapsedMs)||minimumElapsedMs<0||minimumElapsedMs>=1200000||
    !obj(body)||body.courseSessionId!=='clarity_day_'+day||body.consent!==true||body.voiceConsent!==true||
    body.trainingUseConsent!==true)invalid()
 const entry=JSON.stringify({type:'hh_clarity_enter',accountId,runId,day,body})
 if(entry.length>4096)invalid()
 let phase='entry',binding=null,decision=null,elapsedMs=minimumElapsedMs,committed=false,visit=null
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
  if(['consenting','active','pausing'].includes(phase)&&msg?.type==='hh_clarity_clock'&&(exact(msg,['type','day','elapsedMs','status'])||exact(msg,['type','day','elapsedMs','status','visitId','coachId']))){
   const tagged=Object.hasOwn(msg,'visitId')
   if((visit&&!tagged)||(tagged&&(!id(msg.visitId)||msg.coachId!==body.personaId||(visit&&visit.visitId!==msg.visitId))))invalid()
   if(msg.day!==day||!Number.isSafeInteger(msg.elapsedMs)||msg.elapsedMs<elapsedMs||msg.elapsedMs>1200000||
      !['active','paused','time_limit'].includes(msg.status)||(msg.status==='time_limit')!==(msg.elapsedMs===1200000)||
      (phase==='consenting'&&(msg.status!=='active'||(runId===null&&msg.elapsedMs!==0))))invalid()
   // A durable begin ACK may race a local pause. Accept its time without
   // reopening capture; only a terminal pause ACK releases this interlock.
   elapsedMs=msg.elapsedMs;committed=true
   if(tagged)visit=Object.freeze({visitId:msg.visitId,coachId:msg.coachId})
   if(phase==='pausing'&&msg.status==='active')return {kind:'clock',binding,elapsedMs,status:'pausing',...(visit||{})}
   phase=msg.status
   return {kind:'clock',binding,elapsedMs,status:phase,...(visit||{})}
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


// The browser connects only to its own origin. No vendor token, raw setup,
// Director packet, clock write, fallback mint or automatic reconnect.
export function connectClarityBrowserRelay({selection,explicitPlay,isForeground,onClock,onProvider,
 onSelection=()=>{},onDrainingProvider=()=>{},onClosed=()=>{},
 origin=globalThis.location?.origin,WebSocketImpl=globalThis.WebSocket,
 schedule=setTimeout,cancel=clearTimeout,documentTarget=globalThis.document,windowTarget=globalThis.window}={}){
 if(explicitPlay!==true||typeof isForeground!=='function'||isForeground()!==true||
    typeof onClock!=='function'||typeof onProvider!=='function'||typeof onClosed!=='function'||
    typeof WebSocketImpl!=='function'||typeof origin!=='string'||!/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/.test(origin)||
    (globalThis.location?.origin&&origin!==globalThis.location.origin))invalid()
 const control=createClarityRelayClient(selection)
 const socket=new WebSocketImpl('wss://'+origin.slice(8)+'/api/app/my-coach/live-relay')
 let done=false,opened=false,consentSent=false,terminalVerified=false,lastClock=null,timer=null
 function clearTimer(){if(timer!==null){cancel(timer);timer=null}}
 function send(raw){if(done||socket.readyState!==1||!canSend(socket))return false;try{socket.send(raw);return true}catch{return false}}
 function finish(reason){
  if(done)return
  done=true;clearTimer()
  documentTarget?.removeEventListener?.('visibilitychange',visibility)
  windowTarget?.removeEventListener?.('pagehide',background)
  windowTarget?.removeEventListener?.('offline',background)
  const snapshot=control.snapshot()
  control.close()
  if(socket.readyState===0||socket.readyState===1)try{socket.close(1000,'course relay closed')}catch{}
  // A candidate or lost connection cannot be promoted to a completed course.
  // After sending consent without an ACK, enrollment may have committed.
  try{onClosed({reason,binding:snapshot.committed?snapshot.binding:null,committed:snapshot.committed,
   elapsedMs:snapshot.committed?snapshot.elapsedMs:null,status:terminalVerified?lastClock.status:consentSent?'unverified':'not_started',terminalVerified})}catch{}
 }
 function arm(ms,reason){clearTimer();timer=schedule(()=>{timer=null;finish(reason)},ms)}
 function requestStop(change=false){
  if(done)return false
  const phase=control.snapshot().phase
  if(phase==='pausing'||phase==='paused'||phase==='time_limit')return true
  if(phase!=='active'&&phase!=='consenting'){finish('cancelled_before_consent');return true}
  // Stop audio immediately, even if the server stop ACK is delayed.
  if(!send(change?control.changeCoach():control.pause())){finish('stop_unverified');return false}
  arm(5000,'stop_unverified');return true
 }
 function background(){requestStop()}
 function visibility(){if(isForeground()!==true)requestStop()}
 socket.onopen=()=>{
  if(done||opened)return
  opened=true
  if(isForeground()!==true){finish('cancelled_before_consent');return}
  if(!send(control.entry))finish('entry_failed')
 }
 socket.onmessage=event=>{
  if(done)return
  try{
   const message=control.receive(event.data)
   if(message.kind==='unavailable'){finish('unavailable');return}
   if(message.kind==='selection'){onSelection(message.binding);return}
   if(message.kind==='ready'){
    if(isForeground()!==true){finish('cancelled_before_consent');return}
    const consent=control.consent({foreground:true,explicitPlay:true})
    consentSent=true
    if(!send(consent))finish('consent_unverified')
    return
   }
   if(message.kind==='clock'){
    lastClock=message
    if(message.status==='paused'||message.status==='time_limit')terminalVerified=true
    if(onClock(message)!==true){requestStop();if(!done&&terminalVerified)finish('terminal');return}
    if(terminalVerified){finish('terminal');return}
    if(message.status==='active'){clearTimer();if(isForeground()!==true)requestStop()}
    return
   }
   if(message.kind==='provider'){
    if(isForeground()!==true){requestStop();onDrainingProvider(message.packet);return}
    onProvider(message.packet);return
   }
   if(message.kind==='draining-provider')onDrainingProvider(message.packet)
  }catch{finish('protocol_unverified')}
 }
 socket.onerror=()=>finish('connection_unverified')
 socket.onclose=()=>finish(terminalVerified?'terminal':'connection_unverified')
 documentTarget?.addEventListener?.('visibilitychange',visibility)
 windowTarget?.addEventListener?.('pagehide',background)
 windowTarget?.addEventListener?.('offline',background)
 arm(20000,'startup_unverified')
 function sendAudio(packet){
  if(done||!control.snapshot().canSendAudio)return false
  if(isForeground()!==true){requestStop();return false}
  if(!exact(packet,['realtimeInput'])||!exact(packet.realtimeInput,['audio'])||
     !exact(packet.realtimeInput.audio,['data','mimeType']))return false
  const {data,mimeType}=packet.realtimeInput.audio
  if(mimeType!=='audio/pcm;rate=16000'||typeof data!=='string'||data.length<4||data.length>22000||
     data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data)||
     ((data.length/4*3)-(data.endsWith('==')?2:data.endsWith('=')?1:0))%2!==0)return false
  if(!canSend(socket)){finish('audio_backpressure_unverified');return false}
  if(send(JSON.stringify(packet)))return true
  finish('connection_unverified');return false
 }
 return Object.freeze({sendAudio,pause:()=>requestStop(),changeCoach:()=>requestStop(true),
  snapshot:()=>({...control.snapshot(),terminalVerified,closed:done})})
}

// The presentation/Daybook binding must also match the current signed-in owner.
// This is a projection of relay ACKs, never a client clock event or entitlement.
export function projectClarityPanelClock({previous=null,selection,owner,ack}={}){
 if(!id(owner)||selection?.accountId!==owner||![1,2,3].includes(selection.day)||
    ack?.kind!=='clock'||!id(ack.binding?.runId)||!id(ack.binding?.protocolId)||
    (selection.personaId!==undefined&&(!id(ack.visitId)||ack.coachId!==selection.personaId))||
    ack.binding.day!==selection.day||ack.binding.runId===ack.binding.protocolId||
    (selection.runId!=null&&selection.runId!==ack.binding.runId)||
    (selection.protocolId!=null&&selection.protocolId!==ack.binding.protocolId)||
    !Number.isSafeInteger(ack.elapsedMs)||ack.elapsedMs<0||ack.elapsedMs>1200000||
    !['active','pausing','paused','time_limit'].includes(ack.status)||
    (ack.status==='time_limit')!==(ack.elapsedMs===1200000)||
    (Number.isSafeInteger(selection.minimumElapsedMs)&&ack.elapsedMs<selection.minimumElapsedMs))return null
 if(previous&&(previous.accountId!==owner||previous.runId!==ack.binding.runId||
    previous.protocolId!==ack.binding.protocolId||previous.day!==ack.binding.day||
    previous.status==='time_limit'||ack.elapsedMs<previous.elapsedMs))return null
 return Object.freeze({accountId:owner,runId:ack.binding.runId,protocolId:ack.binding.protocolId,
  day:ack.binding.day,elapsedMs:ack.elapsedMs,status:ack.status,...(id(ack.visitId)?{visitId:ack.visitId,coachId:ack.coachId}:{})})
}

// Only the exact private paused course may offer fresh voice continuation.
// No draft transcript or stored context is returned to the provider.
export function restoredClarityRelayBinding({owner,runId,protocol,courseSessionId,time,personaId,structured=false,handoff=false}={}){
 if(structured||!id(owner)||!id(runId)||!id(protocol?.id)||runId===protocol.id||
    (protocol.personaId!==personaId&&handoff!==true)||protocol.courseSessionId!==courseSessionId||
    !/^clarity_day_[123]$/.test(courseSessionId)||time?.status!=='paused'||
    !Number.isInteger(time.elapsedSeconds)||time.elapsedSeconds<0||time.elapsedSeconds>=1200||
    time.remainingSeconds!==1200-time.elapsedSeconds)return null
 return Object.freeze({accountId:owner,runId,protocolId:protocol.id,day:Number(courseSessionId.slice(-1)),
  elapsedMs:time.elapsedSeconds*1000,status:'paused'})
}
