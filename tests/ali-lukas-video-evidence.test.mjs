import test from 'node:test'
import assert from 'node:assert/strict'
import {createVideoFrameEvidence,hasLukasVideoTrack,watchLukasVideo} from '../lib/coaching/lukas-video-evidence.mjs'
import {ownerLukasVideoCheckReady,ownerLukasVideoCheckRequestAllowed,LUKAS_VIDEO_CHECK_TEXT,ownerSimliDialogueReady} from '../lib/coaching/live-avatar-pilot.mjs'
test('no video readiness from token, audio only or a single frozen frame',()=>{
  let t=0
  const gate=createVideoFrameEvidence({now:()=>t})
  gate.observe(0,false)
  assert.equal(gate.live(false),false)
  gate.observe(1,true);gate.observe(1,true)
  assert.equal(gate.live(true),false)
  t=5000;assert.equal(gate.expired(),true)
})
test('two advancing frames and a live remote track are required; stall fails closed',()=>{
  let t=0
  const gate=createVideoFrameEvidence({now:()=>t})
  gate.observe(10,true);t=30;gate.observe(11,true);t=60;assert.equal(gate.observe(12,true),true)
  assert.equal(gate.live(true),true);assert.equal(gate.live(false),false)
  t=3060;assert.equal(gate.expired(),true);assert.equal(gate.live(true),false)
})
test('live track must be playing, decoded, present and not muted',()=>{
  const track={readyState:'live',muted:false}
  const video={srcObject:{getVideoTracks:()=>[track]},videoWidth:640,videoHeight:480,readyState:2,paused:false,ended:false}
  assert.equal(hasLukasVideoTrack(video),true)
  video.paused=true;assert.equal(hasLukasVideoTrack(video),false)
  video.paused=false;track.muted=true;assert.equal(hasLukasVideoTrack(video),false)
  track.muted=false;track.readyState='ended';assert.equal(hasLukasVideoTrack(video),false)
  assert.equal(hasLukasVideoTrack({srcObject:{getVideoTracks:()=>[]}}),false)
})
test('browser frame callback path requires advancement and stops on video track loss',async()=>{
  let callback,id=0,failed=0,t=0
  const track={readyState:'live',muted:false}
  const video={srcObject:{getVideoTracks:()=>[track]},videoWidth:640,videoHeight:480,readyState:2,paused:false,ended:false,
    requestVideoFrameCallback(fn){callback=fn;return ++id},cancelVideoFrameCallback(){}}
  const watcher=watchLukasVideo(video,{now:()=>t,onFailure:()=>failed++})
  try{
    t=33;callback();t=66;callback();await watcher.ready
    assert.equal(watcher.isLive(),true)
    track.readyState='ended';t=100;callback()
    assert.equal(watcher.isLive(),false);assert.equal(failed,1)
  }finally{watcher.stop()}
})
test('synthetic video check cannot grant dialogue or submit custom text or private history',()=>{
  const env={SIMLI_API_KEY:'fake',HH_COACH_AVATAR_PILOT:'owner-free-only',HH_SIMLI_FREE_ACCOUNT_VERIFIED:'true',NEXT_PUBLIC_HH_LUKAS_VIDEO_CHECK:'true'}
  assert.equal(ownerLukasVideoCheckReady(env),true)
  assert.equal(ownerSimliDialogueReady(env),false)
  assert.equal(ownerLukasVideoCheckReady({}),false)
  const body={action:'lukas-check-audio',target:'chatbot',locale:'ru',freeOnly:true,syntheticOnly:true}
  assert.equal(ownerLukasVideoCheckRequestAllowed(body),true)
  for(const bad of [{...body,text:'anything'},{...body,history:[]},{...body,locale:'constructor'},{...body,target:'coach'},{...body,syntheticOnly:false}])assert.equal(ownerLukasVideoCheckRequestAllowed(bad),false)
  assert.equal(Object.keys(LUKAS_VIDEO_CHECK_TEXT).length,3)
})
