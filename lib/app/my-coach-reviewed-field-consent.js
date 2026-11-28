import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { transaction } from './database.js'
import { operationHash } from './crypto.js'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { verifyCoachContextSession } from './coach-context-session.js'
import { lockCoachProtocolIdentity } from './my-coach-protocol-drafts.js'
import { verifyCoachMemoryTicket } from '../coaching/coach-staged-memory-ticket.mjs'
import { appendCoachContextGrant, lockCoachContextConsent } from '../coaching/context-cloud-grant-writer.mjs'
import { readCoachContextGrants } from '../coaching/context-cloud-grant-reader.mjs'
import { hasCoachContextGrant } from '../coaching/context-cloud-consent.mjs'
import { coachContextPolicy } from '../coaching/context-cloud-policy.mjs'
import { coachingGroqConfig } from '../coaching/groq-coach-provider.mjs'
import { coachReviewedFieldContext } from '../coaching/coach-preconsulting.mjs'

const category='reviewed_protocol_fields'
const provider='groq'
const grantLifetime=15*60*1000
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const hash=/^[0-9a-f]{64}$/
const policyFor=env=>env.HH_COACH_REVIEWED_FIELD_GRANTS_ENABLED==='true'&&env.HH_COACH_CONTEXT_ENABLED==='true'&&
  env.HH_CLIENT_MEMORY_ENABLED==='true'&&env.HH_COACH_MEMORY_SELECTION_ENABLED==='true'&&coachingGroqConfig(env)
  ?coachContextPolicy(provider,env):null

function fieldSnapshot(projection){
 const items=coachReviewedFieldContext(projection)
 if(typeof projection?.protocolId!=='string'||!uuid.test(projection.protocolId)||!items.length)return null
 return {itemId:projection.protocolId,items,fields:projection.fields.slice(0,3).map(field=>[field.id,field.revision])}
}
const proof=(config,actor,{stageToken,policyVersion,snapshot})=>operationHash({
 purpose:'coach-reviewed-field-preview-v1',accountId:actor.id,stageToken,policyVersion,snapshot,
},config)
const sourceRevision=(config,actor,{stageToken,policyVersion,snapshot,settingsRevision})=>operationHash({
 purpose:'coach-reviewed-field-text-grant-v1',accountId:actor.id,stageToken,policyVersion,snapshot,settingsRevision,
},config)

export function reviewedFieldPreviewProof(config,actor,stageToken,projection,env){
 const policy=policyFor(env),snapshot=fieldSnapshot(projection)
 return policy&&snapshot?proof(config,actor,{stageToken,policyVersion:policy.version,snapshot}):null
}

async function authorizedRevision(db,actor,snapshot){
 await lockCoachProtocolIdentity(db,actor,snapshot.itemId)
 const {rows:[settings]}=await db.query(`select revision,memory_enabled,sensitive_enabled,third_party_inference_enabled
  from app_private.client_ai_memory_settings where account_id=$1 for share`,[actor.id])
 if(settings?.memory_enabled!==true||settings.sensitive_enabled!==true||
    settings.third_party_inference_enabled!==true||!Number.isSafeInteger(settings.revision))return null
 const current=await db.query(`select 1 from app_private.my_coach_protocol_records
  where account_id=$1 and protocol_id=$2`,[actor.id,snapshot.itemId])
 if(!current.rows.length)return null
 const changed=await db.query(`select 1 from app_private.client_ai_memory_protocol_refs
  where account_id=$1 and protocol_id=$2 and field_id=any($3::text[]) and (status='blocked' or revision>0) limit 1`,
  [actor.id,snapshot.itemId,snapshot.fields.map(([id])=>id)])
 return changed.rows.length?null:settings.revision
}

export async function manageCoachReviewedFieldConsent(config,actor,input,loadProjection,env){
 const {decision,contextSessionToken,stageToken,reviewProof,confirmed}=input
 onlyKeys(input,decision==='revoke'?['stage','provider','decision','contextSessionToken']:
  ['stage','provider','decision','contextSessionToken','stageToken','reviewProof','confirmed'])
 const session=verifyCoachContextSession(config,actor,contextSessionToken)
 if(input.provider!==provider||!session||!['grant','revoke'].includes(decision))
  throw new AppError('MY_COACH_MEMORY_INVALID',400)
 if(decision==='revoke'){
  await transaction(config,actor,db=>appendCoachContextGrant(db,actor,{
   provider,policyVersion:'withdrawal',category,itemId:null,sessionId:session.sessionId,expiresAt:null,
  },'revoke'))
  return {granted:false}
 }
 const policy=policyFor(env)
 if(!policy||confirmed!==true||typeof reviewProof!=='string'||!hash.test(reviewProof)||
    !verifyCoachMemoryTicket(stageToken,{accountId:actor.id,provider,secret:config.encryptionKey,requirePrior:true}))
  throw new AppError('MY_COACH_MEMORY_GRANT_REQUIRED',403)
 const snapshot=fieldSnapshot(await loadProjection())
 if(!snapshot||!timingSafeEqual(Buffer.from(reviewProof,'hex'),Buffer.from(proof(config,actor,{
  stageToken,policyVersion:policy.version,snapshot,
 }),'hex')))throw new AppError('MY_COACH_MEMORY_REVIEW_STALE',409)
 return transaction(config,actor,async db=>{
  await lockCoachContextConsent(db,actor)
  const settingsRevision=await authorizedRevision(db,actor,snapshot)
  if(settingsRevision===null)throw new AppError('MY_COACH_MEMORY_GRANT_REQUIRED',403)
  const expiresAt=Math.min(session.expiresAt,Number(stageToken.split('.')[1]),Date.now()+grantLifetime)
  if(expiresAt<=Date.now())throw new AppError('MY_COACH_MEMORY_REVIEW_STALE',409)
  await appendCoachContextGrant(db,actor,{provider,policyVersion:policy.version,category,itemId:snapshot.itemId,
   sessionId:session.sessionId,expiresAt:new Date(expiresAt),
   sourceRevision:sourceRevision(config,actor,{stageToken,policyVersion:policy.version,snapshot,settingsRevision}),
  },'grant',true)
  return {granted:true,expiresAt}
 })
}

export async function readApprovedCoachReviewedFields(config,actor,{contextSessionToken,stageToken,projection},env){
 const policy=policyFor(env),session=verifyCoachContextSession(config,actor,contextSessionToken)
 const snapshot=fieldSnapshot(projection)
 if(!policy||!session||!snapshot||
    !verifyCoachMemoryTicket(stageToken,{accountId:actor.id,provider,secret:config.encryptionKey,requirePrior:true}))return []
 try{
  return await transaction(config,actor,async db=>{
   await lockCoachContextConsent(db,actor)
   const settingsRevision=await authorizedRevision(db,actor,snapshot)
   if(settingsRevision===null)return []
   const events=await readCoachContextGrants(db,actor,{provider,sessionId:session.sessionId,sessionOnly:true})
   return hasCoachContextGrant({accountId:actor.id,provider,policyVersion:policy.version,category,role:'coach',
    itemId:snapshot.itemId,sessionId:session.sessionId,sessionOnly:true,now:Date.now(),
    sourceRevision:sourceRevision(config,actor,{stageToken,policyVersion:policy.version,snapshot,settingsRevision}),
   },events)?snapshot.items:[]
  })
 }catch{return []}
}
