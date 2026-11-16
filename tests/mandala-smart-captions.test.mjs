import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {audioTransientScores,recommendSmartAudioCuts} from "../lib/mandala/creative-editor-smart-cut.mjs";
import {captionAnimationFrame,normalizeCaptionAppearance,importSrtCaptionClips,
  exportSrtCaptionClips,CAPTION_CUE_LIMIT} from "../lib/mandala/creative-editor-captions.mjs";

const shots=Array.from({length:4},(_,i)=>({
  sceneId:"approved-"+i,startSeconds:5*i,durationSeconds:5,
  colorLook:i%2?"warm":"original",transitionIn:"cut"
}));
test("real PCM energy onset gives nonfake musical transient candidates",()=>{
  const samples=new Float32Array(8000*20);
  for(const start of [4,10,17])
    for(let j=start*8000;j<start*8000+1600;j++)
      samples[j]=Math.sin(j*.14)*.85;
  const pulse=audioTransientScores(samples,8000,20);
  assert.equal(pulse.length,20);
  assert.ok(pulse[4]>.5&&pulse[10]>.5&&pulse[17]>.5);
  assert.equal(pulse[0],0);
  const edit=recommendSmartAudioCuts(20,shots,pulse);
  assert.equal(edit.status,"audio_aligned");
  assert.equal(edit.shots.reduce((sum,s)=>sum+s.durationSeconds,0),20);
  assert.deepEqual(edit.shots.map(s=>s.sceneId),shots.map(s=>s.sceneId));
  assert.ok(edit.shots.every(s=>s.durationSeconds>=2));
});
test("silence is not invented into an AI beat, invalid sources fail closed",()=>{
  const silent=Array(20).fill(0);
  const result=recommendSmartAudioCuts(20,shots,silent);
  assert.equal(result.status,"no_clear_beats");
  assert.deepEqual(result.shots,shots);
  assert.throws(()=>audioTransientScores([],44100,20),/invalid_smart_cut_audio/);
  assert.throws(()=>recommendSmartAudioCuts(20,[shots[0],shots[0]],silent),/invalid_smart_cut_plan/);
});
test("subtitle SRT import, editable timing and export roundtrip remain local",()=>{
  const srt="1\r\n00:00:01,200 --> 00:00:03,800\r\nI can change\r\nmy life\r\n\r\n"+
    "2\r\n00:00:07,000 --> 00:00:09,000\r\nIt starts here\r\n";
  const clips=importSrtCaptionClips(srt,20);
  assert.deepEqual(clips.map(c=>[c.id,c.startSeconds,c.durationSeconds]),
    [["srt-1",1.2,2.6],["srt-2",7,2]]);
  assert.equal(clips[0].text,"I can change my life");
  assert.equal(exportSrtCaptionClips(clips,20).includes("00:00:01,200 --> 00:00:03,800"),true);
  assert.throws(()=>importSrtCaptionClips("hello",20),/invalid_srt/);
  assert.throws(()=>importSrtCaptionClips(Array.from({length:CAPTION_CUE_LIMIT+1},(_,i)=>(
    i+"\n00:00:01,000 --> 00:00:02,000\nHello")).join("\n\n"),20),/srt_cue_count_limit/);
});
test("caption animation and text appearance presets have deterministic interpolation",()=>{
  const a=captionAnimationFrame({styleId:"glow",motionId:"pop",positionId:"top"},0,4,1);
  const b=captionAnimationFrame({styleId:"glow",motionId:"pop",positionId:"top"},.6,4,1);
  assert.equal(a.scale,.84);
  assert.equal(b.scale,1);
  assert.equal(a.alpha,0);
  assert.equal(b.alpha,1);
  assert.equal(b.positionId,"top");
  const move=captionAnimationFrame({motionId:"slide_up"},.1,4);
  assert.ok(move.translateY>0);
  assert.deepEqual(normalizeCaptionAppearance({styleId:"<script>",motionId:"invalid"}),{
    styleId:"classic",motionId:"none",positionId:"bottom"});
});
test("real studio exposes audio-aware cut, subtitle import and rendered caption motion",()=>{
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const timeline=readFileSync(new URL("../components/mandala-multitrack-timeline.tsx",import.meta.url),"utf8");
  assert.match(studio,/recommendSmartAudioCuts\(/);
  assert.match(studio,/audioTransientScores\(/);
  assert.match(studio,/captionAnimationFrame\(/);
  assert.match(studio,/data-video-smart-audio-cut/);
  assert.match(studio,/data-video-subtitles-import/);
  assert.match(studio,/data-video-subtitles-export/);
  assert.match(timeline,/data-video-caption-motion/);
  assert.match(timeline,/data-video-caption-position/);
});
