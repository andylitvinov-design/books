import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics} from '../lib/mandala/mytube-content-taxonomy.mjs';

test('director categories resolve every real MyTube subcategory and topic',()=>{
 const source=readFileSync(new URL('../components/mandala-auto-video-director.tsx',import.meta.url),'utf8');
 const goalMap=source.match(/const taxonomyCategoryForGoal=\{([^}]+)\}/)?.[1]||'';
 const themeMap=source.match(/const legacyThemeForSubcategory:Record<string,VideoTheme>=\{([^}]+)\}/)?.[1]||'';
 const routes=Array.from(goalMap.matchAll(/\w+:"([^"]+)"/g),m=>m[1]);
 const entries=Object.fromEntries(Array.from(themeMap.matchAll(/"([^"]+)":"([^"]+)"/g),m=>[m[1],m[2]]));
 const validThemes=new Set(['energy','money','relationships','goals','life','health']);
 const categories=listMyTubeCategories('en');
 assert.equal(categories.length,4);
 assert.deepEqual(new Set(routes),new Set(categories.map(c=>c.id)));
 for(const category of categories){
   const subcategories=listMyTubeSubcategories(category.id,'en');
   assert.equal(subcategories.length,4,category.id);
   for(const subcategory of subcategories){
     assert.ok(validThemes.has(entries[subcategory.id]),subcategory.id+' has a valid theme');
     assert.equal(listMyTubeTopics(category.id,subcategory.id,'en').length,4,subcategory.id);
   }
 }
 assert.equal(Object.keys(entries).length,16);
});
