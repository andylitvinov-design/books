import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {createAntiStressRun,advanceAntiStressRun} from '../lib/coaching/anti-stress-runs.mjs'
import {normalizeAntiStressRelayEntry,resolveAntiStressRelaySelection,attachAntiStressRelayEntry} from '../lib/coaching/anti-stress-relay-entry.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const owner=id(100),sessionId='anti_stress_ground',body={personaId:'mira',locale:'en',courseSessionId:sessionId,consent:true,voiceConsent:true,trainingUseConsent:true},base=1795100000000
const wire=(overrides={})=>JSON.stringify({type:'hh_anti_stress_enter',accountId:owner,runId:null,sessionId,body,...overrides})
const entitlement=({owner,runId,existingRun})=>({accountId:owner,courseRunId:runId,programId:'anti-stress-three-session',verified:true,access:existingRun?.access||'free'})
function fixture(){
 let run=createAntiStressRun({id:id(1),protocolIds:[id(2),id(3),id(4)],createdAt:base,access:'free'})
 const event={courseRunId:run.id,sessionId,day:1,protocolId:id(2),connectionId:id(10),segmentId:id(11),coachId:'mira'}
 const active=advanceAntiStressRun(run,{...event,type:'begin',expectedRevision:0,atMs:base,consent:{kind:'explicit_client_session_consent',decision:'start',protocolId:id(2),connectionId:id(10),coachId:'mira',atMs:base,turnId:'start'}})
 run=advanceAntiStressRun(active,{...event,type:'pause',expectedRevision:1,atMs:base+5000,evidence:'server_observed_stop'})
 return {run,active}
}
test('Therapy initial frame cannot supply entitlement, protocol, clock, another owner or program',()=>{
 assert.equal(normalizeAntiStressRelayEntry(wire(),owner).sessionId,sessionId)
 for(const bad of [{accountId:id(99)},{protocolId:id(2)},{entitlement:{verified:true}},{elapsedMs:100},{sessionId:'clarity_day_1'},{sessionId:'anti_stress_calm'},{body:{...body,trainingUseConsent:false}},{body:{...body,programType:'therapy'}},{body:{...body,entitlement:true}}])assert.throws(()=>normalizeAntiStressRelayEntry(wire(bad),owner),/INVALID/)
})
test('selection resolves only exact persisted current day and trusted access decision',async()=>{
 const {run,active}=fixture()
 let n=20
 const args={owner,readRun:async()=>run,uuid:()=>id(++n),resolveEntitlement:entitlement}
 const first=await resolveAntiStressRelaySelection(normalizeAntiStressRelayEntry(wire(),owner),args)
 assert.equal(first.firstProtocolIds.length,3);assert.equal(first.protocolId,first.firstProtocolIds[0])
 const existing=normalizeAntiStressRelayEntry(wire({runId:run.id}),owner)
 const next=await resolveAntiStressRelaySelection(existing,args)
 assert.equal(next.protocolId,id(2));assert.equal(next.firstProtocolIds,null)
 await assert.rejects(resolveAntiStressRelaySelection(existing,{...args,readRun:async()=>active}),/INVALID/)
 await assert.rejects(resolveAntiStressRelaySelection({...existing,runId:id(99)},args),/INVALID/)
 await assert.rejects(resolveAntiStressRelaySelection({...existing,sessionId:'anti_stress_calm'},args),/INVALID/)
 for(const wrong of [{verified:false},{accountId:id(99)},{courseRunId:id(99)},{programId:'clarity'},{access:'paid'}])await assert.rejects(resolveAntiStressRelaySelection(existing,{...args,resolveEntitlement:v=>({...entitlement(v),...wrong})}),/INVALID/)
 await assert.rejects(resolveAntiStressRelaySelection(existing,{...args,resolveEntitlement:async()=>null}),/INVALID/)
})
class Socket extends EventEmitter{constructor(){super();this.readyState=1;this.messages=[]}send(raw){this.messages.push(JSON.parse(raw))}close(){if(this.readyState===3)return;this.readyState=3;this.emit('close')}input(raw){this.emit('message',raw)}}
test('entry attaches synchronously and does not mint while entitlement is pending or rejected',async()=>{
 const {run}=fixture();let release;const blocked=new Promise(r=>release=r),socket=new Socket();let opens=0,n=40
 const args={owner,readRun:async()=>run,uuid:()=>id(++n),resolveEntitlement:async v=>{await blocked;return entitlement(v)},prepareBody:async b=>({body:b,session:null}),open:async()=>{opens++;return {close:async()=>{}}},schedule:()=>1,cancel:()=>{}}
 const h=attachAntiStressRelayEntry(socket,args);socket.input(wire({runId:run.id}));socket.input(wire());release();await h.settled()
 assert.equal(opens,0);assert.equal(socket.readyState,3);assert.equal(socket.messages[0].type,'hh_anti_stress_unavailable')
 const s=new Socket(),g=attachAntiStressRelayEntry(s,{...args,resolveEntitlement:entitlement});s.input(wire({runId:run.id}));await g.settled()
 assert.equal(opens,1);assert.deepEqual(s.messages[0],{type:'hh_anti_stress_selection',runId:run.id,sessionId,day:1,protocolId:id(2)})
 const x=new Socket(),k=attachAntiStressRelayEntry(x,{...args,resolveEntitlement:()=>null});x.input(wire());await k.settled()
 assert.equal(opens,1);assert.equal(x.readyState,3)
})

test('Therapy browser transport uses exact run, session and server visit, never direct provider credentials',async()=>{
 const {createAntiStressRelayClient,connectAntiStressBrowserRelay}=await import('../lib/coaching/anti-stress-relay-client.mjs')
 const selection={accountId:owner,runId:id(1),protocolId:id(2),sessionId,body,minimumElapsedMs:5000}
 const selected={type:'hh_anti_stress_selection',runId:id(1),protocolId:id(2),sessionId,day:1}
 const ready={type:'hh_anti_stress_ready',decision:'continue'}
 const frame={type:'hh_anti_stress_clock',day:1,elapsedMs:5000,status:'active',visitId:id(11),coachId:'mira'}
 const control=createAntiStressRelayClient(selection)
 assert.equal(JSON.parse(control.entry).sessionId,sessionId)
 assert.equal(JSON.parse(control.entry).protocolId,undefined)
 assert.throws(()=>control.receive(JSON.stringify({...selected,sessionId:'anti_stress_calm'})),/INVALID/)
 control.receive(JSON.stringify(selected));control.receive(JSON.stringify(ready))
 assert.equal(control.snapshot().canSendAudio,false)
 assert.throws(()=>control.consent({foreground:true,explicitPlay:false}),/INVALID/)
 control.consent({foreground:true,explicitPlay:true})
 assert.throws(()=>control.receive(JSON.stringify({...frame,coachId:'alex'})),/INVALID/)
 assert.throws(()=>control.receive(JSON.stringify({...frame,visitId:undefined})),/INVALID/)
 assert.equal(control.receive(JSON.stringify(frame)).visitId,id(11))
 assert.equal(control.snapshot().canSendAudio,true)
 assert.throws(()=>control.receive(JSON.stringify({...frame,elapsedMs:4999})),/INVALID/)
 assert.equal(JSON.parse(control.changeCoach()).type,'hh_anti_stress_change_coach')
 assert.equal(control.snapshot().canSendAudio,false)
 assert.equal(control.receive(JSON.stringify({serverContent:{turnComplete:true}})).playAudio,false)
 assert.equal(control.receive(JSON.stringify({...frame,status:'paused'})).elapsedMs,5000)
 let socket,closed=[],clocks=[],played=[]
 class BrowserSocket{
  constructor(url){this.url=url;this.readyState=0;this.bufferedAmount=0;this.sent=[];socket=this}
  send(raw){this.sent.push(JSON.parse(raw))}
  close(){this.readyState=3;this.onclose?.()}
  receive(value){this.onmessage({data:JSON.stringify(value)})}
 }
 const h=connectAntiStressBrowserRelay({selection,explicitPlay:true,isForeground:()=>true,onClock:x=>{clocks.push(x);return true},onProvider:x=>played.push(x),onClosed:x=>closed.push(x),origin:'https://holistichouse.vercel.app',WebSocketImpl:BrowserSocket,schedule:()=>1,cancel:()=>{}})
 assert.equal(socket.url,'wss://holistichouse.vercel.app/api/app/anti-stress/live-relay')
 socket.readyState=1;socket.onopen();socket.receive(selected);socket.receive(ready)
 const audio={realtimeInput:{audio:{data:'AAAAAA==',mimeType:'audio/pcm;rate=16000'}}}
 assert.equal(h.sendAudio(audio),false)
 socket.receive(frame)
 assert.equal(h.sendAudio(audio),true)
 assert.equal(h.sendAudio({clientContent:{turns:[]}}),false)
 assert.equal(h.sendAudio({type:'observe'}),false)
 socket.receive({serverContent:{turnComplete:true}});assert.equal(played.length,1)
 assert.equal(h.pause(),true)
 socket.receive({...frame,status:'paused'})
 assert.equal(closed[0].terminalVerified,true);assert.equal(closed[0].elapsedMs,5000)
 assert.equal(closed[0].binding.sessionId,sessionId)
 assert.equal(clocks.length,2)
})

test('Therapy panel binds real clock receipts to its own session and shares the existing PCM runner without direct fallback',async()=>{
 const {projectAntiStressPanelClock}=await import('../lib/coaching/anti-stress-relay-client.mjs')
 const selection={accountId:owner,runId:id(1),protocolId:id(2),sessionId,personaId:'mira',minimumElapsedMs:5000}
 const ack={kind:'clock',binding:{runId:id(1),protocolId:id(2),sessionId,day:1},status:'active',elapsedMs:5000,visitId:id(11),coachId:'mira'}
 const first=projectAntiStressPanelClock({selection,owner,ack})
 assert.equal(first.elapsedMs,5000);assert.equal(first.protocolId,id(2))
 for(const bad of [{...ack,coachId:'alex'},{...ack,elapsedMs:4999},{...ack,status:'time_limit'},{...ack,binding:{...ack.binding,protocolId:id(3)}},{...ack,binding:{...ack.binding,sessionId:'anti_stress_calm'}}])
  assert.equal(projectAntiStressPanelClock({selection,owner,ack:bad}),null)
 assert.equal(projectAntiStressPanelClock({selection,owner:id(99),ack}),null)
 const paused=projectAntiStressPanelClock({previous:first,selection,owner,ack:{...ack,status:'paused',elapsedMs:6000}})
 assert.equal(paused.elapsedMs,6000)
 assert.equal(projectAntiStressPanelClock({previous:paused,selection,owner,ack}),null)
 const done=projectAntiStressPanelClock({previous:paused,selection,owner,ack:{...ack,status:'time_limit',elapsedMs:900000}})
 assert.equal(done.status,'time_limit')
 const {readFileSync}=await import('node:fs')
 const voice=readFileSync(new URL('../components/my-coach-gemini-live.jsx',import.meta.url),'utf8')
 const panel=readFileSync(new URL('../components/app/anti-stress-live-panel.jsx',import.meta.url),'utf8')
 assert.match(voice,/const connect=r\.therapyMode\?connectAntiStressBrowserRelay:connectClarityBrowserRelay/)
 assert.match(voice,/if\(\(therapyMode\|\|clarityDay\)&&\(!selected/)
 assert.match(voice,/audioGate:new GeminiLiveBargeGate\(\),claritySelection:selected,therapyMode/)
 assert.match(panel,/therapyRelaySelection=\{selection\} onTherapyRelayClock=\{onClock\}/)
 assert.match(panel,/await speech\.current\?\.finishCourseSegment/)
 assert.doesNotMatch(panel,/localStorage|sessionStorage|liveContextAccess=|live-token/)
})
