/**
 * Honest, read-only MyTube footprint and editorial sourcing gaps.
 *
 * Never counts AI concepts, YouTube links, original-motion graphics, re-crops,
 * or metadata proposals as *new filmed originals*. Only approved, safe local
 * licensed_mp4 catalog entries are eligible. No cloud/network/user data.
 *
 * "ready" below means 4 approved TOPIC-TAGGED options, not a verified
 * four-event film, R2 upload, frame-verified literal symbol, or MP4 render.
 */
import {getMyTubeTaxonomy} from "./mytube-content-taxonomy.mjs";
import {MYTUBE_VISUAL_MOTIFS,MYTUBE_VISUAL_STYLES,
  listMyTubeScenarioMotifs,evaluateMyTubeSceneCreativeMatch}
  from "./mytube-creative-choices.mjs";
import {recommendMyTubeTopicStoryClips} from "./mytube-video-tagging.mjs";
import {isSafeMontageScene} from "./video-montage-sources.mjs";
import {sceneSupportsPhysicalAspect} from "./video-source-tag-facets.mjs";

const ASPECTS=new Set(["portrait","landscape","square"]);
const counts=(rows,p)=>rows.reduce((sum,row)=>sum+(p(row)?1:0),0);
const unique=(rows,property)=>new Set(rows.map(row=>row[property])).size;
const sortKey=(x,y)=>y.priority-x.priority||x.topicId.localeCompare(y.topicId)||
  x.motifId.localeCompare(y.motifId);
const isEligible=(scene,aspect)=>
  scene?.media==="licensed_mp4"&&isSafeMontageScene(scene)&&
  sceneSupportsPhysicalAspect(scene,aspect);
function footageEvidence(scenes,motifId){
  const matches=scenes.filter(scene=>
    evaluateMyTubeSceneCreativeMatch(scene,{motifId}).motifMatch);
  return {
    catalogTaggedClipCount:matches.length,
    metadataClaimsReviewedCount:counts(matches,scene=>
      evaluateMyTubeSceneCreativeMatch(scene,{motifId}).motifFrameVerified),
    // The current catalog has no timecoded frame witness ledger. Therefore
    // even claimed reviewed tags are NOT verified in this read-only audit.
    frameEvidenceIndependentlyVerified:false,
  };
}
/** @param {{
 *  scenes?:readonly object[],aspect?:"portrait"|"landscape"|"square",
 *  minTopicScore?:number
 * }} [options]
 */
export function auditMyTubeMediaCoverage({scenes=[],aspect="portrait",minTopicScore=65}={}){
  if(!ASPECTS.has(aspect)||!Number.isFinite(minTopicScore)||minTopicScore<0||
     minTopicScore>100||!Array.isArray(scenes))
    throw Error("invalid_mytube_coverage_options");
  const byId=new Set(),byPath=new Set();
  const approved= scenes.filter(scene=>{
    if(!isEligible(scene,aspect)||byId.has(scene.id)||byPath.has(scene.video))return false;
    byId.add(scene.id);byPath.add(scene.video);return true;
  });
  const inventories=MYTUBE_VISUAL_MOTIFS.map(motif=>({
    motifId:motif.id,...footageEvidence(approved,motif.id),
  }));
  const styles=MYTUBE_VISUAL_STYLES.map(style=>({
    styleId:style.id,
    catalogTaggedClipCount:counts(approved,s=>
      evaluateMyTubeSceneCreativeMatch(s,{styleId:style.id}).styleMatch),
    frameEvidenceIndependentlyVerified:false,
  }));
  const topicRows=[],scenarioRows=[],scenarioMotifRows=[],scenarioStyleRows=[];
  const demand=new Map();
  for(const category of getMyTubeTaxonomy().categories)
    for(const subcategory of category.subcategories)
      for(const topic of subcategory.topics){
        let topicReady=0;
        for(const scenario of topic.scenarios){
          const baseline=recommendMyTubeTopicStoryClips({
            topicId:topic.id,scenarioId:scenario.id,scenes:approved,minTopicScore,targetAspect:aspect,
          });
          if(baseline.dedicatedFourSceneReady)topicReady++;
          const motifs=listMyTubeScenarioMotifs(scenario.id,"en");
          const motifRows=motifs.map(motif=>{
            const selection=recommendMyTubeTopicStoryClips({
              topicId:topic.id,scenarioId:scenario.id,scenes:approved,
              motifId:motif.id,minTopicScore,targetAspect:aspect,
            });
            const count=selection.candidates.filter(c=>c.motifMatch).length;
            const key=topic.id+"|"+motif.id;
            const old=demand.get(key)||{categoryId:category.id,subcategoryId:subcategory.id,
              topicId:topic.id,motifId:motif.id,demand:0,
              matchingTopicFootage:count,readyScenarios:0};
            old.demand++;if(selection.dedicatedFourSceneReady)old.readyScenarios++;
            demand.set(key,old);
            const result={
              categoryId:category.id,subcategoryId:subcategory.id,
              topicId:topic.id,scenarioId:scenario.id,motifId:motif.id,
              candidateCount:selection.candidateCount,motifTaggedCount:count,
              fourSourceTaggedReady:selection.dedicatedFourSceneReady,
              sourceTagStatus:"metadata_only_not_frame_verified",
            };
            scenarioMotifRows.push(result);
            return result;
          });
          const styleRows=MYTUBE_VISUAL_STYLES.map(style=>{
            const selection=recommendMyTubeTopicStoryClips({
              topicId:topic.id,scenarioId:scenario.id,scenes:approved,
              styleId:style.id,minTopicScore,targetAspect:aspect,
            });
            const result={topicId:topic.id,scenarioId:scenario.id,styleId:style.id,
              matchingTopicFootage:selection.candidates.filter(c=>c.styleMatch).length,
              fourSourceTaggedReady:selection.dedicatedFourSceneReady};
            scenarioStyleRows.push(result);return result;
          });
          scenarioRows.push({categoryId:category.id,subcategoryId:subcategory.id,
            topicId:topic.id,scenarioId:scenario.id,
            candidateCount:baseline.candidateCount,
            fourSourceTaggedReady:baseline.dedicatedFourSceneReady,
            motifTaggedReady:motifRows.filter(x=>x.fourSourceTaggedReady).length,
            styleTaggedReady:styleRows.filter(x=>x.fourSourceTaggedReady).length,
            finishedStoryboardVerified:false});
        }
        topicRows.push({categoryId:category.id,subcategoryId:subcategory.id,
          topicId:topic.id,scenariosWithFourTaggedSources:topicReady});
      }
  const queue=[...demand.values()].map(item=>({
    ...item,neededForFourUniqueTopicClips:Math.max(0,4-item.matchingTopicFootage),
    // A missing literal motif needs a verified scene, but four DIFFERENT sources
    // can be reused across stories. Do not sum these gaps as an upload promise.
    neededForChosenMotif: item.matchingTopicFootage===0?1:0,
    priority:100*(item.matchingTopicFootage===0?1:0)+
      10*(item.readyScenarios===0?1:0)+item.demand,
    stage:"source_and_visual_editorial_review_required",
    assetId:null,cloudObjectKey:null,providerUrl:null,
  })).sort(sortKey);
  return {
    schemaVersion:"hh-mytube-media-coverage-v1",aspect,
    evidenceLevel:"catalog_tags_only_not_physical_proof",
    footageInventory:{
      eligibleLocalLicensedCatalogRows:approved.length,
      distinctVideoPaths:unique(approved,"video"),
      privateR2UploadCount:"unknown_unverified",
      physicallyCheckedInThisAudit:false,
      originalMotionExcluded:true,
    },
    tree:{
      categories:4,subcategories:16,topics:topicRows.length,
      scenarios:scenarioRows.length,recommendedMotifPlacements:scenarioMotifRows.length,
      visualMotifs:inventories.length,visualStyles:styles.length,
    },
    summary:{
      scenariosWithFourTopicTaggedSources:counts(scenarioRows,x=>x.fourSourceTaggedReady),
      scenariosWithNoFourTopicTaggedSources:counts(scenarioRows,x=>!x.fourSourceTaggedReady),
      motifSelectionsWithFourTaggedSources:counts(scenarioMotifRows,x=>x.fourSourceTaggedReady),
      motifSelectionsBlocked:counts(scenarioMotifRows,x=>!x.fourSourceTaggedReady),
      motifsWithAnyCatalogTag:counts(inventories,x=>x.catalogTaggedClipCount>0),
      motifsWithoutCatalogTag:counts(inventories,x=>x.catalogTaggedClipCount===0),
      independentlyFrameVerifiedMotifs:0,
      uniqueTopicMotifSourcingNeeds:queue.filter(x=>x.matchingTopicFootage===0).length,
    },
    motifs:inventories,styles,topics:topicRows,scenarios:scenarioRows,
    scenarioMotifs:scenarioMotifRows,scenarioStyles:scenarioStyleRows,
    sourcingQueue:queue,
  };
}
