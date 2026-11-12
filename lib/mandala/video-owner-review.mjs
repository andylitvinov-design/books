/**
 * Owner-only video review model. The digests are historical GitHub CI evidence,
 * not an authorization to publish: mandatory CI compares them with fresh
 * ffprobe/FFmpeg/SHA-256 results for all 44 actual first-party MP4 files.
 */
import catalogue from '../../data/video-catalog/scene-taxonomy.json' with {type:'json'};
import digests from '../../data/video-catalog/video-review-ci-digests-v1.json' with {type:'json'};
import {
  VIDEO_GOAL_CATEGORIES, VIDEO_GOAL_TOPICS, VIDEO_GOAL_SCENARIOS,
  VIDEO_STORY_MOTIFS, auditVideoGoalTaxonomy,
} from './video-goal-taxonomy.mjs';
import {auditScenarioMediaCandidates} from './video-scenario-bindings.mjs';
import {inspectVerifiedVideoAsset} from './verified-asset-resolver.mjs';

export const VIDEO_OWNER_REVIEW_SCHEMA='hh-owner-video-review-v1';
const hash=/^[0-9a-f]{64}$/;
const rightsKind={dareful_cc_by_4_0:'individual_record',
  existing_approved_first_party_master:'collection_only'};
const errors=()=>{throw Error('invalid_owner_video_review_snapshot');};

export function videoReviewEvidenceFromSnapshot(catalog=catalogue,snapshot=digests){
  // This is the archived, immutable CI proof for the original 44 masters.
  // Newly approved clips have their own separate, exact-head physical audit.
  // Expanding the public catalogue must not manufacture historical approval.
  if(!Array.isArray(catalog?.scenes)||catalog.count!==catalog.scenes.length||
     catalog.scenes.length<44||snapshot?.schemaVersion!=='hh-video-review-ci-digests-v1'||
     snapshot.catalogVersion!==catalog.version||
     !Number.isSafeInteger(snapshot.sourceRunId)||
     !snapshot.digests||Object.keys(snapshot.digests).length!==44)errors();
  const historicalScenes=catalog.scenes.filter(scene=>Object.hasOwn(snapshot.digests,scene.id));
  if(historicalScenes.length!==44||new Set(catalog.scenes.map(scene=>scene.id)).size!==catalog.scenes.length)errors();
  const seen=new Set();
  const assets=historicalScenes.map(scene=>{
    if(!scene?.id||seen.has(scene.id)||!hash.test(snapshot.digests[scene.id]||'')||
       !Object.hasOwn(rightsKind,scene.rightsReference?.kind))errors();
    seen.add(scene.id);
    const collection=scene.collection;
    if(!['money-films-v1','film-collection-v2','film-collection-v3'].includes(collection))errors();
    const first=collection==='money-films-v1';
    return {
      id:scene.id,path:scene.video,status:'technical_ready',
      technicalVerified:true,sha256:snapshot.digests[scene.id],
      codec:'h264',width:first?720:1080,height:first?1280:1920,
      fps:first?20:24,durationSeconds:5,frameDecoded:true,
      rightsScope:rightsKind[scene.rightsReference.kind],
    };
  });
  if(Object.keys(snapshot.digests).some(id=>!seen.has(id)))errors();
  if(assets.some((asset,i)=>
    inspectVerifiedVideoAsset(historicalScenes[i],
      {schemaVersion:'hh-verified-assets-v1',status:'pass',assets:[asset]}).status!=='technical_ready'))errors();
  return {schemaVersion:'hh-verified-assets-v1',status:'pass',
    snapshotRunId:snapshot.sourceRunId,assets};
}

/** Physically independently audited in CI, never inferred from the approved tag. */
export function verifyOwnerVideoReviewSnapshot({
  catalog=catalogue,snapshot=digests,probeReport,
}={}){
  const expected=videoReviewEvidenceFromSnapshot(catalog,snapshot);
  if(probeReport?.schemaVersion!=='hh-verified-assets-v1'||
     probeReport.status!=='pass'||!Array.isArray(probeReport.assets)||
     probeReport.assets.length<44)errors();
  const actualById=new Map(probeReport.assets.map(asset=>[asset.id,asset]));
  if(actualById.size!==probeReport.assets.length)errors();
  for(const target of expected.assets){
    const actual=actualById.get(target.id);
    if(!actual||actual.status!=='technical_ready'||actual.technicalVerified!==true||
       actual.path!==target.path||actual.sha256!==target.sha256||
       actual.codec!==target.codec||actual.width!==target.width||
       actual.height!==target.height||Math.abs(actual.fps-target.fps)>0.001||
       Math.abs(actual.durationSeconds-target.durationSeconds)>0.15||
       actual.frameDecoded!==true||actual.rightsScope!==target.rightsScope)errors();
  }
  return {ok:true,checked:44,snapshotRunId:snapshot.sourceRunId};
}

const label=(item,locale)=>item?.[locale]||item?.ru||item?.en||'';
export function buildOwnerVideoReviewModel({
  catalog=catalogue,snapshot=digests,locale='ru',
}={}){
  const safeLocale=['ru','en','es'].includes(locale)?locale:'ru';
  const taxonomy=auditVideoGoalTaxonomy();
  if(!taxonomy.ok||taxonomy.scenarios!==120)errors();
  const evidence=videoReviewEvidenceFromSnapshot(catalog,snapshot);
  const result=auditScenarioMediaCandidates({
    scenarios:VIDEO_GOAL_SCENARIOS,topics:VIDEO_GOAL_TOPICS,
    scenes:catalog.scenes.filter(scene=>Object.hasOwn(snapshot.digests,scene.id)),evidence,
  });
  if(result.count!==120||result.summary.executableScenarioCount!==0||
     result.rows.some(row=>row.canExport!==false))errors();
  const byClip=new Map(catalog.scenes.map(scene=>[scene.id,scene]));
  const byScenario=new Map(VIDEO_GOAL_SCENARIOS.map(s=>[s.id,s]));
  const byTopic=new Map(VIDEO_GOAL_TOPICS.map(t=>[t.id,t]));
  const byCat=new Map(VIDEO_GOAL_CATEGORIES.map(c=>[c.id,c]));
  const viewClip=choice=>{
    if(!choice)return null;
    const entry=byClip.get(choice.sceneId);
    if(!entry||!choice.sourceSha256||choice.sourceSha256!==snapshot.digests[entry.id])errors();
    return {
      id:entry.id,title:label(entry.label,safeLocale),description:label(entry.description,safeLocale),
      video:entry.video,poster:entry.poster,sha256:choice.sourceSha256,
      matchType:choice.matchType,rightsReviewRequired:choice.rightsReviewRequired,
      seconds:choice.sourceSeconds,score:choice.score,
    };
  };
  return {
    schema:VIDEO_OWNER_REVIEW_SCHEMA,
    locale:safeLocale,snapshotRunId:snapshot.sourceRunId,
    canExport:false,neverPublish:true,counts:result.summary,
    rows:result.rows.map(row=>{
      const s=byScenario.get(row.scenarioId),topic=byTopic.get(row.topicId);
      if(!s||!topic||!byCat.has(row.categoryId))errors();
      return {
        id:row.scenarioId,categoryId:row.categoryId,topicId:row.topicId,
        category:label(byCat.get(row.categoryId).label,safeLocale),
        topic:label(topic.label,safeLocale),title:label(s.label,safeLocale),
        candidateCount:row.proposedDistinctScenes,status:row.status,
        canExport:false,
        beats:row.beats.map(beat=>({
          number:beat.beatIndex,motifId:beat.motifId,
          motif:label(VIDEO_STORY_MOTIFS[beat.motifId],safeLocale),
          selected:viewClip(beat.selected),
          alternatives:beat.alternatives.map(viewClip),
        })),
      };
    }),
  };
}
