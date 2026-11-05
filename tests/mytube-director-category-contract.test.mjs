import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic,auditMyTubeTaxonomy}
 from "../lib/mandala/mytube-content-taxonomy.mjs";

const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");

test("public director has one exact 4/16/64/256 canonical tree, with no duplicated subcategories",()=>{
 const audit=auditMyTubeTaxonomy();
 assert.deepEqual(audit.errors,[]);
 assert.deepEqual(audit.counts,{categories:4,subcategories:16,topics:64,scenarios:256});
 const declaration=director.match(/const videoGoalCategories=\[([\s\S]*?)\] as const;/)?.[1]||"";
 const actualIds=Array.from(declaration.matchAll(/\{id:"([^"]+)",theme:/g),m=>m[1]);
 for(const locale of ["ru","en","es"]){
  const categories=listMyTubeCategories(locale);
  assert.deepEqual(actualIds,categories.map(item=>item.id),"front-end IDs equal the catalog");
  const ids=new Set(),topics=new Set(),labels=new Set();
  for(const category of categories){
   const subcategories=listMyTubeSubcategories(category.id,locale);
   assert.equal(subcategories.length,4,category.id);
   for(const sub of subcategories){
    assert.ok(!ids.has(sub.id),"duplicate subcategory: "+sub.id);ids.add(sub.id);
    const label=sub.label.normalize("NFKC").trim().toLocaleLowerCase(locale);
    assert.ok(!labels.has(label),"duplicate label: "+sub.label);labels.add(label);
    const entries=listMyTubeTopics(category.id,sub.id,locale);
    assert.equal(entries.length,4,sub.id);
    for(const topic of entries){
     assert.ok(!topics.has(topic.id),"duplicate topic: "+topic.id);topics.add(topic.id);
     const item=getMyTubeTopic(topic.id);
     assert.equal(item.category.id,category.id);
     assert.equal(item.subcategory.id,sub.id);
    }
   }
  }
  assert.equal(ids.size,16);assert.equal(topics.size,64);
 }
 assert.match(director,/taxonomyCategories=listMyTubeCategories\(locale\)/);
 assert.match(director,/listMyTubeSubcategories\(selectedCategoryId,locale\)/);
 assert.match(director,/listMyTubeTopics\(selectedCategoryId,selectedSubcategoryId,locale\)/);
 assert.match(director,/profileSubcategories\.map\(item=>/);
 assert.doesNotMatch(director,/popularTopicOrder|popularTopicCopy|taxonomyCategoryForGoal/);
});

test("relationship closeness stays under Love, self-confidence under Energy",()=>{
 const closeness=getMyTubeTopic("emotional-intimacy");
 assert.equal(closeness.category.id,"love-relationships");
 assert.equal(closeness.subcategory.id,"intimacy-family");
 const confidence=getMyTubeTopic("self-confidence");
 assert.equal(confidence.category.id,"energy-confidence");
 assert.equal(confidence.subcategory.id,"confidence-calm");
 assert.match(director,/categoryManuallySelected\|\|inferred.categoryId===selectedCategoryId/);
 assert.match(director,/found.category.id!==selectedCategoryId\|\|found.subcategory.id!==selectedSubcategoryId/);
});
