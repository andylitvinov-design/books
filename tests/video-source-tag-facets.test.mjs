import test from "node:test";
import assert from "node:assert/strict";
import original from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import master from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import ranking from "../data/video-catalog/mytube-scene-rankings-v1.json" with {type:"json"};
import money from "../public/videos/holistic-house/money-films-v1/manifest.json" with {type:"json"};
import film from "../public/videos/holistic-house/film-collection-v2/manifest.json" with {type:"json"};
import stock from "../data/video-catalog/free-stock-scenes.json" with {type:"json"};
import {MYTUBE_VISUAL_MOTIFS,MYTUBE_VISUAL_STYLES} from "../lib/mandala/mytube-creative-choices.mjs";
import {auditVideoSceneTags,deriveVideoSceneTags,
 physicalSceneAspect,sceneSupportsPhysicalAspect} from "../lib/mandala/video-source-tag-facets.mjs";
import {validateMontageClips} from "../lib/mandala/video-montage-sources.mjs";

test("all 732 approved MP4s have conservative multi-facet tags",()=>{
 const topicsById=Object.fromEntries(ranking.scenes.map(x=>[x.sceneId,x.topics]));
 const audit=auditVideoSceneTags([...master.scenes,...original.scenes],{
  motifs:MYTUBE_VISUAL_MOTIFS,styles:MYTUBE_VISUAL_STYLES,topicsById,
 });
 assert.deepEqual(audit.missing,[]);
 assert.equal(audit.total,732);
 assert.equal(audit.tagged,732);
 assert.deepEqual(audit.sourceKinds,{licensed:48,procedural:684});
 assert.deepEqual(audit.aspectCounts,{portrait:732,landscape:0,square:0});
 assert.ok(audit.withStyleCandidates>0);
 assert.ok(audit.withMotifCandidates>0);
 assert.ok(audit.records.every(x=>x.subjectTags.length&&x.searchableTags.length&&x.productionStyle));
 assert.ok(audit.records.every(x=>x.evidence.doesNotGrantPublicationRights));
 assert.ok(audit.records.every(x=>x.physicalAspect==="portrait"));
});
test("all 44 legacy licensed MP4s are portrait despite absent allowedAspects",()=>{
 const geo=[...money.scenes,...film.scenes,...stock];
 assert.equal(geo.length,48);
 assert.equal(master.scenes.filter(x=>x.allowedAspects===undefined).length,44);
 const byId=new Map(geo.map(x=>[x.id,x]));
 for(const scene of master.scenes){
  const physical=byId.get(scene.id);
  assert.ok(physical&&physical.width<physical.height,scene.id);
  assert.equal(physicalSceneAspect(scene),"portrait");
  assert.equal(sceneSupportsPhysicalAspect(scene,"portrait"),true);
  assert.equal(sceneSupportsPhysicalAspect(scene,"landscape"),false);
  assert.equal(sceneSupportsPhysicalAspect(scene,"square"),false);
 }
 for(const scene of original.scenes){
  assert.equal(scene.width,432);
  assert.equal(scene.height,768);
  assert.equal(sceneSupportsPhysicalAspect(scene,"landscape"),false);
 }
});
test("landscape requires true geometry and matching aspect metadata",()=>{
 const wide={id:"true-wide",collection:"film-collection-v3",width:1280,height:720,allowedAspects:["landscape"]};
 assert.equal(sceneSupportsPhysicalAspect(wide,"landscape"),true);
 assert.equal(sceneSupportsPhysicalAspect(wide,"portrait"),false);
 assert.equal(sceneSupportsPhysicalAspect({...wide,allowedAspects:["portrait"]},"landscape"),false);
 assert.equal(sceneSupportsPhysicalAspect({...wide,width:undefined,height:undefined},"landscape"),false);
 assert.equal(sceneSupportsPhysicalAspect({collection:"not-trusted"},"landscape"),false);
 assert.equal(sceneSupportsPhysicalAspect(wide,"cinemascope"),false);
});
test("composer refuses four physical portrait masters for a 16:9 selection",()=>{
 const four=master.scenes.slice(0,4);
 assert.equal(validateMontageClips(four.map(x=>x.id),four,[],"portrait"),true);
 assert.equal(validateMontageClips(four.map(x=>x.id),four,[],"landscape"),false);
});
test("editorial tags never upgrade unapproved sources or assert frame proof",()=>{
 const scene=master.scenes[0];
 const tags=deriveVideoSceneTags(scene,{styles:MYTUBE_VISUAL_STYLES,motifs:MYTUBE_VISUAL_MOTIFS});
 assert.ok(tags.subjectTags.includes("gold"));
 assert.equal(tags.evidence.subject,"catalog_metadata_not_independently_frame_verified");
 assert.equal(deriveVideoSceneTags({...scene,status:"candidate"}),null);
 assert.equal(deriveVideoSceneTags({...scene,rightsReference:{kind:null}}),null);
 assert.throws(()=>auditVideoSceneTags([scene,scene]),/DUPLICATE_SOURCE/);
});
