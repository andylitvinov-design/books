/**
 * Audited third-party PERFORMANCE recordings, unlike the 196 FIRST-PARTY
 * generated score masters. The source manifest ships only with actual encoded
 * MP3 masters and explicit attribution/recording + composition permissions.
 * Strictly no dynamic streaming, paid API, importing at runtime or health data.
 */
import manifest from "../../data/video-catalog/curated-audio-imports.json" with {type:"json"};
const videoThemes=Object.freeze({
  body:["health","life"],business:["money","goals"],
  energy:["energy","life"],love:["relationships","life"],
  stress:["health","energy"],
});
const approvedLicenses=new Set(["CC0-1.0","CC-BY-3.0","CC-BY-4.0","PDM-1.0"]);
const idPattern=/^curated-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const soundKinds=new Set(["melody"]);
const moods=new Set(["calm","focus","uplift"]);
const paces=new Set(["slow","steady","active"]);
function safeRecord(row){
  return row&&idPattern.test(row.id||"")&&
    approvedLicenses.has(row.recordingLicense)&&
    (row.compositionRights==="public_domain"||row.compositionRights==="licensed_for_commercial_sync")&&
    row.url==="/audio/mandala/curated/"+row.id+".mp3"&&
    /^[a-f0-9]{64}$/.test(row.audioSha256||"")&&
    /^https:\/\//.test(row.sourcePage||"")&&
    /^https:\/\//.test(row.recordingLicenseEvidence||"")&&
    Array.isArray(row.categories)&&row.categories.length>0&&
    row.categories.every(x=>!!videoThemes[x])&&
    Array.isArray(row.moods)&&row.moods.length>0&&row.moods.every(x=>moods.has(x))&&
    paces.has(row.pace)&&typeof row.voiceSafe==="boolean"&&
    ["ru","en","es"].every(l=>typeof row.name?.[l]==="string"&&!!row.name[l]);
}
/** @type {Array<Record<string, any>>} */
const entries=/** @type {Array<Record<string, any>>} */ (manifest.entries||[]);
if(!Array.isArray(entries)||entries.some(x=>!safeRecord(x))||
  new Set(entries.map(x=>x.id)).size!==entries.length||
  new Set(entries.map(x=>x.audioSha256)).size!==entries.length){
  throw Error("unreviewed_curated_audio_registry");
}
export const curatedAudioTracks=Object.freeze(entries.map(row=>Object.freeze({
  id:row.id,kind:"melody",pace:row.pace,moods:row.moods,
  themes:[...new Set(row.categories.flatMap(category=>videoThemes[category]))],
  voiceSafe:row.voiceSafe,durationSeconds:32,icon:"♫",
  name:row.name,
  detail:Object.fromEntries(["ru","en","es"].map(l=>[l,
    row.performer+" · "+row.recordingLicense+" · "+row.title])),
  rights:Object.freeze({
    sourceType:"reviewed_external_recording",
    license:row.recordingLicense,
    sourcePage:row.sourcePage,
    licenseUrl:row.recordingLicenseUrl,
    recordingLicenseEvidence:row.recordingLicenseEvidence,
    composerRights:row.compositionRights,
    creator:row.creator,performer:row.performer,
  }),
})));
/** Curated recordings are optional, after dedicated scenario score choices. */
export function recommendCuratedAudio({
  theme="energy",kind="all",mood="all",pace="all",voiceFriendly=false
}={}){
  return curatedAudioTracks.filter(t=>
    (kind==="all"||kind===t.kind)&&
    (mood==="all"||t.moods.includes(mood))&&
    (pace==="all"||t.pace===pace)&&
    (!voiceFriendly||t.voiceSafe)
  ).map((t,i)=>({...t,relevance:t.themes.includes(theme)?20:0,stableIndex:i}))
    .sort((a,b)=>b.relevance-a.relevance||a.stableIndex-b.stableIndex);
}
