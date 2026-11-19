import test from "node:test";
import assert from "node:assert/strict";
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {getCompleteFilmScreenplay} from "../lib/mandala/film-screenplay-256.mjs";
import {getFilm256EditorialOverride,film256EditorialOverrideIds}
  from "../lib/mandala/film-256-editorial-overrides.mjs";
import {moneyEditorial} from "../lib/mandala/film-256-money-editorial.mjs";
import {relationshipEditorial} from "../lib/mandala/film-256-relationship-editorial.mjs";

const ids=[
 "money-blocks-s1","money-blocks-s2","money-blocks-s3","money-blocks-s4",
 "couple-conflict-s1","couple-conflict-s2","couple-conflict-s3","couple-conflict-s4"];
const locales=["ru","en","es"];
const sceneTimes=[[0,5],[5,10],[10,15],[15,20],[20,25],[25,30]];
test("eight original films keep the 256 canonical IDs with independent editorial variants",()=>{
 const taxonomy=getMyTubeTaxonomy();
 const taxonomyIds=new Set(taxonomy.categories.flatMap(c=>
   c.subcategories.flatMap(s=>s.topics.flatMap(t=>t.scenarios.map(x=>x.id)))));
 assert.equal(taxonomyIds.size,256);
 assert.equal(film256EditorialOverrideIds.length,12);
 assert.deepEqual(new Set([...Object.keys(moneyEditorial),...Object.keys(relationshipEditorial)]),new Set(ids));
 for(const id of ids){
   assert.ok(taxonomyIds.has(id),id);
   const versions=locales.map(locale=>getCompleteFilmScreenplay(id,locale));
   assert.equal(new Set(versions.map(x=>x.story)).size,3);
   for(const [i,locale] of locales.entries()){
     const story=versions[i],editorial=getFilm256EditorialOverride(id,locale);
     assert.equal(story.editorialTreatment,"individually_directed");
     assert.equal(story.storyboard.length,6);
     assert.equal(editorial.scenes.length,6);
     assert.deepEqual(story.storyboard.map(shot=>shot.action),editorial.scenes);
     assert.deepEqual(story.storyboard.map(shot=>shot.sceneId),story.conceptScenes.map(s=>s.id));
     assert.deepEqual(story.storyboard.map(shot=>[shot.startSeconds,shot.endSeconds]),sceneTimes);
     assert.ok(story.review.status==="pass",id+":"+locale+":"+JSON.stringify(story.review));
     assert.equal(new Set(story.storyboard.map(s=>s.action)).size,6);
     assert.equal(story.mediaBindingStatus,"editorial_only_unverified");
     assert.ok(story.storyboard.every(s=>s.sourceStatus==="editorial_unverified"&&!s.sourceVerified));
     assert.ok(story.storyboard.every((s,i)=>story.sourceStages[s.sourceBeatIndex]===s.sourceBeat),
       "all 6 video scenes retain their original 4-beat catalog provenance");
     assert.doesNotMatch(story.story,/guaranteed cure|must forgive|debes perdonar|обязан простить|чудесное исцеление|→/iu);
   }
 }
});
test("relationship films reject coercion and do not promise an automatic reconciliation",()=>{
 for(const locale of locales){
   const conflict=getCompleteFilmScreenplay("couple-conflict-s4",locale);
   const repair=getCompleteFilmScreenplay("couple-conflict-s3",locale);
   assert.equal(conflict.editorialTreatment,"individually_directed");
   assert.equal(repair.editorialTreatment,"individually_directed");
   const joined=conflict.story+" "+repair.story;
   assert.ok(joined.length>700);
   assert.doesNotMatch(joined,/must forgive|must stay|debes perdonar|tienes que quedarte|обязан терпеть|должен простить/iu);
 }
});
