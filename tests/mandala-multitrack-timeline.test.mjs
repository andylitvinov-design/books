import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeTrackWindow,moveTrackWindow,timedTextAt,trackIsEdited} from "../lib/mandala/multitrack-timing.mjs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("clip windows snap, retain min length and never exceed the movie",()=>{
  assert.deepEqual(normalizeTrackWindow(2.31,5.87,10),{startSeconds:2.5,endSeconds:6});
  assert.deepEqual(normalizeTrackWindow(9.9,-20,10),{startSeconds:9.5,endSeconds:10});
  assert.deepEqual(moveTrackWindow({startSeconds:2,endSeconds:5},8.7,10),{startSeconds:7,endSeconds:10});
  assert.deepEqual(moveTrackWindow({startSeconds:1,endSeconds:2},-8,10),{startSeconds:0,endSeconds:1});
  assert.deepEqual(normalizeTrackWindow(NaN,Infinity,15),{startSeconds:0,endSeconds:15});
  assert.equal(trackIsEdited({startSeconds:0,endSeconds:15},15),false);
  assert.equal(trackIsEdited({startSeconds:2,endSeconds:15},15),true);
});
test("text is visible only during the chosen interval; latest overlay wins",()=>{
  const clips=[{id:"one",text:"Привет",startSeconds:1,endSeconds:4},
    {id:"two",text:"Second",startSeconds:2,endSeconds:3}];
  assert.equal(timedTextAt(clips,0),null);
  assert.equal(timedTextAt(clips,1.1).text,"Привет");
  assert.equal(timedTextAt(clips,2.5).text,"Second");
  assert.equal(timedTextAt(clips,4),null);
  assert.equal(timedTextAt([{text:"   ",startSeconds:0,endSeconds:1}],.5),null);
});
test("real Montage uses one Canvas and preserves protected source/audio gates",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const editor=read("components/mandala-multitrack-timeline.tsx");
  const localAudio=read("lib/mandala/local-video-music.ts");
  const webcodecs=read("lib/mandala/webcodecs-mp4-export.ts");
  assert.match(studio,/data-video-basic-editor/);
  assert.match(studio,/<MandalaMultitrackTimeline/);
  assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
  assert.match(studio,/paintTimedTextOverlay\(ctx,frameTime/);
  assert.match(studio,/paintTimedTextOverlay\(ctx,time/);
  assert.match(studio,/paintTimedTextOverlay\(ctx,frameSecond/);
  assert.match(editor,/onPointerDown/);
  assert.match(editor,/onPointerUp/);
  assert.match(editor,/data-montage-text-track/);
  assert.match(editor,/data-montage-audio-track/);
  assert.match(editor,/data-montage-video-track/);
  assert.match(localAudio,/startSeconds\?:number/);
  assert.match(webcodecs,/startSeconds\?:number/);
  assert.match(studio,/!audioNeedsAttachment &&/);
  assert.match(studio,/!uploadedAudio \|\| audioRights/);
});
