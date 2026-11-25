/**
 * Scenario → four physical shot candidates for the existing Video Studio.
 * Strictly research/editorial evidence, NOT an automatic publication or
 * a competing renderer. All 120 canonical scenarios remain unbound until
 * somebody has reviewed the real pixels and the rights for every shot.
 */
import {inspectVerifiedVideoAsset} from './verified-asset-resolver.mjs';
import {VIDEO_STORY_MOTIFS} from './video-goal-taxonomy.mjs';

export const SCENARIO_MEDIA_BINDING_VERSION='hh-scenario-media-binding-v1';
const SAFE_ID=/^[a-z0-9-]{1,100}$/;
const HASH=/^[a-f0-9]{64}$/;
// Editorial-only visual crosswalk; broad conceptual/metaphorical similarity
// cannot become a claim of a literal match without reviewing the footage.
export const CANDIDATE_MOTIF_ALIASES=Object.freeze({
  stone:Object.freeze(['rock']),
  shore:Object.freeze(['coast','beach']),
  breeze:Object.freeze(['wind']),
  flowers:Object.freeze(['bloom']),
  river:Object.freeze(['stream']),
  leaves:Object.freeze(['fern']),
  warmth:Object.freeze(['warm']),
});
const invalid=()=>{throw Error('invalid_scenario_media_binding');};

function validInputs(scenario,topic,scenes){
  if(!scenario||!topic||scenario.topicId!==topic.id||
    scenario.categoryId!==topic.categoryId||scenario.sourceStatus!=='unbound'||
    !SAFE_ID.test(scenario.id||'')||
    !Array.isArray(scenario.visualMotifs)||scenario.visualMotifs.length!==4||
    scenario.visualMotifs.some(id=>!Object.hasOwn(VIDEO_STORY_MOTIFS,id))||
    !Array.isArray(scenes)||scenes.length>300)invalid();
}
function rankCandidates(motifId,topicTheme,scenes,evidence){
  const aliases=CANDIDATE_MOTIF_ALIASES[motifId]||[];
  const choices=[];
  for(const scene of scenes){
    const asset=inspectVerifiedVideoAsset(scene,evidence);
    if(asset.status!=='technical_ready')continue;
    const motifs=new Set(scene.motifs||[]);
    const tags=new Set(scene.tags||[]);
    let matchType=null,points=0;
    if(motifs.has(motifId)){matchType='catalog_motif';points=100;}
    else if(tags.has(motifId)){matchType='catalog_tag';points=85;}
    else if(aliases.some(id=>motifs.has(id)||tags.has(id))){
      matchType='editorial_alias';points=50;
    }
    if(!matchType)continue;
    if(scene.theme===topicTheme)points+=8;
    choices.push({
      sceneId:scene.id,sourceSha256:asset.sha256,
      sourceSeconds:asset.durationSeconds,
      matchType,score:points,rightsReviewRequired:asset.rightsReviewRequired,
      // No native video frame or editorial acceptance is inferred from a tag.
      editorialApproved:false,
    });
  }
  return choices.sort((a,b)=>b.score-a.score||
    a.sceneId.localeCompare(b.sceneId)).slice(0,8);
}

/** Optimal distinct four-shot proposal; prefer number of matching beats
 * before score. A null shot is truthful evidence of missing visual coverage.
 */
function chooseDistinct(candidates){
  let best=null;
  function visit(index,used,selected,count,score){
    if(index===4){
      const key=selected.map(x=>x?.sceneId||'~').join('|');
      if(!best||count>best.count||
        (count===best.count&&(score>best.score||
         (score===best.score&&key<best.key))))
        best={count,score,key,selected:[...selected]};
      return;
    }
    if(best&&count+4-index<best.count)return;
    for(const choice of candidates[index]){
      if(used.has(choice.sceneId))continue;
      used.add(choice.sceneId);
      selected.push(choice);
      visit(index+1,used,selected,count+1,score+choice.score);
      selected.pop();
      used.delete(choice.sceneId);
    }
    selected.push(null);
    visit(index+1,used,selected,count,score);
    selected.pop();
  }
  visit(0,new Set(),[],0,0);
  return best?.selected||[null,null,null,null];
}

export function suggestScenarioMediaCandidates({
  scenario,topic,scenes=[],evidence=null,
}={}){
  validInputs(scenario,topic,scenes);
  const hasEvidence=evidence?.status==='pass'&&
    evidence.schemaVersion==='hh-verified-assets-v1';
  const choices=scenario.visualMotifs.map(motifId=>
    hasEvidence?rankCandidates(motifId,topic.legacyVideoTheme,scenes,evidence):[]);
  const chosen=chooseDistinct(choices);
  const count=chosen.filter(Boolean).length;
  return {
    schemaVersion:SCENARIO_MEDIA_BINDING_VERSION,
    scenarioId:scenario.id,topicId:topic.id,categoryId:topic.categoryId,
    // Original editorial story is unbound even when all four suggestions exist.
    sourceStatus:'unbound',canExport:false,
    status:!hasEvidence?'awaiting_verified_media':
      count===4?'needs_editorial_review':'incomplete_visual_coverage',
    proposedDistinctScenes:count,
    rightsReviewRequired:chosen.some(x=>x?.rightsReviewRequired),
    beats:scenario.visualMotifs.map((motifId,index)=>({
      beatIndex:index+1,motifId,selected:chosen[index],
      alternatives:choices[index].filter(x=>x.sceneId!==chosen[index]?.sceneId).slice(0,3),
      // User may only confirm a genuinely reviewed executable storyboard.
      editorialApproved:false,
    })),
  };
}

export function auditScenarioMediaCandidates({
  scenarios=[],topics=[],scenes=[],evidence=null,
}={}){
  if(!Array.isArray(scenarios)||!Array.isArray(topics)||
     !Array.isArray(scenes)||scenarios.length>200)invalid();
  const topicsById=new Map(topics.map(x=>[x.id,x]));
  const rows=scenarios.map(s=>suggestScenarioMediaCandidates({
    scenario:s,topic:topicsById.get(s.topicId),scenes,evidence,
  }));
  if(new Set(rows.map(r=>r.scenarioId)).size!==rows.length)invalid();
  return {
    schemaVersion:SCENARIO_MEDIA_BINDING_VERSION,
    source:'verified_first_party_catalogue_metadata',
    disclaimer:'Candidate tags are not video-frame or rights approval',
    count:rows.length,
    summary:{
      candidateFourShots:rows.filter(r=>r.status==='needs_editorial_review').length,
      incompleteVisualCoverage:rows.filter(r=>r.status==='incomplete_visual_coverage').length,
      awaitingVerifiedMedia:rows.filter(r=>r.status==='awaiting_verified_media').length,
      fullyEditorialApproved:0,
      executableScenarioCount:0,
    },
    rows,
  };
}

/** Structural gate only. Never accept a client-submitted approval as trusted.
 * The owner's editorial workflow must issue/authorize these records.
 */
export function validateReviewedScenarioMediaBinding({
  binding,scenario,topic,scenes=[],evidence=null,
}={}){
  validInputs(scenario,topic,scenes);
  if(!binding||binding.schemaVersion!==SCENARIO_MEDIA_BINDING_VERSION||
     binding.scenarioId!==scenario.id||binding.topicId!==topic.id||
     binding.reviewState!=='owner_approved'||binding.licenseReviewState!=='approved'||
     typeof binding.editorialEvidenceId!=='string'||
     !/^[a-zA-Z0-9_-]{8,100}$/.test(binding.editorialEvidenceId)||
     !Array.isArray(binding.shots)||binding.shots.length!==4)invalid();
  const byId=new Map(scenes.map(scene=>[scene.id,scene]));
  const used=new Set(),shots=[];
  for(let i=0;i<4;i++){
    const item=binding.shots[i];
    if(!item||item.beatIndex!==i+1||
       item.visualMotifId!==scenario.visualMotifs[i]||
       !SAFE_ID.test(item.sceneId||'')||used.has(item.sceneId)||
       item.visualFrameReviewed!==true||
       item.licenseReviewed!==true||
       typeof item.frameEvidenceId!=='string'||
       !/^[a-zA-Z0-9_-]{8,100}$/.test(item.frameEvidenceId)||
       !HASH.test(item.sourceSha256||''))invalid();
    used.add(item.sceneId);
    const asset=inspectVerifiedVideoAsset(byId.get(item.sceneId),evidence);
    if(asset.status!=='technical_ready'||item.sourceSha256!==asset.sha256||
       !Number.isFinite(item.sourceInSeconds)||item.sourceInSeconds<0||
       !Number.isFinite(item.sourceOutSeconds)||
       item.sourceOutSeconds>asset.durationSeconds+0.05||
       item.sourceOutSeconds-item.sourceInSeconds<0.5)invalid();
    shots.push({sceneId:item.sceneId,sourceSha256:item.sourceSha256,
      sourceInSeconds:item.sourceInSeconds,sourceOutSeconds:item.sourceOutSeconds});
  }
  return {
    schemaVersion:SCENARIO_MEDIA_BINDING_VERSION,scenarioId:scenario.id,
    status:'review_record_structurally_valid',canExport:false,shots,
    requiresTrustedOwnerAuthorization:true,
    requiresExistingRenderer:true,
  };
}
