// Server-only connection controller. Both sockets belong to the trusted
// relay process, not the browser. No browser timestamps, revisions, provider
// events, token or arbitrary clock mutations are accepted.
import {randomUUID} from 'node:crypto'
import {assertClarityCredentialEvent,validateClarityRun,isClarityRunId} from './clarity-course-runs.mjs'
import {CLARITY_CLOCK_MAX_GAP_MS,CLARITY_LOGICAL_SESSION_MS} from './clarity-course-clock.mjs'
import {PUBLIC_COACH_PERSONA_IDS} from './persona-registry.mjs'
import {clarityScenarioTimeGuidance} from './clarity-course-scenarios.mjs'
import {geminiLiveDirectorMessage} from './gemini-live-transport.mjs'
const OPEN=1,CONNECTING=0,PERIOD=5000,MAX_FRAME=400000
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
export function bindClarityTrustedLiveConnection({client,provider,lease,coachId,setup,persist,retireLease=null,segmentDeadlineMs=null,
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
 let queue=Promise.resolve(),providerClosedNormally=false,durableFinish=false,retirementQueued=false
 const binding={leaseId:lease.leaseId,courseRunId:run.id,protocolId,day,reservedAtMs:lease.now,possibleExpiresAtMs:expires}
 function emit(value){
  if(client.readyState===OPEN)try{client.send(JSON.stringify(value))}catch{}
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
 function maybeRetire(){
  if(!durableFinish||!providerClosedNormally||retirementQueued||typeof retireLease!=='function')return
  retirementQueued=true
  // A failed retirement leaves the original expiry in force; never retry a
  // provider mint here and never report a successful release before commit.
  queue=queue.then(()=>retireLease(binding)).catch(()=>{})
 }
 function finish(durable=false){
  durableFinish=durable===true
  closed=true;closing=true;clear();stopSocket(provider);stopSocket(client)
  maybeRetire()
 }
 function connected(){return !closing&&client.readyState===OPEN&&provider.readyState===OPEN}
 function sendCourseCue(){
  if(!connected()||!started||lastCueElapsed===elapsed)return
  const hint=clarityScenarioTimeGuidance('clarity_day_'+day,Math.floor(elapsed/1000))
  // This checkpoint carries no transcript, name, stored answers or model-
  // supplied claims. It cannot generate a reply or advance a course field.
  if(!hint)return
  provider.send(JSON.stringify(geminiLiveDirectorMessage(hint.trim())))
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
   if(started){
    const item=await write(event(reason,clock(),{evidence:'server_observed_stop'}))
    emit({type:'hh_clarity_clock',day,elapsedMs:item.elapsedMs,status:item.status})
   }
   finish(true)
  })
 }
 function scheduleProbe(){
  if(!connected()||!started)return
  timer=schedule(()=>{
   timer=null
   if(!connected())return void stop()
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
  challenge=null;if(timer!==null)cancel(timer);timer=null
  const now=clock()
  if(now>=deadline){void stopAtDeadline();return}
  if(now-observedAt>CLARITY_CLOCK_MAX_GAP_MS){void stop('lost_observation');return}
  void enqueue(async()=>{
   if(!connected()||!started)return
   const item=await write(event('observe',now,{evidence:'server_observed_connected'}))
   emit({type:'hh_clarity_clock',day,elapsedMs:item.elapsedMs,status:item.status})
   if(item.status!=='active'){started=false;finish(true);return}
   scheduleProbe()
  })
 }
 function maybeStart(){
  if(!ready||!consent||started||!connected())return
  void enqueue(async()=>{
   if(started||!connected()||!ready||!consent)return
   const atMs=clock()
   if(atMs>=startDeadline||atMs>=deadline){finish(true);return}
   const item=await write(event('begin',atMs,{consent:{
    kind:'explicit_client_session_consent',decision,protocolId,connectionId:lease.leaseId,coachId,atMs,turnId:uuid()
   }}))
   started=true
   if(consentTimer!==null)cancel(consentTimer);consentTimer=null
   if(closing)return // queued stop follows the committed begin
   sendCourseCue() // after durable start/resume, before the first PCM frame
   emit({type:'hh_clarity_clock',day,elapsedMs:item.elapsedMs,status:item.status})
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
   provider.send(JSON.stringify(msg))
  }catch{void stop()}
 }
 function onProvider(data){
  if(closing||closed)return
  if(clock()>=deadline){void stopAtDeadline();return}
  const msg=parse(data)
  if(!record(msg)){void stop();return}
  if(Object.hasOwn(msg,'setupComplete')&&record(msg.setupComplete)&&setupSent&&!ready){
   ready=true;emit({type:'hh_clarity_ready',decision});maybeStart();return
  }
  if(Object.hasOwn(msg,'goAway')){void stop('disconnect');return}
  // Do not leak provider credentials or its session resumption handle.
  if(started&&record(msg.serverContent)){
   const content=msg.serverContent
   if(content.interrupted===true){interruptedTurn=true;cleanBoundary=false}
   if(content.modelTurn||content.inputTranscription)cleanBoundary=false
   if(content.turnComplete===true){cleanBoundary=!interruptedTurn;interruptedTurn=false}
   emit({serverContent:content})
  }
 }
 function onOpen(){
  if(!connected()||setupSent)return
  if(clock()>=deadline){void stopAtDeadline();return}
  if(clock()>=startDeadline){void stop();return}
  setupSent=true
  try{provider.send(JSON.stringify(setup))}catch{void stop()}
 }
 client.on('message',onClient);provider.on('message',onProvider)
 client.on('pong',data=>pong('client',data));provider.on('pong',data=>pong('provider',data))
 client.on('close',()=>{void stop()})
 provider.on('close',code=>{
  // setupComplete proves the one-use token was used; a normal server socket
  // close event (not a browser message or close() invocation) proves closure.
  if(ready&&setupSent&&code===1000&&provider.readyState===3)providerClosedNormally=true
  void stop()
  maybeRetire()
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
