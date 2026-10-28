// Local-only, auditable request matching. Never persist selections, fetch from
// third parties, send to CRM, or infer diagnoses/clinical effectiveness.
import { evaluateClientFit } from "./client-intent-model.mjs";
const VALID_GOALS = new Set(["money","energy","relationships","goals","meaning"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const RISK = Object.freeze({low:0,moderate:10,unknown:15,high:40});
function tags(value) { return Array.isArray(value) ? value.filter(x=>typeof x==="string") : []; }
function released(video) {
 return video?.editorial_status==="approved" && video.embed_status==="confirmed" &&
   video.rights_status==="embed_approved" && Boolean(video.content_checked_at);
}
function availability(video, editorialPreview, publishedSourceIds) {
 if(editorialPreview) return "preview";
 if(released(video)) return "embedded";
 // These original IDs are already in the published Academy/PsiMaster manifest.
 if(video.source_kind==="original" && video.metadata_confidence==="owner_source" &&
   tags(publishedSourceIds).includes(video.youtube_id)) return "embedded";
 // Metadata-checked external recommendation opens ONLY the creator's YouTube
 // page. It must not become an iframe or an "approved" practice automatically.
 if(video.source_kind==="external" && video.discovery_status==="link_only" &&
   video.editorial_status==="candidate" && video.metadata_confidence==="public_listing" &&
   video.content_type==="guided" && ["low","moderate"].includes(video.claims_risk) &&
   video.embed_status==="unverified" && video.rights_status==="pending_embed_check" &&
   Boolean(video.metadata_checked_at) && Boolean(video.youtube_oembed_checked_at)) return "youtube_only";
 return null;
}
function permittedDuration(video,request) {
 const max = request?.maxDurationMinutes;
 if (!Number.isFinite(max) || max <= 0) return true;
 const exact = Number(video.duration_verified_seconds);
 if (Number.isFinite(exact) && exact>0) return exact <= max*60;
 // A title hint is never presented as a verified runtime. A visitor has
 // to explicitly opt into APPROXIMATE length matching.
 return request.allowUnverifiedDuration===true &&
   Number(video.duration_hint_minutes)>0 &&
   Number(video.duration_hint_minutes)<=max;
}
function matchesPreferences(video, request) {
 const desired = {
  experienceLevel:video.experience_level,
  intensity:video.intensity,
  musicStyle:video.music_style,
  posture:video.posture,
  spiritualStyle:video.spiritual_style,
  timeOfDay:video.time_of_day,
 };
 for(const [property,value] of Object.entries(desired)) {
  const requested=request[property];
  if(!requested || requested==="any") continue;
  // An unknown video property isn't evidence that the preference is met.
  if(property==="posture" && (value===requested || value==="either"))continue;
  if(property==="timeOfDay" && (value===requested || value==="any"))continue;
  if(value!==requested)return false;
 }
 if(request.avoidBinaural!==false && tags(video.safety_flags).includes("binaural_sound"))return false;
 return true;
}
/**
 * Only use a reviewed source manifest or public Supabase RLS rows.
 * Strict constraints: language, provider review gate, format/style/safety,
 * length, goal. Soft relevance: situation/outcome/technique.
 * An "exact" match requires EACH explicitly chosen dimension to match;
 * no made-up percent of treatment success or user "suitability".
 *
 * @param {{videos?:object[], request?:object, editorialPreview?:boolean,publishedSourceIds?:string[]}} input
 */
export function rankMeditationCatalog({videos=[],request={},editorialPreview=false,publishedSourceIds=[]}={}) {
 const language=["en","ru","es"].includes(request.language)?request.language:"en";
 const goal=VALID_GOALS.has(request.goal)?request.goal:null;
 const ceiling=Math.min(RISK.unknown, RISK[request.maxRisk]??RISK.unknown);
 const result=(Array.isArray(videos)?videos:[])
  .filter(video=>video && YOUTUBE_ID.test(video.youtube_id||"") &&
     ["guided","practice"].includes(video.content_type))
  .map(video=>({video,playback:availability(video,editorialPreview,publishedSourceIds)}))
  .filter(({video,playback})=>Boolean(playback) &&
     video.audio_language===language &&
     (!request.sourceKind || request.sourceKind==="all" || video.source_kind===request.sourceKind) &&
     (RISK[video.claims_risk]??RISK.high)<=ceiling &&
     matchesPreferences(video,request) && permittedDuration(video,request))
  .map(({video,playback})=>{
    const fit=evaluateClientFit({
      goals:video.goals,goalWeights:video.goal_weights,
      situations:video.user_situations,desiredStates:video.desired_states,
      techniques:video.techniques,
    },request);
    return {
      video,playback,score:fit.score,
      matchType:goal?fit.matchType:"unspecified",
      reasons:fit.reasons,goalMatched:fit.goalMatched,
      durationVerified:Number(video.duration_verified_seconds)>0,
      // Prevent "10 minutes" in a title from masquerading as confirmed.
      durationEstimated:!Number(video.duration_verified_seconds) && Number(video.duration_hint_minutes)>0,
    };
  })
  .filter(row=>(!goal || row.goalMatched || request.allowRelated===true) &&
    (!request.exactOnly || !goal || row.matchType==="exact" || row.matchType==="topic"))
  .sort((a,b)=>b.score-a.score||
     (a.playback==="embedded" ? -1 : b.playback==="embedded" ? 1 : 0) ||
     a.video.youtube_id.localeCompare(b.video.youtube_id));
 const seen=new Set();
 return result.filter(row=>!seen.has(row.video.youtube_id)&&seen.add(row.video.youtube_id))
  .slice(0,Math.max(1,Math.min(30,Number.isFinite(request.limit)?Math.trunc(request.limit):5)));
}
