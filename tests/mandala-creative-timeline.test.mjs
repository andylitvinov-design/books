import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  creativeShotFrameAt,paintCreativeTimelineShot,CREATIVE_EDGE_SECONDS
} from "../lib/mandala/creative-timeline-effects.mjs";
import {
  snapTimelineSecond,splitTimelineCaption,duplicateTimelineCaption,
  timedCaptionAt
} from "../lib/mandala/editable-timeline.mjs";

const shots=()=>Array.from({length:4},(_,i)=>({sceneId:"approved-"+i,
  durationSeconds:5,startSeconds:i*5}));

test("legacy plans keep their subtle .35s transition, no new footage",()=>{
  const all=shots();
  const edge=creativeShotFrameAt(all,1,0);
  assert.equal(edge.look,"original");
  assert.equal(edge.alpha,.25);
  assert.equal(creativeShotFrameAt(all,1,CREATIVE_EDGE_SECONDS).alpha,0);
  assert.equal(creativeShotFrameAt(all,2,2.5).alpha,0);
  assert.equal(creativeShotFrameAt(all,99,1).alpha,0);
});

test("a cut does not darken either side of the selected junction",()=>{
  const all=shots();all[2].transitionIn="cut";
  assert.equal(creativeShotFrameAt(all,1,5).alpha,0);
  assert.equal(creativeShotFrameAt(all,2,0).alpha,0);
});

test("fade, flash and look are computed from the actual clip clock",()=>{
  const all=shots();all[1].transitionIn="fade_black";all[1].colorLook="warm";
  assert.equal(creativeShotFrameAt(all,1,0).alpha,1);
  assert.equal(creativeShotFrameAt(all,0,5).alpha,1);
  assert.equal(creativeShotFrameAt(all,1,2).look,"warm");
  all[2].transitionIn="flash_white";all[2].colorLook="dream";
  const flash=creativeShotFrameAt(all,2,0);
  assert.equal(flash.color,"255,255,255");
  assert.equal(flash.alpha,.85);
  assert.equal(flash.look,"dream");
  const fills=[];
  const fake={canvas:{width:720,height:1280},save(){},restore(){},
    set fillStyle(value){this.color=value;},fillRect(x,y,w,h){fills.push({color:this.color,x,y,w,h});}};
  paintCreativeTimelineShot(fake,all,2,0);
  assert.equal(fills.length,2);
  assert.match(fills[0].color,/139,104,213/);
  assert.equal(fills[1].w,720);
});

test("magnetic snapping finds real shot boundaries, remains optional and bounded",()=>{
  const marks=[0,5,10,15,20];
  assert.equal(snapTimelineSecond(9.8,marks,20),10);
  assert.equal(snapTimelineSecond(9.4,marks,20),9.4);
  assert.equal(snapTimelineSecond(21,marks,20),20);
  assert.equal(snapTimelineSecond(-1,marks,20),0);
  assert.equal(snapTimelineSecond(9.8,marks,20,0),9.8);
  assert.equal(snapTimelineSecond(NaN,marks,20),0);
});

test("split + duplicate captions keep author text and precise playback time",()=>{
  const original=[{id:"a",text:"I can choose a new path",
    startSeconds:2,durationSeconds:6}];
  const split=splitTimelineCaption(original,"a",5,20,"new-part");
  assert.equal(split.length,2);
  assert.deepEqual(split.map(c=>[c.id,c.startSeconds,c.durationSeconds]),
    [["a",2,3],["new-part",5,3]]);
  assert.equal(timedCaptionAt(split,5)?.text,"I can choose a new path");
  assert.equal(timedCaptionAt(split,8),null);
  const dup=duplicateTimelineCaption(split,"a","duplicate",20);
  assert.equal(dup.length,3);
  assert.equal(dup[1].startSeconds,2.5);
  assert.equal(dup[1].text,original[0].text);
  assert.equal(original.length,1);
  assert.equal(splitTimelineCaption(original,"a",2.1,20,"b").length,1);
  assert.equal(splitTimelineCaption(original,"a",5,20,"a").length,1);
});

test("UI controls are wired to the real Canvas render path, never only CSS",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const editor=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
  const styles=readFileSync(new URL("../components/mandala-multitrack-timeline.module.css",import.meta.url),"utf8");
  assert.match(studio,/paintCreativeTimelineShot\(ctx,storyboard\.shots/);
  assert.match(studio,/onSetShotEffect=\{/);
  assert.match(studio,/onSplitCaption=\{/);
  assert.match(editor,/data-video-timeline-transition/);
  assert.match(editor,/data-video-timeline-look/);
  assert.match(editor,/data-video-timeline-zoom/);
  assert.match(editor,/data-video-timeline-snap/);
  assert.match(editor,/data-video-timeline-split-caption/);
  assert.match(editor,/data-video-timeline-duplicate-caption/);
  assert.match(styles,/\.timelineViewport\{/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,frameTime,cinematicPlan,timelineTextClips\)/);
});
