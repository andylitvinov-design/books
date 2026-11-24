import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),"utf8");
const manifest=JSON.parse(read("data/video-catalog/standard-motion-films-v1.json"));
const catalogue=JSON.parse(read("data/video-catalog/scene-taxonomy.json"));
const implementation=read("scripts/benchmarking/render-standard-antistress-master.mjs");

test("film is six genuine, separately sourced, approved moving MP4 masters",()=>{
 const film=manifest.films.find(f=>f.id==="anti-stress-30s");
 assert.equal(film.clips.length,6);
 assert.equal(film.durationMs,30000);
 const origins=new Set();
 for(const id of film.clips){
   const scene=catalogue.scenes.find(s=>s.id===id);
   assert.equal(scene.rightsReference.kind,"existing_approved_first_party_master");
   assert.equal(scene.status,"approved");
   assert.equal(scene.media,"licensed_mp4");
   assert.match(scene.video,/^\/videos\/holistic-house\/film-collection-v2\/[a-z-]+\.mp4$/);
   assert.ok(statSync(join(root,"public",scene.video)).size>2048);
   assert.ok(!origins.has(scene.originMasterKeys[0]));
   origins.add(scene.originMasterKeys[0]);
 }
 for(const locale of ["en","ru","es"])assert.equal(film.captions[locale].length,6);
});

test("one-off builder uses original locked FFmpeg Fast Assembly, never still-photo fallback or a provider",()=>{
 assert.match(implementation,/assembleCinematicVideo/);
 assert.match(implementation,/SOURCE_IS_STILL/);
 assert.match(implementation,/frameHash\(path,0\.8\)===frameHash\(path,3\.2\)/);
 assert.match(implementation,/licensed_music/);
 assert.match(implementation,/film-collection-v2/);
 assert.match(implementation,/sourcePhotosUsed:0/);
 assert.doesNotMatch(implementation,/render-image-motion|images\/holistic-house|heygen|kling|LTX/);
});
