import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {analyzeMusicRhythm,planMusicVideoCuts} from "../lib/mandala/music-to-mv.mjs";
import {allocateMusicAlignedFilmTimeline,allocateSourceBoundedFilmTimeline} from "../lib/mandala/free-film-timeline.mjs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const rhythmTrack=({seconds=20,sampleRate=8000,bpm=120,offset=.37}={})=>{
  const pcm=new Float32Array(seconds*sampleRate);
  for(let time=offset;time<seconds;time+=60/bpm){
    const start=Math.floor(time*sampleRate);
    for(let i=0;i<sampleRate*.08&&start+i<pcm.length;i++)
      pcm[start+i]=.7*Math.sin(i*.3)*Math.exp(-i/(sampleRate*.035));
  }
  return pcm;
};
const shots=[0,5,10,15].map((startSeconds,index)=>({
  sceneId:"licensed-"+index,startSeconds,durationSeconds:5,
  overlayText:"original-"+index,transitionIn:"soft"
}));
test("actual local rhythmic attacks identify the approximate music tempo",()=>{
  const rhythm=analyzeMusicRhythm(rhythmTrack(),8000,20);
  assert.ok(rhythm.beats.length>=28);
  assert.ok([60,120].includes(rhythm.bpm),"real beats detected around 120 BPM");
  assert.ok(rhythm.confidence>=.55);
});
test("silence does not fabricate BPM or cuts",()=>{
  const rhythm=analyzeMusicRhythm(new Float32Array(8000*20),8000,20);
  assert.deepEqual(rhythm,{bpm:null,confidence:0,beats:[]});
  const plan=planMusicVideoCuts(20,shots,rhythm);
  assert.equal(plan.status,"no_clear_beats");
  assert.deepEqual(plan.shots,shots);
});
test("real beat cuts preserve licensed source identities, original captions, duration",()=>{
  const rhythm=analyzeMusicRhythm(rhythmTrack(),8000,20);
  const plan=planMusicVideoCuts(20,shots,rhythm);
  assert.equal(plan.status,"audio_aligned");
  assert.deepEqual(plan.shots.map(x=>x.sceneId),shots.map(x=>x.sceneId));
  assert.deepEqual(plan.shots.map(x=>x.overlayText),shots.map(x=>x.overlayText));
  assert.deepEqual(plan.shots.map(x=>x.transitionIn),shots.map(x=>x.transitionIn));
  assert.equal(plan.shots.at(-1).startSeconds+plan.shots.at(-1).durationSeconds,20);
  for(const cut of plan.cuts)assert.ok(rhythm.beats.some(b=>Math.abs(b.seconds-cut)<=.02));
  for(const shot of plan.shots)assert.ok(shot.durationSeconds>=2);
});
test("invalid audio, plan and impossible timestamps fail closed",()=>{
  assert.throws(()=>analyzeMusicRhythm(new Float32Array(100),8000,20),/music_mv_audio_too_short/);
  assert.throws(()=>planMusicVideoCuts(20,shots.slice(1),{beats:[]}),/invalid_music_mv_plan/);
  assert.throws(()=>planMusicVideoCuts(20,shots,{beats:[{seconds:30,strength:1}]}),/invalid_music_mv_plan/);
});
test("Music MV is an upgrade of the existing audio/montage and keeps export and licensing guards",()=>{
  assert.match(studio,/data-video-music-to-mv-create/);
  assert.match(studio,/onClick=\{\(\)=>void smartCutFromAudio\(\)\}/);
  assert.match(studio,/data-video-montage-audio/);
  assert.match(studio,/setMontagePanel\("concept"\)/);
  assert.match(studio,/compileFreeFilmPreset\(preset,locale,duration,aspect,\{/);
  assert.match(studio,/sourceRef\.current!==sourceSignature/);
  assert.match(studio,/curatedAudioTracks\.some\(track=>track\.id===attached\.id\)/);
  assert.match(studio,/if\(attached\.kind==="file"&&\(!audioRights/);
  assert.match(studio,/presetAudioUrl\(attached\.id\)/);
  assert.match(studio,/setCinematicPlan\(nextFilm\)/);
  assert.doesNotMatch(studio.slice(studio.indexOf("const smartCutFromAudio="),
    studio.indexOf("const freeFilmClipLabel=")),/api\/heygen|api\/runway|api\/higgsfield|fetch\("https:\/\//);
});

test("verified music cuts retain subsecond beat timing without changing legacy manual timing",()=>{
  const rhythm=analyzeMusicRhythm(rhythmTrack(),8000,20);
  const plan=planMusicVideoCuts(20,shots,rhythm);
  assert.equal(plan.status,"audio_aligned");
  assert.ok(plan.shots.some(x=>!Number.isInteger(x.durationSeconds)));
  const ids=plan.shots.map(x=>x.sceneId);
  const lengths=plan.shots.map(x=>x.durationSeconds);
  assert.throws(()=>allocateSourceBoundedFilmTimeline(20,ids,[20,20,20,20],lengths),
    /invalid_adaptive_film_timing/);
  const aligned=allocateMusicAlignedFilmTimeline(20,ids,lengths);
  assert.deepEqual(aligned.map(x=>x.sceneId),ids);
  assert.deepEqual(aligned.map(x=>x.startSeconds),plan.shots.map(x=>x.startSeconds));
  assert.deepEqual(aligned.map(x=>x.durationSeconds),lengths);
  assert.equal(aligned.at(-1).startSeconds+aligned.at(-1).durationSeconds,20);
  assert.match(studio,/musicAligned:true/);
  assert.match(studio,/allocateMusicAlignedFilmTimeline\(durationSeconds/);
  assert.match(studio,/scene\.durationSeconds<timings\[index\]\.durationSeconds/);
});
test("explicit subsecond timings fail closed for gaps, too-short scenes and tampered precision",()=>{
  const ids=shots.map(x=>x.sceneId);
  assert.throws(()=>allocateMusicAlignedFilmTimeline(20,ids,[5.333,4.667,5,5]),
    /invalid_music_aligned_film_timing/);
  assert.throws(()=>allocateMusicAlignedFilmTimeline(20,ids,[1.99,8.01,5,5]),
    /invalid_music_aligned_film_timing/);
  assert.throws(()=>allocateMusicAlignedFilmTimeline(20,ids,[5,5,5,4.99]),
    /invalid_music_aligned_film_timing/);
  assert.throws(()=>allocateMusicAlignedFilmTimeline(20,[ids[0],ids[0],...ids.slice(2)],[5,5,5,5]),
    /invalid_free_film_timeline/);
});
