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
