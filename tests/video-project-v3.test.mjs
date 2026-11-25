import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createVideoProjectV2,applyVideoProjectAction} from "../lib/mandala/video-project-v2.mjs";
import {createVideoProjectV3,validateVideoProjectV3,applyVideoProjectV3Action,
  compileVideoProjectV3,resolveVideoFramesV3,resolveAudioMixV3,
  migrateVideoProjectV2ToV3,VIDEO_PROJECT_V3_LIMITS} from "../lib/mandala/video-project-v3.mjs";

const approvedAssets=[
  ...["sky","stream","forest","mountain"].map(id=>({
    id,kind:"video",origin:"catalog",durationMs:30000,path:
      "/videos/holistic-house/original/"+id+".mp4",
    rightsKind:"existing_approved_first_party_master",consentConfirmed:false,loaded:true
  })),
  {id:"voice-file",kind:"audio",origin:"local",durationMs:11000,path:null,
    rightsKind:"user_confirmed",consentConfirmed:true,loaded:true},
  {id:"original-melody",kind:"audio",origin:"catalog",durationMs:10000,
    path:"/audio/mandala/warm-morning.wav",
    rightsKind:"project_generated_original",consentConfirmed:false,loaded:true}
];
const projectAsset=id=>{
  const {kind,origin,durationMs}=approvedAssets.find(a=>a.id===id);
  return {id,kind,origin,durationMs,width:kind==="video"?1280:0,height:kind==="video"?720:0};
};
const clip=(id,assetId,startMs,durationMs,sourceInMs=0,transitionIn="cut")=>({
  id,assetId,startMs,durationMs,sourceInMs,sourceOutMs:30000,
  speed:1,opacityPercent:100,transitionIn,
  transform:{scale:1,x:0,y:0,rotation:0},mask:"none",
});
const source=()=>createVideoProjectV3({projectId:"nle-local",locale:"ru",aspect:"portrait",durationMs:30000});
const build=()=>{
  let p=source();
  p=applyVideoProjectV3Action(p,{type:"set_assets",
    value:["sky","stream","forest","voice-file","original-melody"].map(projectAsset)});
  p=applyVideoProjectV3Action(p,{type:"set_video_tracks",value:[
    {id:"base-video",layer:0,clips:[
      clip("take-one","sky",0,16000),
      clip("take-two","stream",15000,15000,0,"crossfade")]},
    {id:"inset",layer:1,clips:[clip("inset-one","forest",5000,5000)]},
  ]});
  p=applyVideoProjectV3Action(p,{type:"set_audio_tracks",value:[
    {id:"voice",kind:"voice",assetId:"voice-file",startMs:0,durationMs:11000,
      sourceInMs:0,gainPercent:90,loop:false,fadeInMs:100,fadeOutMs:150},
    {id:"melody",kind:"music",assetId:"original-melody",startMs:0,durationMs:30000,
      sourceInMs:0,gainPercent:25,loop:true,fadeInMs:1000,fadeOutMs:1000}
  ]});
  p=applyVideoProjectV3Action(p,{type:"set_text_tracks",value:[{
    id:"subtitles",items:[{id:"caption-1",text:"Мой новый путь",startMs:1000,endMs:5000,
      position:"bottom",style:"cinema",approved:true}]
  }]});
  return p;
};
const tamper=(p,patch)=>JSON.parse(JSON.stringify({...p,...patch}));
const compile=(p=build(),registry=approvedAssets)=>
  compileVideoProjectV3(p,{approvedAssets:registry});

test("immutable V3 starts private and action revisions invalidate prior render claims",()=>{
  const p=source();
  assert.equal(p.schemaVersion,3);
  assert.equal(p.revision,0);
  assert.equal(p.privacy.localOnly,true);
  assert.equal(p.privacy.externalAiConsent,false);
  assert.equal(Object.isFrozen(p),true);
  const next=applyVideoProjectV3Action(p,{type:"set_assets",value:[projectAsset("sky")]});
  assert.equal(next.revision,1);
  assert.equal(p.assets.length,0);
  assert.equal(Object.isFrozen(next.assets[0]),true);
  assert.throws(()=>applyVideoProjectV3Action(next,{type:"set_goal_text",value:"new"},0),
    /mytube_v3_stale_revision/);
  const noChange=applyVideoProjectV3Action(next,{type:"set_assets",value:[projectAsset("sky")]});
  assert.equal(noChange.revision,1);
  const tab=applyVideoProjectV3Action(next,{type:"set_workspace",value:"editor"});
  assert.equal(tab.revision,1);
  assert.equal(tab.activeWorkspace,"editor");
  assert.throws(()=>applyVideoProjectV3Action(next,{type:"payment",value:true}),
    /mytube_v3_unsupported_action/);
});
test("compiled project verifies rights, limits decoder concurrency and is not falsely runnable",()=>{
  const p=build(), plan=compile(p);
  assert.equal(plan.runnable,false);
  assert.equal(plan.engine,"pending_advanced_compositor");
  assert.equal(plan.maxSimultaneousDecoders,2);
  assert.equal(plan.audioTracks.length,2);
  assert.equal(plan.textTracks[0].items[0].approved,true);
  assert.equal(plan.rightsProof.find(a=>a.assetId==="voice-file").sourcePath,null);
  assert.ok(plan.rightsProof.find(a=>a.assetId==="sky").sourcePath.startsWith("/videos/"));
  assert.match(plan.planHash,/^fnv64-[0-9a-f]{16}$/);
  assert.equal(Object.isFrozen(plan.videoTracks[0].clips[0]),true);
  assert.equal(compile(p).planHash,plan.planHash);
  assert.equal(JSON.stringify(plan).includes("Мой новый путь"),true);
});
test("frame resolver handles actual 2-source overlap, crossfade and picture-in-picture clocks",()=>{
  const plan=compile();
  const initial=resolveVideoFramesV3(plan,0);
  assert.equal(initial.length,1);
  assert.equal(initial[0].assetId,"sky");
  assert.equal(initial[0].sourceMs,0);
  const overlay=resolveVideoFramesV3(plan,6000);
  assert.deepEqual(overlay.map(x=>x.assetId),["sky","forest"]);
  assert.deepEqual(overlay.map(x=>x.layer),[0,1]);
  assert.equal(overlay[1].sourceMs,1000);
  const blend=resolveVideoFramesV3(plan,15500);
  assert.deepEqual(blend.map(x=>x.assetId),["sky","stream"]);
  assert.deepEqual(blend.map(x=>x.opacity),[.5,.5]);
  assert.equal(blend[1].sourceMs,500);
  assert.equal(resolveVideoFramesV3(plan,30000).length,0);
  assert.throws(()=>resolveVideoFramesV3(plan,-1),/frame_clock/);
});
test("audio frame resolver applies separate faders, prevents fake voice loops",()=>{
  const plan=compile();
  const at0=resolveAudioMixV3(plan,0);
  assert.deepEqual(at0.map(t=>t.gain),[0,0]);
  const mid=resolveAudioMixV3(plan,5000);
  assert.equal(mid[0].gain,.9);
  assert.equal(mid[1].gain,.25);
  assert.equal(mid[1].sourceMs,5000);
  const afterVoice=resolveAudioMixV3(plan,13000);
  assert.deepEqual(afterVoice.map(t=>t.kind),["music"]);
  assert.equal(afterVoice[0].sourceMs,3000);
  assert.equal(resolveAudioMixV3(plan,30000).length,0);
});
test("unapproved catalogue URLs, unconsented local media and source mismatch fail closed",()=>{
  const p=build();
  assert.throws(()=>compile(p,approvedAssets.filter(a=>a.id!=="sky")),/unapproved_asset/);
  assert.throws(()=>compile(p,approvedAssets.map(a=>a.id==="sky"?
    {...a,path:"https://outside.example/video.mp4"}:a)),/registry_source/);
  assert.throws(()=>compile(p,approvedAssets.map(a=>a.id==="voice-file"?
    {...a,consentConfirmed:false}:a)),/registry_local/);
  assert.throws(()=>compile(p,approvedAssets.map(a=>a.id==="sky"?
    {...a,rightsKind:"unlicensed"}:a)),/registry/);
  assert.throws(()=>validateVideoProjectV3(tamper(p,{privatePhoto:"base64..."})),
    /metadata/);
  assert.throws(()=>validateVideoProjectV3(tamper(p,{privacy:{
    localOnly:false,externalAiConsent:true}})),/metadata/);
});
test("overlap, excessive simultaneous sources, illegal trims and large track counts fail",()=>{
  const p=build();
  const byTrack=p.videoTracks.map(t=>({...t,clips:t.clips.map(s=>({...s}))}));
  byTrack[0].clips[1].transitionIn="cut";
  assert.throws(()=>validateVideoProjectV3(tamper(p,{videoTracks:byTrack})),/video_overlap/);
  const three=[...p.videoTracks,{id:"third-layer",layer:2,clips:[
    clip("extra-one","stream",5000,4000)]}];
  const pp=tamper(p,{videoTracks:three});
  assert.throws(()=>compile(pp),/decoder_budget_exceeded/);
  const bad=p.videoTracks.map(t=>({...t,clips:t.clips.map(s=>({...s}))}));
  bad[1].clips[0].sourceOutMs=2000;
  assert.throws(()=>validateVideoProjectV3(tamper(p,{videoTracks:bad})),/video_clip/);
  assert.throws(()=>validateVideoProjectV3(tamper(p,{
    videoTracks:Array.from({length:9},(_,i)=>({id:"layer-"+i,layer:i,clips:[]}))})),
    /limit/);
  assert.equal(VIDEO_PROJECT_V3_LIMITS.videoClips,24);
});
test("V2 -> V3 migration retains approved scene/order, text and authorized audio without old export claims",()=>{
  const legacyShots=["sky","stream","forest","mountain"].map((sceneId,i)=>({
    sceneId,startMs:i*5000,durationMs:5000
  }));
  let p=createVideoProjectV2({projectId:"legacy-a",locale:"ru",goalText:"Новая жизнь"});
  p=applyVideoProjectAction(p,{type:"set_film",film:{
    presetId:"film-a",aspect:"landscape",durationMs:20000,shots:legacyShots}});
  p=applyVideoProjectAction(p,{type:"approve_phrases",
    confirmed:true,items:["Я могу выбирать"]});
  p=applyVideoProjectAction(p,{type:"set_audio",trackId:"original-melody",volumePercent:45});
  const migrated=migrateVideoProjectV2ToV3(p,{approvedAssets});
  assert.equal(migrated.schemaVersion,3);
  assert.equal(migrated.revision,p.revision);
  assert.deepEqual(migrated.videoTracks[0].clips.map(x=>x.assetId),
    legacyShots.map(x=>x.sceneId));
  assert.deepEqual(migrated.approvedPhrases,["Я могу выбирать"]);
  assert.equal(migrated.audioTracks[0].gainPercent,45);
  assert.equal(migrated.export.state,"idle");
  assert.equal(migrated.renderApproval.planHash,null);
  const unavailable=approvedAssets.filter(a=>a.id!=="original-melody");
  assert.throws(()=>migrateVideoProjectV2ToV3(p,{approvedAssets:unavailable}),
    /migration_audio_not_approved/);
});
test("unapproved text cannot enter a final render and an old binary cannot be certified",()=>{
 const p=build();
 const copied=tamper(p,{textTracks:[{id:"subtitles",items:[
   {id:"caption-1",text:"Unapproved",startMs:0,endMs:3000,
     position:"bottom",style:"classic",approved:false}]}]});
 assert.throws(()=>validateVideoProjectV3(copied),/text_item/);
 const forged=tamper(p,{export:{state:"ready",planHash:"fnv64-0123456789abcdef",
   artifact:{mime:"video/mp4",bytes:3000,validatedPlayback:true,validatedAudio:true}}});
 assert.throws(()=>validateVideoProjectV3(forged),/export_state/);
});
test("model has no server export, network, payment or new preview renderer",()=>{
 const sourceCode=readFileSync(new URL("../lib/mandala/video-project-v3.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(sourceCode,/\bfetch\s*\(|createObjectURL\s*\(|navigator\.mediaDevices/);
 assert.match(sourceCode,/runnable:false/);
 assert.match(sourceCode,/pending_advanced_compositor/);
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(studio,/paintCinematicFrame\(/);
 assert.match(studio,/encodeLocalWebCodecsMp4\(/);
});
