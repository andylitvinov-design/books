// Existing Gemini sideband only; no new provider request or authority.
import {coachSignatureReplyGuidance} from './coach-signature-speech.mjs'
function coachLivePersonalityGuidance(guidance,turn,limit=620){
 if(typeof guidance!=="string"||guidance.length>limit||!turn)return guidance;
 const modes=["repair","answer","close","listen","contact","support","action","review","explore"];
 if(!modes.includes(turn.mode))return guidance;
 const s=turn.style||{};
 const level=v=>Number.isInteger(v)&&v>=1&&v<=5;
 if(!level(s.warmth)||!level(s.directness)||!["slow","balanced","fast"].includes(s.pace)||!["light","balanced","deep"].includes(s.depth))return guidance;
 // Existing provider checkpoint is authoritative. Append only complete fixed
 // editorial delivery instructions if they fit; never clip consent/course text.
 const prohibitions=(turn.humorAllowed===false?" No jokes.":"")+(turn.metaphorAllowed===false?" No metaphors.":"")+(turn.concise===true?" Brief.":"");
 const full=" Voice delivery: "+turn.mode+"; warmth "+s.warmth+"/5; directness "+s.directness+"/5; "+s.pace+" pace; "+s.depth+" depth."+prohibitions;
 const short=" Delivery: "+turn.mode+", "+s.pace+", directness "+s.directness+"/5."+prohibitions;
 const minimal=(s.directness<=2||turn.humorAllowed===false||turn.metaphorAllowed===false)?" Keep delivery gentle."+prohibitions:"";
 for(const suffix of [full,short,minimal]){
  if(suffix&&guidance.length+suffix.length<=limit){
   const required=guidance+suffix;
   const cue=coachSignatureReplyGuidance(turn.signatureReply,turn.personaId,turn.locale,true);
   return cue&&required.length+cue.length<=limit?required+cue:required;
  }
 }
 return guidance;
}

function withCoachLivePersonality(checkpoint,turn){
 if(!checkpoint||typeof checkpoint!=="object")return checkpoint;
 const delivery=checkpoint.openingProgress?.completed===false&&turn?{...turn,signatureReply:null}:turn;
 const guidance=coachLivePersonalityGuidance(checkpoint.guidance,delivery);
 return guidance===checkpoint.guidance?checkpoint:{...checkpoint,guidance};
}
export {coachLivePersonalityGuidance,withCoachLivePersonality}
