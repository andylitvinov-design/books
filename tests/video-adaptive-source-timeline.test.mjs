import test from "node:test";
import assert from "node:assert/strict";
import {allocateVariableFilmTimeline,shiftVariableFilmBoundary}
 from "../lib/mandala/free-film-timeline.mjs";
import {resolveLicensedSourceFrame} from "../lib/mandala/free-film-source-clock.mjs";
import {cinematicPreviewSeconds} from "../lib/mandala/cinematic-director.mjs";
import {prepareFourFilmSources} from "../lib/mandala/free-film-source-loader.mjs";
import {validateMontageClips} from "../lib/mandala/video-montage-sources.mjs";
import sceneCatalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};

test("legacy four-shot validation stays strict; new verified adaptive form is opt-in",()=>{
 const real=sceneCatalog.scenes.filter(scene=>scene.status==="approved"&&
   scene.media==="licensed_mp4").slice(0,12)
   .map(scene=>({...scene,allowedAspects:["portrait"]}));
 assert.equal(real.length,12);
 const five=real.slice(0,5).map(x=>x.id);
 assert.equal(validateMontageClips(five,real,[],"portrait"),false);
 assert.equal(validateMontageClips(five,real,[],"portrait",true),true);
 assert.equal(validateMontageClips([...five,five[0]],real,[],"portrait",true),false);
 assert.equal(validateMontageClips(five,real,[],"landscape",true),false);
});

test("adaptive 30- and 60-second shot count drives one physical-source clock",()=>{
 for(const [seconds,count] of [[30,6],[60,12]]){
   const ids=Array.from({length:count},(_,i)=>"verified-mp4-"+i);
   const shots=allocateVariableFilmTimeline(seconds,ids);
   assert.equal(shots.length,count);
   assert.equal(shots.reduce((n,shot)=>n+shot.durationSeconds,0),seconds);
   const plan={version:"hh-local-stock-compilation-v1",durationSeconds:seconds,shots};
   assert.equal(cinematicPreviewSeconds(plan,seconds+2),2);
   for(const [i,shot] of shots.entries()){
     const f=resolveLicensedSourceFrame(plan,shot.startSeconds+0.1,8);
     assert.equal(f.shotIndex,i);
     assert.equal(f.sceneId,ids[i]);
     assert.ok(f.expectedSourceSeconds>=0&&f.expectedSourceSeconds<8);
   }
 }
});

test("duration change cannot fit twelve physical cuts into ten seconds",()=>{
 const ids=Array.from({length:12},(_,i)=>"cut-"+i);
 assert.throws(()=>allocateVariableFilmTimeline(10,ids),/invalid_variable_film_timeline/);
 const shotTimes=allocateVariableFilmTimeline(60,ids).map(x=>x.durationSeconds);
 const moved=shiftVariableFilmBoundary(shotTimes,3,1);
 assert.equal(moved.reduce((n,x)=>n+x,0),60);
 assert.equal(moved[3],shotTimes[3]+1);
});

test("four-source loader does not implicitly authorize unbounded sources",async()=>{
 const ids=Array.from({length:5},(_,i)=>({sceneId:"cut-"+i}));
 await assert.rejects(prepareFourFilmSources(ids,{}),/invalid_four_scene_montage/);
 await assert.rejects(prepareFourFilmSources(ids,{}, {adaptive:true}),/four_scene_player_not_mounted/);
});
