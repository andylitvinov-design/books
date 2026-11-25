import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {distributeMontageSetups,isMontageSetupClip,
  reorderMontageSetups,retimeMontageSetups} from "../lib/mandala/creative-editor-setups.mjs";
import {captionAnimationFrame} from "../lib/mandala/creative-editor-captions.mjs";
import {timedCaptionAt} from "../lib/mandala/editable-timeline.mjs";
test("five user-selected setups divide the real 30s video timeline",()=>{
  const texts=["I am open to love","I feel supported","My heart is peaceful",
    "I trust the process","I create my reality"];
  const clips=distributeMontageSetups(texts,30);
  assert.deepEqual(clips.map(c=>[c.id,c.startSeconds,c.durationSeconds]),[
    ["setup-1",0,6],["setup-2",6,6],["setup-3",12,6],["setup-4",18,6],["setup-5",24,6]]);
  assert.equal(timedCaptionAt(clips,8).text,texts[1]);
  assert.equal(timedCaptionAt(clips,30),null);
  assert.ok(clips.every(isMontageSetupClip));
  assert.deepEqual(distributeMontageSetups(texts,Infinity),[]);
});
test("drag reorder keeps text appearance, undo order and other authored captions",()=>{
  const original=distributeMontageSetups(["One","Two","Three","Four","Five"],30);
  const advanced={...original[1],motionId:"rotate",motionSpeed:2,motionDirection:"left"};
  const clips=[original[0],advanced,...original.slice(2),
    {id:"own-text",text:"Original",startSeconds:1,durationSeconds:2}];
  const reordered=reorderMontageSetups(clips,1,4,30,true);
  assert.deepEqual(reordered.filter(isMontageSetupClip).map(c=>c.text),["One","Three","Four","Five","Two"]);
  assert.equal(reordered.filter(isMontageSetupClip)[4].motionId,"rotate");
  assert.equal(reordered.filter(isMontageSetupClip)[4].motionSpeed,2);
  assert.equal(reordered.filter(isMontageSetupClip)[4].startSeconds,24);
  assert.equal(reordered[5],clips[5]);
  assert.equal(retimeMontageSetups(reordered,15).filter(isMontageSetupClip)[4].startSeconds,12);
  assert.equal(reorderMontageSetups(clips,1,99,30),clips);
});
test("motion transforms interpolate for the same Canvas preview and export",()=>{
  const animation=(motionId,time=1)=>captionAnimationFrame({
    motionId,motionDirection:"left",motionSpeed:1},time,4,1);
  assert.ok(animation("move",.1).translateX>0);
  assert.ok(animation("move",3).translateX<0);
  assert.ok(animation("grow",3).scale>animation("grow",.1).scale);
  assert.ok(animation("shrink",3).scale<animation("shrink",.1).scale);
  assert.ok(Math.abs(animation("rotate",3).rotation)>1);
  assert.notEqual(animation("pulse",1).scale,animation("pulse",.5).scale);
  assert.ok(animation("type",1).reveal<1);
  assert.equal(animation("type",4).reveal,1);
});
test("the existing Video Studio owns the text, media, drafts and real output",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const timeline=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
  assert.match(studio,/onImportSetups=\{importMontageSetups\}/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,frameTime,cinematicPlan,timelineTextClips\)/);
  assert.match(studio,/createQuickVideo/);
  assert.match(timeline,/data-video-setup-import/);
  assert.match(timeline,/data-video-setup-drag/);
  assert.match(timeline,/data-video-caption-motion-strip/);
  assert.match(studio,/data-video-montage-advanced-tools/);
  assert.match(timeline,/data-video-timeline-add-text/);
});
