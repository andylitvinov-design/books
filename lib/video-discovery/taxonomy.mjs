/**
 * Canonical four-life-area crosswalk for public educational video discovery.
 * Reuses #2480 area IDs; goal chips remain subgoals, never extra life areas.
 * This module does not make therapeutic or clinical inferences.
 */
export const VIDEO_LIFE_AREAS = Object.freeze(["business","relationships","energy_health","personal_growth"]);
export const VIDEO_CONTENT_TYPES = Object.freeze(["soft_meditation","energy_boost_practice","explanation","course_lesson"]);
export const VIDEO_DIRECTIONS = Object.freeze(["magical","temple","psychological","reiki_energy","somatic"]);
export const VIDEO_TRADITIONS = Object.freeze(["egyptian","greek","maya","aztec","northern","slavic","roman","zoroastrian_eastern","other"]);

const AREA_BY_INTENT = Object.freeze({
  work:["business"],money:["business"],business:["business"],
  relationships:["relationships"],love:["relationships"],
  stress:["energy_health"],energy:["energy_health"],health:["energy_health"],body:["energy_health"],
  meaning:["personal_growth"],goals:["personal_growth"],life:["personal_growth"],
  growth:["personal_growth"],personal_growth:["personal_growth"],
  // "practices" is a content preference, never its own life sphere.
});
const SOURCE_OVERRIDES = Object.freeze({
  "tantra-reiki":{lifeAreas:["relationships","energy_health"],contentType:"soft_meditation",directions:["reiki_energy"]},
  "reiki-yggdrasil":{lifeAreas:["energy_health","personal_growth"],contentType:"soft_meditation",directions:["reiki_energy"]},
  "kundalini-reiki":{lifeAreas:["energy_health"],contentType:"soft_meditation",directions:["reiki_energy"]},
  "videos/greek-mysteries-dionysus":{lifeAreas:["relationships","personal_growth"],contentType:"course_lesson",directions:["temple"],traditions:["greek"]},
  "videos/greek-mysteries-demeter":{lifeAreas:["relationships","personal_growth"],contentType:"course_lesson",directions:["temple"],traditions:["greek"]},
  "videos/egypt-osiris":{lifeAreas:["personal_growth"],contentType:"course_lesson",directions:["temple"],traditions:["egyptian"]},
  "videos/maya-archetypes":{lifeAreas:["personal_growth"],contentType:"course_lesson",directions:["temple"],traditions:["maya"]},
  "videos/planetary-power":{lifeAreas:["energy_health","personal_growth"],contentType:"course_lesson",directions:["magical"]},
  "videos/strength-protection":{lifeAreas:["energy_health"],contentType:"soft_meditation",directions:["reiki_energy"]},
  "videos/energy-pump-ups":{lifeAreas:["energy_health"],contentType:"energy_boost_practice",directions:["reiki_energy"]},
  "videos/sun-meditations":{lifeAreas:["energy_health","personal_growth"],contentType:"soft_meditation",directions:["reiki_energy"]},
});
const tagList=(value,allowed)=>Array.isArray(value)
  ? [...new Set(value.filter(v=>typeof v==="string"&&allowed.includes(v)))] : [];
export function lifeAreasForIntent(intent){
  if(typeof intent!=="string")return [];
  return [...(AREA_BY_INTENT[intent]||[])];
}
export function lifeAreasForStudioCategory(category){
  return lifeAreasForIntent(category);
}
export function normalizeDiscoveryFacets(video={}){
  const inferred=SOURCE_OVERRIDES[video.sourceGroup]||{};
  const explicitAreas=tagList(video.lifeAreas,VIDEO_LIFE_AREAS);
  const goalAreas=[...new Set((Array.isArray(video.topicTags)?video.topicTags:[])
    .flatMap(lifeAreasForIntent))];
  const lifeAreas=explicitAreas.length?explicitAreas:
    (inferred.lifeAreas||goalAreas);
  const contentType=VIDEO_CONTENT_TYPES.includes(video.contentType)?video.contentType:
    (inferred.contentType||null);
  const directions=tagList(video.directions,VIDEO_DIRECTIONS);
  const traditions=tagList(video.traditions,VIDEO_TRADITIONS);
  const resolvedDirections=directions.length?directions:(inferred.directions||[]);
  const resolvedTraditions=(resolvedDirections.includes("temple")||resolvedDirections.includes("magical"))
    ? (traditions.length?traditions:(inferred.traditions||[])) : [];
  return {
    lifeAreas:[...lifeAreas], contentType,
    directions:[...resolvedDirections],traditions:[...resolvedTraditions],
  };
}
export function videoMatchesFacets(video={},filters={}){
  const normalized=normalizeDiscoveryFacets(video);
  if(filters.area&&filters.area!=="all"&&!normalized.lifeAreas.includes(filters.area))return false;
  if(filters.contentType&&filters.contentType!=="all"&&normalized.contentType!==filters.contentType)return false;
  if(filters.direction&&filters.direction!=="all"&&!normalized.directions.includes(filters.direction))return false;
  if(filters.tradition&&filters.tradition!=="all"&&!normalized.traditions.includes(filters.tradition))return false;
  return true;
}
