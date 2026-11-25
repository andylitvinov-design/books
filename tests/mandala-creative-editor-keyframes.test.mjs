import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {motionPreset,motionKeyframeAt,paintMyTubeMotion,
  validateMyTubeMotion,MYTUBE_MOTION_PRESETS} from "../lib/mandala/creative-editor-keyframes.mjs";
import {createMyTubeEditorDraft,parseMyTubeEditorDraft} from "../lib/mandala/creative-editor-draft.mjs";
const approved=["v-one","v-two","v-three","v-four"];
const allow={approvedSceneIds:approved,approvedPresetIds:["licensed-preset"]};
const draftShots=()=>approved.map((id,i)=>({
 sceneId:id,startSeconds:i*5,durationSeconds:5,overlayText:"",motion:i===0?motionPreset("push-in"):null
}));
test("keyframe interpolation respects start, center and end, including linear/smooth",()=>{
 const m=motionPreset("push-in");
 assert.equal(motionKeyframeAt(m,0,5).zoom,1.05);
 assert.equal(motionKeyframeAt(m,2.5,5).zoom,1.15);
 assert.equal(motionKeyframeAt(m,6,5).zoom,1.25);
 const pan=motionPreset("pan-left");
 assert.equal(motionKeyframeAt(pan,0,10).x,.07);
 assert.equal(motionKeyframeAt(pan,10,10).x,-.07);
 assert.equal(motionKeyframeAt(null,1,10).zoom,1);
 const custom={...m,preset:"custom",easing:"linear"};
 assert.equal(motionKeyframeAt(custom,1.25,5).zoom,1.1);
});
test("all built-in presets stay bounded and protect the decoded source",()=>{
 for(const id of MYTUBE_MOTION_PRESETS){
  const m=motionPreset(id);
  if(id==="none")assert.equal(m,null);
  else{
   const v=validateMyTubeMotion(m);
   for(const point of [v.from,v.to]){
    assert.ok(point.zoom>=1&&point.zoom<=1.6);
    assert.ok(Math.abs(point.x)<=.16&&Math.abs(point.y)<=.16);
   }
  }
 }
 assert.throws(()=>motionPreset("external-provider"),/preset/);
});
test("malicious keyframe payloads, infinity and unbounded zoom fail closed",()=>{
 const ok=motionPreset("drift");
 for(const bad of [
  {...ok,url:"https://malicious.invalid/video"},
  {...ok,to:{...ok.to,zoom:10}},
  {...ok,to:{...ok.to,x:99}},
  {...ok,to:{...ok.to,rotation:Infinity}},
  {...ok,to:{...ok.to,rotation:NaN}},
  {...ok,preset:"unknown"},
  {...ok,easing:"javascript:"},
  {...ok,from:{...ok.from,poster:"oops"}}
 ])assert.throws(()=>validateMyTubeMotion(bad),/invalid_mytube_motion/);
});
test("the real Canvas wrapper draws one source and always restores the context",()=>{
 const calls=[];
 const ctx={canvas:{width:720,height:1280},
   save(){calls.push("save")},restore(){calls.push("restore")},
   set fillStyle(v){calls.push(v)},fillRect(){calls.push("backdrop")},
   translate(){calls.push("translate")},rotate(){calls.push("rotate")},
   scale(){calls.push("scale")}};
 paintMyTubeMotion(ctx,motionPreset("tilt"),2,5,()=>calls.push("source"));
 assert.equal(calls.filter(x=>x==="source").length,1);
 assert.equal(calls.at(-1),"restore");
 assert.ok(calls.includes("scale"));
 const plain=[];paintMyTubeMotion(ctx,null,0,5,()=>plain.push("source"));
 assert.deepEqual(plain,["source"]);
});
test("local draft keeps keyframes and rejects forged motion on import",()=>{
 const json=createMyTubeEditorDraft({presetId:"licensed-preset",aspect:"portrait",
  durationSeconds:20,shots:draftShots(),captions:null,audioStartSeconds:0},allow);
 const draft=parseMyTubeEditorDraft(json,allow);
 assert.equal(draft.shots[0].motion.to.zoom,1.25);
 assert.equal(draft.shots[1].motion,null);
 const forged=JSON.parse(json);forged.shots[1].motion={...motionPreset("push-in"),
   to:{...motionPreset("push-in").to,zoom:9}};
 assert.throws(()=>parseMyTubeEditorDraft(JSON.stringify(forged),allow),/mytube_draft_/);
});
test("real shot controls edit the same Canvas path for preview and MP4 export",()=>{
 const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 const timeline=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
 assert.match(studio,/paintMyTubeMotion\(ctx,shot\.motion/);
 assert.match(studio,/onSetShotMotion=/);
 assert.match(studio,/shot\.motion\?\?null/);
 assert.match(timeline,/data-video-timeline-motion-preset/);
 assert.match(timeline,/data-video-timeline-keyframe-end-zoom/);
 assert.match(timeline,/data-video-timeline-keyframe-end-pan/);
});
