/**
 * MyTube ranking v1: editorial visual-fit tags for approved local stock scenes,
 * and conservative metadata-only discovery tags for public YouTube videos.
 * Never claims a finished scenario, medical outcome, approved publication,
 * licensed assets, or a human review for newly inferred tags.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
import curated from "../../data/video-catalog/mytube-scene-rankings-v1.json" with {type:"json"};
import {sceneEditorialInterest} from "./mytube-interest-priority.mjs";
import {isSafeMontageScene} from "./video-montage-sources.mjs";
import {getMyTubeMotif,getMyTubeStyle} from "./mytube-creative-choices.mjs";
import {validateMyTubeCreativeSelection,evaluateMyTubeSceneCreativeMatch,
  evaluateMyTubeMontageCreativeMatch} from "./mytube-creative-choices.mjs";

const LOCALES=new Set(["ru","en","es"]);
const VALID_ASPECTS=new Set(["portrait","landscape","square"]);
const localeOf=(value)=>LOCALES.has(value)?value:"ru";
const topicIndex=new Map();
for(const category of taxonomy.categories)
  for(const subcategory of category.subcategories)
    for(const topic of subcategory.topics)
      topicIndex.set(topic.id,{category,subcategory,topic});
const sceneIndex=new Map(curated.scenes.map(row=>[row.sceneId,row]));
/**
 * Conservative future compatibility with the *separate* 684-original-motion
 * library. A matching sourceId is a topic-level metadata hint, not proof that
 * the four events of a plot appear in the video.
 *
 * The caller STILL must pass isSafeMontageScene against the approved source
 * collection. The 21 legacy topic IDs not in the current taxonomy never become
 * exact topic matches via a name similarity or broad category.
 */
export function exactOriginalMotionTopicHint(scene,topicId){
  if(!topicIndex.has(topicId)||!scene||scene.collection!=="original-motion-v1"||
     scene.media!=="original_motion_mp4"||
     scene.visualOrigin!=="original_procedural_non_photographic"||
     scene.status!=="approved"||
     scene.rightsReference?.kind!=="project_generated_original"||
     scene.rightsReference?.thirdPartyFootage!==false||
     scene.sourceId!==topicId||
     !Array.isArray(scene.tags)||!scene.tags.includes(topicId)||
     typeof scene.id!=="string"||!scene.id.endsWith("-"+topicId+"-v1")&&
       !new RegExp("-"+topicId+"-v(?:[1-9]|10)$").test(scene.id)||
     scene.video!=="/videos/holistic-house/original-motion-v1/"+scene.id+".mp4"||
     !/^[a-f0-9]{64}$/.test(scene.sha256||""))return null;
  return {topicId,score:84,evidence:"exact_original_abstract_motion_source_id"};
}

const ARCHETYPES=Object.freeze(["journey","shelter","reframe","integration"]);
const BROAD_TAGS=Object.freeze({
  "goals-money":["business","money","goals","meaning","work","personal_growth"],
  "love-relationships":["relationships","love","connection","family"],
  "energy-confidence":["energy","health","body","recovery","confidence"],
  "stress-anxiety":["stress","anxiety","trauma","emotions"],
});

function normalize(text){
  return String(text??"").normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
}
function phraseIn(text,phrase){
  const term=normalize(phrase);
  return term.length>=4 && (" "+text+" ").includes(" "+term+" ");
}
function matchesForTopic(topicId,score,visualFit,locale){
  const found=topicIndex.get(topicId);
  if(!found)return null;
  const {category,subcategory,topic}=found;
  const scenarios=topic.scenarios.map((scenario,i)=>{
    const visual=visualFit[ARCHETYPES[i]]??50;
    return {scenarioId:scenario.id,label:scenario.label[locale],archetype:scenario.archetype,
      score:Math.round(score*0.65+visual*0.35),visualFit:visual};
  }).sort((a,b)=>b.score-a.score||a.scenarioId.localeCompare(b.scenarioId));
  return {categoryId:category.id,subcategoryId:subcategory.id,topicId:topic.id,
    categoryLabel:category.label[locale],subcategoryLabel:subcategory.label[locale],
    topicLabel:topic.label[locale],score,scenarios};
}

/** Ranked scene -> 1 primary topic + 2 secondary topics -> 4 ranked scenario fits per topic. */
export function rankApprovedMyTubeScene(sceneId,{locale="ru"}={}){
  const row=sceneIndex.get(sceneId);
  if(!row)return null;
  const lang=localeOf(locale);
  const matches=row.topics.map(x=>matchesForTopic(x.topicId,x.score,row.scenarioVisualFit,lang))
    .filter(Boolean).sort((a,b)=>b.score-a.score||a.topicId.localeCompare(b.topicId));
  return {sceneId,classification:"editorial_visual_suitability",
    humanReviewed:false,sourcePublishStatus:"unchanged",primary:matches[0]||null,
    matches,scenarioRankingStatus:"visual_storyboard_fit_only"};
}

/** Only the approved registry is eligible; the same clip present in a stock import is not a second video. */
export function rankAllApprovedMyTubeScenes(scenes=[],{locale="ru"}={}){
  if(!Array.isArray(scenes))return [];
  const seen=new Set();
  return scenes.flatMap(scene=>{
    if(scene?.status!=="approved"||scene?.media!=="licensed_mp4"||seen.has(scene.id))return [];
    seen.add(scene.id);
    const ranked=rankApprovedMyTubeScene(scene.id,{locale});
    return ranked?[{...ranked,label:scene.label?.[localeOf(locale)]||scene.id,
      video:scene.video,poster:scene.poster}]:[];
  });
}

/**
 * Titles and short descriptions can support topic-level tags; old broad tags
 * only support category-level suggestions. This prevents generic "energy"
 * from being misrepresented as evidence for every specific mental-health topic.
 * Call after existing rights/editorial/publication gates, not before.
 */
export function rankPublicMyTubeVideo(video,{locale="ru"}={}){
  const lang=localeOf(locale);
  const title=normalize(video?.title);
  const description=normalize([video?.description,video?.seriesTitle].filter(Boolean).join(" "));
  const tags=new Set(Array.isArray(video?.topicTags)?video.topicTags.filter(x=>typeof x==="string"):[]);
  const scores=[];
  for(const {topic} of topicIndex.values()){
    let score=tags.has(topic.id)?99:0;
    // The UI locale does not determine the audio/title language: evaluate the
    // verified multi-language editorial dictionary without translating speech.
    const terms=[...LOCALES].flatMap(locale=>[topic.label[locale],...topic.searchIntent[locale]]);
    if(terms.some(term=>phraseIn(title,term)))score=Math.max(score,96);
    if(terms.some(term=>phraseIn(description,term)))score=Math.max(score,82);
    // A generic old tag (stress/relationships/energy) is intentionally not a
    // clinical or topic-specific match, even if listed on many taxonomy topics.
    if(score>=65)scores.push({topicId:topic.id,score});
  }
  scores.sort((a,b)=>b.score-a.score||a.topicId.localeCompare(b.topicId));
  const isPractice=/\b(practice|práctica|exercise|упражнен|практик|practica)\b/iu.test(title);
  const isMeditation=/медитац|meditation|meditación|meditacion/iu.test(title);
  const visualFit={journey:65,shelter:isMeditation?85:60,reframe:60,
    integration:isPractice?86:57};
  const matches=scores.slice(0,8).map(row=>matchesForTopic(row.topicId,row.score,visualFit,lang));
  const categories=new Map();
  for(const match of matches){
    const old=categories.get(match.categoryId);
    if(!old||match.score>old.score)categories.set(match.categoryId,{categoryId:match.categoryId,score:match.score,evidence:"topic"});
  }
  for(const [categoryId,broadTags] of Object.entries(BROAD_TAGS)){
    if(broadTags.some(tag=>tags.has(tag))&&!categories.has(categoryId))
      categories.set(categoryId,{categoryId,score:42,evidence:"legacy_category_tag"});
  }
  const categoryCandidates=[...categories.values()].sort((a,b)=>b.score-a.score||a.categoryId.localeCompare(b.categoryId));
  // Only explicitly reviewed public-video metadata can populate literal visual filters.
  // Broad topic tags or a title containing "key" NEVER prove the key is visible.
  const visualsReviewed=video?.visualReviewStatus==="human_reviewed";
  const reviewedIds=(candidate,verify)=>visualsReviewed&&Array.isArray(candidate)?
    [...new Set(candidate.filter(id=>typeof id==="string"&&verify(id)))]:[];
  const mytubeMotifIds=reviewedIds(video?.visualMotifsVerified,getMyTubeMotif);
  const mytubeStyleIds=reviewedIds(video?.visualStylesVerified,getMyTubeStyle);
  return {
    mytubeRankings:matches,
    mytubeCategoryCandidates:categoryCandidates,
    mytubeCategoryIds:categoryCandidates.map(x=>x.categoryId),
    mytubeSubcategoryIds:[...new Set(matches.map(x=>x.subcategoryId))],
    mytubeTopicIds:matches.map(x=>x.topicId),
    mytubeScenarioIds:[...new Set(matches.flatMap(x=>x.scenarios.map(s=>s.scenarioId)))],
    mytubeNeedsReview:!matches.length||matches[0].score<85,
    mytubeTagMethod:"metadata_only_unreviewed",
    mytubeMotifIds,mytubeStyleIds,
    mytubeVisualTagEvidence:visualsReviewed?"explicit_human_review":"not_verified",
  };
}


/**
 * Topic-driven, rights-safe candidate selector for the existing four-shot
 * editor. Unlike the editorial tag report this validates the actual input
 * registry and negative visual requests before suggesting any clip ID.
 *
 * Insufficient coverage is explicit: no unrelated filler is silently called
 * topic-specific and no new executable scenario is manufactured.
 */
/** Pick four source-tagged scenes that meet explicit motif/style constraints.
 * Bounded deterministic search, no external calls or false media claims.
 */
function chooseFourWithCreativeConstraints(matches,motifId,styleId){
  if(matches.length<4)return null;
  if(!motifId&&!styleId)return matches.slice(0,4);
  const pool=[],seen=new Set();
  const add=row=>{if(!seen.has(row.sceneId)){seen.add(row.sceneId);pool.push(row);}};
  for(const row of matches.slice(0,12))add(row);
  if(motifId)for(const row of matches.filter(x=>x.motifMatch).slice(0,2))add(row);
  if(styleId)for(const row of matches.filter(x=>x.styleMatch).slice(0,4))add(row);
  let best=null,bestScore=-Infinity,bestTie="";
  for(let a=0;a<pool.length-3;a++)
    for(let b=a+1;b<pool.length-2;b++)
      for(let c=b+1;c<pool.length-1;c++)
        for(let d=c+1;d<pool.length;d++){
          const selected=[pool[a],pool[b],pool[c],pool[d]];
          if(motifId&&!selected.some(x=>x.motifMatch))continue;
          if(styleId&&selected.filter(x=>x.styleMatch).length<3)continue;
          const score=selected.reduce((n,x)=>n+x.score,0);
          const tie=selected.map(x=>x.sceneId).join("|");
          if(score>bestScore||(score===bestScore&&(best===null||tie<bestTie))){
            best=selected;bestScore=score;bestTie=tie;
          }
        }
  return best;
}
export function recommendMyTubeTopicStoryClips({
  topicId,scenarioId=null,scenes=[],excludedMotifs=[],minTopicScore=65,
  motifId=null,styleId=null,meaningAxisId=null,targetAspect=null,
}={}){
  const found=topicIndex.get(topicId);
  if(!found)return {status:"unknown_topic",topicId,scenarioId,candidateCount:0,
    clipIds:[],candidates:[],dedicatedFourSceneReady:false};
  const scenarioIndex=scenarioId===null?-1:
    found.topic.scenarios.findIndex(scenario=>scenario.id===scenarioId);
  if(scenarioId!==null&&scenarioIndex<0)return {status:"invalid_scenario",topicId,scenarioId,
    candidateCount:0,clipIds:[],candidates:[],dedicatedFourSceneReady:false};
  if(targetAspect!==null&&!VALID_ASPECTS.has(targetAspect))
    return {status:"invalid_aspect",topicId,scenarioId,candidateCount:0,
      clipIds:[],candidates:[],dedicatedFourSceneReady:false};
  if(!Array.isArray(scenes)||!Array.isArray(excludedMotifs))
    return {status:"invalid_media",topicId,scenarioId,candidateCount:0,clipIds:[],
      candidates:[],dedicatedFourSceneReady:false};
  if(motifId!==null||styleId!==null||meaningAxisId!==null){
    if(!scenarioId)return {status:"scenario_required_for_creative_filter",topicId,scenarioId,
      candidateCount:0,clipIds:[],candidates:[],dedicatedFourSceneReady:false};
    const selection=validateMyTubeCreativeSelection({topicId,scenarioId,motifId,styleId,meaningAxisId});
    if(!selection.ok)return {status:selection.status,topicId,scenarioId,
      candidateCount:0,clipIds:[],candidates:[],dedicatedFourSceneReady:false};
  }
  const matches=[],seen=new Set(),seenOriginalGroup=new Set();
  for(const scene of scenes){
    if(!scene||seen.has(scene.id)||!isSafeMontageScene(scene,excludedMotifs))continue;
    // With no aspect selected, two crops of one film must not inflate the candidate pool.
    if(targetAspect===null&&scene.sourceOriginalGroupId&&seenOriginalGroup.has(scene.sourceOriginalGroupId))continue;
    // Newly published portrait-only masters must not enter 16:9/1:1 renders.
    if(targetAspect!==null&&scene.allowedAspects!==undefined&&
      (!Array.isArray(scene.allowedAspects)||!scene.allowedAspects.includes(targetAspect)))continue;
    seen.add(scene.id);
    if(targetAspect===null&&scene.sourceOriginalGroupId)seenOriginalGroup.add(scene.sourceOriginalGroupId);
    const tagged=sceneIndex.get(scene.id);
    const originalHint=exactOriginalMotionTopicHint(scene,topicId);
    const relation=tagged?.topics.find(t=>t.topicId===topicId)||originalHint;
    if(!relation||relation.score<minTopicScore)continue;
    // Abstract motion is deliberately assigned a *neutral* heuristic visual
    // score. It has no human-reviewed plot-event or cinematic-action rating.
    const visualScore=scenarioIndex<0?relation.score:
      tagged?.scenarioVisualFit?.[ARCHETYPES[scenarioIndex]]??70;
    const combined=scenarioIndex<0?relation.score:
      Math.round(relation.score*0.65+visualScore*0.35);
    const creative=evaluateMyTubeSceneCreativeMatch(scene,{motifId,styleId});
    // Motif >=1, style >=3; editorial tags are NOT independent frame proof.
    const interest=sceneEditorialInterest(scene);
    matches.push({sceneId:scene.id,
      score:combined+(creative.motifMatch?160:0)+(creative.styleMatch?40:0)+interest.weight,
      interestTier:interest.tier,interestReviewScore:interest.visualScore,
      interestEvidence:interest.evidence,
      motifMatch:creative.motifMatch,styleMatch:creative.styleMatch,
      motifEvidence:creative.motifEvidence,styleEvidence:creative.styleEvidence,
      topicScore:relation.score,scenarioVisualFit:visualScore,
      sourceKind:originalHint?"original_abstract_motion":"licensed_filmed_footage",
      evidence:originalHint?.evidence||"curated_topic_score",
      depictedPlotEventsVerified:false});
  }
  matches.sort((a,b)=>b.score-a.score||a.sceneId.localeCompare(b.sceneId));
  const chosen=chooseFourWithCreativeConstraints(matches,motifId,styleId);
  const topIds=chosen?.map(x=>x.sceneId)||[];
  const creative=(motifId!==null||styleId!==null)&&chosen?
    evaluateMyTubeMontageCreativeMatch({clipIds:topIds,scenes,motifId,styleId}):null;
  const sufficient=Boolean(chosen&&(!creative||creative.ok));
  const unavailable=matches.length<4?"insufficient_topic_media":
    motifId&&!matches.some(x=>x.motifMatch)?"insufficient_motif_media":
    styleId&&matches.filter(x=>x.styleMatch).length<3?"insufficient_style_media":
    creative?.status||"insufficient_topic_media";
  return {
    status:sufficient?"four_approved_scene_candidates":unavailable,
    topicId,scenarioId,candidateCount:matches.length,
    clipIds:sufficient?topIds:[],
    candidates:matches,dedicatedFourSceneReady:sufficient,
    motifId,styleId,meaningAxisId,targetAspect,creativeEvidence:creative,
    // Approval for finished scripts, narrative sequencing and production
    // must happen independently; this is only a source selection suggestion.
    verifiedFinishedScript:false,
  };
}

/** Small review summary; safe to expose without any user/private source data. */
export function auditMyTubeSceneTagging(scenes=[]){
  const approved=Array.isArray(scenes)?scenes.filter(x=>x.status==="approved"&&x.media==="licensed_mp4"):[];
  const ranked=rankAllApprovedMyTubeScenes(approved);
  const categories=Object.fromEntries(taxonomy.categories.map(category=>[
    category.id,ranked.filter(row=>row.primary?.categoryId===category.id).length,
  ]));
  return {approvedUnique:new Set(approved.map(x=>x.id)).size,ranked:ranked.length,
    missing:[...new Set(approved.map(x=>x.id))].filter(id=>!sceneIndex.has(id)),
    primaryCategoryCounts:categories,topicPlacements:ranked.reduce((n,x)=>n+x.matches.length,0),
    scenarioVisualMatches:ranked.reduce((n,x)=>n+x.matches.reduce((m,t)=>m+t.scenarios.length,0),0),
    reviewStatus:"editorial_proposal_not_human_approved"};
}
