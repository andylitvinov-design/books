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
export function safeRecord(row){
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
    Number.isFinite(row.durationSeconds)&&row.durationSeconds>=16&&row.durationSeconds<=180&&
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
  voiceSafe:row.voiceSafe,durationSeconds:row.durationSeconds,icon:"♫",
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
/** Curated recordings remain optional alongside dedicated scenario score choices. */
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

/** Strict video-audio category rules shared by compact cards and Browse.
 * Sorting/ranking is not filtering: a mismatched track must never appear. */
export function curatedAudioMatchesCategory(track,category="all"){
  if(!track||track.kind!=="melody"||!Array.isArray(track.themes)||!Array.isArray(track.moods))return false;
  if(category==="all")return true;
  const theme=key=>track.themes.includes(key);
  const mood=key=>track.moods.includes(key);
  switch(category){
    case "wellbeing": return theme("health");
    case "focus": return (theme("goals")||theme("money"))&&mood("focus");
    case "calm": return (theme("health")||theme("life"))&&mood("calm");
    case "energy": return theme("energy")&&mood("uplift");
    case "love": return theme("relationships");
    default: return false;
  }
}
/** Suggest an initial Audio chip from the current video concept, not private profile data.
 * The user may freely override the suggestion; no track starts playing.
 * @param {{theme?:string,wish?:string,concept?:null|{
 *  goal?:string,semanticPurpose?:string|null,categoryId?:string,subcategoryId?:string,
 *  topicId?:string,desiredLabel?:string,mainMessage?:string,emotionalProgram?:string[]
 * }}} input
 */
export function inferVideoAudioCategory({theme="energy",concept=null,wish=""}={}){
  const fallback={health:"wellbeing",goals:"focus",money:"focus",life:"calm",
    energy:"energy",relationships:"love"}[theme]||"energy";
  const normalize=value=>String(value||"").slice(0,900).toLocaleLowerCase();
  const primary=normalize([wish,concept?.goal,concept?.semanticPurpose,
    concept?.categoryId,concept?.subcategoryId,concept?.topicId].filter(Boolean).join(" "));
  const secondary=normalize([concept?.desiredLabel,concept?.mainMessage,
    ...(Array.isArray(concept?.emotionalProgram)?concept.emotionalProgram.slice(0,4):[])]
    .filter(Boolean).join(" "));
  const patterns={
    love:/любов|отношен|близост|сердц|довер|love|relationship|romanc|heart|connect|amor|relaci[oó]n|coraz[oó]n/iu,
    calm:/спокой|расслаб|сон|отдых|тишин|медитац|антистресс|тревог|calm|relax|sleep|rest|meditat|peace|tranquil|seren|relaj|descans|paz/iu,
    focus:/фокус|концентр|ясност|работ|проект|цел[ьи]|финанс|деньг|бизнес|карьер|focus|concentrat|clarity|business|work|project|career|money|finance|enfoque|trabajo|negocio|dinero/iu,
    energy:/энерг|радост|праздн|вдохнов|бодр|мотивац|уверен|energy|energ[ií]a|joy|celebrat|inspir|motivat|confidence|vital/iu,
    wellbeing:/здоров|самочув|оздоров|wellbeing|health|salud|bienestar/iu,
  };
  // Explicit goal outranks generated emotional wording.
  for(const text of [primary,secondary]){
    if(!text)continue;
    for(const category of ["love","calm","focus","energy","wellbeing"])
      if(patterns[category].test(text))return category;
  }
  return fallback;
}
