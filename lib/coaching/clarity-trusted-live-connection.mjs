// Server-only connection controller. Both sockets belong to the trusted
// relay process, not the browser. No browser timestamps, revisions, provider
// events, token or arbitrary clock mutations are accepted.
import {randomUUID} from 'node:crypto'
import {assertClarityCredentialEvent,validateClarityRun,isClarityRunId} from './clarity-course-runs.mjs'
import {CLARITY_CLOCK_MAX_GAP_MS,CLARITY_LOGICAL_SESSION_MS} from './clarity-course-clock.mjs'
import {PUBLIC_COACH_PERSONA_IDS} from './persona-registry.mjs'
import {clarityScenarioTimeGuidance} from './clarity-course-scenarios.mjs'
import {geminiLiveDirectorMessage,geminiLiveStartMessage,geminiLiveContinueMessage} from './gemini-live-transport.mjs'
const OPEN=1,CONNECTING=0,PERIOD=5000,MAX_FRAME=400000,MAX_BUFFERED_SOCKET_BYTES=200000
const writable=s=>Number.isSafeInteger(s.bufferedAmount)&&s.bufferedAmount>=0&&s.bufferedAmount<=MAX_BUFFERED_SOCKET_BYTES
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)
const shape=(v,keys)=>record(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k))
function parse(data){
 const text=typeof data==='string'?data:Buffer.isBuffer(data)?data.toString('utf8'):null
 if(!text||text.length>MAX_FRAME)return null
 try{return JSON.parse(text)}catch{return null}
}
function pcm(v){
 if(!shape(v,['realtimeInput'])||!shape(v.realtimeInput,['audio'])||
    !shape(v.realtimeInput.audio,['data','mimeType']))return false
 const {data,mimeType}=v.realtimeInput.audio
 return mimeType==='audio/pcm;rate=16000'&&typeof data==='string'&&data.length>=4&&data.length<=22000&&
    data.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/u.test(data)&&Buffer.from(data,'base64').length%2===0
}
const socket=v=>v&&['on','send','close','ping'].every(k=>typeof v[k]==='function')
export function bindClarityTrustedLiveConnection({client,provider,lease,coachId,setup,persist,loadOpeningNote=null,retireLease=null,segmentDeadlineMs=null,
 clock=Date.now,schedule=setTimeout,cancel=clearTimeout,uuid=randomUUID}){
 if(!socket(client)||!socket(provider)||client===provider||client.readyState!==OPEN||
    ![OPEN,CONNECTING].includes(provider.readyState)||!PUBLIC_COACH_PERSONA_IDS.includes(coachId)||
    !record(setup?.setup)||typeof persist!=='function'||!isClarityRunId(lease?.leaseId))
   throw Error('CLARITY_RELAY_INVALID')
 const run=validateClarityRun(lease.run),day=lease.day,protocolId=lease.protocolId
 const current=run.clock.days.find(d=>d.status!=='time_limit')
 const expires=Date.parse(lease.expiresAt),startDeadline=Date.parse(lease.newSessionExpireTime)
 if(!current||current.day!==day||current.status==='active'||run.protocolIds[day-1]!==protocolId||
    !Number.isSafeInteger(lease.now)||!Number.isSafeInteger(expires)||!Number.isSafeInteger(startDeadline)||
    startDeadline<=lease.now||startDeadline>expires||expires-lease.now>CLARITY_LOGICAL_SESSION_MS)
   throw Error('CLARITY_RELAY_INVALID')
 // A host deadline is a server-owned cutoff, not the logical session end.
 if(segmentDeadlineMs!==null&&(!Number.isSafeInteger(segmentDeadlineMs)||segmentDeadlineMs<=lease.now))
  throw Error('CLARITY_RELAY_INVALID')
 const hostDeadline=segmentDeadlineMs??Infinity
 const deadline=Math.min(expires,hostDeadline)
 const stopAtDeadline=()=>stop(hostDeadline<expires?'pause':'lost_observation')
 const decision=current.status==='not_started'?'start':'continue',segmentId=uuid()
 let revision=run.clock.revision,elapsed=current.elapsedMs,observedAt=null,started=false
 // Send advisory checkpoints only from durable time and at conservative
 // speech boundaries. A continuous audio stream is not evidence of silence.
 let lastAudioAt=null,lastCueElapsed=null,cleanBoundary=false,interruptedTurn=false
 let closing=false,closed=false,ready=false,setupSent=false,consent=false,challenge=null,timer=null,expiryTimer=null,consentTimer=null
 let queue=Promise.resolve(),providerClosedNormally=false,resolveProviderClosed
 const providerClosed=new Promise(resolve=>{resolveProviderClosed=resolve})
 const binding={leaseId:lease.leaseId,courseRunId:run.id,protocolId,day,reservedAtMs:lease.now,possibleExpiresAtMs:expires}
 function emit(value){
  if(client.readyState===OPEN&&writable(client))try{client.send(JSON.stringify(value));return true}catch{}
  return false
 }
 function stopSocket(s){
  if(s.readyState===OPEN||s.readyState===CONNECTING)try{s.close(1000,'session closed')}catch{}
 }
 function clear(){
  if(timer!==null)cancel(timer)
  if(expiryTimer!==null)cancel(expiryTimer)
  if(consentTimer!==null)cancel(consentTimer)
  timer=null;expiryTimer=null;consentTimer=null;challenge=null
 }
 function finish(){
  closed=true;closing=true;clear();stopSocket(provider);stopSocket(client)
 }
 // A real ws close handshake is asynchronous. Keep the client attached until
 // the durable stop and bounded upstream closure/retirement attempt finish.
 // Never retire on an abnormal/missing close; the original expiry stays valid.
 async function finishDurably(item=null){
  if(closed)return
  closing=true;clear();stopSocket(provider)
  if(provider.readyState!==3){
   let timeout
   try{await Promise.race([providerClosed,new Promise(resolve=>{timeout=setTimeout(resolve,1500)})])}
   finally{clearTimeout(timeout)}
  }
  if(providerClosedNormally&&typeof retireLease==='function'){
   try{await retireLease(binding)}catch{} // fail closed: original expiry remains
  }
  if(item)emit({type:'hh_clarity_clock',day,elapsedMs:item.elapsedMs,status:item.status,visitId:segmentId,coachId})
  finish()
 }
 function connected(){return !closing&&client.readyState===OPEN&&provider.readyState===OPEN}
 function deliverable(){return connected()&&writable(client)&&writable(provider)}
 function sendProvider(value){
  if(!deliverable())throw Error('CLARITY_RELAY_BACKPRESSURE')
  provider.send(JSON.stringify(value))
 }
 function sendCourseCue(){
  if(!connected()||!started||lastCueElapsed===elapsed)return
  const hint=clarityScenarioTimeGuidance('clarity_day_'+day,Math.floor(elapsed/1000))
  // This checkpoint carries no transcript, name, stored answers or model-
  // supplied claims. It cannot generate a reply or advance a course field.
  if(!hint)return
  sendProvider(geminiLiveDirectorMessage(hint.trim()))
  lastCueElapsed=elapsed
 }
 function event(type,atMs,extra={}){
  const e={type,atMs,expectedRevision:revision,courseRunId:run.id,day,protocolId,connectionId:lease.leaseId,segmentId,coachId,...extra}
  assertClarityCredentialEvent(binding,e);return e
 }
 async function write(e){
  const result=await persist(e)
  const item=result?.days?.find(d=>d.day===day)
  if(result?.id!==run.id||result.revision!==revision+1||item?.protocolId!==protocolId||
     !Number.isSafeInteger(item.elapsedMs)||item.elapsedMs<elapsed||item.elapsedMs>CLARITY_LOGICAL_SESSION_MS||
     !['active','paused','time_limit'].includes(item.status))throw Error('CLARITY_RELAY_ACK_INVALID')
  if(e.type==='begin'&&(item.status!=='active'||item.elapsedMs!==elapsed))throw Error('CLARITY_RELAY_ACK_INVALID')
  if(e.type!=='begin'&&e.type!=='observe'&&(item.status!=='paused'||item.elapsedMs!==elapsed))throw Error('CLARITY_RELAY_ACK_INVALID')
  if(e.type==='observe'&&item.elapsedMs-elapsed>CLARITY_CLOCK_MAX_GAP_MS)throw Error('CLARITY_RELAY_ACK_INVALID')
  if((item.status==='time_limit')!==(item.elapsedMs===CLARITY_LOGICAL_SESSION_MS))throw Error('CLARITY_RELAY_ACK_INVALID')
  revision=result.revision;elapsed=item.elapsedMs
  if(item.status==='active')observedAt=e.atMs
  return item
 }
 function enqueue(fn){
  queue=queue.then(fn).catch(()=>{emit({type:'hh_clarity_unavailable'});finish()})
  return queue
 }
 function stop(reason='disconnect'){
  if(closing||closed)return queue
  closing=true;clear()
  // Close the actual provider first; delayed database ACK cannot leak audio.
  stopSocket(provider)
  return enqueue(async()=>{
   if(closed)return
   const item=started?await write(event(reason,clock(),{evidence:'server_observed_stop'})):null
   await finishDurably(item)
  })
 }
 function scheduleProbe(){
  if(!connected()||!started)return
  timer=schedule(()=>{
   timer=null
   if(!deliverable())return void stop()
   if(clock()>=deadline)return void stopAtDeadline()
   if(clock()-observedAt>CLARITY_CLOCK_MAX_GAP_MS)return void stop('lost_observation')
   // These are RFC 6455 pings issued on the real, server-held sockets.
   // Application JSON claiming 'pong' is never accepted as evidence.
   if(challenge)return void stop('lost_observation')
   const nonce=uuid();challenge={nonce,client:false,provider:false}
   try{client.ping(nonce);provider.ping(nonce)}catch{return void stop('lost_observation')}
   timer=schedule(()=>{timer=null;if(challenge)void stop('lost_observation')},PERIOD)
  },PERIOD)
 }
 function pong(side,data){
  const value=Buffer.isBuffer(data)?data.toString('utf8'):data
  if(!connected()||!started||!challenge||value!==challenge.nonce)return
  challenge[side]=true
  if(!challenge.client||!challenge.provider)return
  if(!deliverable()){void stop();return}
  challenge=null;if(timer!==null)cancel(timer);timer=null
  const now=clock()
  if(now>=deadline){void stopAtDeadline();return}
  if(now-observedAt>CLARITY_CLOCK_MAX_GAP_MS){void stop('lost_observation');return}
  void enqueue(async()=>{
   if(!connected()||!started)return
   if(!deliverable()){void stop();return}
   const item=await write(event('observe',now,{evidence:'server_observed_connected'}))
   if(item.status!=='active'){started=false;await finishDurably(item);return}
   const sent=emit({type:'hh_clarity_clock',day,elapsedMs:item.elapsedMs,status:item.status,visitId:segmentId,coachId})
   if(!sent){void stop();return}
   scheduleProbe()
  })
 }
 async function openingNote(){
  if(typeof loadOpeningNote!=='function')return ''
  let timeout
  try{
   return await Promise.race([
    loadOpeningNote(),
    new Promise(resolve=>{timeout=setTimeout(()=>resolve(''),4500)}),
   ])
  }catch{return ''}
  finally{clearTimeout(timeout)}
 }
 function maybeStart(){
  if(!ready||!consent||started||!connected())return
  void enqueue(async()=>{
   if(started||!connected()||!ready||!consent)return
   if(!deliverable()){void stop();return}
   const note=loadOpeningNote?await openingNote():''
   if(!connected())return
   const atMs=clock()
   if(atMs>=startDeadline||atMs>=deadline){await finishDurably();return}
   const item=await write(event('begin',atMs,{consent:{
    kind:'explicit_client_session_consent',decision,protocolId,connectionId:lease.leaseId,coachId,atMs,turnId:uuid()
   }}))
   started=true
   if(consentTimer!==null)cancel(consentTimer);consentTimer=null
   if(closing)return // queued stop follows the committed begin
   if(clock()>=deadline){void stopAtDeadline();return}
   if(!connected()||!emit({type:'hh_clarity_clock',day,elapsedMs:item.elapsedMs,status:item.status,visitId:segmentId,coachId})){void stop();return}
   // Only the trusted relay can open a provider turn, after committed consent.
   // Only the owner-authorized, bounded context resolved above may accompany the cue.
   try{
    sendCourseCue()
    sendProvider(decision==='start'?geminiLiveStartMessage(note):geminiLiveContinueMessage(note))
   }catch{void stop();return}
   scheduleProbe()
  })
 }
 function onClient(data){
  if(closing||closed)return
  if(clock()>=deadline){void stopAtDeadline();return}
  const msg=parse(data)
  if(shape(msg,['type','decision'])&&msg.type==='hh_clarity_consent'&&msg.decision===decision&&!consent){
   consent=true;maybeStart();return
  }
  if(shape(msg,['type'])&&msg.type==='hh_clarity_pause'){void stop('pause');return}
  if(shape(msg,['type'])&&msg.type==='hh_clarity_change_coach'){void stop('coach_change');return}
  if(!connected()||!started)return
  if(!pcm(msg)){void stop('disconnect');return}
  // Never relay client setup, fake provider messages, tool calls, checkpoint
  // instructions, or resumption handles. Only approved bounded PCM is accepted.
  const at=clock(),safeBoundary=cleanBoundary&&(lastAudioAt===null||at-lastAudioAt>=500)
  cleanBoundary=false;lastAudioAt=at
  try{
   if(safeBoundary)sendCourseCue()
   sendProvider(msg)
  }catch{void stop()}
 }
 function onProvider(data){
  if(closing||closed)return
  if(clock()>=deadline){void stopAtDeadline();return}
  const msg=parse(data)
  if(!record(msg)){void stop();return}
  if(Object.hasOwn(msg,'setupComplete')&&record(msg.setupComplete)&&setupSent&&!ready){
   ready=true;if(!emit({type:'hh_clarity_ready',decision})){void stop();return}maybeStart();return
  }
  if(Object.hasOwn(msg,'goAway')){void stop('disconnect');return}
  // Do not leak provider credentials or its session resumption handle.
  if(started&&record(msg.serverContent)){
   const content=msg.serverContent
   if(content.interrupted===true){interruptedTurn=true;cleanBoundary=false}
   if(content.modelTurn||content.inputTranscription)cleanBoundary=false
   if(content.turnComplete===true){cleanBoundary=!interruptedTurn;interruptedTurn=false}
   if(!emit({serverContent:content}))void stop()
  }
 }
 function onOpen(){
  if(!connected()||setupSent)return
  if(clock()>=deadline){void stopAtDeadline();return}
  if(clock()>=startDeadline){void stop();return}
  setupSent=true
  try{sendProvider(setup)}catch{void stop()}
 }
 client.on('message',onClient);provider.on('message',onProvider)
 client.on('pong',data=>pong('client',data));provider.on('pong',data=>pong('provider',data))
 client.on('close',()=>{void stop()})
 provider.on('close',code=>{
  // setupComplete proves the one-use token was used; a normal server socket
  // close event (not a browser message or close() invocation) proves closure.
  if(ready&&setupSent&&code===1000&&provider.readyState===3)providerClosedNormally=true
  resolveProviderClosed()
  void stop()
 })
 for(const s of [client,provider])s.on('error',()=>{void stop()})
 provider.on('open',onOpen)
 consentTimer=schedule(()=>{if(!started)void stop('lost_observation')},Math.max(0,startDeadline-clock()))
 expiryTimer=schedule(()=>{void stopAtDeadline()},Math.max(0,deadline-clock()))
 if(provider.readyState===OPEN)onOpen()
 // Only trusted server lifecycle calls can request shutdown. No clock-event
 // entrypoint or arbitrary revision is returned.
 return {close:()=>stop(),settled:async()=>{let pending;do{pending=queue;await pending}while(pending!==queue)}}
}
