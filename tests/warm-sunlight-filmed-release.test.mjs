import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {isApprovedMontageScene,validateMontageClips} from "../lib/mandala/video-montage-sources.mjs";
import {rankAllApprovedMyTubeScenes,recommendMyTubeTopicStoryClips} from "../lib/mandala/mytube-video-tagging.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url));
const json=p=>JSON.parse(read(p).toString("utf8"));
const master=json("data/video-catalog/scene-taxonomy.json");
const stock=json("data/video-catalog/free-stock-scenes.json");
const preset=json("data/video-catalog/free-film-presets-v2.json").presets.find(x=>x.id==="warm-pleasant-sun");
const importProof=json("data/video-catalog/sunlight-physical-import-evidence-20261106.json");
test("4 genuine Dareful filmed originals are 8 real dual-aspect H264 media variants",()=>{
 assert.equal(master.scenes.length,56);
 assert.equal(stock.length,24);
 assert.equal(importProof.sources.length,4);
 assert.equal(importProof.distinctOriginalFilms,4);
 assert.equal(importProof.registeredPhysicalMp4Variants,8);
 assert.equal(importProof.ownerViewedEachSource,false);
 assert.equal(new Set(importProof.sources.map(x=>x.sourcePage)).size,4);
 for(const src of importProof.sources){
  assert.match(src.sourcePage,/^https:\/\/dareful\.com\//);
  assert.ok(src.sourceArtQuality.portraitMotion>0.5);
  for(const aspect of ["landscape","portrait"]){
   const id=src.id+(aspect==="portrait"?"-portrait":"");
   const scene=master.scenes.find(s=>s.id===id);
   const item=stock.find(s=>s.id===id);
   const v=src.variants[aspect];
   assert.ok(scene&&item,id);
   assert.ok(isApprovedMontageScene(scene));
   assert.deepEqual(scene.allowedAspects,[aspect]);
   assert.equal(scene.sourceOriginalGroupId,src.id);
   assert.equal(item.sourceOriginalGroupId,src.id);
   assert.equal(scene.rightsReference.sourcePage,src.sourcePage);
   assert.equal(scene.rightsReference.kind,"dareful_cc_by_4_0");
   assert.match(scene.rightsReference.attribution,/Joel Holland.*CC BY 4.0/);
   assert.equal(scene.video,v.video);
   assert.equal(scene.poster,v.poster);
   assert.equal(v.width,aspect==="portrait"?720:1280);
   assert.equal(v.height,aspect==="portrait"?1280:720);
   assert.equal(v.fps,24);
   const movie=read("public"+v.video);
   assert.equal(movie.byteLength,v.bytes);
   assert.equal(createHash("sha256").update(movie).digest("hex"),v.sha256);
   assert.equal(item.sha256,v.sha256);
   const poster=read("public"+v.poster);
   assert.ok(poster.length>3000);
   assert.equal(createHash("sha256").update(poster).digest("hex"),v.posterSha256);
  }
 }
 assert.ok(preset);
 for(const locale of ["ru","en","es"])assert.ok(preset.label[locale]);
 assert.equal(preset.clips.length,4);
 assert.equal(preset.portraitClips.length,4);
 assert.equal(validateMontageClips(preset.clips,master.scenes,[],"landscape"),true);
 assert.equal(validateMontageClips(preset.portraitClips,master.scenes,[],"portrait"),true);
 assert.equal(validateMontageClips(preset.clips,master.scenes,[],"portrait"),false);
 assert.equal(validateMontageClips(preset.portraitClips,master.scenes,[],"landscape"),false);
 assert.equal(validateMontageClips([preset.clips[0],preset.portraitClips[0],preset.clips[1],preset.clips[2]],master.scenes,[],null),false);
});
test("MyTube doesn't double-count aspect crops as separate film origins",()=>{
 assert.equal(rankAllApprovedMyTubeScenes(master.scenes).length,56);
 const clips=recommendMyTubeTopicStoryClips({topicId:"calm-presence",scenes:master.scenes,targetAspect:null,minTopicScore:60});
 const keys=clips.clipIds.map(id=>master.scenes.find(s=>s.id===id)?.sourceOriginalGroupId||id);
 assert.equal(new Set(keys).size,keys.length);
});
