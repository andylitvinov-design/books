import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {readFileSync,statSync} from "node:fs";

const here = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, here));
const root = "public/videos/holistic-house/film-collection-v2/";
const expectScenes = {
 money:["wealth-sunrise","golden-harvest","radiant-portal","prosperity-coast"],
 energy:["solar-surge","ocean-pulse","sunbeam-flow","river-power","desert-light","mountain-air"],
 life:["wildflower-dance","fern-awakening","coastal-freedom","lone-tree","meadow-morning"],
 health:["calm-sea","morning-dew","mossy-stream","gentle-falls","sea-breeze"],
};
test("Twenty licensed moving FULL HD H264 masters include their own first-party posters",()=>{
 const manifest = JSON.parse(read(root+"manifest.json").toString());
 assert.equal(manifest.version,2);
 assert.equal(manifest.format,"h264-mp4");
 assert.equal(manifest.width,1080);
 assert.equal(manifest.height,1920);
 assert.equal(manifest.fps,24);
 assert.equal(manifest.animated,true);
 assert.equal(manifest.sourceFootagePublished,false);
 assert.match(manifest.license,/supareels.com\/stock-footage-licence/);
 assert.equal(manifest.scenes.length,20);
 const fingerprints = new Set();
 for(const [theme,ids] of Object.entries(expectScenes)){
   assert.equal(manifest.scenes.filter(row=>row.theme===theme).length,ids.length,theme+" count");
   for(const id of ids){
     const row=manifest.scenes.find(item=>item.id===id);
     assert.ok(row,theme+" "+id);
     assert.equal(row.theme,theme);
     assert.equal(row.width,1080);
     assert.equal(row.height,1920);
     assert.equal(row.fps,24);
     assert.equal(row.durationSeconds,5);
     assert.match(row.video,new RegExp(id+"\\.mp4$"));
     assert.match(row.poster,new RegExp(id+"\\.jpg$"));
     assert.match(row.originalSourcePage,/^https:\/\/supareels.com\/b-roll\//);
     const binary=read(root+id+".mp4");
     assert.equal(binary.subarray(4,8).toString(),"ftyp");
     assert.ok(binary.includes(Buffer.from("moov")),id+" must be seekable");
     assert.ok(binary.includes(Buffer.from("mdat")),id+" contains video frames");
     assert.ok(binary.length>80_000 && binary.length<8_000_000,id+" realistic size");
     assert.equal(binary.length,row.bytes);
     fingerprints.add(createHash("sha256").update(binary).digest("hex"));
     const jpeg=read(root+id+".jpg");
     assert.deepEqual([...jpeg.subarray(0,3)],[255,216,255],id+" actual frame poster");
     assert.ok(statSync(new URL(root+id+".jpg",here)).size>4000);
   }
 }
 assert.equal(fingerprints.size,20,"No two scenes contain identical videos");
});
test("EN RU ES scene selectors share native MP4 and local photo compositor across health and life",()=>{
 const studio=read("components/mandala-free-video-studio.tsx").toString();
 const sceneFile=read("lib/mandala/holistic-video-themes.ts").toString();
 const library=read("lib/mandala/film-collection-v2.ts").toString();
 const intent=read("lib/mandala/personal-video-intent.mjs").toString();
 for(const theme of Object.keys(expectScenes)){
   assert.ok(studio.includes('"'+theme+'"'),theme+" category");
   assert.ok(intent.includes(theme+": "),theme+" intent");
   for(const id of expectScenes[theme]) {
     assert.ok(library.includes(id),id+" in library");
     assert.ok(sceneFile.includes('"'+id+'"')||theme==="money",id+" localized UI");
   }
 }
 assert.match(studio,/data-real-mp4=\{film\.src\}/);
 assert.match(studio,/getThemedRealFilm\(theme, otherScene\)/);
 assert.match(studio,/paintRealThemedVideoFrame/);
 assert.match(studio,/data-video-health-disclaimer/);
 assert.match(studio,/backgroundOnly/);
 assert.match(sceneFile,/ctx\.drawImage\(video,|c\.drawImage\(video,/);
 assert.doesNotMatch(studio+library,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|localStorage|sessionStorage|heygen|higgsfield|kling\.ai/i);
});
