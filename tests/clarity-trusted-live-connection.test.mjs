import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import {createClarityRun,advanceClarityRun,clarityRunSummary,clarityRunCredentialWindow} from '../lib/coaching/clarity-course-runs.mjs'
import {bindClarityTrustedLiveConnection} from '../lib/coaching/clarity-trusted-live-connection.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
class Socket extends EventEmitter{
 constructor(){super();this.readyState=1;this.bufferedAmount=0;this.messages=[];this.pings=[]}
 send(value){this.messages.push(JSON.parse(value))}
 ping(value){this.pings.push(value)}
 close(code=1000){if(this.readyState===3)return;this.readyState=3;this.emit('close',code)}
 input(value){this.emit('message',JSON.stringify(value))}
 pong(){this.emit('pong',Buffer.from(this.pings.at(-1)))}
}
function fixture({beforePersist=async()=>{},segmentBudgetMs=null,previousRun=null}={}){
 const base=previousRun?previousRun.clock.lastEventAt+1000:1795100000000,client=new Socket(),provider=new Socket(),protocolId=id(2)
 let run=previousRun||createClarityRun({id:id(1),ordinal:1,access:'free',protocolIds:[protocolId,id(3),id(4)],createdAt:base})
 const previousCredentialExpiresAt=previousRun?base:null
 const lease={leaseId:previousRun?id(11):id(10),run,day:1,protocolId,now:base,previousCredentialExpiresAt,
  ...clarityRunCredentialWindow(run,{day:1,protocolId,now:base,previousCredentialExpiresAt})}
 let now=base,seq=previousRun?200:20,tid=0;const timers=new Map(),events=[],retirements=[]
 const relay=bindClarityTrustedLiveConnection({client,provider,lease,coachId:'mira',setup:{setup:{model:'synthetic'}},segmentDeadlineMs:segmentBudgetMs===null?null:base+segmentBudgetMs,clock:()=>now,uuid:()=>id(++seq),
  schedule:(fn,ms)=>{timers.set(++tid,{fn,at:now+ms});return tid},cancel:key=>timers.delete(key),
  retireLease:async binding=>{retirements.push({binding,status:run.clock.days[0].status,elapsed:run.clock.days[0].elapsedMs})},
  persist:async e=>{events.push(e);await beforePersist(e);run=advanceClarityRun(run,e);return clarityRunSummary(run)}})
 function advance(ms){now+=ms;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.fn()}}
 const ready=()=>provider.input({setupComplete:{}})
 const consent=()=>client.input({type:'hh_clarity_consent',decision:previousRun?'continue':'start'})
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
 const cues=()=>f.provider.messages.filter(m=>m.clientContent?.turnComplete===false)
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


test('hosting segment deadline pauses the same logical protocol without completing or crediting unobserved time',async()=>{
 const f=fixture({segmentBudgetMs:270000});f.ready();f.consent();await f.relay.settled()
 const original=f.run.protocolIds[0]
 for(let i=0;i<53;i++){f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()}
 assert.equal(f.run.clock.days[0].elapsedMs,265000)
 f.advance(5000);await f.relay.settled()
 assert.equal(f.provider.readyState,3);assert.equal(f.client.readyState,3)
 assert.equal(f.run.protocolIds[0],original)
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.run.clock.days[0].elapsedMs,265000)
 assert.equal(f.events.at(-1).type,'pause')
 assert.equal(f.retirements.length,1)
 assert.equal(f.client.messages.at(-1).status,'paused')
})

test('one trusted spoken start follows committed consent and ACK; resume retains protocol without replay',async()=>{
 const f=fixture(),order=[]
 const clientSend=f.client.send.bind(f.client),providerSend=f.provider.send.bind(f.provider)
 f.client.send=value=>{if(JSON.parse(value).type==='hh_clarity_clock')order.push('ack');clientSend(value)}
 f.provider.send=value=>{if(JSON.parse(value).clientContent?.turnComplete===true)order.push('spoken');providerSend(value)}
 const speech=s=>s.messages.filter(m=>m.clientContent?.turnComplete===true)
 f.ready();assert.equal(speech(f.provider).length,0)
 f.consent();await f.relay.settled()
 assert.deepEqual(order,['ack','spoken'])
 assert.equal(speech(f.provider).length,1)
 assert.match(speech(f.provider)[0].clientContent.turns[0].parts[0].text,/APPLICATION START EVENT/)
 f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()
 f.client.input({type:'hh_clarity_change_coach'});await f.relay.settled()
 const g=fixture({previousRun:f.run})
 g.ready();assert.equal(g.client.messages.at(-1).decision,'continue')
 g.consent();await g.relay.settled()
 assert.equal(g.run.clock.days[0].protocolId,f.run.clock.days[0].protocolId)
 assert.equal(g.run.clock.days[0].elapsedMs,5000)
 assert.equal(speech(g.provider).length,1)
 assert.match(speech(g.provider)[0].clientContent.turns[0].parts[0].text,/APPLICATION CONTINUATION EVENT/)
 assert.match(speech(g.provider)[0].clientContent.turns[0].parts[0].text,/Never claim to remember facts you cannot access/)
 g.consent();await g.relay.settled()
 assert.equal(speech(g.provider).length,1)
 assert.equal(g.run.clock.days[0].status,'paused')
})
test('failed delivery of start ACK stops without opening speech or adding time',async()=>{
 const f=fixture();f.ready()
 f.client.send=()=>{throw Error('synthetic closed client')}
 f.consent();await f.relay.settled()
 assert.equal(f.provider.messages.filter(m=>m.clientContent?.turnComplete===true).length,0)
 assert.equal(f.run.clock.days[0].status,'paused')
 assert.equal(f.run.clock.days[0].elapsedMs,0)
 assert.equal(f.provider.readyState,3)
})


test('relay backpressure stops both sockets and preserves only durably observed time',async()=>{
 const audio={realtimeInput:{audio:{data:'AAAAAA==',mimeType:'audio/pcm;rate=16000'}}}
 for(const side of ['client','provider']){
  const f=fixture();f.ready();f.consent();await f.relay.settled()
  f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()
  assert.equal(f.run.clock.days[0].elapsedMs,5000)
  f.advance(5000);f.client.pong();f[side].bufferedAmount=200001;f.provider.pong();await f.relay.settled()
  assert.equal(f.run.clock.days[0].elapsedMs,5000);assert.equal(f.run.clock.days[0].status,'paused')
  assert.equal(f.client.readyState,3);assert.equal(f.provider.readyState,3)
 }
 const g=fixture();g.ready();g.consent();await g.relay.settled()
 const before=g.provider.messages.length;g.provider.bufferedAmount=200001;g.client.input(audio);await g.relay.settled()
 assert.equal(g.provider.messages.length,before);assert.equal(g.run.clock.days[0].status,'paused')
 const h=fixture();h.ready();h.consent();await h.relay.settled()
 const delivered=h.client.messages.length;h.client.bufferedAmount=200001;h.provider.input({serverContent:{turnComplete:true}});await h.relay.settled()
 assert.equal(h.client.messages.length,delivered);assert.equal(h.run.clock.days[0].status,'paused')
})


test('two host segments reach exactly 20 active minutes despite setup and consent delays',async()=>{
 const f=fixture({segmentBudgetMs:770000});f.advance(20000);f.ready();f.consent();await f.relay.settled()
 for(let i=0;i<149;i++){f.advance(5000);f.client.pong();f.provider.pong();await f.relay.settled()}
 f.advance(5000);await f.relay.settled()
 assert.equal(f.run.clock.days[0].status,'paused');assert.equal(f.run.clock.days[0].elapsedMs,745000)
 const g=fixture({previousRun:f.run,segmentBudgetMs:770000})
 g.advance(20000);g.ready();g.consent();await g.relay.settled()
 assert.equal(g.run.clock.days[0].elapsedMs,745000,'setup must not count as coaching')
 for(let i=0;i<91;i++){g.advance(5000);g.client.pong();g.provider.pong();await g.relay.settled()}
 assert.equal(g.run.clock.days[0].elapsedMs,1200000)
 assert.equal(g.run.clock.days[0].status,'time_limit')
 assert.equal(g.run.protocolIds[0],f.run.protocolIds[0])
 assert.equal(g.provider.readyState,3);assert.equal(g.client.readyState,3)
 assert.equal(g.client.messages.at(-1).status,'time_limit')
 assert.equal(g.retirements.length,1)
})
