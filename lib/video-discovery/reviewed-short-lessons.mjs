/**
 * Project independently reviewed <=15-minute lessons from the existing catalogue.
 * Never approves, downloads, republishes or duplicates source videos.
 */
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const CONTENT_TYPES={guided:"soft_meditation",practice:"energy_boost_practice",talk:"explanation"};
const GOAL_TAGS={money:"work",business:"work",relationships:"relationships",energy:"energy",goals:"meaning",meaning:"meaning",stress:"stress"};
const AREA_FOR_GOAL={money:"business",business:"business",relationships:"relationships",energy:"energy_health",goals:"personal_growth",meaning:"personal_growth",stress:"energy_health"};
const AREAS=new Set(["business","relationships","energy_health","personal_growth"]);
const SUBTOPIC_TAGS={business:"work",work:"work",money:"work",money_mindset:"work",relationships:"relationships",connection:"relationships",energy_health:"energy",recovery:"stress",body:"energy",emotions:"stress",personal_growth:"meaning",meaning:"meaning",traits:"meaning",goal:"meaning"};
const list=value=>Array.isArray(value)?value.filter(x=>typeof x==="string"):[];
export function projectReviewedShortLessonRows(rows=[]){
  const seen=new Set();
  if(!Array.isArray(rows))return [];
  return rows.flatMap(row=>{
    const id=row?.youtube_id;
    if(typeof id!=="string"||!VIDEO_ID.test(id)||seen.has(id))return [];
    const playback="https://www.youtube.com/watch?v="+id;
    if(!["en","ru","es"].includes(row.audio_language)||
       row.editorial_status!=="approved"||row.embed_status!=="confirmed"||
       row.rights_status!=="embed_approved"||!row.content_checked_at||
       !row.embed_checked_at||!row.metadata_checked_at||
       !Object.hasOwn(CONTENT_TYPES,row.content_type)||
       !["low","moderate"].includes(row.claims_risk)||
       !["original","external"].includes(row.source_kind)||
       (row.source_kind==="external"&&!row.source_evidence_url)||
       row.source_url!==playback||row.duration_basis!=="metadata_checked"||
       !Number.isInteger(row.duration_verified_seconds)||
       row.duration_verified_seconds<1||row.duration_verified_seconds>900)return [];
    seen.add(id);
    const goals=list(row.goals),subtopics=list(row.subtopics);
    const tags=new Set(goals.map(g=>GOAL_TAGS[g]).filter(Boolean));
    for(const tag of subtopics)if(SUBTOPIC_TAGS[tag])tags.add(SUBTOPIC_TAGS[tag]);
    if(list(row.user_situations).some(s=>["stress","emotional_overload"].includes(s)))tags.add("stress");
    if(!tags.size)tags.add("practices");
    const areas=new Set(subtopics.filter(tag=>AREAS.has(tag)));
    if(!areas.size)for(const goal of goals)if(AREA_FOR_GOAL[goal])areas.add(AREA_FOR_GOAL[goal]);
    if(!areas.size)return [];
    const sourceLabel=typeof row.creator==="string"?row.creator.slice(0,100):"Reviewed source";
    return [{
      id:"approved-short-learning-"+id,kind:"video",youtubeId:id,
      title:String(row.title||"Reviewed short lesson").slice(0,160),
      description:sourceLabel,href:playback,audioLanguage:row.audio_language,
      durationVerifiedSeconds:row.duration_verified_seconds,
      lifeAreas:[...areas],topicTags:[...tags],
      contentType:CONTENT_TYPES[row.content_type],
      sourceGroup:"approved-meditations",sourceLabel,sourceApproved:true,
      curation:"verified",editorial_status:"approved",embed_status:"confirmed",
      rights_status:"embed_approved",content_checked_at:row.content_checked_at,
      source_kind:row.source_kind,
    }];
  });
}
