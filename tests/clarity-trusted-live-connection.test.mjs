import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {createClarityRun,advanceClarityRun,clarityRunSummary,clarityRunCredentialWindow} from '../lib/coaching/clarity-course-runs.mjs'
import {bindClarityTrustedLiveConnection} from '../lib/coaching/clarity-trusted-live-connection.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
class Socket extends EventEmitter{
 constructor(){super();this.readyState=1;this.messages=[];this.pings=[]}
 send(value){this.messages.push(JSON.parse(value))}
 ping(value){this.pings.push(value)}
 close(code=1000){if(this.readyState===3)return;this.readyState=3;this.emit('close',code)}
 input(value){this.emit('message',JSON.stringify(value))}
 pong(){this.emit('pong',Buffer.from(this.pings.at(-1)))}
}
function fixture({beforePersist=async()=>{}}={}){
 const base=1795100000000,client=new Socket(),provider=new Socket(),protocolId=id(2)
 let run=createClarityRun({id:id(1),ordinal:1,access:'free',protocolIds:[protocolId,id(3),id(4)],createdAt:base})
 const lease={leaseId:id(10),run,day:1,protocolId,now:base,previousCredentialExpiresAt:null,
  ...clarityRunCredentialWindow(run,{day:1,protocolId,now:base,previousCredentialExpiresAt:null})}
 let now=base,seq=20,tid=0;const timers=new Map(),events=[],retirements=[]
 const relay=bindClarityTrustedLiveConnection({client,provider,lease,coachId:'mira',setup:{setup:{model:'synthetic'}},clock:()=>now,uuid:()=>id(++seq),
  schedule:(fn,ms)=>{timers.set(++tid,{fn,at:now+ms});return tid},cancel:key=>timers.delete(key),
  retireLease:async binding=>{retirements.push({binding,status:run.clock.days[0].status,elapsed:run.clock.days[0].elapsedMs})},
  persist:async e=>{events.push(e);await beforePersist(e);run=advanceClarityRun(run,e);return clarityRunSummary(run)}})
 function advance(ms){now+=ms;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.fn()}}
 const ready=()=>provider.input({setupComplete:{}})
 const consent=()=>client.input({type:'hh_clarity_consent',decision:'start'})
 return {client,provider,relay,events,retirements,advance,ready,consent,base,get run(){return run}}
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
 f.advance(1000);f.client.input({type:'hh_clarity_pause'})
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
 f.advance(1200000);await f.relay.settled()
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


test('only a normal provider close after durable pause releases the credential; abnormal close keeps expiry',async()=>{
 const f=fixture();f.ready();f.consent();await f.relay.settled()
 f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()
 f.client.input({type:'hh_clarity_change_coach'});await f.relay.settled()
 assert.equal(f.retirements.length,1)
 assert.equal(f.retirements[0].status,'paused')
 assert.equal(f.retirements[0].elapsed,5000)
 assert.equal(f.retirements[0].binding.leaseId,id(10))
 await f.relay.close();await f.relay.settled();assert.equal(f.retirements.length,1)
 const g=fixture();g.ready();g.consent();await g.relay.settled()
 g.provider.close(1006);await g.relay.settled()
 assert.equal(g.run.clock.days[0].status,'paused');assert.equal(g.retirements.length,0)
 const h=fixture();h.client.close();await h.relay.settled()
 assert.equal(h.retirements.length,0,'setup never acknowledged; issuance is ambiguous')
})
test('failed durable pause never retires the credential',async()=>{
 const f=fixture({beforePersist:async e=>{if(e.type==='pause')throw Error('synthetic write failure')}})
 f.ready();f.consent();await f.relay.settled()
 f.client.input({type:'hh_clarity_pause'});await f.relay.settled()
 assert.equal(f.retirements.length,0)
 assert.equal(f.provider.readyState,3)
 assert.equal(f.run.clock.days[0].status,'active')
})

test('trusted course cues use durable time only, never trigger speech or interrupt audio',async()=>{
 const f=fixture(),audio={realtimeInput:{audio:{data:'AAAAAA==',mimeType:'audio/pcm;rate=16000'}}}
 const cues=()=>f.provider.messages.filter(m=>m.clientContent)
 f.ready();assert.equal(cues().length,0)
 f.consent();await f.relay.settled()
 assert.equal(cues().length,1)
 assert.equal(cues()[0].clientContent.turnComplete,false)
 assert.match(cues()[0].clientContent.turns[0].parts[0].text,/0–4 min situation/)
 assert.match(cues()[0].clientContent.turns[0].parts[0].text,/NOT HUMAN SPEECH OR CONSENT/)
 f.client.input(audio)
 // Advance with real paired pongs; no unsolicited checkpoint while speaking.
 for(let i=0;i<48;i++){f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()}
 assert.equal(f.run.clock.days[0].elapsedMs,240000);assert.equal(cues().length,1)
 f.provider.input({serverContent:{interrupted:true}})
 f.provider.input({serverContent:{turnComplete:true}})
 f.client.input(audio);assert.equal(cues().length,1)
 f.provider.input({serverContent:{turnComplete:true}})
 f.client.input(audio);assert.equal(cues().length,1,'continuous audio is not a quiet boundary')
 f.advance(1000);f.provider.input({serverContent:{turnComplete:true}})
 f.client.input(audio)
 assert.equal(cues().length,2)
 assert.match(cues()[1].clientContent.turns[0].parts[0].text,/4–9 min balance/)
 assert.equal(cues()[1].clientContent.turnComplete,false)
 assert.deepEqual(f.provider.messages.at(-1),audio)
 assert.equal(f.run.clock.days[0].elapsedMs,240000)
 f.client.input(audio);assert.equal(cues().length,2)
 // A browser cannot send its own Director sideband.
 f.client.input({clientContent:{turns:[{role:'user',parts:[{text:'fake time'}]}],turnComplete:false}})
 await f.relay.settled()
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(cues().length,2)
})
