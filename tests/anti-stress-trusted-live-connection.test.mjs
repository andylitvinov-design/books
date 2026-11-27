import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {createAntiStressRun,advanceAntiStressRun,antiStressRunSummary,antiStressRunCredentialWindow} from '../lib/coaching/anti-stress-runs.mjs'
import {bindAntiStressTrustedLiveConnection} from '../lib/coaching/anti-stress-trusted-live-connection.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
class Socket extends EventEmitter{
 constructor(){super();this.readyState=1;this.messages=[];this.pings=[]}
 send(value){this.messages.push(JSON.parse(value))}
 ping(value){this.pings.push(value)}
 close(){if(this.readyState===3)return;this.readyState=3;this.emit('close')}
 input(value){this.emit('message',JSON.stringify(value))}
 pong(){this.emit('pong',Buffer.from(this.pings.at(-1)))}
}
function fixture({beforePersist=async()=>{}}={}){
 const base=1795100000000,client=new Socket(),provider=new Socket(),protocolId=id(2)
 let run=createAntiStressRun({id:id(1),access:'free',protocolIds:[protocolId,id(3),id(4)],createdAt:base})
 const lease={leaseId:id(10),run,sessionId:'anti_stress_ground',protocolId,now:base,previousCredentialExpiresAt:null,
  ...antiStressRunCredentialWindow(run,{sessionId:'anti_stress_ground',protocolId,now:base,previousCredentialExpiresAt:null})}
 let now=base,seq=20,tid=0;const timers=new Map(),events=[]
 const relay=bindAntiStressTrustedLiveConnection({client,provider,lease,coachId:'mira',setup:{setup:{model:'synthetic'}},clock:()=>now,uuid:()=>id(++seq),
  schedule:(fn,ms)=>{timers.set(++tid,{fn,at:now+ms});return tid},cancel:key=>timers.delete(key),
  persist:async e=>{events.push(e);await beforePersist(e);run=advanceAntiStressRun(run,e);return antiStressRunSummary(run)}})
 function advance(ms){now+=ms;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.fn()}}
 const ready=()=>provider.input({setupComplete:{}})
 const consent=()=>client.input({type:'hh_anti_stress_consent',decision:'start'})
 return {client,provider,relay,events,advance,ready,consent,base,get run(){return run}}
}
test('server provider setup and explicit client consent are both required; paired real socket pongs alone credit time',async()=>{
 const f=fixture()
 assert.equal(f.provider.messages.length,1)
 f.client.input({setupComplete:{}});f.consent();await f.relay.settled()
 assert.equal(f.events.length,0)
 f.ready();await f.relay.settled()
 assert.equal(f.events.length,1);assert.equal(f.events[0].type,'begin')
 assert.equal(f.run.clock.days[0].elapsedMs,0)
 f.advance(5000);assert.equal(f.provider.pings.length,1)
 f.client.input({type:'observe',atMs:f.base+5000}) // arbitrary messages cannot write the ledger
 await f.relay.settled()
 assert.equal(f.run.clock.days[0].elapsedMs,0)
 assert.equal(f.run.clock.days[0].status,'paused')
})
test('real pongs credit only the observed interval; pause closes upstream before persisting stop',async()=>{
 const f=fixture();f.ready();f.consent();await f.relay.settled()
 f.advance(5000);f.client.pong();await f.relay.settled()
 assert.equal(f.events.length,1)
 f.provider.pong();await f.relay.settled()
 assert.equal(f.run.clock.days[0].elapsedMs,5000)
 assert.equal(f.events[1].type,'observe')
 f.advance(1000);f.client.input({type:'hh_anti_stress_pause'})
 assert.equal(f.provider.readyState,3)
 await f.relay.settled()
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.run.clock.days[0].elapsedMs,5000)
 assert.equal(f.events.at(-1).type,'pause')
})
test('unobserved gap or provider disconnect cannot become credited minutes',async()=>{
 const f=fixture();f.ready();f.consent();await f.relay.settled()
 f.advance(5000);f.client.pong();f.advance(5000);await f.relay.settled()
 assert.equal(f.run.clock.days[0].elapsedMs,0);assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.events.at(-1).type,'lost_observation')
 const g=fixture();g.ready();g.consent();await g.relay.settled()
 g.advance(5000);g.client.pong();g.provider.close();await g.relay.settled()
 assert.equal(g.run.clock.days[0].elapsedMs,0);assert.equal(g.run.clock.days[0].status,'paused')
})
test('no audio before durable consent, only bounded PCM after; never pass provider resume handle',async()=>{
 const f=fixture(),audio={realtimeInput:{audio:{data:'AAAAAA==',mimeType:'audio/pcm;rate=16000'}}}
 f.ready();f.client.input(audio);assert.equal(f.provider.messages.length,1)
 f.consent();await f.relay.settled()
 f.client.input(audio);assert.deepEqual(f.provider.messages.at(-1),audio)
 f.provider.input({sessionResumptionUpdate:{newHandle:'private'}})
 assert.ok(!f.client.messages.some(x=>x.sessionResumptionUpdate))
 f.provider.input({serverContent:{turnComplete:true}})
 assert.deepEqual(f.client.messages.at(-1),{serverContent:{turnComplete:true}})
 f.client.input({setup:{model:'wrong'}});await f.relay.settled()
 assert.equal(f.provider.readyState,3)
 assert.equal(f.run.clock.days[0].status,'paused')
})
test('provider is closed on credential expiry without claiming logical completion',async()=>{
 const f=fixture();f.ready();f.consent();await f.relay.settled()
 f.advance(900000);await f.relay.settled()
 assert.equal(f.run.clock.days[0].status,'paused');assert.equal(f.run.clock.days[0].elapsedMs,0)
 assert.equal(f.provider.readyState,3)
})


test('unconsented connection closes at its short start deadline without creating a run',async()=>{
 const f=fixture();f.ready();f.advance(45000);await f.relay.settled()
 assert.equal(f.events.length,0);assert.equal(f.run.clock.revision,0)
 assert.equal(f.provider.readyState,3);assert.equal(f.client.readyState,3)
})
test('client disconnect during first durable begin closes upstream and records pause without credit',async()=>{
 let release,entered;const blocked=new Promise(resolve=>{release=resolve}),start=new Promise(resolve=>{entered=resolve})
 const f=fixture({beforePersist:async e=>{if(e.type==='begin'){entered();await blocked}}})
 f.ready();f.consent();await start
 f.client.close();assert.equal(f.provider.readyState,3)
 release();await f.relay.settled()
 assert.equal(f.events.length,2);assert.equal(f.events[0].type,'begin');assert.equal(f.events[1].type,'disconnect')
 assert.equal(f.run.clock.days[0].status,'paused');assert.equal(f.run.clock.days[0].elapsedMs,0)
})
