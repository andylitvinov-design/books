import test from 'node:test';
import assert from 'node:assert/strict';
import {videoRenderFingerprint} from "../lib/mandala/render-plan-v2.mjs";
import {EXPRESS_READY_INDEX_VERSION,chooseExactExpressReadyMaster,isVerifiedExpressMaster}
  from '../lib/mandala/express-ready-master.mjs';
const scenes=['one-scene','two-scene','third-scene','fourth-scene','fifth-scene','sixth-scene'];
const plan={version:'hh-render-plan-v2',projectId:'guest-preview',projectRevision:0,
  privacy:{localOnly:true,externalProviderApproved:false},
  presetId:'gentle-rest',durationMs:30000,
  requestedTarget:{aspect:'portrait',width:720,height:1280,fps:24},
  shots:scenes.map(sceneAssetId=>({sceneAssetId})),
  audioTracks:[{assetId:'harmony'}],captions:[]};
const canonicalPlan={...plan,planHash:videoRenderFingerprint(plan)};
const master={id:'gentle-rest-en-9x16',status:'verified',
  path:'/videos/holistic-house/express-v1/gentle-rest-en-9x16.mp4',
  locale:'en',planHash:canonicalPlan.planHash,presetId:plan.presetId,
  durationMs:plan.durationMs,verifiedDurationMs:29998,aspect:'portrait',
  sceneIds:scenes,audioIds:['harmony'],captioned:false,
  width:720,height:1280,fps:25,videoCodec:'h264',pixelFormat:'yuv420p',
  audioCodec:'aac',bytes:2500000,sha256:'a'.repeat(64),
  proofVersion:'ffprobe-ffmpeg-verified-v1'};
const index={version:EXPRESS_READY_INDEX_VERSION,masters:[master]};
const result=(p=canonicalPlan,i=index,locale='en')=>chooseExactExpressReadyMaster({plan:p,index:i,locale});

test('exact pre-rendered 30s six-scene MP4 bypasses iPhone encoder',()=>{
  const v=result();assert.equal(v.strategy,'ready_master');
  assert.equal(v.master.url,master.path);assert.deepEqual(v.master.sourceIds,scenes);
  assert.equal(v.master.durationMs,30000);assert.equal(v.master.mime,'video/mp4');
});
test('rejects fake verification and raw stock source posing as finished film',()=>{
  for(const edit of [
    {status:'planned'}, {proofVersion:'owner-review-only'}, {sha256:'invalid'},
    {path:'/videos/holistic-house/film-collection-v3/gentle-rest.mp4'},
    {audioCodec:'none'},{width:540},{fps:8},{bytes:30*1024*1024},
    {sceneIds:[scenes[0],scenes[0],...scenes.slice(2)]},{verifiedDurationMs:27900},
    {videoCodec:'vp9'},{pixelFormat:'yuv420p10le'},
  ]){
    assert.equal(isVerifiedExpressMaster({...master,...edit}),false,JSON.stringify(edit));
    assert.equal(result(canonicalPlan,{version:EXPRESS_READY_INDEX_VERSION,
      masters:[{...master,...edit}]}).strategy,'render_required');
  }
});
test('never drops a personal text or different soundtrack, locale, aspect, duration, scene',()=>{
  const modified=[
    {...canonicalPlan,planHash:'fnv64-abcdefabcdefabcd'},
    {...canonicalPlan,projectId:'personal-private'},
    {...canonicalPlan,projectRevision:1},
    {...canonicalPlan,captions:[{text:'Custom affirmation'}]},
    {...canonicalPlan,audioTracks:[]},
    {...canonicalPlan,audioTracks:[{assetId:'meditation'}]},
    {...canonicalPlan,shots:[...plan.shots].reverse()},
    {...canonicalPlan,durationMs:20000},
    {...canonicalPlan,requestedTarget:{aspect:'landscape',width:1280,height:720}},
    {...canonicalPlan,privacy:{localOnly:false}},
  ];
  for(const p of modified)assert.equal(result(p).strategy,'render_required');
  assert.equal(result(canonicalPlan,{version:EXPRESS_READY_INDEX_VERSION,masters:[{...master,sceneIds:[...scenes].reverse()}]}).strategy,'render_required');
  assert.equal(result(canonicalPlan,index,'ru').strategy,'render_required');
  assert.equal(result(canonicalPlan,{version:EXPRESS_READY_INDEX_VERSION,masters:[]}).strategy,'render_required');
});
test('malformed/missing catalog never leads to a stock fallback',()=>{
  assert.equal(result(canonicalPlan,null).reason,'NO_VERIFIED_MASTERS');
  assert.equal(result(null).reason,'PLAN_NOT_EXPRESS_CANONICAL');
  const duplicate={...plan,shots:[plan.shots[0],plan.shots[0],...plan.shots.slice(2)]};
  assert.equal(result({...duplicate,planHash:videoRenderFingerprint(duplicate)}).reason,'PLAN_SOURCES_INVALID');
});
