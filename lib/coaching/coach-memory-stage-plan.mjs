/**
 * Pure advisory contract for the existing Director. NOT a provider grant,
 * a stage transition, a source reader or a second Director. Call only with
 * server-resolved run, mode, current ledger and independently authorized
 * historical records. No new runtime consumer until those gates are wired.
 */
export const COACH_MEMORY_PLAN_VERSION='hh-coach-memory-plan-v1'
const key=/^[a-z0-9_]{1,60}$/
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const types=new Set(['resource','goal_statement','action_statement','practice_observation','state_observation','client_statement'])
const modes=new Set(['coaching','therapy'])
const providers=new Set(['groq','openrouter','gemini_free','gemini_paid'])
const states=new Set(['confirmed_current','skipped_by_client','candidate','not_recorded'])
const invalid=()=>{throw Error('COACH_MEMORY_PLAN_INVALID')}
const isKey=v=>typeof v==='string'&&key.test(v)
const isId=v=>typeof v==='string'&&uuid.test(v)
function trustedContext(c){
 return c&&isId(c.accountId)&&isId(c.courseRunId)&&isId(c.sessionProtocolId)&&
  isKey(c.stageId)&&modes.has(c.mode)&&c.active===true&&c.sessionAccepted===true&&
  c.focusConfirmed===true&&c.safety==='clear'&&Number.isSafeInteger(c.consentEpoch)&&c.consentEpoch>=0&&
  providers.has(c.provider)&&typeof c.policyVersion==='string'&&c.policyVersion.length>0&&Number.isFinite(c.now)
}
function cleanFields(fields){
 if(!Array.isArray(fields)||fields.length>32||fields.some(f=>!f||!isKey(f.id)||
   !types.has(f.type)||!states.has(f.state))||new Set(fields.map(f=>f.id)).size!==fields.length)invalid()
 return fields
}
export function planCoachStageMemory(context,fields){
 const empty={version:COACH_MEMORY_PLAN_VERSION,status:'not_authorized',query:null,fields:[]}
 if(!trustedContext(context))return empty
 const checked=cleanFields(fields)
 const outstanding=checked.filter(f=>f.state!=='confirmed_current'&&f.state!=='skipped_by_client')
 const view=checked.map(f=>({id:f.id,state:f.state}))
 if(!outstanding.length)return {version:COACH_MEMORY_PLAN_VERSION,status:'not_needed',query:null,fields:view}
 return {version:COACH_MEMORY_PLAN_VERSION,status:'needed',
  query:{purpose:'stage_requirements',types:[...new Set(outstanding.map(f=>f.type))],
   fieldIds:outstanding.map(f=>f.id),timeScope:'history',limit:Math.min(6,outstanding.length)},fields:view}
}
function applicable(record,context,field){
 // Owner-only refs and unknown mode/run are never eligible.
 return record&&record.accountId===context.accountId&&record.mode===context.mode&&
  record.courseRunId===context.courseRunId&&record.sessionProtocolId===context.sessionProtocolId&&
  record.consentEpoch===context.consentEpoch&&record.fieldId===field.id&&record.type===field.type&&
  record.status==='active'&&['client_confirmed','measured'].includes(record.evidenceStatus)&&
  record.temporalStatus==='historical'&&record.providerShareable===true&&
  record.sourceVerified===true&&record.grantVerified===true&&
  typeof record.sourceRevision==='string'&&record.sourceRevision.length>0&&
  record.sourceRevision===record.currentSourceRevision&&record.provider===context.provider&&
  record.policyVersion===context.policyVersion&&Number.isFinite(record.grantExpiresAt)&&
  record.grantExpiresAt>context.now&&typeof record.observedAt==='string'&&
  Number.isFinite(Date.parse(record.observedAt))&&Date.parse(record.observedAt)<=context.now
}
export function adviseCoachStageMemory(context,fields,records){
 const plan=planCoachStageMemory(context,fields)
 if(plan.status==='not_authorized')return {version:COACH_MEMORY_PLAN_VERSION,status:'not_authorized',fields:[],nextField:null}
 if(!Array.isArray(records)||records.length>150)invalid()
 // Only metadata, never personal text, source IDs or grant details.
 const result=cleanFields(fields).map(field=>{
  if(field.state==='confirmed_current'||field.state==='skipped_by_client')return {id:field.id,state:field.state}
  const found=records.filter(record=>applicable(record,context,field))
  return {id:field.id,state:found.some(r=>r.conflicting===true)?
   'stale_or_conflicting':found.length?'confirmed_historical':field.state}
 })
 const next=result.find(f=>f.state!=='confirmed_current'&&f.state!=='skipped_by_client')||null
 return {version:COACH_MEMORY_PLAN_VERSION,status:next?'ask_or_confirm':'no_open_field',fields:result,
  nextField:next?{id:next.id,requiresCurrentConfirmation:next.state==='confirmed_historical'||next.state==='stale_or_conflicting'}:null}
}
