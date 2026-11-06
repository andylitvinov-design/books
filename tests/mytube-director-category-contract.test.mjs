import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,getMyTubeTopic,auditMyTubeTaxonomy}
 from '../lib/mandala/mytube-content-taxonomy.mjs';

test('director presents one 4x4x4 canonical tree and validates child ownership',()=>{
 const source=readFileSync(new URL('../components/mandala-auto-video-director.tsx',import.meta.url),'utf8');
 const audit=auditMyTubeTaxonomy();
 assert.deepEqual(audit.errors,[]);
 assert.deepEqual(audit.counts,{categories:4,subcategories:16,topics:64,scenarios:256});
 const declaration=source.match(/const videoGoalCategories=\[([\s\S]*?)\] as const;/)?.[1]||'';
 const selected=Array.from(declaration.matchAll(/\{id:"([^"]+)",theme:/g),m=>m[1]);
 assert.equal(selected.length,4);
 const themeMap=source.match(/const legacyThemeForSubcategory:Record<string,VideoTheme>=\{([^}]+)\}/)?.[1]||'';
 const entries=Object.fromEntries(Array.from(themeMap.matchAll(/"([^"]+)":"([^"]+)"/g),m=>[m[1],m[2]]));
 const validThemes=new Set(['energy','money','relationships','goals','life','health']);
 assert.equal(Object.keys(entries).length,16);
 for(const locale of ['ru','en','es']){
  const categories=listMyTubeCategories(locale),subIds=new Set(),topicIds=new Set();
  assert.deepEqual(selected,categories.map(c=>c.id));
  for(const category of categories){
   const subs=listMyTubeSubcategories(category.id,locale);
   assert.equal(subs.length,4);
   for(const sub of subs){
    assert.ok(!subIds.has(sub.id));subIds.add(sub.id);
    assert.ok(validThemes.has(entries[sub.id]),sub.id+' keeps a valid renderer theme');
    const topics=listMyTubeTopics(category.id,sub.id,locale);
    assert.equal(topics.length,4);
    for(const topic of topics){
     assert.ok(!topicIds.has(topic.id));topicIds.add(topic.id);
     const resolved=getMyTubeTopic(topic.id);
     assert.equal(resolved.category.id,category.id);
     assert.equal(resolved.subcategory.id,sub.id);
    }
   }
  }
  assert.equal(subIds.size,16);assert.equal(topicIds.size,64);
 }
 assert.match(source,/taxonomyCategories=listMyTubeCategories\(locale\)/);
 assert.match(source,/listMyTubeSubcategories\(selectedCategoryId,locale\)/);
 assert.match(source,/listMyTubeTopics\(selectedCategoryId,selectedSubcategoryId,locale\)/);
 assert.match(source,/found.category.id!==selectedCategoryId\|\|found.subcategory.id!==selectedSubcategoryId/);
 assert.match(source,/categoryManuallySelected\|\|inferred.categoryId===selectedCategoryId/);
 assert.doesNotMatch(source,/popularTopicOrder|taxonomyCategoryForGoal/);
});
