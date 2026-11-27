import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {createAntiStressRun,advanceAntiStressRun,antiStressRunSummary,antiStressRunCredentialWindow} from '../lib/coaching/anti-stress-runs.mjs'
import {bindAntiStressTrustedLiveConnection} from '../lib/coaching/anti-stress-trusted-live-connection.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
class Socket extends EventEmitter{
 constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];this.pings=[]}
 send(value){this.messages.push(JSON.parse(value))}
 ping(value){this.pings.push(value)}
 close(code=1000){if(this.readyState===3)return;this.readyState=3;this.emit('close',code)}
 input(value){this.emit('message',JSON.stringify(value))}
 pong(){this.emit('pong',Buffer.from(this.pings.at(-1)))}
}
function fixture({beforePersist=async()=>{},segmentBudgetMs=null,previousRun=null,persistTurn=null}={}){
 const base=previousRun?previousRun.clock.lastEventAt+1000:1795100000000,client=new Socket(),provider=new Socket(),protocolId=id(2)
 let run=previousRun||createAntiStressRun({id:id(1),access:'free',protocolIds:[protocolId,id(3),id(4)],createdAt:base})
 const previousCredentialExpiresAt=previousRun?base:null
 const lease={leaseId:previousRun?id(11):id(10),run,sessionId:'anti_stress_ground',protocolId,now:base,previousCredentialExpiresAt,
  ...antiStressRunCredentialWindow(run,{sessionId:'anti_stress_ground',protocolId,now:base,previousCredentialExpiresAt})}
 let now=base,seq=previousRun?200:20,tid=0;const timers=new Map(),events=[],retired=[]
 const relay=bindAntiStressTrustedLiveConnection({client,provider,lease,coachId:'mira',setup:{setup:{model:'synthetic'}},segmentDeadlineMs:segmentBudgetMs===null?null:base+segmentBudgetMs,clock:()=>now,uuid:()=>id(++seq),persistTurn,
  schedule:(fn,ms)=>{timers.set(++tid,{fn,at:now+ms});return tid},cancel:key=>timers.delete(key),
  retireLease:async b=>{retired.push(b);return true},persist:async e=>{events.push(e);await beforePersist(e);run=advanceAntiStressRun(run,e);return antiStressRunSummary(run)}})
 function advance(ms,fireTimers=true){now+=ms;if(!fireTimers)return;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.fn()}}
 const ready=()=>provider.input({setupComplete:{}})
 const consent=()=>client.input({type:'hh_anti_stress_consent',decision:previousRun?'continue':'start'})
 return {client,provider,relay,events,retired,advance,ready,consent,base,get run(){return run}}
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

test('normal provider closure and durable pause retire only the exact therapy lease',async()=>{
 const f=fixture();f.ready();f.consent();await f.relay.settled()
 assert.equal(f.retired.length,0)
 f.client.input({type:'hh_anti_stress_pause'});await f.relay.settled()
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.retired.length,1);assert.equal(f.retired[0].programKind,'therapy')
 assert.equal(f.retired[0].leaseId,id(10));assert.equal(f.retired[0].protocolId,id(2))
 const g=fixture();g.ready();g.consent();await g.relay.settled()
 g.provider.close(1006);await g.relay.settled()
 assert.equal(g.retired.length,0)
 const h=fixture();h.client.close();await h.relay.settled()
 assert.equal(h.retired.length,0)
 const k=fixture({beforePersist:async e=>{if(e.type==='pause')throw Error('synthetic persistence failure')}})
 k.ready();k.consent();await k.relay.settled()
 k.client.input({type:'hh_anti_stress_pause'});await k.relay.settled()
 assert.equal(k.retired.length,0)
})

test('hosting cutoff pauses the same 15-minute therapy protocol and retires only a normally closed lease',async()=>{
 const f=fixture({segmentBudgetMs:270000})
 f.ready();f.consent();await f.relay.settled()
 for(let i=0;i<53;i++){f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()}
 assert.equal(f.run.clock.days[0].elapsedMs,265000)
 f.advance(5000);await f.relay.settled()
 assert.equal(f.provider.readyState,3)
 assert.equal(f.client.readyState,3)
 assert.equal(f.run.clock.days[0].protocolId,id(2))
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.run.clock.days[0].elapsedMs,265000)
 assert.equal(f.events.at(-1).type,'pause')
 assert.equal(f.retired.length,1)
 assert.equal(f.retired[0].programKind,'therapy')
})
test('late host timer cannot permit microphone or provider replies past the hard segment boundary',async()=>{
 const audio={realtimeInput:{audio:{data:'AAAAAA==',mimeType:'audio/pcm;rate=16000'}}}
 for(const sender of ['client','provider']){
  const f=fixture({segmentBudgetMs:10000});f.ready();f.consent();await f.relay.settled()
  f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()
  const upstream=f.provider.messages.length,downstream=f.client.messages.length
  f.advance(5000,false)
  f[sender].input(sender==='client'?audio:{serverContent:{outputTranscription:{text:'late'}}})
  await f.relay.settled()
  assert.equal(f.provider.messages.length,upstream)
  assert.equal(f.client.messages.length,downstream+1)
  assert.equal(f.client.messages.at(-1).status,'paused')
  assert.equal(f.run.clock.days[0].elapsedMs,5000)
  assert.equal(f.events.at(-1).type,'pause')
  assert.equal(f.retired.length,1)
 }
})
test('invalid hosting deadline fails before a therapy socket is opened',()=>{
 assert.throws(()=>fixture({segmentBudgetMs:0}),/ANTI_STRESS_RELAY_INVALID/)
})

test('therapy opening follows committed consent and the delivered clock ACK; resume is not a new intake',async()=>{
 const f=fixture(),order=[]
 const sendClient=f.client.send.bind(f.client),sendProvider=f.provider.send.bind(f.provider)
 f.client.send=value=>{if(JSON.parse(value).type==='hh_anti_stress_clock')order.push('ack');sendClient(value)}
 f.provider.send=value=>{if(JSON.parse(value).clientContent?.turnComplete===true)order.push('spoken');sendProvider(value)}
 const cues=s=>s.messages.filter(m=>m.clientContent?.turnComplete===true)
 f.ready();assert.equal(cues(f.provider).length,0)
 f.consent();await f.relay.settled()
 assert.deepEqual(order,['ack','spoken'])
 assert.equal(cues(f.provider).length,1)
 assert.match(cues(f.provider)[0].clientContent.turns[0].parts[0].text,/THERAPY START EVENT/)
 assert.match(cues(f.provider)[0].clientContent.turns[0].parts[0].text,/separate explicit practice permission/)
 f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()
 f.client.input({type:'hh_anti_stress_change_coach'});await f.relay.settled()
 const g=fixture({previousRun:f.run});g.ready();assert.equal(g.client.messages.at(-1).decision,'continue')
 g.consent();await g.relay.settled()
 assert.equal(g.run.clock.days[0].protocolId,id(2))
 assert.equal(g.run.clock.days[0].elapsedMs,5000)
 assert.equal(cues(g.provider).length,1)
 assert.match(cues(g.provider)[0].clientContent.turns[0].parts[0].text,/THERAPY CONTINUATION EVENT/)
 assert.match(cues(g.provider)[0].clientContent.turns[0].parts[0].text,/Do not repeat the intake or claim to remember unavailable details/)
 await g.relay.close();await g.relay.settled()
})
test('failed start receipt or backpressure stops therapy without granting unobserved time',async()=>{
 const f=fixture();f.ready()
 f.client.send=()=>{throw Error('synthetic broken socket')}
 f.consent();await f.relay.settled()
 assert.equal(f.provider.messages.filter(m=>m.clientContent).length,0)
 assert.equal(f.run.clock.days[0].status,'paused');assert.equal(f.run.clock.days[0].elapsedMs,0)
 for(const side of ['client','provider']){
  const g=fixture();g.ready();g.consent();await g.relay.settled()
  g[side].bufferedAmount=200001
  g.advance(5000);await g.relay.settled()
  assert.equal(g.run.clock.days[0].status,'paused');assert.equal(g.run.clock.days[0].elapsedMs,0)
  assert.equal(g.provider.readyState,3)
 }
})

test('storage consent adapter saves complete upstream turns only inside durable clock observations',async()=>{
 const rows=[],f=fixture({persistTurn:async e=>rows.push(e)})
 f.ready();f.consent();await f.relay.settled()
 f.provider.input({serverContent:{interimInputTranscription:{text:'interim'}}})
 f.provider.input({serverContent:{inputTranscription:{text:'I feel tired'}}})
 f.provider.input({serverContent:{outputTranscription:{text:'I hear you'}}})
 f.provider.input({serverContent:{turnComplete:true}})
 assert.equal(rows.length,0)
 f.advance(5000);f.client.pong();await f.relay.settled();assert.equal(rows.length,0)
 f.provider.pong();await f.relay.settled()
 assert.equal(rows.length,2)
 assert.deepEqual(rows.map(r=>r.role),['client','coach'])
 assert.equal(rows[0].text,'I feel tired');assert.equal(rows[1].text,'I hear you')
 assert.equal(rows[0].protocolId,id(2));assert.equal(rows[1].coachId,'mira')
 assert.equal(rows[0].proof,'server_observed_final_turn');assert.equal(rows[0].atMs,f.base)
 assert.ok(rows.every(r=>r.kind==='turn'&&r.fieldId===undefined))
 f.provider.input({serverContent:{outputTranscription:{text:'cut'}}})
 f.provider.input({serverContent:{interrupted:true,turnComplete:true}})
 f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled();assert.equal(rows.length,2)
 f.provider.input({serverContent:{outputTranscription:{text:'not yet complete'}}})
 f.client.input({type:'hh_anti_stress_pause'});await f.relay.settled()
 assert.equal(rows.length,2)
})
test('failed private log write stops the segment without claiming a reviewed result',async()=>{
 const f=fixture({persistTurn:async()=>{throw Error('synthetic log failure')}})
 f.ready();f.consent();await f.relay.settled()
 f.provider.input({serverContent:{outputTranscription:{text:'Complete'},turnComplete:true}})
 f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.run.clock.days[0].elapsedMs,5000)
 assert.equal(f.provider.readyState,3)
})
