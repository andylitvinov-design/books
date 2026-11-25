import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 GIFT_APPROVED_SCENES,GIFT_VISUAL_GROUPS,GIFT_MEDIA_LIBRARY_COUNTS,
 defaultGiftVisualGroup,listGiftApprovedScenes,giftApprovedSceneById
} from "../lib/mandala/video-gift-clip-catalog.mjs";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("only rights-approved first-party moving MP4 clips can reach customers",()=>{
 assert.equal(GIFT_APPROVED_SCENES.length,24);
 assert.equal(GIFT_VISUAL_GROUPS.length,7);
 for(const scene of GIFT_APPROVED_SCENES){
  assert.equal(scene.clientReady,true);
  assert.equal(scene.durationSeconds,5);
  assert.equal(scene.rawDownloadAllowed,false);
  assert.match(scene.video,/^\/videos\/holistic-house\/film-collection-v3\/[a-z0-9-]+\.mp4$/);
  assert.match(scene.poster,/^\/videos\/holistic-house\/film-collection-v3\/[a-z0-9-]+\.jpg$/);
  assert.match(scene.credit,/CC BY 4\.0/);
  assert.equal(scene.video.includes("drive.google.com"),false);
  assert.ok(giftApprovedSceneById(scene.id));
 }
 assert.equal(giftApprovedSceneById("../secrets"),null);
 assert.equal(GIFT_MEDIA_LIBRARY_COUNTS.driveArchivedClientScenes,4);
 assert.equal(GIFT_MEDIA_LIBRARY_COUNTS.driveMasterSceneFiles,42);
 assert.equal(GIFT_MEDIA_LIBRARY_COUNTS.driveInternalQaVideos,3);
});
test("changing a group automatically returns the appropriate ready clips",()=>{
 for(const group of GIFT_VISUAL_GROUPS){
  const clips=listGiftApprovedScenes({group:group.id,aspect:"portrait",occasion:"birthday"});
  assert.ok(clips.every(x=>x.group===group.id));
 }
 assert.ok(listGiftApprovedScenes({group:"forest",occasion:"support"}).length>=2);
 assert.ok(listGiftApprovedScenes({group:"water",occasion:"love"}).length>=2);
 assert.ok(listGiftApprovedScenes({group:"flowers",occasion:"birthday"}).length>=2);
 assert.deepEqual(listGiftApprovedScenes({group:"invented"}),[]);
 for(const occasion of ["birthday","love","thanks","support","anniversary","custom"]){
  const group=defaultGiftVisualGroup(occasion);
  assert.ok(listGiftApprovedScenes({group,occasion}).length>0);
 }
});
test("verified Drive masters remain separate from missing archives and QA",()=>{
 const four=GIFT_APPROVED_SCENES.filter(x=>x.driveArchived).map(x=>x.id).sort();
 assert.deepEqual(four,[
  "fall-foliage-forest","snow-forest-winter","sun-trees-forest","warm-clouds-sunset"
 ]);
 assert.ok(GIFT_APPROVED_SCENES.some(x=>x.aspect==="landscape"));
 assert.ok(GIFT_APPROVED_SCENES.some(x=>x.aspect==="portrait"));
});
test("client picker and both MP4 render paths use the actual selected clip",()=>{
 const ui=source("components/mandala-video-gift.tsx");
 const render=source("lib/mandala/video-gift-browser.ts");
 assert.match(ui,/data-video-gift-media-library/);
 assert.match(ui,/data-video-gift-group/);
 assert.match(ui,/data-video-gift-scene/);
 assert.match(ui,/sceneId:selectedScene\?\.id\?\?null/);
 assert.match(render,/giftApprovedSceneById\(sceneId\)/);
 assert.match(render,/canvasesAtTimestamps/);
 assert.match(render,/sceneVideo\.play/);
 assert.match(render,/if\(t>=14&&t<19&&sceneFrame\)/);
 assert.match(render,/const tracks:MediaStreamTrack\[\]/);
 assert.doesNotMatch(render,/drive\.google\.com\/uc/);
});
