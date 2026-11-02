import {normalizeDiscoveryFacets} from "./taxonomy.mjs";

const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const AUDIO_LANGUAGES=new Set(["en","ru","es"]);
const restrictedStates=new Set(["candidate","draft","rejected","hidden","unlisted_private","pending"]);
const stableId=video=>typeof video?.youtubeId==="string"&&VIDEO_ID.test(video.youtubeId)?video.youtubeId:null;
const unique=(a,b)=>[...new Set([...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])];
function eligible(item){
  if(!item||item.kind!=="video"||!stableId(item))return false;
  if(item.sourceApproved===false)return false;
  if(restrictedStates.has(item.editorial_status)||restrictedStates.has(item.status))return false;
  // Explicitly identified candidate records must independently satisfy ALL gates.
  if(item.editorial_status||item.embed_status||item.rights_status){
    if(item.editorial_status!=="approved"||item.embed_status!=="confirmed"||
      item.rights_status!=="embed_approved"||!item.content_checked_at)return false;
  }
  // Unverified external links must never be promoted by a fabricated local tag.
  if(item.source_kind==="external" && item.sourceApproved!==true &&
    item.curation!=="verified")return false;
  return true;
}
/**
 * Canonical PUBLIC read projection. Inputs must come from the EXISTING
 * published Library/Academy adapters, not directly from client sessions.
 * Does not mutate source records or publish anything to the provider.
 */
export function buildPublishedVideoIndex(items=[]){
  const map=new Map();
  for(const item of Array.isArray(items)?items:[]){
    if(!eligible(item))continue;
    const id=stableId(item);
    const facets=normalizeDiscoveryFacets(item);
    const language=AUDIO_LANGUAGES.has(item.audioLanguage)?item.audioLanguage:undefined;
    const existing=map.get(id);
    if(!existing){
      map.set(id,{
        ...item, kind:"video", youtubeId:id,
        href:"https://www.youtube.com/watch?v="+id,
        ...(language?{audioLanguage:language}:{}),
        ...facets,
        sourceGroup:item.sourceGroup||"public-library",
        provenance:[item.sourceLabel||item.sourceGroup||"published"],
      });
      continue;
    }
    // Keep first verified lesson (and the numbered Greek series order).
    // Merge tags/provenance, never silently claim the audio was translated.
    const replacePrimary=existing.curation!=="verified"&&item.curation==="verified";
    const primary=replacePrimary?item:existing;
    const primaryFacets=normalizeDiscoveryFacets(primary);
    const otherFacets=normalizeDiscoveryFacets(replacePrimary?existing:item);
    const merged={
      ...primary,
      kind:"video",youtubeId:id,
      href:"https://www.youtube.com/watch?v="+id,
      lifeAreas:unique(primaryFacets.lifeAreas,otherFacets.lifeAreas),
      topicTags:unique(primary.topicTags,(replacePrimary?existing:item).topicTags),
      directions:unique(primaryFacets.directions,otherFacets.directions),
      traditions:unique(primaryFacets.traditions,otherFacets.traditions),
      contentType:primaryFacets.contentType||otherFacets.contentType||null,
      provenance:unique(existing.provenance,[item.sourceLabel||item.sourceGroup||"published"]),
    };
    if(!AUDIO_LANGUAGES.has(primary.audioLanguage)){
      if(AUDIO_LANGUAGES.has(existing.audioLanguage)&&!replacePrimary)merged.audioLanguage=existing.audioLanguage;
      else delete merged.audioLanguage;
    }
    map.set(id,merged);
  }
  return [...map.values()];
}
export function relatedPublishedVideos(active,items=[],limit=3){
  const id=stableId(active);
  if(!id||!Number.isFinite(limit)||limit<=0)return [];
  const activeFacets=normalizeDiscoveryFacets(active);
  const topics=new Set(active.topicTags||[]);
  const scored=buildPublishedVideoIndex(items).filter(v=>v.youtubeId!==id)
    .map(video=>{
      const facets=normalizeDiscoveryFacets(video);
      const shared=facets.lifeAreas.filter(x=>activeFacets.lifeAreas.includes(x)).length;
      const technique=facets.directions.filter(x=>activeFacets.directions.includes(x)).length;
      const topic=video.topicTags?.filter(x=>topics.has(x)).length||0;
      return {video,score:shared*3+technique*2+topic*2+(video.curation==="verified"?1:0)};
    }).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score||a.video.youtubeId.localeCompare(b.video.youtubeId));
  const seenSources=new Set(),diverse=[],rest=[];
  for(const entry of scored){
    const source=entry.video.sourceGroup||entry.video.youtubeId;
    if(seenSources.has(source))rest.push(entry.video);
    else {seenSources.add(source);diverse.push(entry.video);}
  }
  return [...diverse,...rest].slice(0,Math.min(8,Math.floor(limit)));
}
