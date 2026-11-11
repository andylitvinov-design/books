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
