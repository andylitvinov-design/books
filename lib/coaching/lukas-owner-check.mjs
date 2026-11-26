// The verified server-side Google owner may run a fixed editorial test only.
// This is not an admin session or a grant of general customer video access.
export function lukasOwnerCheckActor(access){
  return access?.googleVerified===true&&access?.ownerExempt===true&&typeof access.actor?.id==='string'&&access.actor.id?access.actor:null
}
export function parseLukasOwnerCheck(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||body.target!=='chatbot'||body.syntheticOnly!==true||body.freeOnly!==true)return null
  const keys=Object.keys(body)
  if(body.action==='start'&&body.provider==='simli'&&keys.length===5&&keys.every(k=>['action','provider','target','syntheticOnly','freeOnly'].includes(k)))return {action:'start'}
  if(body.action==='lukas-check-audio'&&['ru','en','es'].includes(body.locale)&&keys.length===5&&keys.every(k=>['action','target','locale','syntheticOnly','freeOnly'].includes(k)))return {action:'audio',locale:body.locale}
  return null
}
