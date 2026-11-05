import test from "node:test";
import "./mandala-real-audio-waveform.test.mjs"; // Existing video Specialist CI; no new runner.
import "./video-project-v3.test.mjs"; // Existing Mandala CI gate; V3 stays contract-only.
import "./mandala-smart-captions.test.mjs"; // Reuse the existing Mandala specialist job; no new CI runner.
import "./mandala-music-bed.test.mjs"; // Reuse existing focused Mandala tests.
import "./mandala-source-slip-speed.test.mjs"; // Same licensed-media CI; no extra runner.
import "./mandala-creative-editor-keyframes.test.mjs"; // Same video CI and already-approved test runner.

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createMyTubeEditorDraft,parseMyTubeEditorDraft,MYTUBE_DRAFT_MAX_BYTES} from "../lib/mandala/creative-editor-draft.mjs";
import {emptyMyTubeEditorHistory,recordMyTubeEditorUndo,undoMyTubeEditor,redoMyTubeEditor,MYTUBE_UNDO_LIMIT} from "../lib/mandala/creative-editor-history.mjs";

const sources=["safe-1","safe-2","safe-3","safe-4","safe-5"];
const allowlists={approvedSceneIds:sources,approvedPresetIds:["permitted-preset"]};
const baseShots=()=>sources.slice(0,4).map((sceneId,i)=>({
  sceneId,startSeconds:5*i,durationSeconds:5,overlayText:"Hello",
  transitionIn:i?"cut":"soft",colorLook:i===1?"warm":"original",
}));
const base=()=>({presetId:"permitted-preset",aspect:"portrait",durationSeconds:20,
  shots:baseShots(),captions:[{id:"caption-1",text:"Hello",startSeconds:1,durationSeconds:4}],
  audioStartSeconds:1.5});
const decode=value=>parseMyTubeEditorDraft(JSON.stringify(value),allowlists);

test("draft stores only approved ids, scalar settings and authored captions",()=>{
  const raw=createMyTubeEditorDraft({...base(),rawPhoto:"private",musicFile:"private"},allowlists);
  assert.equal(raw.includes("private"),false);
  const draft=parseMyTubeEditorDraft(raw,allowlists);
  assert.equal(draft.shots.length,4);
  assert.equal(draft.shots[1].colorLook,"warm");
  assert.equal(draft.shots[1].transitionIn,"cut");
  assert.equal(draft.audioStartSeconds,1.5);
  assert.deepEqual(draft.captions,[{id:"caption-1",text:"Hello",startSeconds:1,durationSeconds:4}]);
  assert.equal(Object.hasOwn(draft,"audioFile"),false);
  assert.equal(draft.shots[0].captionText,"Hello");
});
test("cannot import a forged scene, rights bypass, URLs or additional fields",()=>{
  const draft=decode(JSON.parse(createMyTubeEditorDraft(base(),allowlists)));
  for(const bad of [
    {...draft,sourceUrl:"https://third-party.invalid/evil.mp4"},
    {...draft,shots:draft.shots.map((s,i)=>i? s:{...s,sceneId:"malicious"})},
    {...draft,shots:draft.shots.map((s,i)=>i? s:{...s,poster:"/secret"})},
    {...draft,shots:draft.shots.map((s,i)=>i? s:{...s,sceneId:draft.shots[1].sceneId})},
    {...draft,shots:[...draft.shots.slice(0,3)]},
    {...draft,presetId:"unknown"},
    {...draft,aspect:"4k"},
    {...draft,durationSeconds:60},
    {...draft,format:"capcut"},
    {...draft,captions:[{id:"x",text:"one",startSeconds:19.5,durationSeconds:1}]},
    {...draft,captions:[{id:"x",text:"bad\ntext",startSeconds:1,durationSeconds:1}]},
    {...draft,audioStartSeconds:21},
  ]) assert.throws(()=>decode(bad),/mytube_draft_/);
  assert.throws(()=>parseMyTubeEditorDraft("x".repeat(MYTUBE_DRAFT_MAX_BYTES+1),allowlists),/size/);
  assert.throws(()=>parseMyTubeEditorDraft("{bad json",allowlists),/json/);
  assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify({...draft,__proto__:null}),{}),/preset|shots/);
});
test("explicitly deleted captions remain empty; imported media stays detached",()=>{
 const draft=JSON.parse(createMyTubeEditorDraft({...base(),captions:[]},allowlists));
 assert.deepEqual(decode(draft).captions,[]);
 assert.deepEqual(decode({...draft,captions:null}).captions,null);
 assert.throws(()=>decode({...draft,captions:Array.from({length:17},(_,i)=>({
   id:"caption-"+i,text:"Hi",startSeconds:0,durationSeconds:1}))}),/captions/);
});
test("undo/redo restores exact pre-change snapshot and clears redo after new change",()=>{
 const first={film:"one",captions:[]},second={film:"two",captions:[]};
 let h=emptyMyTubeEditorHistory();
 h=recordMyTubeEditorUndo(h,first,"shot-reorder",1000);
 let r=undoMyTubeEditor(h,second);
 assert.deepEqual(r.snapshot,first);
 let back=redoMyTubeEditor(r.history,first);
 assert.deepEqual(back.snapshot,second);
 r=undoMyTubeEditor(back.history,second);
 h=recordMyTubeEditorUndo(r.history,first,"shot-look",1500);
 assert.equal(h.future.length,0);
 assert.equal(redoMyTubeEditor(h,first).snapshot,null);
});
test("caption drag and keystrokes coalesce, history bounded, different actions independent",()=>{
 let h=emptyMyTubeEditorHistory();
 h=recordMyTubeEditorUndo(h,{t:0},"caption:abc",100);
 h=recordMyTubeEditorUndo(h,{t:1},"caption:abc",300);
 h=recordMyTubeEditorUndo(h,{t:2},"caption:abc",901);
 assert.equal(h.past.length,2);
 h=recordMyTubeEditorUndo(h,{t:3},"audio-offset",920);
 assert.equal(h.past.length,3);
 for(let i=0;i<80;i++)h=recordMyTubeEditorUndo(h,{t:i},"shot-reorder",800+i);
 assert.equal(h.past.length,MYTUBE_UNDO_LIMIT);
 assert.equal(undoMyTubeEditor(h,{t:100}).snapshot.t,79);
});
test("real Studio wires editing actions to history and bounded local project import/export",()=>{
 const s=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const t=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
 assert.match(s,/data-video-editor-draft-save/);
 assert.match(s,/data-video-editor-draft-open/);
 assert.match(s,/createMyTubeEditorDraft\(/);
 assert.match(s,/parseMyTubeEditorDraft\(/);
 assert.match(s,/compileFreeFilmPreset\(/);
 assert.match(s,/recordMyTubeEditorUndo\(/);
 assert.match(s,/undoMyTubeEditor\(/);
 assert.match(s,/redoMyTubeEditor\(/);
 assert.match(s,/setAspect\(snapshot\.aspect\);setDuration\(snapshot\.duration\)/);
 assert.match(s,/epoch!==editorDraftEpochRef\.current/);
 assert.match(s,/validateMontageClips/);
 assert.match(t,/data-video-timeline-undo/);
 assert.match(t,/data-video-timeline-redo/);
});

test("portable draft retains user-selected animated subtitle appearance safely",()=>{
  const styled={...base(),captions:[{id:"caption-1",text:"Hello",startSeconds:1,
    durationSeconds:4,styleId:"cinema",motionId:"slide_up",positionId:"center"}]};
  const encoded=createMyTubeEditorDraft(styled,allowlists);
  assert.equal(parseMyTubeEditorDraft(encoded,allowlists).captions[0].motionId,"slide_up");
  assert.throws(()=>decode({...JSON.parse(encoded),
    captions:[{...JSON.parse(encoded).captions[0],styleId:"<img src=x>"}]}),/caption/);
});
