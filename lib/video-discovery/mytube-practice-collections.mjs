/**
 * Owner-reviewed PsiMaster practice collections. IDs come from the existing
 * public PsiMaster archive and 2026-11-12 owner approval; this module never
 * approves a video or infers copyright, duration or publication status.
 */
export const ORIGINAL_SUN_IDS=Object.freeze([
  "lOkX_8TM-FA", "DPdDGnU4DL8", "1oshNCVzHR8", "6wNdBVoYt50",
]);
export const ORIGINAL_PLANET_IDS=Object.freeze([
  // Named original planetary meditations, not unrelated records from the
  // broader PsiMaster "Planetary Power" archive playlist.
  "8XN-EFpSt8M", "3Lc38_-SqD0", "ocks6JP2lD8", "R1krHd3JRXc",
]);
const SUN=new Set(ORIGINAL_SUN_IDS);
const PLANETS=new Set(ORIGINAL_PLANET_IDS);
const MONEY_CIRCLE="ziXmEWe3Dh0";
const LOVE_ENERGY="-volI7wYbl0";
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const KNOWN_OWNER_APPROVED_IDS=new Set([
  ...ORIGINAL_SUN_IDS,...ORIGINAL_PLANET_IDS,MONEY_CIRCLE,
  "uN5BFjdKVvY","h8r_fIVWM0U","ZYGjw0PtvdM","2GMLhPrEJ3s",
  "owG8gBIQ2hU",LOVE_ENERGY,
]);
const COLLECTIONS=Object.freeze([
  {id:"sun",icon:"☀",label:{ru:"Медитации Солнца",en:"Sun meditations",es:"Meditaciones del Sol"}},
  {id:"planets",icon:"◉",label:{ru:"Медитации планет",en:"Planet meditations",es:"Meditaciones planetarias"}},
  {id:"golden",icon:"✧",label:{ru:"Золотой храм · деньги",en:"Golden Temple · money",es:"Templo Dorado · dinero"}},
  {id:"energy",icon:"✦",label:{ru:"Энергия и защита",en:"Energy & protection",es:"Energía y protección"}},
]);
/** Metadata only: callers must first validate that the ID is owner-approved. */
export function originalPsiMasterPracticeMetadata(id){
  const sun=SUN.has(id),planet=PLANETS.has(id),money=id===MONEY_CIRCLE;
  const topicTags=["energy","practices"];
  // The owner confirms that the Solar meditations develop the energy needed
  // to reach goals. Named planetary practices also have a source-backed
  // growth theme, whereas the Golden Temple explicitly refers to money.
  if(sun||planet||money)topicTags.push("meaning","goals");
  if(sun||money)topicTags.push("work");
  if(money)topicTags.push("money");
  if(id===LOVE_ENERGY)topicTags.push("relationships");
  return {topicTags,collections:[
    ...(sun?["sun"]:[]),...(planet?["planets"]:[]),...(money?["golden"]:[]),
    ...(!sun&&!planet&&!money?["energy"]:[]),
  ]};
}
/** Collection membership never bypasses existing public/owner approval. */
export function myTubePracticeCollectionIds(video={}){
  if(video.sourceGroup!=="psimaster-original-meditations"||
     video.sourceApproved!==true||video.curation!=="verified"||
     typeof video.youtubeId!=="string"||!VIDEO_ID.test(video.youtubeId)||
     !KNOWN_OWNER_APPROVED_IDS.has(video.youtubeId))return [];
  return originalPsiMasterPracticeMetadata(video.youtubeId).collections;
}
export function matchesMyTubePracticeCollection(video={},collectionId="all"){
  return collectionId==="all"||myTubePracticeCollectionIds(video).includes(collectionId);
}
/** Show only shelves backed by real eligible videos in the current filter. */
export function listMyTubePracticeCollections(videos=[],locale="ru"){
  const unique=new Set(),counts=new Map();
  for(const video of Array.isArray(videos)?videos:[]){
    if(!video||video.kind!=="video"||!VIDEO_ID.test(video.youtubeId||"")||
       unique.has(video.youtubeId))continue;
    const ids=myTubePracticeCollectionIds(video);
    if(!ids.length)continue;
    unique.add(video.youtubeId);
    for(const id of ids)counts.set(id,(counts.get(id)||0)+1);
  }
  const language=["ru","en","es"].includes(locale)?locale:"en";
  return COLLECTIONS.filter(row=>counts.has(row.id)).map(row=>({
    id:row.id,label:row.label[language],icon:row.icon,count:counts.get(row.id),
  }));
}
