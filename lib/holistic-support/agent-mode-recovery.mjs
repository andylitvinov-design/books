/**
 * Recover only from a confirmed disabled optional inference mode.
 * No model/network calls, user identifiers, credentials or persistence here.
 */
export function shouldRetryNativeAgentMode({mode,status,errorCode}={}){
  return (mode==="device"||mode==="owned")&&status===503&&errorCode==="AGENT_DISABLED";
}

/** Reduce an opted-in optional-mode request to a zero-provider first-party turn. */
export function nativeAgentFallbackPayload(body){
  if(!body||typeof body!=="object"||!["device","owned"].includes(body.mode))return null;
  const next={...body,mode:"rules",ownedInferenceConsent:false,
    usePrivateProfile:false,usePrivateHistory:false,useAgentMemory:false,chosenAxes:[]};
  delete next.nativeSession;
  return next;
}
