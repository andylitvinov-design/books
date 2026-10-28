// Pure, local-only meditation relevance ranking. NEVER transmit visitor selections
// to analytics, public URL, CRM, YouTube metadata services or client records.
// Data rows from hh_meditation_catalog_v1 must pass public QA/RLS before display.
const GOALS = new Set(["money","energy","relationships","goals","meaning"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const RISK = {low:0,moderate:10,unknown:15,high:40};
function items(list) { return Array.isArray(list) ? list.filter(x=>typeof x==="string") : []; }
function overlap(tags,selected) { return items(selected).filter(x=>items(tags).includes(x)); }
function released(video) {
 return video?.editorial_status==="approved" && video.embed_status==="confirmed" &&
 video.rights_status==="embed_approved" && Boolean(video.content_checked_at);
}
function permittedDuration(video,request,preview) {
 const max=request?.maxDurationMinutes;
 if(!Number.isFinite(max)||max<=0)return true;
 const exact=Number(video.duration_verified_seconds);
 if(Number.isFinite(exact)&&exact>0)return exact<=max*60;
 // Never claim an unverified 10-minute title is an exact 10-minute video.
 if(preview && request?.allowUnverifiedDuration===true &&
  Number(video.duration_hint_minutes)>0) return Number(video.duration_hint_minutes)<=max;
 return false;
}
/**
 * @param {{videos?:object[], request?:object, editorialPreview?:boolean}} input
 * Public default always excludes unapproved candidates.
 */
export function rankMeditationCatalog({videos=[],request={},editorialPreview=false}={}) {
 const lang=["en","ru","es"].includes(request.language)?request.language:"en";
 const goal=GOALS.has(request.goal)?request.goal:null;
 const requiredRisk=request.maxRisk||"moderate";
 const riskCeiling=RISK[requiredRisk]??RISK.moderate;
 const matches=(Array.isArray(videos)?videos:[])
  .filter(video=>video && YOUTUBE_ID.test(video.youtube_id||""))
  .filter(video=>editorialPreview || released(video))
  .filter(video=>video.audio_language===lang)
  .filter(video=>!request.sourceKind||request.sourceKind==="all"||video.source_kind===request.sourceKind)
  .filter(video=>request.includeHighClaims===true || (RISK[video.claims_risk]??15)<=riskCeiling)
  .filter(video=>!goal||items(video.goals).includes(goal)||request.allowRelated===true)
  .filter(video=>!request.spiritualStyle||request.spiritualStyle==="any"||video.spiritual_style===request.spiritualStyle)
  .filter(video=>!request.posture||request.posture==="any"||video.posture===request.posture||video.posture==="either")
  .filter(video=>!request.timeOfDay||request.timeOfDay==="any"||["any",request.timeOfDay].includes(video.time_of_day))
  .filter(video=>permittedDuration(video,request,editorialPreview))
  .map(video=>{
    const goalExact=Boolean(goal && items(video.goals).includes(goal));
    const situations=overlap(video.user_situations,request.situations);
    const states=overlap(video.desired_states,request.desiredStates);
    const techniques=overlap(video.techniques,request.techniques);
    const weights=video.goal_weights&&typeof video.goal_weights==="object"?video.goal_weights:{};
    const importance=goalExact?Math.min(100,Math.max(0,Number(weights[goal])||0)):0;
    const score=(goalExact?45+importance*.25:0) + situations.length*21 +
      states.length*12 + techniques.length*6 +
      (request.sourceKind==="all" && video.source_kind==="original"?2:0) -
      (RISK[video.claims_risk]??15)*.3;
    const reasons=[
       ...(goalExact?[{facet:"goal",value:goal}]:[]),
       ...situations.map(value=>({facet:"situation",value})),
       ...states.map(value=>({facet:"outcome",value})),
       ...techniques.map(value=>({facet:"technique",value})),
    ];
    return {video,score,matchType:goalExact?"exact":goal?"related":"unspecified",reasons,
      durationVerified:Number(video.duration_verified_seconds)>0};
  }).sort((a,b)=>b.score-a.score||a.video.youtube_id.localeCompare(b.video.youtube_id));
 const seen=new Set();
 return matches.filter(m=>!seen.has(m.video.youtube_id)&&seen.add(m.video.youtube_id))
  .slice(0,Math.max(1,Math.min(30,Math.trunc(request.limit||5))));
}
