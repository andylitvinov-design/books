import test from 'node:test';
import assert from 'node:assert/strict';
import {compileVerifiedRenderPlanV2,videoRenderFingerprint} from '../lib/mandala/render-plan-v2.mjs';

function fixture(count=6){
  const seconds=count===5?6:5;
  const scenes=Array.from({length:count},(_,i)=>({
    id:'verified-scene-'+(i+1),theme:'health',collection:'film-collection-v3',
    status:'approved',media:'licensed_mp4',tags:['light','calm'],motifs:['light'],
    rightsReference:{kind:'dareful_cc_by_4_0'},width:720,height:1280,
    allowedAspects:['portrait'],verifiedDurationMs:seconds*1000,
    originMasterKeys:['first-party-master-'+(i+1)],
    video:'/videos/holistic-house/film-collection-v3/verified-scene-'+(i+1)+'.mp4',
  }));
  const shots=scenes.map((source,i)=>({
    number:i+1,sceneId:source.id,assetPath:source.video,
    startSeconds:i*seconds,durationSeconds:seconds,captionText:'',
  }));
  return {scenes,scenario:{
    version:'hh-executable-video-scenario-v1',readyToExecute:true,
    paidRenderApproved:false,noExternalClientData:true,
    shotCount:count,shots,durationSeconds:count*seconds,aspect:'portrait',
    presetId:'gentle-rest',rendering:{quality:'hd'},
    audio:{kind:'silent',trackId:'none',volumePercent:75}
  }};
}
test('original trusted four-shot scenario remains byte-stable in plan shape',()=>{
  const f=fixture(4),p=compileVerifiedRenderPlanV2(f);
  assert.equal(p.shots.length,4);
  assert.equal(p.durationMs,20000);
  assert.equal(p.requestedTarget.width,720);
  assert.equal(p.requestedTarget.height,1280);
  const {planHash,...body}=p;
  assert.equal(planHash,videoRenderFingerprint(body));
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.shots));
});
test('five distinct verified original masters compile into 30s H264-ready planning',()=>{
  const f=fixture(5),p=compileVerifiedRenderPlanV2(f);
  assert.equal(p.shots.length,5);
  assert.equal(p.durationMs,30000);
  assert.equal(p.shots[4].startMs,24000);
  assert.deepEqual(p.shots.map(x=>x.sceneAssetId),f.scenes.map(x=>x.id));
});
test('six reviewed, duration-verified film sources compile without changing scene identity',()=>{
  const f=fixture(6);
  f.scenario.shots[2].captionText='I can give myself time.';
  const p=compileVerifiedRenderPlanV2(f);
  assert.equal(p.shots.length,6);
  assert.equal(p.captions.length,1);
  assert.equal(p.shots[5].startMs,25000);
  assert.equal(p.durationMs,30000);
  assert.deepEqual(p.rightsProof.map(x=>x.sceneId),f.scenes.map(x=>x.id));
  const {planHash,...body}=p;
  assert.equal(planHash,videoRenderFingerprint(body));
});
test('six-shot paths require real encoded-source durations and distinct original footage',()=>{
  const a=fixture(6);delete a.scenes[1].verifiedDurationMs;
  assert.throws(()=>compileVerifiedRenderPlanV2(a),/render_plan_source_duration_unverified/);
  const b=fixture(6);b.scenes[2].verifiedDurationMs=4000;
  assert.throws(()=>compileVerifiedRenderPlanV2(b),/render_plan_source_duration_unverified/);
  const c=fixture(6);c.scenes[3].originMasterKeys=['first-party-master-1'];
  assert.throws(()=>compileVerifiedRenderPlanV2(c),/render_plan_reused_origin/);
  const d=fixture(6);d.scenario.shots[4].number=4;
  assert.throws(()=>compileVerifiedRenderPlanV2(d),/render_plan_invalid_shot_order/);
});
test('no unapproved photos, foreign URLs, duplicate scene IDs or incorrect shot count',()=>{
  const a=fixture(6);a.scenario.shots[0].assetPath='https://unknown.example/file.mp4';
  assert.throws(()=>compileVerifiedRenderPlanV2(a),/render_plan_invalid_timeline/);
  const b=fixture(6);b.scenario.shots[3].sceneId=b.scenario.shots[0].sceneId;
  assert.throws(()=>compileVerifiedRenderPlanV2(b),/render_plan_unlicensed_scene/);
  const c=fixture(6);c.scenario.shotCount=4;
  assert.throws(()=>compileVerifiedRenderPlanV2(c),/render_plan_invalid_input/);
  const d=fixture(6);d.scenes[0].status='draft';
  assert.throws(()=>compileVerifiedRenderPlanV2(d),/render_plan_unlicensed_scene/);
  const e=fixture(6);e.scenario.paidRenderApproved=true;
  assert.throws(()=>compileVerifiedRenderPlanV2(e),/render_plan_invalid_input/);
  const f=fixture(6);f.scenario.shots[0].captionText='x'.repeat(181);
  assert.throws(()=>compileVerifiedRenderPlanV2(f),/render_plan_invalid_caption/);
  const g=fixture(6);g.scenario.shots[5].startSeconds=28;
  assert.throws(()=>compileVerifiedRenderPlanV2(g),/render_plan_invalid_timeline/);
});
