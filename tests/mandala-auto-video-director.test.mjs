import test from "node:test";
import assert from "node:assert/strict";
import {recommendAutoVideo,AUTO_VIDEO_DIRECTOR_VERSION} from "../lib/mandala/auto-video-director.mjs";

const library=[
  {id:"gentle-rest",theme:"health",clips:["morning-dew","gentle-falls","calm-sea","sea-breeze"]},
  {id:"natural-stillness",theme:"health",clips:["morning-dew","lone-tree","mountain-air","meadow-morning"]},
  {id:"steady-foundation",theme:"money",clips:["golden-shield","abundance-tree","partners","abundance-circle"]},
  {id:"warm-prosperity",theme:"money",clips:["wealth-sunrise","golden-harvest","prosperity-coast","radiant-portal"]},
  {id:"first-step",theme:"goals",clips:["light-path","open-door","guiding-stars","meaning-tree"]},
  {id:"clear-direction",theme:"goals",clips:["light-path","open-door","meaning-tree","guiding-stars"]},
  {id:"warm-connection",theme:"relationships",clips:["heart-light","warm-connection","blossom-garden","two-circles"]},
];
test("recommends a real four-clip preset for RU goal, not a provider job",()=>{
 const result=recommendAutoVideo({goal:"Мне нужно успокоиться после стресса, хочется мягкого отдыха",presets:library});
 assert.equal(result.version,AUTO_VIDEO_DIRECTOR_VERSION);
 assert.equal(result.theme,"health");
 assert.equal(result.presetId,"gentle-rest");
 assert.equal(result.kind,"existing_mp4_compilation");
 assert.equal(result.sourceClipIds.length,4);
 assert.equal(result.paidRenderApproved,false);
 assert.equal(result.noExternalClientData,true);
 assert.equal(JSON.stringify(result).includes("успокоиться"),false);
});
test("classifies EN and ES and picks supported symbolic films",()=>{
 assert.equal(recommendAutoVideo({goal:"I need more confidence and focus",presets:library}).theme,"goals");
 assert.equal(recommendAutoVideo({goal:"Quiero más confianza con mi pareja",presets:library}).theme,"relationships");
 assert.equal(recommendAutoVideo({goal:"Trabajo y estabilidad financiera",presets:library}).theme,"money");
});
test("explicit theme override beats ambiguous multi-theme goal",()=>{
 const result=recommendAutoVideo({goal:"I feel stressed at work",presets:library,preferredTheme:"money"});
 assert.equal(result.theme,"money");
 assert.equal(result.confidence,"explicit");
 assert.equal(result.presetId,"steady-foundation");
});
test("respects exclusions and does not silently reintroduce forbidden water",()=>{
 const result=recommendAutoVideo({goal:"Хочу спокойствия без воды",presets:library});
 assert.equal(result.theme,"health");
 assert.equal(result.presetId,"natural-stillness");
 assert.deepEqual(result.excludedMotifs,["water"]);
 assert.equal(result.sourceClipIds.every(s=>!/(sea|ocean|water|coast|falls|stream)/.test(s)),true);
});
test("no matching licensed source is an honest failure, never imaginary video",()=>{
 const result=recommendAutoVideo({goal:"Хочу спокойствия без воды и без леса",presets:library});
 assert.equal(result.kind,"no_matching_licensed_preset");
 assert.equal(result.presetId,null);
 assert.deepEqual(result.sourceClipIds,[]);
});
test("rejects duplicate clips, unfamiliar themes and corrupted payloads",()=>{
 const result=recommendAutoVideo({goal:"confidence",presets:[
   {id:"bad",theme:"goals",clips:["a","a","b","c"]},
   {id:"bad-2",theme:"invented",clips:["a","b","c","d"]},
 ]});
 assert.equal(result.presetId,null);
});
test("defaults to local selected theme when there is no signal, and is stable",()=>{
 const args={goal:"I would like a beautiful video",fallbackTheme:"money",presets:library};
 assert.deepEqual(recommendAutoVideo(args),recommendAutoVideo(args));
 assert.equal(recommendAutoVideo(args).theme,"money");
 assert.equal(recommendAutoVideo({goal:"",presets:library}).confidence,"low");
});
