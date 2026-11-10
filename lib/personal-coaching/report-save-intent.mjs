const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function makeReportSaveIntent(source,candidates,choices,consent,operationId){
 const invalid=()=>{throw new Error('COACHING_REPORT_SAVE_INTENT_INVALID')}
 if(!source||!uuid.test(source.sessionId)||!Number.isSafeInteger(source.revision)||source.revision<1||
   !['en','ru','es'].includes(source.locale)||!uuid.test(operationId)||consent!==true||
   !Array.isArray(candidates)||candidates.length>3||!choices||typeof choices!=='object'||Array.isArray(choices)||
   Object.keys(choices).length!==candidates.length)invalid()
 const seen=new Set()
 const decisions=candidates.map(candidate=>{
  if(!candidate||typeof candidate.id!=='string'||seen.has(candidate.id)||
    !Object.hasOwn(choices,candidate.id)||!['accepted','deferred','declined'].includes(choices[candidate.id]))invalid()
  seen.add(candidate.id)
  return {candidateId:candidate.id,status:choices[candidate.id]}
 })
 return {sessionId:source.sessionId,revision:source.revision,locale:source.locale,operationId,saveConsent:true,decisions}
}
