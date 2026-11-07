import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import scenes from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import motion from "../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import {auditVideoSiteCoverage,auditVideoTopicCrosswalk}
  from "../lib/video-library/coverage.mjs";

test("coverage counts source rows separately from camera originals and remote R2",()=>{
  const report=auditVideoSiteCoverage();
  assert.equal(report.schemaVersion,"hh-video-site-coverage-v2");
  assert.equal(report.inventory.localLicensedCatalogRows,48);
  assert.equal(report.inventory.proceduralAnimationCatalogRows,684);
  assert.equal(report.inventory.combinedCatalogRows,732);
  assert.equal(report.inventory.distinctCatalogVideoPaths,732);
  assert.equal(report.inventory.duplicatePaths,0);
  assert.equal(report.inventory.independentlyVerifiedCameraMasters,null);
  assert.equal(report.inventory.r2PhysicalReady,null);
  assert.equal(report.inventory.r2RegisteredReady,null);
  assert.equal(report.inventory.locallyDecodedAndHashedThisRun,false);
  assert.equal(report.inventory.cloudInventoryState,"not_queried_this_run");
  assert.equal(report.summary.mytubeTopics,64);
  assert.equal(report.summary.mytubeSubcategories,16);
  assert.equal(report.summary.mytubeTopicsWithAnyTaggedOption,29);
  assert.equal(report.summary.mytubeTopicsWithFourTaggedOptions,15);
  assert.equal(report.summary.mytubeTopicsWithoutTaggedOptions,35);
  assert.equal(report.summary.mytubeFrameVerifiedStories,0);
});

test("all 64 MyTube topics and 30 Studio topics get conservative distinct rows",()=>{
  const report=auditVideoSiteCoverage();
  assert.equal(report.topics.length,64);
  assert.equal(new Set(report.topics.map(t=>t.topicId)).size,64);
  assert.equal(report.categories.length,4);
  assert.equal(report.studioTopics.length,30);
  assert.equal(report.summary.studioScenarios,120);
  assert.equal(report.summary.studioShots,480);
  assert.equal(report.summary.studioVerifiedBoundShots,0);
  assert.ok(report.topics.every(t=>t.frameVerifiedClipCount===0&&
    t.readyForRealFootageExport===false&&
    t.evidence==="editorial_metadata_only_not_frame_verified"));
  assert.ok(report.studioTopics.every(t=>t.shotCount===16&&
    t.mediaBoundShotCount===0&&t.relatedMyTubeTopicIds.length>0));
  assert.equal(report.sites.length,6);
  assert.ok(report.sites.every(s=>s.route.includes("{locale}")&&s.state));
});

test("Studio to MyTube editorial mapping includes precisely the actual topic identifiers",()=>{
  const mapping=auditVideoTopicCrosswalk();
  assert.equal(mapping.valid,true);
  assert.equal(mapping.mappedStudioTopics,30);
  assert.equal(mapping.mytubeTopics,64);
  assert.deepEqual(mapping.unmapped,[]);
  assert.deepEqual(mapping.orphanLinks,[]);
  assert.deepEqual(mapping.malformed,[]);
});

test("all approved local composites remain portrait; no arbitrary landscape reuse",()=>{
  const portrait=auditVideoSiteCoverage({aspect:"portrait"});
  const landscape=auditVideoSiteCoverage({aspect:"landscape"});
  assert.equal(portrait.inventory.localLicensedEligibleForAspect,48);
  assert.equal(landscape.inventory.localLicensedEligibleForAspect,0);
  assert.equal(landscape.summary.mytubeTopicsWithAnyTaggedOption,0);
  assert.equal(landscape.summary.mytubeTopicsWithFourTaggedOptions,0);
  assert.equal(landscape.sourcingQueue.length,64);
  assert.equal(landscape.summary.mytubeFrameVerifiedStories,0);
});

test("candidate/remote/duplicate/animation rows cannot fabricate library coverage",()=>{
  const first=scenes.scenes[0];
  const invalid=[
    {...first,id:"remapped-url",video:first.video},
    {...first,id:"unapproved",status:"candidate",video:"/videos/holistic-house/film-collection-v3/unapproved.mp4"},
    {...first,id:"outside",video:"https://malicious.example/film.mp4"},
    {...first,id:"not-stock",media:"original_motion_mp4",
      video:"/videos/holistic-house/film-collection-v3/not-stock.mp4"},
    {...first,id:"wrong-ratio",allowedAspects:["landscape"],width:720,height:1280,
      video:"/videos/holistic-house/film-collection-v3/wrong-ratio.mp4"},
  ];
  const baseline=auditVideoSiteCoverage();
  const withSpoofed=auditVideoSiteCoverage({scenes:[...scenes.scenes,...invalid]});
  assert.equal(withSpoofed.inventory.localLicensedEligibleForAspect,
    baseline.inventory.localLicensedEligibleForAspect);
  assert.deepEqual(withSpoofed.categories,baseline.categories);
  const withMotion=auditVideoSiteCoverage({animations:[...motion.scenes,first]});
  assert.equal(withMotion.inventory.localLicensedEligibleForAspect,48);
  assert.equal(withMotion.summary.mytubeTopicsWithAnyTaggedOption,29);
  assert.ok(withMotion.inventory.duplicatePaths>0);
});

test("queue priorities missing love/stress while keeping zero false publication flags",()=>{
  const rows=auditVideoSiteCoverage().sourcingQueue;
  assert.ok(rows.length>35);
  assert.ok(rows.some(r=>r.categoryId==="love-relationships"&&r.taggedOptions===0));
  assert.equal(rows[0].priority,0);
  assert.ok(rows.every(r=>r.approvedForImport===false&&r.sourceAssetIds.length===0));
});

test("CLI outputs real JSON and safe CSV without cloud access",()=>{
  const cli=new URL("../scripts/audit-video-site-coverage.mjs",import.meta.url).pathname;
  const result=JSON.parse(execFileSync(process.execPath,[cli,"--json","--strict"],{
    encoding:"utf8",maxBuffer:5_000_000}));
  assert.equal(result.summary.studioShots,480);
  const csv=execFileSync(process.execPath,[cli,"--csv=topics"],{encoding:"utf8"});
  assert.equal(csv.trim().split("\n").length,65);
  const queue=execFileSync(process.execPath,[cli,"--csv=queue","--aspect=landscape"],{encoding:"utf8"});
  assert.equal(queue.trim().split("\n").length,65);
});

test("owner coverage route uses existing protected owner guard",()=>{
  const route=readFileSync(new URL("../app/api/admin/video-library/coverage/route.js",import.meta.url),"utf8");
  assert.match(route,/ownerMaterialRequest\(/);
  assert.match(route,/privateJson\(/);
  assert.doesNotMatch(route,/service_role|r2\.dev|NEXT_PUBLIC_/);
});

test("invalid report options fail closed",()=>{
  assert.throws(()=>auditVideoSiteCoverage({aspect:"horizontal"}),/INVALID_VIDEO_SITE_COVERAGE_INPUT/);
  assert.throws(()=>auditVideoSiteCoverage({minScore:-1}),/INVALID_VIDEO_SITE_COVERAGE_INPUT/);
  assert.throws(()=>auditVideoSiteCoverage({scenes:"rows"}),/INVALID_VIDEO_SITE_COVERAGE_INPUT/);
});
