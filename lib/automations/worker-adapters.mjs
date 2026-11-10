/** Narrow adapter boundary borrowed from OpenClaw/Hermes. NOT a generic shell. */
export const WORKER_CAPABILITIES=Object.freeze({
  builtInScout:Object.freeze(['source.wikimedia.metadata.read','candidate.research.insert','events.append']),
  hermes:Object.freeze([]),
  openclaw:Object.freeze([]),
});
export function authorizeAutomationWorker({kind,capability,enabled=false}={}){
  if(!['builtin','hermes','openclaw'].includes(kind))return false;
  if(kind==='builtin')return enabled===true&&WORKER_CAPABILITIES.builtInScout.includes(capability);
  // Future external harnesses require separate sandbox/identity/cost approval.
  return false;
}
export async function invokeExternalAutomationWorker(){
  return Object.freeze({status:'disabled',reason:'NO_APPROVED_EXTERNAL_RUNTIME'});
}
