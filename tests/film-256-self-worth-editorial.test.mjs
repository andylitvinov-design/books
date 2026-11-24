import test from "node:test";
import assert from "node:assert/strict";
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {getCompleteFilmScreenplay} from "../lib/mandala/film-screenplay-256.mjs";
import {getFilm256EditorialOverride,film256EditorialOverrideIds} from "../lib/mandala/film-256-editorial-overrides.mjs";
import {selfAcceptanceEditorial} from "../lib/mandala/film-256-self-acceptance-editorial.mjs";
import {selfEsteemEditorial} from "../lib/mandala/film-256-self-esteem-editorial.mjs";
const ids=[
 "self-acceptance-s1","self-acceptance-s2","self-acceptance-s3","self-acceptance-s4",
 "low-self-esteem-s1","low-self-esteem-s2","low-self-esteem-s3","low-self-esteem-s4"
];
const locales=["ru","en","es"],times=[[0,5],[5,10],[10,15],[15,20],[20,25],[25,30]];
test("eight self-worth films are individual 6x5s treatments for existing canonical IDs",()=>{
 const j=getMyTubeTaxonomy();
 const known=new Set(j.categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics.flatMap(t=>t.scenarios.map(x=>x.id)))));
 assert.equal(known.size,256);
 assert.equal(film256EditorialOverrideIds.length,20);
 assert.deepEqual(new Set([...Object.keys(selfAcceptanceEditorial),...Object.keys(selfEsteemEditorial)]),new Set(ids));
 for(const id of ids){
   assert.ok(known.has(id));
   for(const locale of locales){
     const film=getCompleteFilmScreenplay(id,locale);
     const editorial=getFilm256EditorialOverride(id,locale);
     assert.equal(film.editorialTreatment,"individually_directed",id+":"+locale);
     assert.equal(film.conceptScenes.length,6);
     assert.equal(film.storyboard.length,6);
     assert.equal(film.storyboard.length,editorial.scenes.length);
     assert.deepEqual(film.storyboard.map(s=>s.visualAction),editorial.scenes);
     assert.deepEqual(film.storyboard.map(s=>s.sceneId),film.conceptScenes.map(s=>s.id));
     assert.deepEqual(film.storyboard.map(s=>[s.startSeconds,s.endSeconds]),times);
     assert.equal(new Set(film.storyboard.map(s=>s.action)).size,6);
     assert.equal(film.review.status,"pass",id+":"+locale+":"+JSON.stringify(film.review));
     assert.ok(film.storyboard.every(s=>s.sourceVerified===false&&s.sourceStatus==="editorial_unverified"));
     assert.equal(film.mediaBindingStatus,"editorial_only_unverified");
     assert.equal(film.sourceStages.length,4);
     assert.doesNotMatch(film.story,/guaranteed cure|must forgive|you are cured|debes perdonar|исцел[её]н навсегда|→/iu);
   }
 }
});
test("new films preserve different character actions, no magic transformation",()=>{
 for(const locale of locales){
  const scriptIds=ids.map(id=>getCompleteFilmScreenplay(id,locale));
  assert.equal(new Set(scriptIds.map(s=>s.story)).size,8);
  assert.equal(new Set(scriptIds.map(s=>s.symbol)).size,8);
  assert.ok(scriptIds.every(s=>s.storyboard[0].action!==s.storyboard[5].action));
 }
});
