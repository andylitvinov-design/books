import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {planVideoLibraryGrowth} from "../lib/mandala/video-library-growth.mjs";

const load=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url),"utf8"));
const actual=()=>({
  catalog:load("data/video-catalog/scene-taxonomy.json"),
  publishedSourceRecords:load("data/video-catalog/free-stock-scenes.json"),
  candidateManifests:[
    load("data/video-catalog/dareful-verified-candidate-wave-20261101.json"),
    load("data/video-catalog/dareful-verified-candidate-wave2-20261101.json"),
    load("data/video-catalog/dareful-verified-candidate-wave3-20261103.json"),
  ],
  mytube:load("data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json"),
});

test("catalog plan counts real approved clips, not candidate HLS URLs or editorial scripts",()=>{
  const args=actual(),plan=planVideoLibraryGrowth(args);
  assert.equal(plan.currentApprovedCatalogRecords,44);
  assert.equal(plan.minimumAdditionalApprovedMasters,276);
  assert.equal(plan.pendingCandidateSources,16);
  assert.equal(plan.newlyPublishedByThisPlanner,0);
  assert.equal(plan.editorialCategories,4);
  assert.equal(plan.editorialTopics,64);
  assert.equal(plan.editorialScenarios,256);
  assert.equal(plan.scenarioFourShotRequirements,1024);
  assert.equal(plan.proposedSourceBriefs.length,320);
  assert.equal(new Set(plan.proposedSourceBriefs.map(x=>x.key)).size,320);
  assert.equal(plan.proposedSourceBriefs.filter(x=>x.sourceUrl!==null).length,0);
  assert.equal(plan.proposedSourceBriefs.filter(x=>x.reviewStatus!=="not_sourced_not_published").length,0);
  assert.equal(plan.pendingUnapprovedNotCounted.every(x=>x.status==="pending_editorial_review_not_imported"),true);
  assert.equal(plan.byCategory.reduce((sum,row)=>sum+row.desiredUniqueVisualSources,0),320);
});

test("500-clip ambition does not mark any unverified source as published",()=>{
  const plan=planVideoLibraryGrowth({...actual(),target:500});
  assert.equal(plan.uniqueSourceTarget,500);
  assert.equal(plan.minimumAdditionalApprovedMasters,456);
  assert.equal(plan.proposedSourceBriefs.length,320);
  assert.equal(plan.newlyPublishedByThisPlanner,0);
});

test("reject duplicate or forged approval, stock pages already used, and missing provenance",()=>{
  const args=actual();
  const candidate=args.candidateManifests[0].sources[0];
  args.candidateManifests[1].sources[0]={...args.candidateManifests[1].sources[0],id:candidate.id,sourcePage:candidate.sourcePage};
  assert.throws(()=>planVideoLibraryGrowth(args),/duplicate_or_unreviewed_candidate/);

  args.candidateManifests=actual().candidateManifests;
  args.candidateManifests[0].approvedForPublication=true;
  assert.throws(()=>planVideoLibraryGrowth(args),/unsafe_candidate_manifest/);

  args.candidateManifests=actual().candidateManifests;
  args.publishedSourceRecords=[{sources:[{sourcePage:candidate.sourcePage}]}];
  assert.throws(()=>planVideoLibraryGrowth(args),/duplicate_or_unreviewed_candidate/);

  args.publishedSourceRecords=[];
  args.catalog.scenes[0].status="draft";
  assert.throws(()=>planVideoLibraryGrowth(args),/unusable_approved_scene/);
});

test("an editorial topic cannot impersonate footage or be counted twice",()=>{
  const args=actual();
  args.mytube.categories[0].subcategories[0].topics[0].scenarios=
    args.mytube.categories[0].subcategories[0].topics[0].scenarios.slice(0,3);
  assert.throws(()=>planVideoLibraryGrowth(args),/expected_four_scenarios/);

  const other=actual();
  other.mytube.categories[1].subcategories[0].topics[0].id=
    other.mytube.categories[0].subcategories[0].topics[0].id;
  assert.throws(()=>planVideoLibraryGrowth(other),/duplicate_topic/);
});
