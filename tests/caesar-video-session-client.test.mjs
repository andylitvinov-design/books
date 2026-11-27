import test from 'node:test'
import assert from 'node:assert/strict'
import {createCaesarVideoSession} from '../lib/coaching/caesar-video-session-client.mjs'
const id='22222222-2222-4222-8222-222222222222'
const grant={allowed:true,provider:'simli',target:'coach',sessionId:id,sessionToken:'synthetic',maxVideoSeconds:300}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
function fixture({getGrant=async()=>grant,end=async()=>({allowed:true,state:'settled'}),ready=Promise.resolve(),live=()=>true,onState=()=>{}}={}){
  const events=[],timers=new Map(),states=[];let clock=0,serial=0,disconnect,frameFailure
  const media=()=>({muted:false,srcObject:{},pause(){events.push('pause')}})
  const video=media(),audio=media()
  const session=createCaesarVideoSession({video,audio,now:()=>clock,setTimer:(fn,delay)=>{timers.set(++serial,{fn,deadline:clock+delay});return serial},clearTimer:key=>timers.delete(key),
    onState:s=>{states.push(s);onState(s)},requestStart:async body=>{events.push(['start',body]);return getGrant()},requestEnd:async body=>{events.push(['end',body]);return end()},
    connect:async options=>{events.push(['connect',options.sessionToken]);disconnect=options.onDisconnect;return {stop:async()=>events.push('renderer-stop')}},
    watch:(_video,{onFailure})=>{frameFailure=onFailure;return {ready,isLive:live,stop:()=>events.push('watch-stop')}},
    createRelay:()=>({schedule:()=>events.push('pcm'),clear:()=>events.push('clear'),close:()=>events.push('relay-close')})})
  function advance(ms){clock+=ms;for(const [key,t] of [...timers])if(t.deadline<=clock){timers.delete(key);t.fn()}}
  return {session,events,states,video,audio,advance,disconnect:()=>disconnect(),frameFailure:()=>frameFailure()}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
test('explicit separate consent; no automatic allocation on creation',async()=>{
  const f=fixture();assert.deepEqual(f.events,[]);assert.equal(await f.session.start(),false);assert.deepEqual(f.events,[])
})
test('provider must grant Caesar; wrong role, excessive duration and missing ID cannot open media',async()=>{
  for(const g of [{...grant,target:'chatbot'},{...grant,maxVideoSeconds:301},{...grant,sessionId:'bad'}]){
    const f=fixture({getGrant:async()=>g});assert.equal(await f.session.start({consent:true}),false);await flush()
    assert.ok(!f.events.some(x=>x[0]==='connect'));assert.notEqual(f.session.getState(),'playing')
  }
})
test('real advancing-frame evidence gates playing and assistant PCM; original voice remains muted on avatar media',async()=>{
  const frames=deferred(),f=fixture({ready:frames.promise}),s=f.session.start({consent:true});await flush()
  assert.equal(f.session.getState(),'connecting');assert.equal(f.session.schedule(new Float32Array(1),0,{}),false)
  frames.resolve();assert.equal(await s,true);assert.equal(f.session.getState(),'playing');assert.equal(f.video.muted,true);assert.equal(f.audio.muted,true)
  assert.deepEqual(f.events[0],['start',{action:'start',nonSensitiveConsent:true,privacyConsentVersion:'caesar-video-v1'}])
  assert.equal(f.session.schedule(new Float32Array(1),0,{}),true);f.session.clear();assert.ok(f.events.includes('pcm'));assert.ok(f.events.includes('clear'));await f.session.stop()
  assert.deepEqual(f.events.find(x=>x[0]==='end'),['end',{action:'end',sessionId:id}]);assert.equal(f.session.getState(),'ended');assert.equal(f.video.srcObject,null)
})
test('video deadline includes startup and uses actual shorter server allowance',async()=>{
  const pending=deferred(),f=fixture({getGrant:()=>pending.promise}),start=f.session.start({consent:true});f.advance(2000)
  pending.resolve({...grant,maxVideoSeconds:5});assert.equal(await start,true);assert.equal(f.session.remainingSeconds(),3)
  f.advance(3000);await flush();assert.equal(f.session.getState(),'ended');assert.ok(f.events.includes('renderer-stop'));assert.equal(f.session.schedule(new Float32Array(1),0,{}),false)
})
test('close during mint never attaches late media and still settles the grant',async()=>{
  const pending=deferred(),f=fixture({getGrant:()=>pending.promise}),start=f.session.start({consent:true});const stop=f.session.stop()
  pending.resolve(grant);assert.equal(await start,false);assert.equal(await stop,'ended');assert.ok(!f.events.some(x=>x[0]==='connect'));assert.deepEqual(f.events.find(x=>x[0]==='end'),['end',{action:'end',sessionId:id}])
})
test('failed frames shut down video without any coaching-session action',async()=>{
  const f=fixture();assert.equal(await f.session.start({consent:true}),true);f.frameFailure();await flush();assert.equal(f.session.getState(),'failed');assert.equal(f.video.srcObject,null);assert.ok(f.events.includes('relay-close'))
})
test('ambiguous provider stop blocks a new grant rather than spending twice',async()=>{
  const f=fixture({end:async()=>({allowed:true,state:'uncertain'})});assert.equal(await f.session.start({consent:true}),true);f.disconnect();await flush()
  assert.equal(f.session.getState(),'unconfirmed');assert.equal(await f.session.start({consent:true}),false);assert.equal(f.events.filter(x=>x[0]==='start').length,1)
})
test('explicit refusal is not a session; lost grant response is unconfirmed',async()=>{
  const no=fixture({getGrant:async()=>({allowed:false,code:'UNAVAILABLE'})});assert.equal(await no.session.start({consent:true}),false);await flush();assert.equal(no.session.getState(),'unavailable')
  const lost=fixture({getGrant:async()=>{throw Error('lost')}});assert.equal(await lost.session.start({consent:true}),false);await flush();assert.equal(lost.session.getState(),'unconfirmed');assert.equal(await lost.session.start({consent:true}),false)
})
test('close and disposal are idempotent, and disposed adapter cannot start',async()=>{
  const f=fixture();await f.session.start({consent:true});await Promise.all([f.session.stop(),f.session.stop(),f.session.dispose()]);assert.equal(f.events.filter(x=>x[0]==='end').length,1);assert.equal(await f.session.start({consent:true}),false)
})
test('reentrant cancellation before request or during stopping cannot allocate a late grant',async()=>{
  let f;f=fixture({onState:state=>{if(state==='connecting'||state==='stopping')void f.session.stop()}})
  assert.equal(await f.session.start({consent:true}),false);await flush();assert.equal(f.session.getState(),'ended');assert.ok(!f.events.some(x=>x[0]==='start'))
})
