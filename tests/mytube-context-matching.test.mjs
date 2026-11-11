import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {classifyMyTubeRequest} from "../lib/mandala/mytube-prompt-classifier.mjs";
import {getMyTubeTopic,getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";

const cases=[
 ["Sex","en","sexuality","love-relationships"],
 ["SEX","ru","sexuality","love-relationships"],
 ["секс","en","sexuality","love-relationships"],
 ["сексуальность","ru","sexuality","love-relationships"],
 ["sexo","es","sexuality","love-relationships"],
 ["sexualidad","en","sexuality","love-relationships"],
 ["libido","es","sexuality","love-relationships"],
 ["хочу секса","ru","sexuality","love-relationships"],
 ["Sleep","en","sleep-rest","energy-confidence"],
 ["бессонница","ru","sleep-rest","energy-confidence"],
 ["sueño","es","sleep-rest","energy-confidence"],
 ["personal boundaries","en","boundaries","love-relationships"],
 ["личные границы","ru","boundaries","love-relationships"],
 ["body image","en","body-image","energy-confidence"],
 ["grief","en","grief","stress-anxiety"],
 ["утрата","ru","grief","stress-anxiety"],
 ["family life","en","family","love-relationships"],
 ["crianza","es","family","love-relationships"],
 ["fresh start","en","transition","goals-money"],
 ["lack of motivation","en","motivation","energy-confidence"],
 ["loneliness","en","loneliness","love-relationships"],
 ["self worth","en","self-worth","energy-confidence"],
 ["creative block","en","creativity","goals-money"]
];
test("12 context directions, EN RU ES and real topic alternatives",()=>{
 for(const [query,locale,contextId,categoryId] of cases){
  const found=classifyMyTubeRequest(query,locale);
  assert.equal(found?.categoryId,categoryId,query);
  assert.equal(found?.contextId,contextId,query);
  assert.equal(found?.matchLevel,"context",query);
  assert.equal(found?.confidence,"low",query);
  assert.equal(found?.suggestedTopicIds?.length,4,query);
  for(const id of found.suggestedTopicIds)
   assert.equal(getMyTubeTopic(id)?.category.id,categoryId,query+" -> "+id);
  assert.equal(Object.hasOwn(found,"request"),false);
 }
 assert.equal(getMyTubeTaxonomy().categories.length,4);
});
test("avoid accidental fragments and conflicting broad requests",()=>{
 for(const text of ["sexism","Essex","сексизм","sex and money","glove","I love my job","love and money"])
  assert.equal(classifyMyTubeRequest(text,"en"),null,text);
 for(const [text,cat] of [["Love","love-relationships"],["Energy","energy-confidence"],["Growth","goals-money"]]){
  const result=classifyMyTubeRequest(text,"en");
  assert.equal(result?.categoryId,cat);
  assert.equal(result?.matchLevel,"category");
  assert.equal(result?.suggestedTopicIds?.length,4);
 }
});
test("Match presents clickable existing taxonomy topics, no second video system",()=>{
 const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 assert.match(ui,/data-video-context-options/);
 assert.match(ui,/data-video-context-option=\{id\}/);
 assert.match(ui,/onClick=\{\(\)=>chooseTaxonomyTopic\(id\)\}/);
 assert.match(ui,/setSelectedCategoryId\(classification.categoryId as CanonicalCategoryId\)/);
 assert.doesNotMatch(ui,/fetch\(/);
});

test("unresolved Match clears stale selected category and provisional intents do not auto-confirm",()=>{
 const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 assert.match(ui,/const broad=matchLevel==="context"\|\|matchLevel==="category"/);
 assert.match(ui,/if\(broad\)setSelectedTopicId\(""\)/);
 assert.match(ui,/setRequestNeedsChoice\(!classification\)/);
 assert.match(ui,/if\(!classification\|\|broad\)\{/);
 assert.match(ui,/setProposal\(null\);setTimelineEdits\(null\);return/);
 assert.match(ui,/aria-pressed=\{selectedCategoryId===item\.id&&!requestNeedsChoice\}/);
 assert.match(ui,/\{selectedCategoryId===item\.id&&!requestNeedsChoice\?<span/);
 assert.match(ui,/subcategoriesOpen&&!requestNeedsChoice/);
 assert.match(ui,/const visibleQuickTopicIds=requestNeedsChoice\?\[\]:/);
 for(const action of ["chooseCategory","chooseTaxonomySubcategory","chooseTaxonomyTopic"]){
  const begin=ui.indexOf(" const "+action+"=");
  assert.ok(begin>0,action);
  assert.match(ui.slice(begin,begin+220),/setRequestNeedsChoice\(false\)/,action);
 }
 assert.match(ui,/data-video-context-options/);
 assert.match(ui,/onClick=\{\(\)=>chooseTaxonomyTopic\(id\)\}/);
});

test("explicit category, popular goal, profile and audience change re-enable manual choices",()=>{
 const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
 for(const action of ["choose","chooseReadyGoal","applyProfile","resetAudienceStory"]){
  const begin=ui.indexOf(" const "+action+"=");
  assert.ok(begin>0,action);
  assert.match(ui.slice(begin,begin+150),/setRequestNeedsChoice\(false\)/,action);
 }
 assert.match(ui,/if\(broad\)setSelectedSubcategoryId\(""\)/);
 assert.match(ui,/else setSelectedSubcategoryId\(classification\?\.subcategoryId\|\|""\)/);
 assert.match(ui,/if\(broad\)setSelectedTopicId\(""\)/);
});
