// Existing Gemini sideband only; no new provider request or authority.
import {COACH_EARLY_CONTACT_CUE} from './coach-early-contact.mjs'
import {coachCharacterReplyGuidance} from './coach-character-signature.mjs'
import {coachSignatureReplyGuidance,coachSessionSignatureGuidance} from './coach-signature-speech.mjs'
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
 // A direct invited opinion takes optional space ahead of signature material; mandatory text stays intact.
 if(turn.mode==='answer'&&turn.judgmentLiveGuidance===' Answer first: your character’s view + reason when invited; facts first.'&&guidance.length+turn.judgmentLiveGuidance.length<=limit)guidance+=turn.judgmentLiveGuidance;
 // A due signature receives first claim on remaining optional space, never on mandatory checkpoint text.
 if(turn.characterReply){
  const cue=coachCharacterReplyGuidance(turn.characterReply,turn.personaId,turn.locale,true)
  for(const suffix of [full,short,minimal,""])if(cue&&guidance.length+suffix.length+cue.length<=limit)return guidance+suffix+cue
 }
 if(turn.signatureDue){
  const cue=coachSessionSignatureGuidance(turn.signatureReply,turn.personaId,turn.locale,true)
  for(const suffix of [full,short,minimal,""])if(cue&&guidance.length+suffix.length+cue.length<=limit)return guidance+suffix+cue
 }
 for(const suffix of [full,short,minimal]){
  if(suffix&&guidance.length+suffix.length<=limit){
   const required=guidance+suffix;
   const cue=turn.signatureDue?'':coachSignatureReplyGuidance(turn.signatureReply,turn.personaId,turn.locale,true);
   return cue&&required.length+cue.length<=limit?required+cue:required;
  }
 }
 return guidance;
}

function withCoachLivePersonality(checkpoint,turn){
 if(!checkpoint||typeof checkpoint!=="object")return checkpoint;
 const delivery=(checkpoint.openingProgress?.completed===false||checkpoint.profileProgress)&&turn?{...turn,characterReply:null,signatureReply:null,signatureDue:false,judgmentLiveGuidance:""}:turn;
 const opening=checkpoint.openingProgress
 const base=opening?.completed===false&&!opening.declined&&!opening.pendingNameCorrection&&!checkpoint.profileProgress&&typeof checkpoint.guidance==='string'&&checkpoint.guidance.length+COACH_EARLY_CONTACT_CUE.length<=620?checkpoint.guidance+COACH_EARLY_CONTACT_CUE:checkpoint.guidance
 const guidance=coachLivePersonalityGuidance(base,delivery);
 return guidance===checkpoint.guidance?checkpoint:{...checkpoint,guidance};
}
export {coachLivePersonalityGuidance,withCoachLivePersonality}
