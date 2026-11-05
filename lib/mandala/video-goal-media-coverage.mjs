/**
 * Read-only media-gap inventory for 5 categories / 30 topics / 120 creative stories.
 * A candidate match is NOT a media binding and never makes a story exportable.
 */
import {VIDEO_GOAL_TAXONOMY_VERSION,VIDEO_GOAL_CATEGORIES,VIDEO_GOAL_TOPICS,VIDEO_GOAL_SCENARIOS}
 from "./video-goal-taxonomy.mjs";
import {isUsableFilm} from "./scenario-media-coverage.mjs";
import sceneCatalog from "../../data/video-catalog/scene-taxonomy.json" with {type:"json"};
const SYNONYMS=Object.freeze({
  "sunrise": [
    "sun",
    "morning",
    "dawn"
  ],
  "sunset": [
    "sun",
    "evening",
    "dusk"
  ],
  "ocean": [
    "sea",
    "coast",
    "waves"
  ],
  "shore": [
    "coast",
    "beach",
    "sea"
  ],
  "river": [
    "stream",
    "water"
  ],
  "stream": [
    "river",
    "water"
  ],
  "forest": [
    "trees",
    "tree",
    "wood"
  ],
  "tree": [
    "forest",
    "trees",
    "roots"
  ],
  "roots": [
    "tree",
    "forest"
  ],
  "mountain": [
    "mountains",
    "peak",
    "sky"
  ],
  "horizon": [
    "sky",
    "coast",
    "view"
  ],
  "light": [
    "sun",
    "glow",
    "spark"
  ],
  "stars": [
    "night",
    "sky"
  ],
  "garden": [
    "flowers",
    "plants"
  ],
  "flowers": [
    "flower",
    "petals",
    "garden"
  ],
  "meadow": [
    "grass",
    "flowers",
    "field"
  ],
  "path": [
    "road",
    "journey"
  ],
  "road": [
    "path",
    "direction"
  ],
  "warmth": [
    "sun",
    "light",
    "hearth"
  ],
  "heart": [
    "love",
    "connection"
  ],
  "clouds": [
    "sky",
    "mist"
  ],
  "breeze": [
    "air",
    "wind"
  ],
  "rain": [
    "water",
    "clouds"
  ],
  "waterfall": [
    "falls",
    "river",
    "water"
  ],
  "home": [
    "house",
    "comfort"
  ],
  "lantern": [
    "light",
    "glow"
  ],
  "seed": [
    "growth",
    "plants"
  ],
  "harvest": [
    "crop",
    "field"
  ],
  "sky": [
    "clouds",
    "stars",
    "light"
  ],
  "clearing": [
    "forest",
    "light"
  ],
  "sun": [
    "sunrise",
    "sunset",
    "light"
  ]
});
const tokens=s=>new Set(String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter(Boolean));
function scoreCandidate(film,motif,preferredTheme){
 const words=tokens([film.id,...(film.tags||[]),...(film.motifs||[]),...(film.categories||[])].join(" "));
 const direct=words.has(motif);
 const related=(SYNONYMS[motif]||[]).some(x=>words.has(x));
 if(!direct&&!related)return 0;
 return (direct?20:8)+(film.theme===preferredTheme?10:0)+(film.pace==="slow"?1:0);
}
export function createGoalTreeMediaQueue({
 scenarios=VIDEO_GOAL_SCENARIOS,topics=VIDEO_GOAL_TOPICS,
 scenes=sceneCatalog.scenes,limit=4,
}={}){
 if(!Array.isArray(scenarios)||!Array.isArray(topics)||!Array.isArray(scenes)||
   !Number.isInteger(limit)||limit<0||limit>8)throw Error("invalid_goal_tree_inventory");
 const topicsById=new Map(topics.map(t=>[t.id,t]));
 const verified=scenes.filter(isUsableFilm),usedIds=new Set(),slots=[];
 if(new Set(verified.map(x=>x.id)).size!==verified.length)throw Error("duplicate_approved_scene_id");
 for(const story of scenarios){
   if(!story||usedIds.has(story.id)||!Array.isArray(story.visualMotifs)||story.visualMotifs.length!==4)
      throw Error("invalid_four_beat_story_"+story?.id);
   usedIds.add(story.id);
   const topic=topicsById.get(story.topicId);
   if(!topic||topic.categoryId!==story.categoryId)throw Error("narrative_topic_mismatch_"+story.id);
   for(const [index,motif] of story.visualMotifs.entries()){
     const candidates=verified.map(film=>({film,score:scoreCandidate(film,motif,topic.legacyVideoTheme)}))
       .filter(item=>item.score>0)
       .sort((a,b)=>b.score-a.score||a.film.id.localeCompare(b.film.id))
       .slice(0,limit).map(item=>item.film.id);
     slots.push({id:story.id+"-shot-"+(index+1),categoryId:story.categoryId,
       topicId:story.topicId,scenarioId:story.id,shot:index+1,visualMotifId:motif,
       desiredLegacyTheme:topic.legacyVideoTheme,candidateApprovedClipIds:candidates,
       assetId:null,rightsVerifiedForThisBinding:false,sourceStatus:"unbound",canExport:false});
   }
 }
 const byCategory=Object.fromEntries(VIDEO_GOAL_CATEGORIES.map(c=>[c.id,{
   topics:topics.filter(t=>t.categoryId===c.id).length,
   scenarios:scenarios.filter(s=>s.categoryId===c.id).length,
   shots:slots.filter(s=>s.categoryId===c.id).length,bound:0
 }]));
 return {version:VIDEO_GOAL_TAXONOMY_VERSION,scope:"new_goal_tree_not_yet_media_bound",
   categories:VIDEO_GOAL_CATEGORIES.length,topics:topics.length,scenarios:scenarios.length,
   requiredFourShotSlots:slots.length,currentlyBoundSlots:0,approvedLegacyClipMasters:verified.length,
   optimisticMinimumNewUniqueMasters:Math.max(0,slots.length-verified.length),
   unboundSlots:slots.length,readyForExport:0,byCategory,slots};
}
export function auditGoalTreeMedia(options){
 const {slots,...rest}=createGoalTreeMediaQueue(options);
 return {...rest,candidatesPresent:slots.filter(s=>s.candidateApprovedClipIds.length>0).length};
}
