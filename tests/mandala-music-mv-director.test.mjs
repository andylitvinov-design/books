import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {analyzeMusicShape,suggestMusicVideoDirections,MUSIC_MV_SHAPE_VERSION}
 from "../lib/mandala/music-mv-director.mjs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const sample=(levels=[.04,.1,.45,.03],seconds=20,rate=8000)=>{
 const ch=new Float32Array(seconds*rate);
 for(let i=0;i<ch.length;i++)ch[i]=levels[Math.min(3,Math.floor(i/(rate*seconds/4)))]*Math.sin(i*.22);
 return ch;
};
test("dynamic acoustic phases and observed climax, no invented song words",()=>{
 const shape=analyzeMusicShape([sample()],8000,20);
 assert.equal(shape.version,MUSIC_MV_SHAPE_VERSION);
 assert.equal(shape.label,"rise_and_release");
 assert.ok(shape.sections[2].relativeEnergy>shape.sections[0].relativeEnergy);
 assert.ok(shape.climaxSeconds>=10&&shape.climaxSeconds<15);
 assert.equal(shape.derivedFrom,"audio_signal_not_semantic_content");
 assert.ok(!("lyrics" in shape));
});
test("silence and stereo stay truthful",()=>{
 const s=analyzeMusicShape([new Float32Array(8000*20)],8000,20);
 assert.equal(s.label,"silence");assert.equal(s.climaxSeconds,null);
 const stereo=analyzeMusicShape([sample(),new Float32Array(8000*20)],8000,20);
 assert.ok(stereo.audible);assert.equal(stereo.sections.at(-1).endSeconds,20);
});
test("three distinct user-goal-led directions in each locale",()=>{
 const shape=analyzeMusicShape([sample()],8000,20);
 for(const locale of ["ru","en","es"]){
  const concepts=suggestMusicVideoDirections({shape,goal:"Confidence",theme:"life",locale});
  assert.deepEqual(concepts.map(x=>x.id),["quiet","cinema","symbols"]);
  assert.equal(new Set(concepts.map(x=>x.storyPitch)).size,3);
  for(const c of concepts){assert.ok(c.storyPitch.includes("Confidence"));
   assert.equal(c.source,"user_goal_editorial_suggestion");assert.equal(c.needsSourceReview,true);}
 }
});
test("bad inputs cannot produce a creative story",()=>{
 assert.throws(()=>analyzeMusicShape([new Float32Array(10)],8000,20),/invalid_music_mv_shape_input/);
 assert.throws(()=>analyzeMusicShape([sample()],8000,180),/invalid_music_mv_shape_input/);
 assert.throws(()=>suggestMusicVideoDirections({shape:{},locale:"ru"}),/invalid_music_mv_creative_request/);
});
test("same video renderer, music picker and rights safeguards",()=>{
 for(const v of ["data-video-music-mv-directions","data-video-music-mv-direction=",
 "analyzeMusicShape(","suggestMusicVideoDirections(","<StudioMusicPicker",
 "musicMvCreative.directions.find(","data-video-music-to-mv-create",
 "setMusicMvCreative(null)","sourceRef.current!==sourceSignature","compileFreeFilmPreset(preset,locale,duration,aspect"]){
  assert.ok(studio.includes(v),v);
 }
});
