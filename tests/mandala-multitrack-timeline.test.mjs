import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  clampTrackSecond,normalizeTimelineClips,timedCaptionAt,moveTimelineCaption
} from "../lib/mandala/editable-timeline.mjs";

test("timeline clips move independently from film shots and are bounded",()=>{
  const original=[{id:"t1",text:"Hello",startSeconds:3,durationSeconds:4}];
  const moved=moveTimelineCaption(original,"t1",10,15);
  assert.equal(moved[0].startSeconds,10);
  assert.equal(timedCaptionAt(original,4)?.text,"Hello");
  assert.equal(timedCaptionAt(moved,4),null);
  assert.equal(timedCaptionAt(moved,12)?.text,"Hello");
  assert.equal(timedCaptionAt(moved,14.1),null);
  assert.equal(original[0].startSeconds,3);
  assert.equal(moveTimelineCaption(original,"t1",30,15)[0].startSeconds,11);
  assert.equal(clampTrackSecond(-10,30),0);
  assert.equal(clampTrackSecond(Infinity,30),0);
});

test("timeline normalizes Unicode, trims overflow and excludes empty overlays",()=>{
  const normalized=normalizeTimelineClips([
    {id:"a",text:" A\n B ",startSeconds:-5,durationSeconds:200},
    {id:"empty",text:"  ",startSeconds:0,durationSeconds:3},
    {id:"b",text:"B",startSeconds:29,durationSeconds:3},
  ],30);
  assert.equal(normalized.length,2);
  assert.equal(normalized[0].text,"A B");
  assert.equal(normalized[0].durationSeconds,30);
  assert.equal(normalized[1].durationSeconds,1);
  assert.ok(normalized.every(x=>x.startSeconds>=0&&
    x.startSeconds+x.durationSeconds<=30.001));
  assert.equal(timedCaptionAt(normalized,40),null);
});

test("three lanes share one exporter and user edits invalidate stale Blob",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const editor=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
  const safari=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
  const audio=readFileSync(new URL("../lib/mandala/local-video-music.ts",import.meta.url),"utf8");
  assert.match(studio,/data-video-editor-scenario/);
  assert.match(studio,/<MandalaMultiTrackTimeline/);
  assert.match(editor,/data-video-track="video"/);
  assert.match(editor,/data-video-track="text"/);
  assert.match(editor,/data-video-track="audio"/);
  assert.match(editor,/onPointerDown/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,frameTime,cinematicPlan,timelineTextClips\)/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,time,cinematicPlan,timelineTextClips\)/);
  assert.match(studio,/audioStartSeconds,timelineTextClips/);
  assert.match(studio,/startSeconds:effectiveAudioStartSeconds/);
  assert.match(studio,/musicSession\?\.begin\?\.\(\)/);
  assert.match(audio,/deferStart/);
  assert.match(safari,/source\.start\(startSeconds\)/);
});

test("iPhone scrub repaints decoded frames and delayed audio starts on the user gesture",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const component=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
  const safari=readFileSync(new URL("../lib/mandala/webcodecs-mp4-export.ts",import.meta.url),"utf8");
  assert.match(studio,/const scrubFrame=freeFilmVideoAt\(previewSeekSeconds,false\)/);
  assert.match(studio,/if\(!usingFreeFilmCompilation\|\|scrubFrame\)/);
  assert.match(studio,/onSeeked=\{\(\)=>\{if\(!previewPlaying\)setPreviewFrameRevision/);
  assert.match(studio,/players\.forEach\(player=>void player\.play\(\)\.catch/);
  assert.match(studio,/player\.volume=delayed\?0:masterVolume/);
  assert.match(studio,/player\.muted=delayed/,"iPhone must mute until the audio clip begins");
  assert.match(studio,/player\.muted=false/,"the scheduled clip must become audible at its timecode");
  assert.doesNotMatch(studio,/session\.timer=window\.setTimeout\(play/);
  assert.match(component,/if\(kind==="ruler"\)onSeek\(position/);
  assert.match(safari,/const available=seconds-startSeconds/);
});
