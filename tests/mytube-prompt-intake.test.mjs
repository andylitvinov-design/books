import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyMyTubeRequest} from "../lib/mandala/mytube-prompt-classifier.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";

const cases=[
 ["хочу меньше тревожиться и ощущать спокойствие","ru","constant-anxiety","stress-anxiety"],
 ["Хочу обрести уверенность в себе","ru","self-confidence","energy-confidence"],
 ["Мы постоянно ссоримся с партнером","ru","couple-conflict","love-relationships"],
 ["стресс на работе","ru","work-stress","stress-anxiety"],
 ["зажимы в теле","ru","muscle-relaxation","energy-confidence"],
 ["не могу начать, прокрастинация","ru","procrastination","goals-money"],
 ["Нужно увеличить мой доход","ru","income-growth","goals-money"],
 ["I feel anxious every day","en","constant-anxiety","stress-anxiety"],
 ["Quiero encontrar pareja","es","find-love","love-relationships"]
];
test("free text maps to real canonical category, subcategory and topic",()=>{
 for(const [query,locale,expectedTopic,expectedCategory] of cases){
  const found=classifyMyTubeRequest(query,locale);
  assert.ok(found,query);
  assert.equal(found.topicId,expectedTopic,query);
  assert.equal(found.categoryId,expectedCategory,query);
  const topic=getMyTubeTopic(found.topicId);
  assert.equal(topic.category.id,found.categoryId);
  assert.equal(topic.subcategory.id,found.subcategoryId);
  assert.ok(["high","medium","low"].includes(found.confidence));
  assert.equal(JSON.stringify(found).includes(query),false,"raw client text must not be returned");
 }
});
test("unrelated or empty requests never produce fake classification",()=>{
 assert.equal(classifyMyTubeRequest(""),null);
 assert.equal(classifyMyTubeRequest("Хочу видео"),null);
 assert.equal(classifyMyTubeRequest(null),null);
 assert.deepEqual(classifyMyTubeRequest("Хочу обрести уверенность в себе","ru"),
  classifyMyTubeRequest("Хочу обрести уверенность в себе","ru"));
});
test("the first-screen Design action controls canonical taxonomy and existing renderer",()=>{
 const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 assert.match(ui,/data-video-request-design/);
 assert.match(ui,/Спроектировать видео/);
 assert.match(ui,/data-video-request-analysis/);
 assert.match(ui,/data-video-request-taxonomy/);
 assert.match(ui,/setSelectedSubcategoryId\(classification\?\.subcategoryId\|\|""\)/);
 assert.match(ui,/setSelectedTopicId\(classification\?\.topicId\|\|""\)/);
 assert.match(ui,/onCategoryChange\?\.\(nextTheme\)/);
 assert.match(ui,/setPromptDesignedFor\(null\);setPromptClassification\(null\)/);
 assert.match(ui,/timelineForTopic\(\s*classification\.topicId,null,recommended/);
 assert.match(ui,/createPortal\(requestInput,requestTarget\)/);
 assert.equal((ui.match(/data-auto-video-input value=\{goal\}/g)||[]).length,1);
 assert.doesNotMatch(ui,/fetch\(/);
});


import {buildPersonalVideoBrief} from "../lib/mandala/mytube-personal-video-brief.mjs";

test("free-text wish survives taxonomy selections and enriches a four-beat film prompt",()=>{
 const a=buildPersonalVideoBrief({
  clientWish:"Хочу меньше тревожиться, больше спокойствия, без воды",
  locale:"ru",categoryId:"stress-anxiety",subcategoryId:"anxiety-fears",
  topicId:"constant-anxiety",excludedMotifs:["water"]
 });
 assert.equal(a.clientWish,"Хочу меньше тревожиться, больше спокойствия, без воды");
 assert.deepEqual(a.hierarchy,["Стресс и тревога","Тревога и страхи","Постоянная тревога"]);
 assert.equal(a.stages.length,4);
 assert.ok(a.prompt.includes(a.clientWish));
 assert.ok(a.prompt.includes(a.hierarchy.join(" → ")));
 assert.ok(a.prompt.includes("Эмоциональный рельеф:"));
 assert.notEqual(a.fromEmotion,a.toEmotion);
 assert.ok(!a.visualTags.includes("water"));
 assert.equal(a.localOnly,true);
 assert.equal(a.requiresLicensedMedia,true);
});
test("user's visual wishes remain visual retrieval hints across RU/EN/ES",()=>{
 for(const input of [
  {clientWish:"Мне нужен лес, свет и новая дорога",locale:"ru",categoryId:"energy-confidence",visual:"forest"},
  {clientWish:"I want a calm film with mountains",locale:"en",categoryId:"stress-anxiety",visual:"mountain"},
  {clientWish:"Quiero un camino en la montaña",locale:"es",categoryId:"goals-money",visual:"path"}
 ]){
  const brief=buildPersonalVideoBrief(input);
  assert.ok(brief.visualTags.includes(input.visual),input.locale);
  assert.ok(brief.stages.every(stage=>stage.sceneQuery.length>4),input.locale);
  assert.equal(brief.clientWish,input.clientWish);
 }
 const mismatch=buildPersonalVideoBrief({
   clientWish:"Хочу близости",categoryId:"stress-anxiety",subcategoryId:"anxiety-fears",
   topicId:"emotional-intimacy",locale:"ru"
 });
 assert.equal(mismatch.topicId,null,"never smuggle a topic from another category");
 assert.equal(mismatch.hierarchy.length,2);
});
test("single screen keeps raw visitor wish while category and scene matchers consume it",()=>{
 const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 const categoryPlanner=readFileSync(new URL("../lib/mandala/category-video-storyboard.mjs",import.meta.url),"utf8");
 const shotPlanner=readFileSync(new URL("../lib/mandala/prompt-shot-director.mjs",import.meta.url),"utf8");
 const emotionPlanner=readFileSync(new URL("../lib/mandala/video-emotional-scene-plan.mjs",import.meta.url),"utf8");
 assert.match(director,/const \[clientWish,setClientWish\]=useState\(""\)/);
 assert.match(director,/setClientWish\(value\);onGoalChange\(value\)/);
 assert.match(director,/const nextGoal=clientWish\.trim\(\)\|\|label/);
 assert.match(director,/const nextGoal=clientWish\.trim\(\)\|\|item\.label/);
 assert.match(director,/stageVisualTags:videoBrief\.stages\.map/);
 assert.match(director,/goal:videoBrief\.prompt/);
 assert.match(director,/stageGoals:videoBrief\.stages\.map/);
 assert.match(director,/personalVisualTags:videoBrief\.visualTags/);
 assert.match(director,/data-video-personal-brief/);
 assert.match(director,/data-video-client-wish-preserved/);
 assert.match(director,/setTimelineEdits\(classification\?timelineForTopic/);
 assert.match(director,/topicSources=scenes\.filter/);
 assert.match(categoryPlanner,/stageVisualTags\[stage\]/);
 assert.match(shotPlanner,/stageSignals=requestedSignals\(stageGoals\[index\]/);
 assert.match(emotionPlanner,/visitorTags\.length\*16/);
 assert.equal((director.match(/data-auto-video-input value=\{goal\}/g)||[]).length,1);
 assert.doesNotMatch(director,/fetch\(/);
});
