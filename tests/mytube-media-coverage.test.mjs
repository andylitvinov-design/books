import test from "node:test";
import assert from "node:assert/strict";
import catalog from "../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import {auditMyTubeMediaCoverage} from "../lib/mandala/mytube-media-coverage.mjs";

const fourIds=new Set(["sun-trees-forest","warm-clouds-sunset",
  "fall-foliage-forest","snow-forest-winter"]);

test("audits 256 stories / 1,280 motifs with honest source-tag evidence only",()=>{
  const audit=auditMyTubeMediaCoverage({scenes:catalog.scenes});
  assert.equal(audit.schemaVersion,"hh-mytube-media-coverage-v1");
  assert.deepEqual(audit.tree,{
    categories:4,subcategories:16,topics:64,scenarios:256,
    recommendedMotifPlacements:1280,visualMotifs:46,visualStyles:10,
  });
  assert.equal(audit.scenarioMotifs.length,1280);
  assert.equal(audit.scenarioStyles.length,2560);
  // Default audit is portrait-only: 48 legacy clips + four new portrait edits.
  // The other four new MP4s are landscape-only, not cross-aspect substitutes.
  assert.equal(audit.footageInventory.eligibleLocalLicensedCatalogRows,52);
  assert.equal(audit.footageInventory.distinctVideoPaths,52);
  assert.equal(audit.footageInventory.physicallyCheckedInThisAudit,false);
  assert.equal(audit.footageInventory.privateR2UploadCount,"unknown_unverified");
  assert.equal(audit.footageInventory.originalMotionExcluded,true);
  assert.equal(audit.summary.independentlyFrameVerifiedMotifs,0);
  assert.equal(audit.summary.motifSelectionsBlocked+
    audit.summary.motifSelectionsWithFourTaggedSources,1280);
  assert.ok(audit.scenarioMotifs.every(row=>row.sourceTagStatus==="metadata_only_not_frame_verified"));
  assert.ok(audit.scenarios.every(row=>row.finishedStoryboardVerified===false));
  assert.ok(audit.summary.motifsWithoutCatalogTag>0);
  assert.equal(audit.motifs.find(x=>x.motifId==="key").catalogTaggedClipCount,0);
  assert.ok(audit.sourcingQueue.every(row=>!row.assetId&&!row.cloudObjectKey&&!row.providerUrl));
});

test("approved portrait footage never masquerades as native landscape or square sources",()=>{
  const portrait=auditMyTubeMediaCoverage({scenes:catalog.scenes,aspect:"portrait"});
  const landscape=auditMyTubeMediaCoverage({scenes:catalog.scenes,aspect:"landscape"});
  const square=auditMyTubeMediaCoverage({scenes:catalog.scenes,aspect:"square"});
  assert.equal(portrait.footageInventory.eligibleLocalLicensedCatalogRows,52);
  assert.equal(landscape.footageInventory.eligibleLocalLicensedCatalogRows,4);
  assert.equal(square.footageInventory.eligibleLocalLicensedCatalogRows,0);
  assert.ok(portrait.motifs.find(row=>row.motifId==="clouds").catalogTaggedClipCount>0);
  assert.ok(landscape.motifs.find(row=>row.motifId==="clouds").catalogTaggedClipCount>=0);
  assert.ok(portrait.scenarioMotifs.some(x=>x.motifTaggedCount>0));
  assert.ok(landscape.scenarioMotifs.some(x=>x.motifTaggedCount>0));
  assert.ok(square.scenarioMotifs.every(x=>x.motifTaggedCount===0));
});

test("unapproved, duplicated and procedural scene rows cannot create fake coverage",()=>{
  const a= catalog.scenes.find(scene=>fourIds.has(scene.id));
  assert.ok(a);
  const variants=[
    {...a,id:"fake-duplicate-video",video:a.video},
    {...a,id:"draft-only",status:"candidate",video:"/videos/holistic-house/film-collection-v3/draft-only.mp4"},
    {...a,id:"concept-only",media:"original_motion_mp4",video:"/videos/holistic-house/film-collection-v3/concept-only.mp4"},
    {...a,id:"external-url",video:"https://example.org/video.mp4"},
  ];
  const baseline=auditMyTubeMediaCoverage({scenes:catalog.scenes});
  const expanded=auditMyTubeMediaCoverage({scenes:[...catalog.scenes,...variants]});
  assert.equal(expanded.footageInventory.eligibleLocalLicensedCatalogRows,
    baseline.footageInventory.eligibleLocalLicensedCatalogRows);
  assert.deepEqual(expanded.summary,baseline.summary);
});

test("invalid aspect and score options fail closed",()=>{
  assert.throws(()=>auditMyTubeMediaCoverage({scenes:catalog.scenes,aspect:"cinematic"}),/invalid_mytube_coverage_options/);
  assert.throws(()=>auditMyTubeMediaCoverage({scenes:catalog.scenes,minTopicScore:-5}),/invalid_mytube_coverage_options/);
  assert.throws(()=>auditMyTubeMediaCoverage({scenes:"fake"}),/invalid_mytube_coverage_options/);
});
