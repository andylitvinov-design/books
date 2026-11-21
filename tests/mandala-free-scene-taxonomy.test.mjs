import "./openmotion-standard-antistress.test.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import {recommendAutoVideo} from "../lib/mandala/auto-video-director.mjs";
import {QUESTION_REGISTRY,isLocalVideoOptionAvailable} from "../lib/mandala/video-studio-question-registry.mjs";

const projectRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const read=(path)=>readFileSync(join(projectRoot,path),"utf8");
const scenes=JSON.parse(read("data/video-catalog/scene-taxonomy.json")).scenes;
const presets=JSON.parse(read("data/video-catalog/free-film-presets-v2.json")).presets;
const director=read("components/mandala-auto-video-director.tsx");
const studio=read("components/mandala-free-video-studio.tsx");
const optionUi=read("components/mandala-cinematic-director.tsx");

test("all approved first-party MP4s have local footage, poster, category, tags, RU/EN/ES description",()=>{
 assert.ok(scenes.length>=44,'never lose the original approved MP4s');
 assert.equal(new Set(scenes.map(item=>item.id)).size,56);
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
 for(const [theme,count] of Object.entries({money:16,energy:8,life:8,health:9,goals:1,relationships:2}))
   assert.ok(themeCounts[theme]>=count,theme+' original approved masters must survive expansion');
});

test("the 25 four-shot scenarios cover both formats of licensed sunshine films",()=>{
 assert.equal(presets.length,25);
 const ids=new Set();
 const used=new Set(presets.flatMap(p=>[...p.clips,...(p.portraitClips||[])]));
 const extras=scenes.filter(s=>s.collection==="film-collection-v3");
 assert.ok(extras.length>=12);
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

test("49 Director questions truthfully expose local/free vs AI-only options with crowns",()=>{
 assert.equal(QUESTION_REGISTRY.length,49);
 assert.equal(new Set(QUESTION_REGISTRY.map(q=>q.id)).size,49);
 for(const q of QUESTION_REGISTRY){
   assert.ok(["free","mixed","premium"].includes(q.tier));
   for(const option of q.options)
     assert.equal(q.freeOptionIds.includes(option.id),isLocalVideoOptionAvailable(q.id,option.id));
 }
 assert.equal(isLocalVideoOptionAvailable("BASIC_05","30"),true);
 assert.equal(isLocalVideoOptionAvailable("BASIC_06","portrait"),true);
 assert.equal(isLocalVideoOptionAvailable("BASIC_09","calm"),true);
 assert.equal(isLocalVideoOptionAvailable("BASIC_10","phrases"),true);
 assert.equal(isLocalVideoOptionAvailable("BASIC_10","subtitles"),false);
 assert.equal(isLocalVideoOptionAvailable("PRO_16","around"),false);
 assert.equal(isLocalVideoOptionAvailable("PERSONAL_06","animal"),false);
 assert.match(optionUi,/data-video-option-tier=\{question\.freeOptionIds/);
 assert.match(optionUi,/<Crown/);
 assert.doesNotMatch(director,/fetch\(/);
});

// The existing focused Mandala job also verifies the optional original-motion library.
import "./original-motion-library.test.mjs";

import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {listApprovedLocalFilmScenes} from "../lib/video-discovery/approved-local-scenes.mjs";
import {isMyTubeEducationalVideo,matchesMyTubeShelf} from "../lib/video-discovery/mytube-shelves.mjs";

test("MyTube exposes only the 12 locally present two-source CC BY 4.0 film composites",()=>{
 const publicScenes=listApprovedLocalFilmScenes("ru");
 assert.equal(publicScenes.length,12);
 assert.equal(new Set(publicScenes.map(item=>item.id)).size,12);
 const english=listApprovedLocalFilmScenes("en");
 const spanish=listApprovedLocalFilmScenes("es");
 assert.deepEqual(publicScenes.map(item=>item.id),english.map(item=>item.id));
 assert.deepEqual(publicScenes.map(item=>item.id),spanish.map(item=>item.id));
 for(const item of publicScenes){
   assert.equal(item.kind,"video");
   assert.equal(item.sourceGroup,"approved-local-film-scenes");
   assert.equal(item.sourceApproved,true);
   assert.equal(item.curation,"verified");
   assert.equal(item.mediaRightsApproved,true);
   assert.equal(item.localMediaVerified,true);
   assert.equal(item.mediaLicense,"CC BY 4.0");
   assert.equal(item.durationVerifiedSeconds,5);
   assert.match(item.videoSrc,/^\/videos\/holistic-house\/film-collection-v3\/[a-z0-9-]+\.mp4$/);
   assert.match(item.image,/^\/videos\/holistic-house\/film-collection-v3\/[a-z0-9-]+\.jpg$/);
   const videoPath=join(projectRoot,"public",item.videoSrc);
   const posterPath=join(projectRoot,"public",item.image);
   assert.ok(existsSync(videoPath),item.id+" MP4 exists in public assets");
   assert.ok(existsSync(posterPath),item.id+" poster exists in public assets");
   const bytes=readFileSync(videoPath);
   assert.equal(bytes.length,item.mediaBytes,item.id+" byte count matches reviewed manifest");
   assert.equal(createHash("sha256").update(bytes).digest("hex"),item.mediaSha256,item.id+" content hash matches manifest");
   assert.match(item.mediaAttribution,/Joel Holland|Dareful/);
   assert.ok(matchesMyTubeShelf(item,"videos"),item.id+" appears on MyTube Videos shelf");
   assert.ok(isMyTubeEducationalVideo(item),item.id+" is a playable public video");
 }
 const unreviewed={
   id:"research-only",sourceGroup:"approved-local-film-scenes",kind:"video",
   sourceApproved:true,curation:"verified",mediaRightsApproved:false,localMediaVerified:false,
   mediaLicense:"CC BY 4.0",videoSrc:"/videos/holistic-house/film-collection-v3/fake.mp4",
   image:"/videos/holistic-house/film-collection-v3/fake.jpg",durationVerifiedSeconds:5,
 };
 assert.equal(matchesMyTubeShelf(unreviewed,"videos"),false);
 assert.equal(isMyTubeEducationalVideo(unreviewed),false);
 assert.equal(listApprovedLocalFilmScenes("ru").length,12,"unverified external/research candidates remain excluded");
});

test("MyTube local films open the native inline MP4 player and show license attribution",()=>{
 const feed=read("components/library-feed.tsx");
 assert.match(feed,/Boolean\(item\.youtubeId \|\| item\.videoSrc\)/);
 assert.match(feed,/<video className=\{styles\.iframe\} data-local-video-player/);
 assert.match(feed,/controls playsInline preload="metadata" poster=\{poster\}/);
 assert.match(feed,/data-video-attribution/);
 assert.match(feed,/mediaAttributionUrl/);
});
