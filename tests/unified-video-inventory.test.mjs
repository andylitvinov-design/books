import test from "node:test";
import assert from "node:assert/strict";
import {buildUnifiedVideoInventory,VIDEO_SOURCE_FOLDERS} from "../lib/video-library/unified-video-inventory.mjs";
import {ENGLISH_YOUTUBE_MASTERS} from "../lib/youtube/english-master-catalog.mjs";

test("single owner inventory reuses 56 approved site compositions and 684 distinct procedural clips",()=>{
 const r=buildUnifiedVideoInventory();
 assert.equal(r.counts.localCompositions,56);
 assert.equal(r.counts.localProcedural,684);
 assert.equal(r.localScenes.length,740);
 assert.equal(new Set(r.localScenes.map(x=>x.id)).size,740);
 assert.equal(new Set(r.localScenes.map(x=>x.video)).size,740);
 for(const x of r.localScenes){
  assert.match(x.video,/^\/videos\/holistic-house\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/);
  assert.match(x.catalogStatus,/not_rechecked/);
  assert.ok(["licensed_mp4","original_motion_mp4"].includes(x.media));
  assert.ok(x.media==="licensed_mp4"||x.collection==="original-motion-v1");
 }
});
test("external references are explicit and never automatically downloadable in the generator",()=>{
 const r=buildUnifiedVideoInventory();
 assert.equal(r.counts.driveListedMasters,9);
 assert.equal(r.counts.heygenApprovedEnglishMasters,ENGLISH_YOUTUBE_MASTERS.length);
 assert.equal(r.externalMasters.length,16);
 assert.equal(new Set(r.externalMasters.map(x=>x.id)).size,16);
 assert.ok(r.externalMasters.every(x=>x.usableInGenerator===false));
 assert.ok(r.externalMasters.every(x=>x.url.startsWith("https://")&&!/[?&](?:Expires|Signature|token)=/.test(x.url)));
 assert.equal(r.externalMasters.filter(x=>x.provider==="HeyGen").length,7);
 assert.equal(r.externalMasters.filter(x=>x.provider==="Google Drive").length,9);
});
test("privacy and provenance boundaries remain explicit",()=>{
 const r=buildUnifiedVideoInventory();
 assert.ok(r.explicitlyExcluded.includes("hh-client-private-media"));
 assert.ok(r.explicitlyExcluded.includes("unapproved-video-vault"));
 assert.ok(!r.localScenes.some(x=>x.video.includes("client")||x.video.includes("telegram-slides")));
 assert.ok(Object.values(VIDEO_SOURCE_FOLDERS).every(url=>url.startsWith("https://")));
 assert.ok(!JSON.stringify(r.externalMasters).includes("signedUrl"));
});
