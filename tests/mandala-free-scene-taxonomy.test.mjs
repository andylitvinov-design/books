import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {recommendAutoVideo} from "../lib/mandala/auto-video-director.mjs";

const projectRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const read=(path)=>readFileSync(join(projectRoot,path),"utf8");
const scenes=JSON.parse(read("data/video-catalog/scene-taxonomy.json")).scenes;
const presets=JSON.parse(read("data/video-catalog/free-film-presets-v2.json")).presets;
const director=read("components/mandala-auto-video-director.tsx");
const studio=read("components/mandala-free-video-studio.tsx");

test("all 44 first-party MP4s have local footage, poster, category, tags, RU/EN/ES description",()=>{
 assert.equal(scenes.length,44);
 assert.equal(new Set(scenes.map(item=>item.id)).size,44);
 const themeCounts={};
 for(const scene of scenes){
   assert.equal(scene.status,"approved");
   assert.equal(scene.media,"licensed_mp4");
   assert.ok(["money","energy","life","health","goals","relationships"].includes(scene.theme));
   themeCounts[scene.theme]=(themeCounts[scene.theme]||0)+1;
   assert.ok(Array.isArray(scene.tags)&&scene.tags.length>=3);
   assert.ok(Array.isArray(scene.categories)&&scene.categories.includes(scene.theme));
   assert.ok(scene.rightsReference);
   for(const locale of ["ru","en","es"]){
     assert.ok(scene.label[locale]?.trim(),scene.id+" title "+locale);
     assert.ok(scene.description[locale]?.trim(),scene.id+" description "+locale);
   }
   for(const key of ["video","poster"]){
     assert.match(scene[key],/^\/videos\/holistic-house\/(?:money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.(?:mp4|jpg)$/);
     assert.ok(statSync(join(projectRoot,"public",scene[key])).size>1024,scene[key]+" is real, not an invented file");
   }
 }
 assert.deepEqual(themeCounts,{money:16,energy:8,life:8,health:9,goals:1,relationships:2});
});

test("the 24 new four-shot scenarios cover every CC-BY Dareful film",()=>{
 assert.equal(presets.length,24);
 const ids=new Set();
 const used=new Set(presets.flatMap(p=>p.clips));
 const extras=scenes.filter(s=>s.collection==="film-collection-v3");
 assert.equal(extras.length,12);
 for(const p of presets){
   assert.ok(!ids.has(p.id));ids.add(p.id);
   assert.equal(p.clips.length,4);
   assert.equal(new Set(p.clips).size,4);
   assert.ok(Array.isArray(p.focusTags)&&p.focusTags.length);
   assert.ok(p.clips.every(id=>scenes.some(s=>s.id===id)));
 }
 for(const extra of extras){
   assert.ok(used.has(extra.id),extra.id+" should be offered in a complete free montage");
   assert.match(extra.rightsReference.attribution,/CC BY 4.0/);
 }
 assert.match(studio,/extraFreeFilmPresets\.presets/);
 assert.match(studio,/FREE_FILM_CATALOG_BY_ID/);
 assert.match(director,/scene\.description\[locale\]/);
 assert.match(director,/scene\.tags\.slice/);
});

test("local recommendation honors real visual motifs, including hidden water in horizons",()=>{
 const recommended=recommendAutoVideo({
   goal:"Хочу спокойствия без воды и без леса",locale:"ru",
   preferredTheme:"health",presets,scenes
 });
 assert.equal(recommended.kind,"existing_mp4_compilation");
 assert.equal(recommended.presetId,"soft-reset");
 assert.equal(recommended.sourceClipIds.length,4);
 assert.ok(recommended.sourceClipIds.every(id=>{
   const m=scenes.find(s=>s.id===id);
   return !m.motifs.some(tag=>["sea","ocean","water","lake","river","stream","coast","beach","forest","trees","tree","garden"].includes(tag));
 }));
 const horizon=recommendAutoVideo({
   goal:"Без воды, хочу ясности и новых горизонтов",locale:"ru",
   preferredTheme:"goals",presets,scenes
 });
 // All currently curated goals presets contain water. Do not invent a
 // replacement: the director must tell the caller there is no match.
 assert.equal(horizon.kind,"no_matching_licensed_preset");
 assert.ok(!horizon.sourceClipIds.includes("soft-horizon"),
   "actual sea imagery must not bypass water exclusion via an innocent-looking scene ID");
 assert.ok(!JSON.stringify(horizon).includes("горизонтов"),"private request text never copied into public storyboard");
});

test("an unknown, unlicensed or inaccurate scene is never suggested",()=>{
 const bad=presets[0],corrupted=[...scenes,{id:"unlicensed-clip",status:"pending",media:"licensed_mp4",
  video:"/videos/holistic-house/film-collection-v3/unlicensed-clip.mp4",tags:[],motifs:[]}];
 const result=recommendAutoVideo({goalId:"stability",scenes:corrupted,presets:[
   {id:"bad",theme:"money",clips:[...bad.clips.slice(0,3),"unlicensed-clip"]}
 ]});
 assert.equal(result.kind,"no_matching_licensed_preset");
 assert.equal(result.paidRenderApproved,false);
 assert.equal(result.noExternalClientData,true);
});

