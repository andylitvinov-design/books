/**
 * Server-only synchronous adapter for exactly the 1,536 UNIQUE MyTube plots.
 * This is not a parallel generic plot catalogue. Reuse the same four curated
 * category JSON files and canonical v4 taxonomy as the live MyTube website.
 * Only the Dot owner renderer imports it; MyTube's browser keeps lazy loading.
 * Plots are creative concepts until licensed source footage is verified.
 */
import taxonomy from '../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json' with {type:'json'};
import goals from '../../data/video-catalog/mytube-plots-goals-money-v1.json' with {type:'json'};
import love from '../../data/video-catalog/mytube-plots-love-relationships-v1.json' with {type:'json'};
import energy from '../../data/video-catalog/mytube-plots-energy-confidence-v1.json' with {type:'json'};
import stress from '../../data/video-catalog/mytube-plots-stress-anxiety-v1.json' with {type:'json'};
import {MYTUBE_TAXONOMY_VERSION,
  listMyTubeCategories,listMyTubeSubcategories,listMyTubeTopics,
  listMyTubeScenarios} from './mytube-content-taxonomy.mjs';

export const TELEGRAM_STORY_PLOT_VERSION='hh-telegram-story-plots-canonical-v2';
const DATA=new Map([
 ['goals-money',goals],['love-relationships',love],
 ['energy-confidence',energy],['stress-anxiety',stress],
]);
// Mirror the canonical MyTube plot reader's reviewed legacy-shard routing.
// New taxonomy headings changed scenario ownership, not the original plot IDs.
// Read each migrated scenario from its original editorial shard, then return
// its current canonical category/topic/subcategory to the Dot and Telegram UI.
const LEGACY_PLOT_SHARD_BY_SUBCATEGORY=Object.freeze({
  "stress-fatigue":"energy-confidence","vital-energy":"energy-confidence",
  "confidence-calm":"energy-confidence","body-health":"energy-confidence",
  "purpose-development":"goals-money","business-career":"goals-money",
  "psychological-trauma":"stress-anxiety","depression-apathy":"stress-anxiety",
});
const originalPlotShard=owner=>LEGACY_PLOT_SHARD_BY_SUBCATEGORY[owner.subcategoryId]||owner.categoryId;
const MODE_HINTS=Object.freeze({
 grounded_dilemma:['life','person','people','journey','human','movement'],
 symbolic_quest:['nature','forest','light','symbol','cosmic','sky','transition'],
 relational_mirror:['people','heart','connection','love','warmth','together'],
 branching_future:['path','horizon','light','journey','choice','forward'],
 documentary_observation:['person','nature','life','light','journey','people'],
 quiet_rehearsal:['quiet','reflection','light','calm','journey','person'],
});
const LOCALES=new Set(['ru','en','es']);
const localeOf=x=>LOCALES.has(x)?x:'ru';
const SCENARIOS=new Map();
for(const category of taxonomy.categories){
 for(const subcategory of category.subcategories){
  for(const topic of subcategory.topics){
   for(const scenario of topic.scenarios){
    if(SCENARIOS.has(scenario.id))throw Error('TELEGRAM_STORY_DUPLICATE_SCENARIO');
    SCENARIOS.set(scenario.id,{
     categoryId:category.id,subcategoryId:subcategory.id,topicId:topic.id,
    });
   }
  }
 }
}
function tokens(text){
 return String(text||'').toLowerCase().match(/[a-z]{4,}/g)||[];
}
function modeTags(plot){
 const tags=[...(MODE_HINTS[plot.plotMode]||[])];
 for(const beat of plot.beats.en||[])tags.push(...tokens(beat));
 return Object.freeze([...new Set(tags)].slice(0,80));
}
export function listTelegramStoryCategories(locale='ru'){
 return listMyTubeCategories(localeOf(locale));
}
export function listTelegramStorySubcategories(categoryId,locale='ru'){
 return listMyTubeSubcategories(categoryId,localeOf(locale));
}
export function listTelegramStoryTopics(categoryId,subcategoryId,locale='ru'){
 return listMyTubeTopics(categoryId,subcategoryId,localeOf(locale));
}
export function listTelegramStoryScenarios(topicId,locale='ru'){
 return listMyTubeScenarios(topicId,localeOf(locale));
}
export function listTelegramStoryPlots(scenarioId,locale='ru'){
 if(typeof scenarioId!=='string'||!SCENARIOS.has(scenarioId))return [];
 const lang=localeOf(locale),owner=SCENARIOS.get(scenarioId);
 const records=DATA.get(originalPlotShard(owner))?.plotsByScenario?.[scenarioId];
 // The four immutable shards predate the new topic grouping. Their original
 // category/topic fields identify editorial provenance, not current navigation
 // ownership. The exact canonical scenario ID + six ordered plot IDs remain
 // mandatory: never accept a plot from another scenario or unverified footage.
 if(!Array.isArray(records)||records.length!==6||
   records.some((plot,i)=>plot.id!==scenarioId+'-p'+(i+1)||
      plot.scenarioId!==scenarioId||
      !Array.isArray(plot.beats?.[lang])||plot.beats[lang].length!==4))
   return [];
 return records.map(plot=>Object.freeze({
  id:plot.id,scenarioId,categoryId:owner.categoryId,
  subcategoryId:owner.subcategoryId,topicId:owner.topicId,
  plotMode:plot.plotMode,label:plot.label[lang],
  creativeBrief:plot.synopsis[lang],synopsis:plot.synopsis[lang],
  transformationIdea:plot.transformationIdea[lang],
  visualBeats:Object.freeze([...plot.beats[lang]]),
  visualCues:Object.freeze([...plot.beats.en]),
  beats:Object.freeze([...plot.beats[lang]]),
  visualTags:modeTags(plot),
  sourceStatus:'editorial_only_unbound',canExport:false,
  taxonomyVersion:MYTUBE_TAXONOMY_VERSION,
  plotVersion:TELEGRAM_STORY_PLOT_VERSION,
 }));
}
export function resolveTelegramStoryPlot(plotId,locale='ru'){
 if(typeof plotId!=='string'||plotId.length>160)return null;
 const match=plotId.match(/^([a-z0-9_-]+)-p([1-6])$/);
 if(!match)return null;
 return listTelegramStoryPlots(match[1],locale)[Number(match[2])-1]||null;
}
export function telegramStoryPlotCounts(){
 let subcategories=0,topics=0,scenarios=0,plots=0;
 for(const category of listTelegramStoryCategories()){
  for(const sub of listTelegramStorySubcategories(category.id)){
   subcategories++;
   for(const topic of listTelegramStoryTopics(category.id,sub.id)){
    topics++;
    for(const scenario of listTelegramStoryScenarios(topic.id)){
     scenarios++;plots+=listTelegramStoryPlots(scenario.id).length;
    }
   }
  }
 }
 return {categories:DATA.size,subcategories,topics,scenarios,plots};
}
