/**
 * Adapter between the SINGLE approved four-step Video Studio journey and
 * Psychologist Mind's existing server-verified meditation request contract.
 * Only explicit, allowlisted focus codes are mapped here. This module never
 * runs a model, makes a clinical clearance, reads tests or exports personal
 * descriptions to a third party. The server performs the real safety preflight.
 */
import { WRITER_AVOID } from "./contract.mjs";
export const MANDALA_WRITER_BRIDGE_VERSION="mandala-writer-bridge-v1";
const LOCALES=new Set(["ru","en","es"]);
const THEMES=Object.freeze({
  energy:Object.freeze({focus:"stress",goal:"support"}),
  money:Object.freeze({focus:"meaning",goal:"goals"}),
  relationships:Object.freeze({focus:"relationships",goal:"relationships"}),
  goals:Object.freeze({focus:"meaning",goal:"goals"}),
  life:Object.freeze({focus:"meaning",goal:"meaning"}),
  health:Object.freeze({focus:"stress",goal:"settle"}),
});
const STATES=Object.freeze({
  calm:Object.freeze({focus:"stress",goal:"settle"}),
  energy:Object.freeze({focus:"stress",goal:"support"}),
  support:Object.freeze({focus:"stress",goal:"support"}),
  connection:Object.freeze({focus:"relationships",goal:"relationships"}),
});
const DURATIONS=new Set([5,10,15]);
const MOTIFS=new Set(["gentle_nature","supportive_object","comfortable_corner","small_light"]);
const STYLES=new Set(["gentle_simple","grounded_practical",
  "poetic_contained","contemplative"]);
const AVOID=new Set(WRITER_AVOID);
const invalid=reason=>Object.freeze({status:"invalid",reason,request:null});
const text=(v,max)=>{
  if(typeof v!=="string")return null;
  const value=v.trim();
  return /[\u0000-\u0008\u000B-\u001F]/u.test(value)
    ?null:value.slice(0,max);
};
/**
 * `allowPersonalNotes` means permission for a same-origin authenticated
 * Holistic House preflight ONLY; it is NOT external AI or resource-imagery
 * consent. This function intentionally cannot manufacture those permissions.
 */
export function buildMandalaWriterRequest({
  locale,theme,focusMode="state",selectedState=null,selectedGoals=[],
  currentState="",desiredState="",allowPersonalNotes=false,
  durationMinutes=10,styleId="gentle_simple",motifId="gentle_nature",avoidElements=[]
}={}){
  if(!LOCALES.has(locale)||!Object.hasOwn(THEMES,theme)||
      !["state","vector"].includes(focusMode)||
      (selectedState!==null&&!Object.hasOwn(STATES,selectedState))||
      !Array.isArray(selectedGoals)||selectedGoals.length>3||
      selectedGoals.some(g=>!Object.hasOwn(THEMES,g))||
      (focusMode==="state"&&selectedState===null&&selectedGoals.length===0&&
        !(typeof desiredState==="string"&&desiredState.trim()))||
      !DURATIONS.has(durationMinutes)||!STYLES.has(styleId)||!MOTIFS.has(motifId)||
      typeof allowPersonalNotes!=="boolean"||
      !Array.isArray(avoidElements)||avoidElements.length>8||
      new Set(avoidElements).size!==avoidElements.length||
      avoidElements.some(x=>!AVOID.has(x)))
    return invalid("UNSUPPORTED_STUDIO_INTENT");
  const now=text(currentState,350),desired=text(desiredState,180);
  if(now===null||desired===null)return invalid("UNSAFE_INPUT_ENCODING");
  if(focusMode==="vector"&&(!now||!desired))
    return invalid("VECTOR_NEEDS_BOTH_STATES");
  const themeChoice=selectedGoals[0]||theme;
  const mapping=focusMode==="state"&&selectedState
    ?STATES[selectedState]:THEMES[themeChoice];
  // These are fully client-selected category codes, not a diagnosis or
  // inference about the user's private description.
  const request={
    locale,focus:mapping.focus,intentionCode:mapping.goal,
    mode:"resource",durationMinutes,styleId,
    motifId,avoidElements:[...avoidElements],
    ...(allowPersonalNotes&&now?{problemFrame:now}:{}),
    ...(allowPersonalNotes&&desired?{desiredExperience:desired}:{}),
  };
  return Object.freeze({
    status:"ready",version:MANDALA_WRITER_BRIDGE_VERSION,
    request:Object.freeze(request),
    rationale:"explicit_studio_focus_only",
    privateNotesSentToFirstParty:allowPersonalNotes&&Boolean(now||desired),
    privateNotesAvailableToExternalFreeModel:false,
    externalProviderCalled:false,
    resourceImageryConsent:false,externalModelConsent:false,
    requiresServerSafetyPreflight:true,
    requiresAuthenticatedRequest:true,
    publishesAudioOrVideo:false,
  });
}
