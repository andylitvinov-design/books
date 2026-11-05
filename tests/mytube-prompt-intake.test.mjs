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
