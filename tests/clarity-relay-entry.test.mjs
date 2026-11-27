import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {readFileSync} from 'node:fs'
import {normalizeClarityRelayEntry,resolveClarityRelaySelection,attachClarityRelayEntry} from '../lib/coaching/clarity-relay-entry.mjs'
import {createClarityRun,advanceClarityRun} from '../lib/coaching/clarity-course-runs.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const owner=id(100),body={courseSessionId:'clarity_day_1',personaId:'mira',locale:'ru',consent:true,voiceConsent:true,trainingUseConsent:true}
const frame=extra=>JSON.stringify({type:'hh_clarity_enter',accountId:owner,runId:null,day:1,body,...extra})
const invalid=/CLARITY_RELAY_ENTRY_INVALID/
test('relay entry accepts only owner-bound selection, not caller protocol, payment or time proof',()=>{
 assert.deepEqual(normalizeClarityRelayEntry(frame(),owner),{runId:null,day:1,body})
 for(const extra of [{accountId:id(101)},{runId:'other'},{day:2},{protocolId:id(7)},{elapsedMs:600000},{token:'bad'},{body:{...body,voiceConsent:false}},{body:{...body,courseSessionId:'clarity_day_2'}}])
  assert.throws(()=>normalizeClarityRelayEntry(frame(extra),owner),invalid)
 assert.throws(()=>normalizeClarityRelayEntry('x'.repeat(4097),owner),invalid)
})
test('server allocates immutable new identity and reads only the selected existing run',async()=>{
 let seq=1,reads=0
 const candidate=await resolveClarityRelaySelection(normalizeClarityRelayEntry(frame(),owner),{uuid:()=>id(seq++),readRun:()=>{reads++;throw Error('unexpected')}})
 assert.deepEqual(candidate,{runId:id(1),day:1,protocolId:id(2),firstProtocolIds:[id(2),id(3),id(4)]});assert.equal(reads,0)
 const run=createClarityRun({id:id(10),ordinal:1,access:'free',protocolIds:[id(11),id(12),id(13)],createdAt:0})
 const request=normalizeClarityRelayEntry(frame({runId:run.id}),owner)
 assert.deepEqual(await resolveClarityRelaySelection(request,{uuid:()=>{throw Error('unexpected')},readRun:async x=>{assert.equal(x,run.id);return run}}),{runId:run.id,day:1,protocolId:id(11),firstProtocolIds:null})
 await assert.rejects(resolveClarityRelaySelection({...request,day:2},{readRun:async()=>run}),invalid)
 await assert.rejects(resolveClarityRelaySelection({...request,runId:id(20)},{readRun:async()=>run}),invalid)
 const active=advanceClarityRun(run,{type:'begin',courseRunId:run.id,expectedRevision:0,day:1,protocolId:id(11),segmentId:id(14),connectionId:id(15),coachId:'mira',atMs:0,consent:{kind:'explicit_client_session_consent',decision:'start',protocolId:id(11),connectionId:id(15),coachId:'mira',atMs:0,turnId:'t:1'}})
 await assert.rejects(resolveClarityRelaySelection(request,{readRun:async()=>active}),invalid)
})
class Socket extends EventEmitter{
 constructor(){super();this.readyState=1;this.sent=[]}
 send(text){this.sent.push(JSON.parse(text))}
 close(){if(this.readyState===3)return;this.readyState=3;this.emit('close')}
}
function fixture({prepareBody=async b=>({body:b,session:null}),open=async()=>({close:async()=>{}})}={}){
 const client=new Socket();let seq=1,opens=0,timer=null
 const relay=attachClarityRelayEntry(client,{owner,uuid:()=>id(seq++),readRun:()=>{throw Error('unexpected')},
  prepareBody,open:async v=>{opens++;return open(v)},schedule:fn=>{timer=fn;return 1},cancel:()=>{timer=null}})
 return {client,relay,expire:()=>timer?.(),get opens(){return opens}}
}
test('initial listener attaches synchronously; one accepted frame opens relay once without exposing token',async()=>{
 const x=fixture({open:async ({selection})=>{assert.equal(selection.protocolId,id(2));return {close:async()=>{}}}})
 x.client.emit('message',Buffer.from(frame()));await x.relay.settled()
 assert.equal(x.opens,1)
 assert.deepEqual(x.client.sent,[{type:'hh_clarity_selection',runId:id(1),day:1,protocolId:id(2)}])
 assert.equal(x.client.listenerCount('message'),0)
})
test('malformed, repeated, disconnected and timed-out entry cannot open provider',async()=>{
 const bad=fixture();bad.client.emit('message',frame({accountId:id(101)}));await bad.relay.settled();assert.equal(bad.opens,0);assert.equal(bad.client.readyState,3)
 const idle=fixture();idle.expire();assert.equal(idle.opens,0);assert.equal(idle.client.readyState,3)
 let release;const block=new Promise(r=>{release=r})
 const dup=fixture({prepareBody:async b=>{await block;return {body:b,session:null}}})
 dup.client.emit('message',frame());dup.client.emit('message',frame());release();await dup.relay.settled();assert.equal(dup.opens,0);assert.equal(dup.client.readyState,3)
 let unblock;const wait=new Promise(r=>{unblock=r})
 const gone=fixture({prepareBody:async b=>{await wait;return {body:b,session:null}}})
 gone.client.emit('message',frame());gone.client.close();unblock();await gone.relay.settled();assert.equal(gone.opens,0)
})
test('upgrade preserves same-origin auth and shared provider quota; direct token route cannot bypass relay',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const upgrade=read('lib/app/clarity-live-upgrade.js'),relay=read('lib/app/clarity-live-relay.js'),route=read('app/api/app/[...path]/route.js')
 assert.ok(upgrade.indexOf('requireSameOrigin(request,config)')<upgrade.indexOf('await auth.verified()'))
 assert.match(upgrade,/owner:actor\.id/)
 assert.match(upgrade,/readRun:id=>readClarityRunForRelay\(config,actor,id\)/)
 assert.ok(relay.indexOf('await consumeRateBatch(config,quota.attempts)')<relay.indexOf('await issueGeminiFreeLiveToken'))
 assert.ok(relay.indexOf('await consumeRateBatch(config,quota.successful)')<relay.indexOf('const provider=createProviderSocket'))
 const section=route.slice(route.indexOf("if (joined === 'my-coach/live-token')"),route.indexOf("if (joined === 'my-coach/live-checkpoint')"))
 assert.ok(section.indexOf("throw new AppError('CLARITY_RELAY_REQUIRED',409)")<section.indexOf('await consumeRateBatch(config,liveQuota.attempts)'))
})


test('Vercel SDK route verifies identity before upgrade and attaches synchronously, with bounded segments',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const route=read('app/api/app/my-coach/live-relay/route.js'),upgrade=read('lib/app/clarity-live-upgrade.js')
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'))
 for(const key of ['@vercel/functions','ws']){
  assert.match(pkg.dependencies[key],/^\d+\.\d+\.\d+$/)
  assert.equal(lock.packages['node_modules/'+key].version,pkg.dependencies[key])
  assert.ok(lock.packages['node_modules/'+key].integrity)
 }
 assert.match(route,/export const maxDuration=800/)
 assert.match(route,/const segmentDeadlineMs=Date\.now\(\)\+770000/)
 assert.match(upgrade,/createProviderSocket,segmentDeadlineMs,selection/)
 const relay=read('lib/app/clarity-live-relay.js')
 assert.match(relay,/setup,segmentDeadlineMs,/)
 assert.match(relay,/segmentDeadlineMs<=Date\.now\(\)\+15000/)
 assert.ok(route.indexOf('await prepareClarityLiveUpgrade(')<route.indexOf('return experimental_upgradeWebSocket('))
 assert.match(route,/experimental_upgradeWebSocket\(client=>\{[\s\S]*?prepared\.attach\(client\)/)
 assert.match(route,/perMessageDeflate:false,followRedirects:false/)
 assert.match(upgrade,/await consumeRate\(config,\{op:'clarity-live-upgrade',actor:actor\.id\},12,3600\)/)
 assert.doesNotMatch(route,/console\.|token:|access_token/)
})

test('relay restart recovers only an exact expired credential and keeps credited time',async()=>{
 const source=readFileSync(new URL('../lib/app/clarity-course-runs.js',import.meta.url),'utf8')
 const start=source.indexOf('export async function readClarityRunForRelay('),end=source.indexOf('export async function listClarityRuns(',start)
 assert.ok(start>=0&&end>start)
 const original={id:id(10),clock:{days:[{status:'active',day:1,protocolId:id(11),elapsedMs:5000,segments:[{connectionId:id(15),startedAt:1000,observedAt:6000}]}]}}
 const row={lease_id:id(15),course_run_id:id(10),course_day:1,protocol_id:id(11),reserved_at_ms:0,possible_expires_at_ms:30000,provider_closed_at_ms:null}
 let now=30001,credential=row,writes=0,locked=false
 const after={...original,clock:{days:[{...original.clock.days[0],status:'paused'}]}}
 const db={query:async(sql,params)=>{assert.equal(locked,true);assert.match(sql,/for update/);assert.deepEqual(params,[owner]);return {rows:credential?[credential]:[]}}}
 const f=new Function('requireEnabled','transaction','lockCourseOwner','read','serverStamp','conflict','expireClarityRunObservation','writeClock',
  source.slice(start,end).replace('export async function','async function')+'\nreturn readClarityRunForRelay')(
  ()=>{},async(config,actor,fn)=>{assert.equal(actor.id,owner);locked=false;return fn(db)},
  async()=>{locked=true},async(_db,actor,_config,runId,lock)=>{assert.equal(actor.id,owner);assert.equal(runId,original.id);assert.equal(lock,true);return original},
  async()=>now,()=>Error('conflict'),(run,t)=>{assert.equal(run,original);assert.equal(t,now);return after},
  async(_db,actor,_config,before,next)=>{assert.equal(actor.id,owner);assert.equal(before,original);assert.equal(next,after);writes++})
 assert.equal(await f({}, {id:owner},original.id),after)
 assert.equal(writes,1);assert.equal(after.clock.days[0].elapsedMs,5000)
 now=29999;await assert.rejects(f({}, {id:owner},original.id),/conflict/)
 now=30001;credential={...row,lease_id:id(99)};await assert.rejects(f({}, {id:owner},original.id),/conflict/)
 credential=null;await assert.rejects(f({}, {id:owner},original.id),/conflict/)
 credential={...row,provider_closed_at_ms:5000};await assert.rejects(f({}, {id:owner},original.id),/conflict/)
 assert.equal(writes,1)
})

test('browser relay resumes the same exact protocol only after foreground Play and durable clock ACK',async()=>{
 const {createClarityRelayClient}=await import('../lib/coaching/clarity-relay-client.mjs')
 const runId=id(10),protocolId=id(11)
 const h=createClarityRelayClient({accountId:owner,runId,protocolId,day:1,body,minimumElapsedMs:5000})
 const wire=v=>JSON.stringify(v)
 const select={type:'hh_clarity_selection',runId,protocolId,day:1}
 const ack=(elapsedMs,status)=>wire({type:'hh_clarity_clock',day:1,elapsedMs,status})
 assert.equal(JSON.parse(h.entry).runId,runId)
 assert.throws(()=>h.receive(wire({...select,protocolId:id(99)})),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.equal(h.receive(wire(select)).kind,'selection')
 assert.equal(h.snapshot().committed,false)
 assert.throws(()=>h.receive(wire({type:'hh_clarity_ready',decision:'start'})),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.equal(h.receive(wire({type:'hh_clarity_ready',decision:'continue'})).decision,'continue')
 assert.throws(()=>h.consent({foreground:false,explicitPlay:true}),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.throws(()=>h.consent({foreground:true,explicitPlay:false}),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.equal(JSON.parse(h.consent({foreground:true,explicitPlay:true})).decision,'continue')
 assert.equal(h.snapshot().canSendAudio,false)
 assert.throws(()=>h.receive(wire({serverContent:{}})),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.throws(()=>h.receive(ack(4999,'active')),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.equal(h.receive(ack(10000,'active')).elapsedMs,10000)
 assert.equal(h.snapshot().canSendAudio,true)
 assert.equal(h.receive(wire({serverContent:{turnComplete:true}})).kind,'provider')
 assert.throws(()=>h.receive(wire({sessionResumptionUpdate:{newHandle:'never'}})),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.equal(JSON.parse(h.pause()).type,'hh_clarity_pause')
 assert.equal(h.snapshot().canSendAudio,false)
 assert.equal(h.receive(ack(10000,'paused')).status,'paused')
 assert.equal(h.snapshot().binding.protocolId,protocolId)
 assert.throws(()=>h.receive(ack(15000,'active')),/CLARITY_RELAY_CLIENT_INVALID/)
})
test('late durable begin acknowledgement never reopens audio after pause',async()=>{
 const {createClarityRelayClient}=await import('../lib/coaching/clarity-relay-client.mjs')
 const h=createClarityRelayClient({accountId:owner,day:1,body})
 h.receive(JSON.stringify({type:'hh_clarity_selection',runId:id(10),protocolId:id(11),day:1}))
 h.receive(JSON.stringify({type:'hh_clarity_ready',decision:'start'}))
 h.consent({foreground:true,explicitPlay:true})
 h.pause()
 assert.equal(h.receive(JSON.stringify({type:'hh_clarity_clock',day:1,elapsedMs:0,status:'active'})).status,'pausing')
 assert.equal(h.snapshot().canSendAudio,false)
 assert.equal(h.receive(JSON.stringify({type:'hh_clarity_clock',day:1,elapsedMs:0,status:'paused'})).status,'paused')
 assert.equal(h.snapshot().committed,true)
 h.close()
 assert.equal(h.snapshot().canSendAudio,false)
})

test('coach switch stops local capture, drains late packets without playback, and preserves the same protocol',async()=>{
 const {createClarityRelayClient}=await import('../lib/coaching/clarity-relay-client.mjs')
 const runId=id(10),protocolId=id(11),wire=JSON.stringify
 const select={type:'hh_clarity_selection',runId,protocolId,day:1}
 const ack=(elapsedMs,status)=>wire({type:'hh_clarity_clock',day:1,elapsedMs,status})
 const packet=wire({serverContent:{inputTranscription:{text:'last observed client words'},modelTurn:{parts:[{text:'late reply'}]}}})
 for(const action of ['pause','changeCoach']){
  const h=createClarityRelayClient({accountId:owner,runId,protocolId,day:1,body,minimumElapsedMs:5000})
  assert.throws(()=>h.changeCoach(),/CLARITY_RELAY_CLIENT_INVALID/)
  h.receive(wire(select))
  h.receive(wire({type:'hh_clarity_ready',decision:'continue'}))
  h.consent({foreground:true,explicitPlay:true})
  h.receive(ack(6000,'active'))
  assert.equal(h.receive(packet).kind,'provider')
  assert.equal(JSON.parse(h[action]()).type,action==='pause'?'hh_clarity_pause':'hh_clarity_change_coach')
  assert.equal(h.snapshot().canSendAudio,false)
  assert.deepEqual(h.receive(packet),{kind:'draining-provider',packet,playAudio:false})
  assert.equal(h.receive(ack(6500,'active')).status,'pausing')
  assert.equal(h.snapshot().canSendAudio,false)
  assert.throws(()=>h.changeCoach(),/CLARITY_RELAY_CLIENT_INVALID/)
  assert.throws(()=>h.receive(wire({sessionResumptionUpdate:{newHandle:'private'}})),/CLARITY_RELAY_CLIENT_INVALID/)
  assert.equal(h.receive(ack(6500,'paused')).binding.protocolId,protocolId)
  assert.equal(h.snapshot().elapsedMs,6500)
  assert.throws(()=>h.receive(packet),/CLARITY_RELAY_CLIENT_INVALID/)
 }
 const fresh=createClarityRelayClient({accountId:owner,day:1,body})
 fresh.receive(wire(select));fresh.receive(wire({type:'hh_clarity_ready',decision:'start'}))
 fresh.consent({foreground:true,explicitPlay:true})
 assert.equal(JSON.parse(fresh.changeCoach()).type,'hh_clarity_change_coach')
 assert.equal(fresh.receive(ack(0,'active')).status,'pausing')
 assert.equal(fresh.snapshot().canSendAudio,false)
 assert.equal(fresh.receive(ack(0,'paused')).status,'paused')
 assert.equal(fresh.snapshot().committed,true)
 const next=createClarityRelayClient({accountId:owner,runId,protocolId,day:1,body:{...body,personaId:'genie'},minimumElapsedMs:0})
 assert.throws(()=>next.receive(wire({...select,protocolId:id(99)})),/CLARITY_RELAY_CLIENT_INVALID/)
 assert.equal(next.receive(wire(select)).binding.protocolId,protocolId)
 assert.equal(next.receive(wire({type:'hh_clarity_ready',decision:'continue'})).kind,'ready')
 assert.equal(next.snapshot().canSendAudio,false)
})

test('an impossible fresh logical session cannot burn a provider slot',async()=>{
 const {canFitNewLogicalSession}=await import('../lib/coaching/relay-session-capacity.mjs')
 const {geminiLiveTokenQuota}=await import('../lib/coaching/gemini-live-quota.mjs')
 const quota=geminiLiveTokenQuota(owner)
 for(const remainingMs of [900000,1200000]){
  assert.equal(canFitNewLogicalSession({remainingMs,segmentMs:270000,quota}),false)
  assert.equal(canFitNewLogicalSession({remainingMs,segmentMs:770000,quota}),true)
 }
 assert.equal(canFitNewLogicalSession({remainingMs:1200000,segmentMs:600000,quota}),true)
 assert.equal(canFitNewLogicalSession({remainingMs:1200000,segmentMs:599999,quota}),false)
 assert.equal(canFitNewLogicalSession({remainingMs:900000,segmentMs:450000,quota}),true)
 assert.equal(canFitNewLogicalSession({remainingMs:900000,segmentMs:450000,quota:geminiLiveTokenQuota(owner,{ownerTrial:true})}),false)
 for(const segmentMs of [0,-1,NaN,Infinity,1.5])assert.equal(canFitNewLogicalSession({remainingMs:900000,segmentMs,quota}),false)
 assert.equal(canFitNewLogicalSession({remainingMs:900000,segmentMs:450000,quota:null}),false)
 const relay=readFileSync(new URL('../lib/app/clarity-live-relay.js',import.meta.url),'utf8')
 const guard=relay.indexOf('if(selection.firstProtocolIds!=null&&!canFitNewLogicalSession(')
 assert.ok(guard>=0&&guard<relay.indexOf('await consumeRateBatch(config,quota.attempts)'))
 assert.ok(guard<relay.indexOf('await reserveClarityRunCredential(')&&guard<relay.indexOf('await issueGeminiFreeLiveToken('))
})


test('browser WebSocket relay opens same-origin only and releases microphone after committed binding',async()=>{
 const {connectClarityBrowserRelay}=await import('../lib/coaching/clarity-relay-client.mjs')
 const runId=id(10),protocolId=id(11),wire=JSON.stringify
 let socket,visible=true,timerId=0
 const timers=new Map(),clocks=[],selectionFrames=[],played=[],drained=[],closed=[]
 class BrowserSocket {
  constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];socket=this}
  send(raw){this.sent.push(JSON.parse(raw))}
  open(){this.readyState=1;this.onopen()}
  receive(value){this.onmessage({data:wire(value)})}
  close(){if(this.readyState===3)return;this.readyState=3;this.onclose?.()}
 }
 const events=new Map(),target={addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name)}}
 const opts={selection:{accountId:owner,day:1,body,runId,protocolId,minimumElapsedMs:5000},explicitPlay:true,
  isForeground:()=>visible,origin:'https://holistichouse.vercel.app',WebSocketImpl:BrowserSocket,
  onSelection:x=>selectionFrames.push(x),onClock:x=>{clocks.push(x);return true},onProvider:x=>played.push(x),
  onDrainingProvider:x=>drained.push(x),onClosed:x=>closed.push(x),
  schedule:fn=>{timers.set(++timerId,fn);return timerId},cancel:id=>timers.delete(id),documentTarget:target,windowTarget:target}
 assert.throws(()=>connectClarityBrowserRelay({...opts,explicitPlay:false}),/INVALID/)
 assert.throws(()=>connectClarityBrowserRelay({...opts,origin:'https://holistichouse.vercel.app/elsewhere'}),/INVALID/)
 const h=connectClarityBrowserRelay(opts)
 const audio={realtimeInput:{audio:{data:'AAAAAA==',mimeType:'audio/pcm;rate=16000'}}}
 const select={type:'hh_clarity_selection',day:1,runId,protocolId}
 const clock=(elapsedMs,status)=>({type:'hh_clarity_clock',day:1,elapsedMs,status})
 const packet={serverContent:{outputTranscription:{text:'late reply'}}}
 assert.equal(socket.url,'wss://holistichouse.vercel.app/api/app/my-coach/live-relay')
 assert.equal(h.sendAudio(audio),false)
 socket.open()
 assert.equal(socket.sent[0].runId,runId)
 socket.receive(select);assert.equal(selectionFrames.length,1);assert.equal(h.snapshot().committed,false)
 socket.receive({type:'hh_clarity_ready',decision:'continue'})
 assert.deepEqual(socket.sent.at(-1),{type:'hh_clarity_consent',decision:'continue'})
 assert.equal(h.sendAudio(audio),false)
 socket.receive(clock(5000,'active'))
 assert.equal(clocks[0].binding.protocolId,protocolId);assert.equal(h.sendAudio(audio),true)
 assert.equal(h.sendAudio({type:'observe'}),false)
 assert.equal(h.sendAudio({clientContent:{turns:[]}}),false)
 assert.equal(h.sendAudio({realtimeInput:{audio:{data:'AAAA',mimeType:'audio/pcm;rate=16000'}}}),false)
 socket.receive(packet);assert.equal(played.length,1)
 assert.equal(h.changeCoach(),true);assert.equal(socket.sent.at(-1).type,'hh_clarity_change_coach')
 assert.equal(h.sendAudio(audio),false)
 socket.receive(packet);assert.equal(played.length,1);assert.equal(drained.length,1)
 socket.receive(clock(6000,'active'));assert.equal(clocks.at(-1).status,'pausing')
 socket.receive(clock(6000,'paused'))
 assert.equal(closed.length,1);assert.equal(closed[0].terminalVerified,true);assert.equal(closed[0].binding.protocolId,protocolId);assert.equal(closed[0].elapsedMs,6000)
 assert.equal(h.snapshot().closed,true);assert.equal(events.size,0);assert.equal(timers.size,0)
 const g=connectClarityBrowserRelay(opts);socket.open();socket.receive(select)
 visible=false;events.get('visibilitychange')()
 assert.equal(closed.at(-1).status,'not_started');assert.equal(socket.sent.length,1)
 visible=true
 const j=connectClarityBrowserRelay(opts);socket.open();socket.receive(select);socket.receive({type:'hh_clarity_ready',decision:'continue'})
 socket.close();assert.equal(closed.at(-1).status,'unverified');assert.equal(closed.at(-1).binding,null)
 assert.equal(j.snapshot().closed,true);assert.equal(events.size,0)
 const k=connectClarityBrowserRelay(opts);socket.open();socket.receive(select);socket.receive({type:'hh_clarity_ready',decision:'continue'})
 socket.receive(clock(5000,'active'));socket.close()
 assert.equal(closed.at(-1).status,'unverified');assert.equal(closed.at(-1).elapsedMs,5000);assert.equal(closed.at(-1).terminalVerified,false)
 assert.equal(k.sendAudio(audio),false)
 const l=connectClarityBrowserRelay(opts);socket.open();socket.receive(select);socket.receive({type:'hh_clarity_ready',decision:'continue'})
 socket.receive(clock(5000,'active'));socket.bufferedAmount=200001
 const before=socket.sent.length
 assert.equal(l.sendAudio(audio),false);assert.equal(socket.sent.length,before)
 assert.equal(closed.at(-1).reason,'audio_backpressure_unverified');assert.equal(closed.at(-1).status,'unverified')
 assert.equal(closed.at(-1).elapsedMs,5000);assert.equal(closed.at(-1).terminalVerified,false)
 assert.equal(l.snapshot().closed,true);assert.equal(events.size,0);assert.equal(timers.size,0)
})

test('live panel consumes only exact committed owner/run/protocol clock receipts',async()=>{
 const {projectClarityPanelClock}=await import('../lib/coaching/clarity-relay-client.mjs')
 const runId=id(10),protocolId=id(11),selection={accountId:owner,day:1,runId:null,protocolId:null,minimumElapsedMs:0}
 const ack={kind:'clock',binding:{runId,protocolId,day:1},status:'active',elapsedMs:0}
 const first=projectClarityPanelClock({selection,owner,ack})
 assert.equal(first.protocolId,protocolId);assert.equal(first.runId,runId)
 const next=projectClarityPanelClock({previous:first,selection,owner,ack:{...ack,elapsedMs:5000}})
 assert.equal(next.elapsedMs,5000)
 for(const bad of [{...ack,kind:'selection'},{...ack,status:'time_limit'},{...ack,elapsedMs:1200000},{...ack,binding:{...ack.binding,protocolId:id(99)}},{...ack,binding:{...ack.binding,runId:id(99)}},{...ack,binding:{...ack.binding,day:2}}]){
  assert.equal(projectClarityPanelClock({previous:next,selection,owner,ack:bad}),null)
 }
 assert.equal(projectClarityPanelClock({previous:next,selection,owner:id(98),ack}),null)
 assert.equal(projectClarityPanelClock({previous:next,selection,owner,ack}),null)
 const paused=projectClarityPanelClock({previous:next,selection,owner,ack:{...ack,status:'paused',elapsedMs:5000}})
 assert.equal(paused.status,'paused')
 const resumed=projectClarityPanelClock({previous:paused,selection:{...selection,runId,protocolId,minimumElapsedMs:5000},owner,ack:{...ack,elapsedMs:5000}})
 assert.equal(resumed.status,'active')
 const done=projectClarityPanelClock({previous:resumed,selection,owner,ack:{...ack,status:'time_limit',elapsedMs:1200000}})
 assert.equal(done.status,'time_limit')
 assert.equal(projectClarityPanelClock({previous:done,selection,owner,ack}),null)
})
test('existing voice panel routes Clarity through the trusted relay and binds the draft before saving',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const voice=read('components/my-coach-gemini-live.jsx'),page=read('components/my-coach-live-dialogue.jsx')
 const begin=voice.slice(voice.indexOf('  async function begin('),voice.indexOf('  function startSession('))
 assert.ok(begin.indexOf('connectCourseRelay(r);return')<begin.indexOf('const token=await getToken(r)'))
 assert.match(voice,/onClarityRelayClock\?\.\(ack,selected\)!==true/)
 assert.match(voice,/r\.ready=true[\s\S]*?server sends the opening/)
 assert.match(voice,/if\(r\.claritySelection\)return !r\.ended&&!r\.paused&&r\.clarityRelay\?\.sendAudio/)
 assert.match(page,/projectClarityPanelClock\(\{previous:relayClockRef\.current,selection,owner,ack\}\)/)
 assert.match(page,/relayClockRef\.current=next;protocolIdRef\.current=next\.protocolId/)
 assert.match(page,/if\(clarityCourseActive\)\{clock\.setRunning/)
 assert.match(page,/if\(clarityCourseDay\(selectedCourseId\)&&!restoredDraft&&\(!relayClockRef\.current/)
 assert.match(page,/next\.status==='time_limit'/)
 assert.match(page,/finishCourseSegment\(choice==='switch'\)/)
})

test('exact paused restored course can continue by voice only with fresh Play; other drafts remain private text',async()=>{
 const {restoredClarityRelayBinding}=await import('../lib/coaching/clarity-relay-client.mjs')
 const protocol={id:id(11),personaId:'mira',courseSessionId:'clarity_day_1',turns:[{role:'user',content:'PRIVATE'}]}
 const input={owner,runId:id(10),protocol,courseSessionId:protocol.courseSessionId,time:{status:'paused',elapsedSeconds:7,remainingSeconds:1193},personaId:'mira'}
 const b=restoredClarityRelayBinding(input)
 assert.deepEqual(b,{accountId:owner,runId:id(10),protocolId:id(11),day:1,elapsedMs:7000,status:'paused'})
 assert.equal(JSON.stringify(b).includes('PRIVATE'),false)
 for(const bad of [{owner:null},{runId:null},{runId:protocol.id},{personaId:'alex'},{structured:true},{courseSessionId:'clarity_day_2'},{time:{...input.time,status:'active'}},{time:{...input.time,remainingSeconds:1192}},{time:{status:'time_limit',elapsedSeconds:1200,remainingSeconds:0}}])
  assert.equal(restoredClarityRelayBinding({...input,...bad}),null)
 const page=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const voice=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 assert.match(page,/relayClockRef\.current=relay;setRestoredRelay\(Boolean\(relay\)\)/)
 assert.match(page,/setCoachEngine\(relay\?'gemini_live_free':'groq_stream'\)/)
 assert.match(page,/if\(!restoredRelay\)toggleComposer\(\)/)
 assert.match(page,/restoredDraft&&!restoredRelay/)
 assert.match(page,/if\(restoredDraft\)forceLocal=true/)
 assert.match(voice,/if\(!verified\)relayStopUnverified\.current=true/)
 assert.match(voice,/relayClosing\.current\|\|relayStopUnverified\.current/)
})

test('committed relay visits preserve authorship across the same protocol and reject forged attribution',async()=>{
 const {createClarityRelayClient,projectClarityPanelClock,restoredClarityRelayBinding}=await import('../lib/coaching/clarity-relay-client.mjs')
 const {clarityRelayArchiveMatches,clarityRelayHandoffEligible}=await import('../lib/coaching/clarity-course-runs.mjs')
 const runId=id(10),protocolId=id(11),v1=id(21),v2=id(22)
 const selection={accountId:owner,runId,protocolId,day:1,personaId:'genie',minimumElapsedMs:5000}
 const h=createClarityRelayClient({...selection,body:{...body,personaId:'genie'}})
 h.receive(JSON.stringify({type:'hh_clarity_selection',runId,day:1,protocolId}))
 h.receive(JSON.stringify({type:'hh_clarity_ready',decision:'continue'}))
 h.consent({foreground:true,explicitPlay:true})
 const frame={type:'hh_clarity_clock',day:1,elapsedMs:5000,status:'active',visitId:v2,coachId:'genie'}
 assert.throws(()=>h.receive(JSON.stringify({...frame,coachId:'mira'})),/INVALID/)
 const ack=h.receive(JSON.stringify(frame))
 assert.equal(ack.visitId,v2);assert.equal(ack.coachId,'genie')
 const projected=projectClarityPanelClock({selection,owner,ack})
 assert.equal(projected.visitId,v2);assert.equal(projected.protocolId,protocolId)
 assert.equal(projectClarityPanelClock({selection,owner,ack:{...ack,visitId:undefined}}),null)
 assert.throws(()=>h.receive(JSON.stringify({...frame,visitId:v1})),/INVALID/)
 const binding={day:1,protocolId,clarityTime:{status:'paused',elapsedSeconds:5,remainingSeconds:1195},relayVisits:[{visitId:v1,coachId:'mira'},{visitId:v2,coachId:'genie'}]}
 const first={role:'assistant',content:'First',coachId:'mira',visitId:v1,authorPersonaId:'mira',inference:{provider:'gemini_live_free'}}
 const second={role:'assistant',content:'Second',coachId:'genie',visitId:v2,authorPersonaId:'genie',inference:{provider:'gemini_live_free'}}
 const protocol={id:protocolId,courseSessionId:'clarity_day_1',personaId:'mira',turns:[first,second]}
 assert.equal(clarityRelayArchiveMatches(binding,protocol),true)
 assert.equal(clarityRelayArchiveMatches(binding,{...protocol,turns:[first,{...second,authorPersonaId:'mira'}]}),false)
 assert.equal(clarityRelayArchiveMatches(binding,{...protocol,turns:[first,{...second,visitId:id(99)}]}),false)
 assert.equal(clarityRelayArchiveMatches(binding,{...protocol,turns:[second,first]}),false)
 assert.equal(clarityRelayArchiveMatches(binding,{...protocol,id:id(99)}),false)
 assert.equal(clarityRelayArchiveMatches(binding,{...protocol,personaId:'genie'}),false)
 const untagged={role:'assistant',content:'New',inference:{provider:'gemini_live_free'}}
 assert.equal(clarityRelayArchiveMatches(binding,{...protocol,turns:[first,untagged]},{from:1}),false)
 assert.equal(clarityRelayHandoffEligible({protocol},binding),true)
 assert.equal(clarityRelayHandoffEligible({protocol,courseGate:{}},binding),false)
 assert.equal(clarityRelayHandoffEligible({protocol},{...binding,clarityTime:{status:'active'}}),false)
 const restored={owner,runId,protocol,courseSessionId:protocol.courseSessionId,time:binding.clarityTime,personaId:'genie'}
 assert.equal(restoredClarityRelayBinding(restored),null)
 assert.equal(restoredClarityRelayBinding({...restored,handoff:true}).protocolId,protocolId)
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const store=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 assert.match(ui,/protocolOriginPersonaRef\.current=p\.personaId/)
 assert.match(ui,/personaId:protocolOriginPersonaRef\.current\|\|personaId/)
 assert.match(ui,/item\.relayHandoff===true&&result\.relayHandoff===true/)
 assert.match(store,/clarityRelayArchiveMatches\(relayBinding,value\.protocol,\{from:old\.protocol\.turns\.length\}\)/)
})
