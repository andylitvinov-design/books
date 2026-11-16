import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {auditStoryPhotoCoverage,STORY_PHOTO_AUDIT_VERSION} from "../lib/video-library/story-photo-audit.mjs";

test("owner photo audit describes the exact 120 canonical stories and 480 unbound beats",()=>{
 const report=auditStoryPhotoCoverage(),s=report.summary;
 assert.equal(report.schemaVersion,STORY_PHOTO_AUDIT_VERSION);
 assert.deepEqual([s.categories,s.topics,s.scenarios,s.storyboardBeats],[5,30,120,480]);
 assert.equal(s.unboundBeats,480);
 assert.equal(s.reviewedFourShotPlans,0);
 assert.equal(s.verifiedPhotoBindings,0);
 assert.equal(report.rows.length,480);
 assert.equal(new Set(report.rows.map(x=>x.id)).size,480);
 assert.equal(report.categories.reduce((a,x)=>a+x.beats,0),480);
 assert.ok(report.categories.every(x=>x.scenarios===24&&x.beats===96));
 assert.ok(report.rows.every(x=>x.photoFrameReviewed===false&&
   x.videoFrameReviewed===false&&x.canExport===false&&
   x.rightsVerifiedForThisShot===false&&x.sourceStatus==="unbound"));
});
test("camera-film stills, legacy graphics and remote photo links remain distinct",()=>{
 const r=auditStoryPhotoCoverage();
 assert.equal(r.summary.cataloguedVideoCompositions,56);
 assert.equal(r.summary.localCameraSourcePosterReferences,44);
 assert.equal(r.summary.localLegacyPosterReferences,12);
 assert.ok(r.summary.externalPhotoSourceReferences>=30);
 assert.equal(r.summary.photoFilesDecodedInThisAudit,false);
 assert.equal(r.summary.remoteVaultChecked,false);
 assert.ok(r.sources.localVideoFrameStills.every(x=>
  x.sourceKind==="video_poster_still_not_independent_photo"));
 assert.ok(r.sources.externalPhotoReferences.every(x=>
  x.sourceKind==="remote_photo_reference_not_download_or_decode_verified"));
 const stills=new Set(r.sources.localVideoFrameStills.map(x=>x.id));
 const photoRefs=new Set(r.sources.externalPhotoReferences.map(x=>x.id));
 for(const row of r.rows){
  assert.ok(row.candidateLocalStillIds.every(id=>stills.has(id)));
  assert.ok(row.candidateExternalPhotoIds.every(id=>photoRefs.has(id)));
  assert.ok(row.candidateLocalStillIds.length<=4);
  assert.ok(row.candidateExternalPhotoIds.length<=4);
  assert.ok(row.candidateExternalPhotoIds.length<=4);
 }
 assert.equal(r.summary.beatsWithAnyPhotoCandidate+r.summary.beatsWithoutPhotoCandidate,480);
});
test("per-scene sourcing queue is actionable without faking stock or export",()=>{
 const r=auditStoryPhotoCoverage();
 assert.ok(r.priorityQueue.length>0);
 assert.equal(r.summary.acquisitionMotifCategoryGroups,r.priorityQueue.length);
 assert.equal(r.priorityQueue.reduce((a,x)=>a+x.missingBeats,0),r.summary.beatsWithoutPhotoCandidate);
 for(const item of r.priorityQueue){
  assert.ok(["P0","P1"].includes(item.priority));
  assert.ok(item.searchQuery.length>10&&item.generationBrief.includes("9:16"));
  assert.ok(item.exampleScenarioId&&item.exampleShot>=1);
 }
 assert.ok(r.rows.every(row=>typeof row.searchQuery==="string"&&
  row.generationBrief.includes("no logo")));
});
test("admin JSON route is owner-authenticated; photo inventory must not expose private media",()=>{
 const api=readFileSync(new URL("../app/api/admin/video-library/photos/route.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../app/admin/video-library/photos/page.tsx",import.meta.url),"utf8");
 assert.match(api,/ownerMaterialRequest/);
 assert.match(api,/privateJson/);
 assert.match(api,/BAD_STORY_PHOTO_AUDIT_QUERY/);
 assert.match(page,/requireAdminRequest/);
 assert.match(page,/report\.priorityQueue/);
 assert.match(page,/report\.sources\.localVideoFrameStills/);
});
