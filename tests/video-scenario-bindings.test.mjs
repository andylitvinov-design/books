import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VIDEO_GOAL_SCENARIOS,VIDEO_GOAL_TOPICS,
  auditVideoGoalTaxonomy} from '../lib/mandala/video-goal-taxonomy.mjs';
import {
  suggestScenarioMediaCandidates,auditScenarioMediaCandidates,
  validateReviewedScenarioMediaBinding,SCENARIO_MEDIA_BINDING_VERSION,
} from '../lib/mandala/video-scenario-bindings.mjs';
import {auditCanonicalVideoScenarioCandidates} from '../scripts/benchmarking/video-scenario-bindings.mjs';
const catalog=JSON.parse(readFileSync(new URL(
  '../data/video-catalog/scene-taxonomy.json',import.meta.url),'utf8')).scenes;
const verified=scene=>({
  id:scene.id,path:scene.video,status:'technical_ready',technicalVerified:true,
  sha256:'a'.repeat(64),codec:'h264',width:720,height:1280,fps:24,
  durationSeconds:5,frameDecoded:true,rightsScope:'collection_only',
});
const evidence=scenes=>({
  schemaVersion:'hh-verified-assets-v1',status:'pass',
  assets:scenes.map(verified),
});
const testScene=(id,tag)=>({
  id,theme:'life',status:'approved',media:'licensed_mp4',
  video:'/videos/holistic-house/film-collection-v2/'+id+'.mp4',
  tags:[tag],motifs:[],rightsReference:{kind:'existing_approved_first_party_master'},
});
const topic={id:'fixture-topic',categoryId:'life',legacyVideoTheme:'life'};
const scenario={id:'fixture-story',topicId:topic.id,categoryId:'life',
  sourceStatus:'unbound',visualMotifs:['stone','river','light','meadow']};
const scenes=['rock','river','light','meadow']
  .map((tag,index)=>testScene('fixture-'+index,tag));

test('canonical 120 stories stay unbound even with synthetic positive asset evidence',()=>{
  assert.equal(auditVideoGoalTaxonomy().ok,true);
  const report=auditCanonicalVideoScenarioCandidates({scenes:catalog,evidence:evidence(catalog)});
  assert.equal(report.count,120);
  assert.equal(report.summary.executableScenarioCount,0);
  assert.equal(report.summary.fullyEditorialApproved,0);
  assert.ok(report.rows.every(r=>r.schemaVersion===SCENARIO_MEDIA_BINDING_VERSION &&
    r.sourceStatus==='unbound' && r.canExport===false &&
    r.beats.length===4 && new Set(r.beats.map(x=>x.beatIndex)).size===4));
  assert.equal(new Set(report.rows.map(r=>r.scenarioId)).size,120);
  assert.equal(report.summary.awaitingVerifiedMedia,0);
  assert.equal(report.summary.candidateFourShots+
    report.summary.incompleteVisualCoverage,120);
});

test('no verified MP4 inventory never produces executable or trusted candidates',()=>{
  const r=suggestScenarioMediaCandidates({scenario,topic,scenes,evidence:null});
  assert.equal(r.status,'awaiting_verified_media');
  assert.equal(r.proposedDistinctScenes,0);
  assert.equal(r.canExport,false);
  assert.equal(r.beats.every(beat=>beat.selected===null&&beat.alternatives.length===0),true);
});

test('literal visual objects and conservative synonyms propose four distinct scenes',()=>{
  const proposal=suggestScenarioMediaCandidates({
    scenario,topic,scenes,evidence:evidence(scenes),
  });
  assert.equal(proposal.status,'needs_editorial_review');
  assert.equal(proposal.canExport,false);
  assert.deepEqual(proposal.beats.map(beat=>beat.selected.sceneId),
    scenes.map(scene=>scene.id));
  assert.equal(proposal.beats[0].selected.matchType,'editorial_alias');
  assert.equal(proposal.beats[0].selected.rightsReviewRequired,true);
  assert.equal(proposal.beats.every(beat=>beat.editorialApproved===false),true);
});

test('one reusable MP4 cannot falsely count as four separate story frames',()=>{
  const one={...scenes[0],tags:['rock','river','light','meadow']};
  const r=suggestScenarioMediaCandidates({
    scenario,topic,scenes:[one],evidence:evidence([one]),
  });
  assert.equal(r.status,'incomplete_visual_coverage');
  assert.equal(r.proposedDistinctScenes,1);
  assert.equal(r.canExport,false);
});

test('editorial approval requires four source hashes, visual and individual license attestations',()=>{
  const bind={
    schemaVersion:SCENARIO_MEDIA_BINDING_VERSION,
    scenarioId:scenario.id,topicId:topic.id,
    reviewState:'owner_approved',licenseReviewState:'approved',
    editorialEvidenceId:'review_20261102',
    shots:scenes.map((s,index)=>({
      beatIndex:index+1,visualMotifId:scenario.visualMotifs[index],
      sceneId:s.id,sourceSha256:'a'.repeat(64),
      visualFrameReviewed:true,licenseReviewed:true,
      frameEvidenceId:'frame_test_'+index,
      sourceInSeconds:0,sourceOutSeconds:5,
    })),
  };
  const context={scenario,topic,scenes,evidence:evidence(scenes)};
  const r=validateReviewedScenarioMediaBinding({binding:bind,...context});
  assert.equal(r.canExport,false);
  assert.equal(r.requiresTrustedOwnerAuthorization,true);
  assert.equal(r.shots.length,4);
  assert.equal(r.requiresExistingRenderer,true);
  assert.throws(()=>validateReviewedScenarioMediaBinding({
    binding:{...bind,reviewState:'draft'},...context,
  }),/invalid_scenario_media_binding/);
  assert.throws(()=>validateReviewedScenarioMediaBinding({
    binding:{...bind,shots:bind.shots.map((s,i)=>i===2?
      {...s,sourceSha256:'b'.repeat(64)}:s)},...context,
  }),/invalid_scenario_media_binding/);
  assert.throws(()=>validateReviewedScenarioMediaBinding({
    binding:{...bind,shots:bind.shots.map((s,i)=>i===3?
      {...s,visualFrameReviewed:false}:s)},...context,
  }),/invalid_scenario_media_binding/);
  assert.throws(()=>validateReviewedScenarioMediaBinding({
    binding:{...bind,shots:bind.shots.map((s,i)=>i===3?
      {...s,sceneId:scenes[1].id}:s)},...context,
  }),/invalid_scenario_media_binding/);
});

test('matching is deterministic under scene order changes and preserves all four beat names',()=>{
  const first=suggestScenarioMediaCandidates({scenario,topic,scenes,evidence:evidence(scenes)});
  const reverse=suggestScenarioMediaCandidates({scenario,topic,
    scenes:[...scenes].reverse(),evidence:evidence(scenes)});
  assert.deepEqual(first,reverse);
  assert.deepEqual(first.beats.map(beat=>beat.motifId),scenario.visualMotifs);
});

test('candidate builder cannot reach external AI or silently publish accepted footage',()=>{
  const source=readFileSync(new URL(
    '../lib/mandala/video-scenario-bindings.mjs',import.meta.url),'utf8');
  const cli=readFileSync(new URL(
    '../scripts/benchmarking/video-scenario-bindings.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|provider\.createScene|chargedXP|clientPhoto/);
  assert.doesNotMatch(cli,/fetch\(|https:\/\/api|process\.env\.[A-Z_]*API_KEY/);
  assert.match(cli,/verified-video-assets\.json/);
  assert.match(source,/canExport:false/);
  const report=auditScenarioMediaCandidates({
    scenarios:[scenario],topics:[topic],scenes,evidence:evidence(scenes),
  });
  assert.equal(report.count,1);
  assert.equal(report.summary.executableScenarioCount,0);
});
