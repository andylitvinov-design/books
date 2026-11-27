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
 assert.match(route,/export const maxDuration=300/)
 assert.match(route,/const segmentDeadlineMs=Date\.now\(\)\+270000/)
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
