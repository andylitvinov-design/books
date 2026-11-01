import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {allocateFreeFilmTimeline,FREE_FILM_DURATIONS} from "../lib/mandala/free-film-timeline.mjs";
const clips=["morning-dew","gentle-falls","calm-sea","sea-breeze"];
test("all five free durations allocate four contiguous source-backed scenes",()=>{
  assert.deepEqual(FREE_FILM_DURATIONS,[10,15,20,30,60]);
  for(const duration of FREE_FILM_DURATIONS){
    const shots=allocateFreeFilmTimeline(duration,clips);
    assert.equal(shots.length,4);
    assert.equal(shots[0].startSeconds,0);
    assert.equal(shots[3].startSeconds+shots[3].durationSeconds,duration);
    assert.ok(shots.every((shot,index)=>shot.sceneId===clips[index]&&shot.durationSeconds>=2));
    for(let i=1;i<shots.length;i++)
      assert.equal(shots[i].startSeconds,shots[i-1].startSeconds+shots[i-1].durationSeconds);
  }
  assert.deepEqual(allocateFreeFilmTimeline(15,clips).map(s=>s.durationSeconds),[4,4,4,3]);
  assert.deepEqual(allocateFreeFilmTimeline(60,clips).map(s=>s.durationSeconds),[15,15,15,15]);
});
test("invalid durations and repeated source clips fail closed",()=>{
  for(const n of [0,5,11,16,120,NaN,15.5])
    assert.throws(()=>allocateFreeFilmTimeline(n,clips),/invalid_free_film_timeline/);
  assert.throws(()=>allocateFreeFilmTimeline(30,["a","b","c"]),/invalid_free_film_timeline/);
  assert.throws(()=>allocateFreeFilmTimeline(30,["a","b","b","c"]),/invalid_free_film_timeline/);
});
test("Studio uses the same four-shot timeline and never indexes nonexistent clips",()=>{
  const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const slice=source.slice(source.indexOf("function compileFreeFilmPreset("),source.indexOf("\n\nconst effects:"));
  assert.match(slice,/allocateFreeFilmTimeline\(durationSeconds,preset\.clips\)/);
  assert.match(slice,/durationSeconds:20/);
  assert.match(slice,/shotCount:4/);
  assert.match(slice,/providerPrompt:""/);
  assert.doesNotMatch(slice,/preset\.clips\[i\]/);
});
