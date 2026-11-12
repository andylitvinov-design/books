import {normalizeDiscoveryFacets} from "./taxonomy.mjs";

// Editorial learning formats, not a claim about actual YouTube playback seconds.
const BRIEF_GROUPS=new Set(["site-introduction"]);
const COURSE_GROUPS=new Set(["tantra-reiki","reiki-yggdrasil","kundalini-reiki"]);
const STUDY_GROUPS=new Set([
  "tantra-reiki","reiki-yggdrasil","kundalini-reiki",
  "videos/greek-mysteries-dionysus","videos/greek-mysteries-demeter",
  "videos/egypt-osiris","videos/maya-archetypes","videos/planetary-power",
  "videos/strength-protection","videos/energy-pump-ups","videos/sun-meditations",
  "approved-meditations",
]);
const BRIEF_TITLE=/\bshorts?\b|\breels?\b|\bintro(?:duction)?\b|\bpreview\b|\bteaser\b|\bquick\b|анонс|вступлени|кратк|коротк|тизер|знакомств|introducci[oó]n|avance|breve/iu;
const COURSE_TITLE=/\bcourse\b|\blesson\b|курс|урок|curso|lecci[oó]n/iu;
const STUDY_TITLE=/lesson|tutorial|workshop|training|course|lecture|seminar|masterclass|practice|meditation|урок|занятие|обучени|курс|лекци|семинар|тренинг|медитаци|практик|lecci[oó]n|clase|curso|taller|formaci[oó]n|pr[aá]ctica|meditaci[oó]n/iu;

/** Every approved public item gets one editorial shelf. Explicit source and
 * lesson intent outrank title clues; no made-up duration or provider requests.
 */
export function classifyMyTubeFormat(video={}){
  if(video?.mytubeFormat==="shorts"||video?.mytubeFormat==="study")return video.mytubeFormat;
  if(video?.seriesId || Number.isInteger(video?.seriesOrder))return "study";
  const group=typeof video?.sourceGroup==="string"?video.sourceGroup:"";
  if(STUDY_GROUPS.has(group))return "study";
  if(BRIEF_GROUPS.has(group))return "shorts";
  const contentType=normalizeDiscoveryFacets(video).contentType;
  const title=typeof video?.title==="string"?video.title:"";
  if(BRIEF_TITLE.test(title))return "shorts";
  if(contentType==="course_lesson"||contentType==="explanation"||contentType==="soft_meditation"||contentType==="energy_boost_practice")return "study";
  if(STUDY_TITLE.test(title))return "study";
  const description=typeof video?.description==="string"?video.description:"";
  if(BRIEF_TITLE.test(description))return "shorts";
  if(STUDY_TITLE.test(description))return "study";
  // An unknown public educational video remains in Study rather than
  // disappearing or being assigned a fabricated runtime.
  return "study";
}
export function matchesMyTubeFormat(video,mode="all"){
  if(mode==="all")return true;
  if(mode==="courses")return classifyMyTubeFormat(video)==="study"&&(
    Boolean(video?.seriesId)||Number.isInteger(video?.seriesOrder)||
    COURSE_GROUPS.has(video?.sourceGroup)||
    normalizeDiscoveryFacets(video).contentType==="course_lesson"||
    COURSE_TITLE.test(typeof video?.title==="string"?video.title:"")
  );
  return (mode==="shorts"||mode==="study")&&classifyMyTubeFormat(video)===mode;
}
export function myTubeFormatCounts(items=[]){
  let shorts=0,study=0;
  for(const video of items){
    if(classifyMyTubeFormat(video)==="shorts")shorts++;
    else study++;
  }
  return {all:items.length,shorts,study};
}
