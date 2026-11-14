import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPersonalVideoBrief} from "../lib/mandala/mytube-personal-video-brief.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("the exact client wish remains local and builds four editorial beats",()=>{
 const wish="Хочу меньше тревожиться, больше спокойствия, без воды";
 const result=buildPersonalVideoBrief({clientWish:wish,locale:"ru",
   categoryId:"stress-anxiety",subcategoryId:"anxiety-fears",topicId:"constant-anxiety",
   excludedMotifs:["water"]});
 assert.equal(result.clientWish,wish);
 assert.equal(result.stages.length,4);
 assert.equal(result.prompt.includes(wish),true);
 assert.equal(result.localOnly,true);
 assert.equal(result.requiresLicensedMedia,true);
 assert.ok(!result.visualTags.includes("water"));
 assert.ok(result.stages.every(stage=>stage.sceneQuery.length>0));
 assert.notEqual(result.fromEmotion,result.toEmotion);
});
test("visual intents stay multilingual, and unrelated taxonomy IDs never leak in",()=>{
 for(const {clientWish,locale,categoryId,tag} of [
  {clientWish:"Хочу лес, свет и новую дорогу",locale:"ru",categoryId:"energy-confidence",tag:"forest"},
  {clientWish:"I want a calm film with mountains",locale:"en",categoryId:"stress-anxiety",tag:"mountain"},
  {clientWish:"Quiero un camino en la montaña",locale:"es",categoryId:"goals-money",tag:"path"},
 ]){
  const plan=buildPersonalVideoBrief({clientWish,locale,categoryId});
  assert.equal(plan.clientWish,clientWish);
  assert.ok(plan.visualTags.includes(tag),locale+": "+tag);
  assert.equal(plan.stages.length,4);
  assert.ok(plan.stages.every(stage=>stage.sceneQuery.trim().length>0));
 }
 const invalid=buildPersonalVideoBrief({clientWish:"Хочу близости",
   categoryId:"stress-anxiety",subcategoryId:"anxiety-fears",
   topicId:"emotional-intimacy",locale:"ru"});
 assert.equal(invalid.topicId,null);
 assert.equal(invalid.hierarchy.length,2);
});
test("one existing input influences live 4-beat planning; all media gates remain strict",()=>{
 const director=read("components/mandala-auto-video-director.tsx");
 const category=read("lib/mandala/category-video-storyboard.mjs");
 const shots=read("lib/mandala/prompt-shot-director.mjs");
 const emotional=read("lib/mandala/video-emotional-scene-plan.mjs");
 assert.equal((director.match(/data-auto-video-input value=\{requestDraft\}/g)||[]).length,1);
 for(const marker of [
  "const clientWish=requestDraft.trim()",
  "buildPersonalVideoBrief({",
  "stageVisualTags:clientWish?videoBrief.stages.map",
  "goal:clientWish?videoBrief.prompt:goal",
  "stageGoals:clientWish?videoBrief.stages.map",
  "personalVisualTags:clientWish?videoBrief.visualTags",
  "goal:topicBrief.prompt",
  "data-video-personal-brief",
  "requestDrafts,setRequestDrafts",
  "verifiedSceneAspect"
 ])assert.ok(director.includes(marker),marker);
 assert.match(category,/stageVisualTags=\[\]/);
 assert.match(category,/visitorStage=Array\.isArray\(stageVisualTags\[stage\]\)/);
 assert.match(shots,/stageSignals=requestedSignals\(stageGoals\[index\]/);
 assert.match(emotional,/visitorTags=requestedVisualTags\.filter/);
 assert.match(director,/validateMontageClips\(\[\.\.\.rankedIds\],scenes,recommended\.excludedMotifs,aspect\)/);
 assert.doesNotMatch(director,/setPersonalWish|localStorage|sessionStorage/);
});
