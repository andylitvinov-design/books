import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  resolveLicensedSourceFrame,assessLicensedSourceFrame,
  validateLicensedSourcePlayback,LICENSED_SOURCE_SPEEDS
} from "../lib/mandala/free-film-source-clock.mjs";
import {createMyTubeEditorDraft,parseMyTubeEditorDraft} from "../lib/mandala/creative-editor-draft.mjs";
import {recordMyTubeEditorUndo,emptyMyTubeEditorHistory} from "../lib/mandala/creative-editor-history.mjs";
const sceneIds=["approved-a","approved-b","approved-c","approved-d"];
const lengths=[5,7,10,8];
const shots=sceneIds.map((sceneId,i)=>({
  sceneId,startSeconds:lengths.slice(0,i).reduce((sum,v)=>sum+v,0),
  durationSeconds:lengths[i],
}));
const storyboard=(patch,i=1)=>({durationSeconds:30,
  shots:shots.map((shot,j)=>j===i?{...shot,...patch}:shot)});
const allowlists={approvedSceneIds:sceneIds,approvedPresetIds:["licensed-preset"]};
const draft=()=>({presetId:"licensed-preset",aspect:"landscape",durationSeconds:30,
  shots:shots.map(x=>({...x,overlayText:""})),captions:null,audioStartSeconds:0});

test("approved slip phase shifts the actual source frame without changing film length",()=>{
  const plan=storyboard({sourcePhasePercent:25,sourceSpeed:1.5});
  const a=resolveLicensedSourceFrame(plan,5,10);
  const b=resolveLicensedSourceFrame(plan,5.25,10);
  const c=resolveLicensedSourceFrame(plan,10.25,10);
  assert.equal(a.expectedSourceSeconds,2.5);
  assert.equal(b.expectedSourceSeconds,2.875);
  assert.equal(c.expectedSourceSeconds,10.375%10);
  assert.equal(b.sourceSpeed,1.5);
  assert.equal(b.sourcePhasePercent,25);
  assert.equal(c.sceneId,"approved-b");
  assert.equal(plan.durationSeconds,30);
  assert.equal(assessLicensedSourceFrame({
    readyState:4,error:null,seeking:false,videoWidth:1280,videoHeight:720,currentTime:2.9
  },b).status,"ready");
});
test("natural media loop remains continuous across slip start + fast speed",()=>{
  const plan=storyboard({sourcePhasePercent:50,sourceSpeed:1.25});
  const shot=resolveLicensedSourceFrame(plan,9,5);
  assert.equal(shot.expectedSourceSeconds,2.5);
  const drift=assessLicensedSourceFrame({
    readyState:4,error:null,seeking:false,videoWidth:1280,videoHeight:720,currentTime:3.4
  },shot);
  assert.equal(drift.status,"drift");
});
test("untrusted speed, negative phase and in/out + phase mixing fail closed",()=>{
  for(const value of [-1,.1,96,Infinity,NaN,"50",null]){
    assert.throws(()=>validateLicensedSourcePlayback(value,1),/invalid_licensed_source_playback/);
  }
  for(const value of [-1,0,.5,1.1,5,"2",NaN]){
    assert.throws(()=>validateLicensedSourcePlayback(0,value),/invalid_licensed_source_playback/);
  }
  assert.deepEqual([...LICENSED_SOURCE_SPEEDS],[.75,1,1.25,1.5]);
  for(const patch of [
    {sourcePhasePercent:120},
    {sourceSpeed:-1},
    {sourcePhasePercent:15,sourceInSeconds:2},
    {sourcePhasePercent:20,sourceOutSeconds:4}
  ]){
    assert.throws(()=>resolveLicensedSourceFrame(storyboard(patch),5,10),
      /invalid_licensed_source_/);
  }
});
test("old drafts remain valid; new source speed and start are license-bounded",()=>{
  const plain=createMyTubeEditorDraft(draft(),allowlists);
  assert.equal(parseMyTubeEditorDraft(plain,allowlists).shots[0].sourceSpeed,undefined);
  const customized=draft();
  customized.shots[2].sourceSpeed=.75;
  customized.shots[2].sourcePhasePercent=40;
  const encoded=createMyTubeEditorDraft(customized,allowlists);
  assert.equal(parseMyTubeEditorDraft(encoded,allowlists).shots[2].sourceSpeed,.75);
  assert.equal(parseMyTubeEditorDraft(encoded,allowlists).shots[2].sourcePhasePercent,40);
  const bad=JSON.parse(encoded);
  bad.shots[2].sourceSpeed=99;
  assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify(bad),allowlists),/mytube_draft_shot_/);
  bad.shots[2].sourceSpeed=.75;
  bad.shots[2].sourcePhasePercent=null;
  assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify(bad),allowlists),/mytube_draft_shot_/);
  bad.shots[2].sourcePhasePercent=40;
  bad.shots[2].sourcePath="https://external.invalid/video.mp4";
  assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify(bad),allowlists),/mytube_draft_shot_/);
});
test("one slider gesture is one bounded undo history entry",()=>{
  let h=emptyMyTubeEditorHistory();
  h=recordMyTubeEditorUndo(h,{phase:0},"source-timing:2",100);
  h=recordMyTubeEditorUndo(h,{phase:5},"source-timing:2",250);
  assert.equal(h.past.length,1);
  h=recordMyTubeEditorUndo(h,{phase:10},"source-timing:2",800);
  assert.equal(h.past.length,2);
});
test("same licensed source clock, real decoder speed and export invalidation are wired",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const timeline=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
 assert.match(studio,/const framePosition=resolveLicensedSourceFrame/);
 assert.match(studio,/video\.playbackRate=frame\.sourceSpeed/);
 assert.match(studio,/shot\.sourcePhasePercent\?\?0,shot\.sourceSpeed\?\?1/);
 assert.match(studio,/onSetShotSourceTiming=\{/);
 assert.match(studio,/recordBeforeEditorChange\("source-timing:"\+index\)/);
 assert.match(timeline,/data-video-timeline-source-phase/);
 assert.match(timeline,/data-video-timeline-source-speed/);
 assert.match(studio,/encodeLocalWebCodecsMp4\(/);
 assert.match(studio,/new MediaRecorder\(/);
});
