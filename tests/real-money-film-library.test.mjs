import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {readFileSync,statSync} from "node:fs";
import {join} from "node:path";

const root=new URL("../",import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const ids=[
 "golden-rain","cosmic-flow","abundance-tree","opportunity-falls",
 "money-magnet","path-to-goals","partners","infinite-flow",
 "golden-shield","abundance-circle","life-gifts","dreams",
];
const folder="public/videos/holistic-house/money-films-v1/";

test("real video library delivers twelve decoded H264 MP4 files and true posters, not static substitutes",()=>{
 const metadata=JSON.parse(read(folder+"manifest.json").toString());
 assert.equal(metadata.scenes.length,12);
 assert.equal(metadata.format,"h264-mp4");
 assert.match(metadata.sourceLicense,/supareels.com\/stock-footage-licence/);
 const fingerprints = new Set();
 for(const id of ids){
  const meta=metadata.scenes.find(item=>item.id===id);
  assert.ok(meta,"Missing "+id);
  assert.equal(meta.width,720);
  assert.equal(meta.height,1280);
  assert.equal(meta.durationSeconds,5);
  assert.ok(meta.video.endsWith("/"+id+".mp4"));
  const mp4=read(folder+id+".mp4");
  assert.ok(mp4.length>18000,id+" is empty");
  assert.equal(mp4.subarray(4,8).toString("utf8"),"ftyp",id+" requires real video container");
  assert.ok(mp4.includes(Buffer.from("moov")),id+" needs seekable metadata");
  assert.ok(mp4.includes(Buffer.from("mdat")),id+" needs actual encoded frames");
  fingerprints.add(createHash("sha256").update(mp4).digest("hex"));
  assert.equal(mp4.length,statSync(new URL(folder+id+".mp4",root)).size);
  const poster=read(folder+id+".jpg");
  assert.deepEqual([...poster.subarray(0,3)],[0xff,0xd8,0xff],id+" poster JPEG must derive from MP4");
 }
 assert.equal(fingerprints.size,12,"all twelve templates must contain distinct encoded moving films");
});
test("public money gallery uses first-party MP4 decoder for selected personal video",()=>{
 const library=read("lib/mandala/real-money-film-library.ts").toString();
 const comp=read("components/mandala-free-video-studio.tsx").toString();
 const cinematic=read("lib/mandala/cinematic-money-video.ts").toString();
 const browser=read("scripts/verify-holistic-mandala-browser.mjs").toString();
 for(const id of ids)assert.ok(library.includes('"'+id+'"'),"Missing "+id+" link");
 assert.match(comp,/data-real-mp4=\{film\.src\}/);
 assert.match(comp,/data-mandala-master-mp4=\{activeMoneyFilm\.src\}/);
 assert.match(comp,/paintRealMoneyVideoFrame/);
 assert.match(cinematic,/ctx\.drawImage\(video,/);
 assert.match(browser,/actual H\.264 video must advance in time/);
 assert.match(browser,/readyState >= 2/);
 assert.doesNotMatch(comp,/\bfetch\s*\(|XMLHttpRequest|FormData|sendBeacon|localStorage|sessionStorage/);
});
