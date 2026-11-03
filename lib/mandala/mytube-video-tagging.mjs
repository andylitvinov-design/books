/**
 * MyTube ranking v1: editorial visual-fit tags for approved local stock scenes,
 * and conservative metadata-only discovery tags for public YouTube videos.
 * Never claims a finished scenario, medical outcome, approved publication,
 * licensed assets, or a human review for newly inferred tags.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
import curated from "../../data/video-catalog/mytube-scene-rankings-v1.json" with {type:"json"};
import {isSafeMontageScene} from "./video-montage-sources.mjs";

const LOCALES=new Set(["ru","en","es"]);
const localeOf=(value)=>LOCALES.has(value)?value:"ru";
const topicIndex=new Map();
for(const category of taxonomy.categories)
  for(const subcategory of category.subcategories)
    for(const topic of subcategory.topics)
      topicIndex.set(topic.id,{category,subcategory,topic});
const sceneIndex=new Map(curated.scenes.map(row=>[row.sceneId,row]));
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
  return {
    mytubeRankings:matches,
    mytubeCategoryCandidates:categoryCandidates,
    mytubeCategoryIds:categoryCandidates.map(x=>x.categoryId),
    mytubeSubcategoryIds:[...new Set(matches.map(x=>x.subcategoryId))],
    mytubeTopicIds:matches.map(x=>x.topicId),
    mytubeScenarioIds:[...new Set(matches.flatMap(x=>x.scenarios.map(s=>s.scenarioId)))],
    mytubeNeedsReview:!matches.length||matches[0].score<85,
    mytubeTagMethod:"metadata_only_unreviewed",
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
export function recommendMyTubeTopicStoryClips({
  topicId,scenarioId=null,scenes=[],excludedMotifs=[],minTopicScore=65,
}={}){
  const found=topicIndex.get(topicId);
  if(!found)return {status:"unknown_topic",topicId,scenarioId,candidateCount:0,
    clipIds:[],candidates:[],dedicatedFourSceneReady:false};
  const scenarioIndex=scenarioId===null?-1:
    found.topic.scenarios.findIndex(scenario=>scenario.id===scenarioId);
  if(scenarioId!==null&&scenarioIndex<0)return {status:"invalid_scenario",topicId,scenarioId,
    candidateCount:0,clipIds:[],candidates:[],dedicatedFourSceneReady:false};
  if(!Array.isArray(scenes)||!Array.isArray(excludedMotifs))
    return {status:"invalid_media",topicId,scenarioId,candidateCount:0,clipIds:[],
      candidates:[],dedicatedFourSceneReady:false};
  const matches=[],seen=new Set();
  for(const scene of scenes){
    if(!scene||seen.has(scene.id)||!isSafeMontageScene(scene,excludedMotifs))continue;
    seen.add(scene.id);
    const tagged=sceneIndex.get(scene.id);
    const relation=tagged?.topics.find(t=>t.topicId===topicId);
    if(!relation||relation.score<minTopicScore)continue;
    const visualScore=scenarioIndex<0?relation.score:
      tagged.scenarioVisualFit[ARCHETYPES[scenarioIndex]];
    const combined=scenarioIndex<0?relation.score:
      Math.round(relation.score*0.65+visualScore*0.35);
    matches.push({sceneId:scene.id,score:combined,topicScore:relation.score,
      scenarioVisualFit:visualScore});
  }
  matches.sort((a,b)=>b.score-a.score||a.sceneId.localeCompare(b.sceneId));
  const sufficient=matches.length>=4;
  return {
    status:sufficient?"four_approved_scene_candidates":"insufficient_topic_media",
    topicId,scenarioId,candidateCount:matches.length,
    clipIds:sufficient?matches.slice(0,4).map(x=>x.sceneId):[],
    candidates:matches, dedicatedFourSceneReady:sufficient,
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
