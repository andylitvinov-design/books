/** Owner-reviewed <=600-second lessons. Link-only always opens YouTube. */
const ID=/^[A-Za-z0-9_-]{11}$/;
const TYPES={guided:"soft_meditation",practice:"energy_boost_practice",talk:"explanation"};
const TAGS={money:"work",business:"work",relationships:"relationships",energy:"energy",goals:"meaning",meaning:"meaning",stress:"stress"};
const AREA_FOR_GOAL={money:"business",business:"business",relationships:"relationships",energy:"energy_health",goals:"personal_growth",meaning:"personal_growth",stress:"energy_health"};
const AREAS=new Set(["business","relationships","energy_health","personal_growth"]);
const SUBTOPIC_TAGS={business:"work",work:"work",money:"work",money_mindset:"work",relationships:"relationships",connection:"relationships",energy_health:"energy",recovery:"stress",body:"energy",emotions:"stress",personal_growth:"meaning",meaning:"meaning",traits:"meaning",goal:"meaning"};
const list=value=>Array.isArray(value)?value.filter(x=>typeof x==="string"):[];
export function projectReviewedShortLessonRows(rows=[]){
 const seen=new Set();if(!Array.isArray(rows))return [];
 return rows.flatMap(row=>{
  const id=row?.youtube_id;
  if(typeof id!=="string"||!ID.test(id)||seen.has(id))return [];
  const url="https://www.youtube.com/watch?v="+id;
  if(!["ru","en","es"].includes(row.audio_language)||row.source_url!==url||
     !Object.hasOwn(TYPES,row.content_type)||row.owner_review_status!=="accepted"||
     !row.content_checked_at||!row.metadata_checked_at||
     !["low","moderate"].includes(row.claims_risk)||
     !["original","external"].includes(row.source_kind)||
     (row.source_kind==="external"&&!row.source_evidence_url)||
     !["metadata_checked","owner_checked"].includes(row.duration_basis)||
     !Number.isInteger(row.duration_verified_seconds)||
     row.duration_verified_seconds<1||row.duration_verified_seconds>600)return [];
  const embedded=row.editorial_status==="approved"&&row.embed_status==="confirmed"&&
    row.rights_status==="embed_approved"&&Boolean(row.embed_checked_at);
  const directLink=row.editorial_status==="candidate"&&row.source_kind==="external"&&
    row.discovery_status==="link_only"&&row.embed_status==="unverified"&&
    row.rights_status==="pending_embed_check"&&row.metadata_confidence==="public_listing"&&
    Boolean(row.youtube_oembed_checked_at);
  if(!embedded&&!directLink)return [];
  const goals=list(row.goals),subtopics=list(row.subtopics),tags=new Set(goals.map(g=>TAGS[g]).filter(Boolean));
  for(const tag of subtopics)if(SUBTOPIC_TAGS[tag])tags.add(SUBTOPIC_TAGS[tag]);
  if(list(row.user_situations).some(x=>["stress","emotional_overload"].includes(x)))tags.add("stress");
  if(!tags.size)tags.add("practices");
  const areas=new Set(subtopics.filter(x=>AREAS.has(x)));
  if(!areas.size)for(const g of goals)if(AREA_FOR_GOAL[g])areas.add(AREA_FOR_GOAL[g]);
  if(!areas.size)return [];
  seen.add(id);
  const sourceLabel=typeof row.creator==="string"?row.creator.slice(0,100):"Reviewed source";
  return [{id:"approved-short-learning-"+id,kind:"video",youtubeId:id,
    title:String(row.title||"Reviewed short lesson").slice(0,160),
    description:sourceLabel,href:url,audioLanguage:row.audio_language,
    durationVerifiedSeconds:row.duration_verified_seconds,lifeAreas:[...areas],
    topicTags:[...tags],contentType:TYPES[row.content_type],
    sourceGroup:"approved-meditations",sourceLabel,sourceApproved:true,
    curation:"verified",source_kind:row.source_kind,
    editorial_status:row.editorial_status,embed_status:row.embed_status,
    rights_status:row.rights_status,content_checked_at:row.content_checked_at,
    owner_review_status:row.owner_review_status,discovery_status:row.discovery_status,
    metadata_checked_at:row.metadata_checked_at,youtube_oembed_checked_at:row.youtube_oembed_checked_at,
    playbackMode:directLink?"youtube_only":"embedded"}];
 });
}
