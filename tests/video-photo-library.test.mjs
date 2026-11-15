import test from "node:test";
import assert from "node:assert/strict";
import {
  isApprovedPhoto,rankPhotoFallback,resolveStoryboardVisual,
  getPhotoLibrarySummary,PHOTO_SOURCE_QUEUE
} from "../lib/video-library/photo-library.mjs";

const photo=(overrides={})=>({
  id:"forest-photo",class:"photograph",status:"approved",downloadStatus:"imported",
  rightsStatus:"source-license-verified",editorialStatus:"source-and-frame-reviewed",
  localPath:"/images/video-library/forest-photo.jpg",sha256:"a".repeat(64),
  width:1600,height:2400,bytes:240000,aspect:"portrait",allowedAspects:["portrait"],
  sourcePageUrl:"https://commons.wikimedia.org/wiki/File:Forest.jpg",
  sourceFileUrl:"https://upload.wikimedia.org/wikipedia/commons/a/ab/Forest.jpg",
  licenseId:"CC0-1.0",attribution:"Photographer / Wikimedia Commons — CC0 1.0",
  topicIds:["stress-fast-calm"],scenarioIds:["stress-fast-calm::shelter"],
  tags:["forest","calm","safety"],motifs:["forest","light"],categories:["stress"],
  ...overrides
});

test("photo class accepts only downloaded, rights-verified local photographs",()=>{
  assert.equal(isApprovedPhoto(photo()),true);
  assert.equal(isApprovedPhoto(photo({class:"generated_image"})),false);
  assert.equal(isApprovedPhoto(photo({downloadStatus:"pending"})),false);
  assert.equal(isApprovedPhoto(photo({licenseId:"unknown"})),false);
  assert.equal(isApprovedPhoto(photo({localPath:"https://images.example/photo.jpg"})),false);
  assert.equal(isApprovedPhoto(photo({sha256:"not-a-hash"})),false);
  assert.equal(isApprovedPhoto(photo({editorialStatus:"pending"})),false);
});

test("photo ranking matches exact topic, aspect, motifs and exclusions",()=>{
  const rows=[
    photo(),
    photo({id:"work-photo",topicIds:["work-focus"],categories:["business"],tags:["work","focus"]}),
    photo({id:"landscape-photo",aspect:"landscape",allowedAspects:["landscape"],width:2400,height:1600}),
    photo({id:"night-photo",tags:["forest","calm","night"],motifs:["night"]})
  ];
  const selected=rankPhotoFallback(rows,{topicId:"stress-fast-calm",requiredTags:["forest","calm"],
    aspect:"portrait",excludedMotifs:["night"]});
  assert.deepEqual(selected.map(item=>item.id),["forest-photo"]);
  assert.deepEqual(rankPhotoFallback(rows,{topicId:"stress-fast-calm",requiredTags:["forest"],
    aspect:"landscape"}),[]);
});

test("video is always preferred over photo fallback",()=>{
  const photoRow=photo();
  const result=resolveStoryboardVisual({
    videoCandidates:[{id:"approved-video",status:"approved",media:"licensed_mp4",
      video:"/videos/holistic-house/film-collection-v3/example.mp4"}],
    topicId:"stress-fast-calm",requiredTags:["forest"],aspect:"portrait"
  });
  assert.equal(result.kind,"video");
  assert.equal(result.asset.id,"approved-video");
  assert.equal(result.fallback,false);
  assert.equal(photoRow.class,"photograph");
});

test("unapproved video cannot block a matching photo from the candidate resolver",()=>{
  const result=resolveStoryboardVisual({
    videoCandidates:[{id:"abstract",status:"approved",media:"original_motion_mp4",
      video:"/videos/holistic-house/original-motion-v1/abstract.mp4"}],
    topicId:"missing-topic",requiredTags:["forest"],aspect:"portrait"
  });
  assert.equal(result.kind,"media-needed");
  assert.equal(result.fallback,false);
});

test("unimported source queue never appears in approved photo results",()=>{
  const summary=getPhotoLibrarySummary();
  assert.equal(summary.approvedPhotos,0);
  assert.equal(summary.sourceVerifiedPendingImport,PHOTO_SOURCE_QUEUE.length);
  assert.ok(PHOTO_SOURCE_QUEUE.length>=12);
});
