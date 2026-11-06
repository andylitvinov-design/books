import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import {createHash} from "node:crypto";
import {isApprovedMontageScene,validateMontageClips,montageReplacementOptions} from "../lib/mandala/video-montage-sources.mjs";
import {videoQualityEvidence} from "../lib/mandala/video-quality-evidence.mjs";
// Run physical SHA, two-aspect crop and source-rights proof inside the existing HD specialist CI.
import "./warm-sunlight-filmed-release.test.mjs";
const json=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const catalog=json("data/video-catalog/scene-taxonomy.json");
const sources=json("data/video-catalog/free-stock-scenes.json");
const presets=json("data/video-catalog/free-film-presets-v2.json").presets;
const release=json("data/video-catalog/hd-published-20261105.json");
const ids=["sun-trees-forest","warm-clouds-sunset","fall-foliage-forest","snow-forest-winter"];
test("only four edited moving CC BY nature masters were promoted and all physical SHA-256 match",()=>{
 assert.equal(catalog.count,56);
 assert.equal(catalog.scenes.length,56);
 assert.equal(sources.length,24);
 assert.equal(release.targetCountTotal,732);
 assert.equal(release.creditedSourceVideoIds.length,4);
 assert.equal(new Set(catalog.scenes.map(s=>s.id)).size,56);
 assert.equal(release.userViewedEachIndividualClip,false);
 for(const id of ids){
  const scene=catalog.scenes.find(s=>s.id===id),master=sources.find(s=>s.id===id);
  assert.ok(scene&&master,id);
  assert.equal(isApprovedMontageScene(scene),true);
  assert.equal(master.sourceKind,"licensed_single_shot_edit");
  assert.equal(master.sources.length,1);
  assert.equal(master.sources[0].licenseId,"cc_by_4_0");
  assert.equal(master.sources[0].licenseUrl,"https://creativecommons.org/licenses/by/4.0/");
  assert.equal(master.sources[0].sourcePage,"https://dareful.com/"+id+"/");
  assert.equal(master.sources[0].rawOriginalSha256,null);
  assert.deepEqual(scene.allowedAspects,["portrait"]);
  assert.equal(scene.technicalQuality.reviewedFrames,120);
  assert.equal(scene.technicalQuality.sourceOriginalLandscapeCrop,true);
  assert.equal(videoQualityEvidence(scene).tier,"editorially_reviewed_encoded_portrait_hd");
  assert.match(scene.rightsReference.attribution,/Joel Holland.*CC BY 4.0/);
  for(const [p,hash] of [[scene.video,master.sha256]]){
   const file=new URL("../public"+p,import.meta.url);
   assert.equal(existsSync(file),true,id);
   assert.equal(statSync(file).size,master.bytes,id);
   assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"),hash,id);
  }
  assert.equal(statSync(new URL("../public"+scene.poster,import.meta.url)).size>2000,true);
 }
});
test("existing portrait-only footage cannot pass native landscape or square selection",()=>{
 const chosen=["forest-balance","gentle-breath","fresh-chapter","kind-connection"];
 for(const name of chosen){
  const item=presets.find(p=>p.id===name);
  assert.ok(item?.portraitClips,name);
  assert.equal(new Set(item.portraitClips).size,4);
  assert.equal(item.portraitClips.filter(id=>ids.includes(id)).length,1);
  assert.equal(validateMontageClips(item.clips,catalog.scenes,[],"landscape"),false);
  assert.equal(validateMontageClips(item.clips,catalog.scenes,[],"portrait"),true);
  assert.equal(validateMontageClips(item.portraitClips,catalog.scenes,[],"portrait"),true);
  assert.equal(validateMontageClips(item.portraitClips,catalog.scenes,[],"landscape"),false);
  assert.equal(validateMontageClips(item.portraitClips,catalog.scenes,[],"square"),false);
 }
 const land=montageReplacementOptions({scenes:catalog.scenes,currentId:"forest-renewal",
   selectedIds:["forest-renewal"],targetAspect:"landscape",limit:12});
 assert.ok(land.every(scene=>!ids.includes(scene.id)));
 assert.equal(release.originalsNotRedistributed,true);
});
test("public credits include each original page, CC BY license and crop modification",()=>{
 const page=readFileSync(new URL("../public/videos/holistic-house/film-collection-v3/hd-credits-20261105.html",import.meta.url),"utf8");
 for(const id of ids) assert.ok(page.includes("https://dareful.com/"+id+"/"));
 assert.match(page,/creativecommons\.org\/licenses\/by\/4\.0/);
 assert.match(page,/cropped/);
 assert.match(page,/not native vertical Full HD/);
});