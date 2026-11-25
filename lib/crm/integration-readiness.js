// Pure owner-facing status: credentials and feature flags do not prove delivery.
// Used by the CRM diagnostics only; provider acceptance requires an actual receipt.
export function crmIntegrationStage(kind,item){
  if(!item||typeof item!=='object')return 'setup'
  const missing=Array.isArray(item.missingKeys)?item.missingKeys:[]
  // Never show a green connection when a channel has only an ENABLED flag,
  // an incomplete credential set, or no production approval.
  if(missing.length)return 'setup'
  if(kind==='telegram'&&item.pilot===true&&item.configured===true)return 'pilot'
  if(item.reason==='sms_disabled'||item.reason==='production_not_approved'||
     item.reason==='sms_production_not_approved'||item.liveApproved===false)
    return 'off'
  if(item.configured===true)return 'configured'
  // SMS/email readiness uses the server-validated enabled flag, not a
  // messenger's raw ENABLED toggle. Messenger channels must be configured.
  if((kind==='sms'||kind==='email')&&item.enabled===true)return 'configured'
  return 'setup'
}
