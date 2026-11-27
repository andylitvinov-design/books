import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction,consumeRateBatch} from './database.js'
import {openSealed,seal,operationHash} from './crypto.js'
import {AppError} from '../assessments/contracts.js'
import {isMyCoachProtocolId} from '../personal-coaching/protocol-archive.mjs'
import {archivedSupervisorCandidate,archiveQualityProjection,archiveReviewStoredVerdict,ARCHIVE_REVIEW_SCOPE} from '../personal-coaching/coach-archive-quality.mjs'
import {reviewCoachCandidate} from '../coaching/coach-supervisor.mjs'
import {createGroqCoachSupervisorInvoker} from '../coaching/groq-coach-supervisor.mjs'
const invalid=()=>new AppError('COACH_QUALITY_REQUEST_INVALID',400)
const missing=()=>new AppError('COACH_QUALITY_NOT_FOUND',404)
const conflict=()=>new AppError('COACH_QUALITY_CONFLICT',409)
const field=v=>typeof v==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(v)
const storageReady=env=>env.HH_COACH_SUPERVISOR_ARCHIVE_STORAGE_READY==='true'
const recordContext=(actor,id)=>({accountId:actor.id,recordId:id,field:'my_coach.protocol'})
const qaContext=(actor,id)=>({accountId:actor.id,recordId:id,field:'my_coach.supervisor'})
function requireId(id){if(!isMyCoachProtocolId(id))throw invalid();return id.toLowerCase()}
async function readProtocol(db,config,actor,id){
 const row=(await db.query('select protocol_id,protocol_ciphertext,schema_version from app_private.my_coach_protocol_records where account_id=$1 and protocol_id=$2',[actor.id,id])).rows[0]
 if(!row)throw missing()
 const value=openSealed(row.protocol_ciphertext,recordContext(actor,id),config)
 if(row.schema_version!==1||value?.id?.toLowerCase()!==id||value.provenance!=='client_reviewed_dialogue')throw new AppError('COACH_QUALITY_SOURCE_UNAVAILABLE',503)
 return value
}
const hash=(config,actor,source)=>operationHash({domain:'hh-coach-archive-quality-v1',accountId:actor.id,source},config)
const lock=(db,actor,id)=>db.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[actor.id+':coach-supervisor-archive:'+id])
const rowFor=(db,actor,id,fieldId)=>db.query('select field_id,review_id,source_revision,source_hash,state,payload_ciphertext,(expires_at>now()) as lease_active from app_private.my_coach_archive_reviews where account_id=$1 and protocol_id=$2 and field_id=$3',[actor.id,id,fieldId]).then(r=>r.rows[0]||null)
function validRow(config,actor,protocol,row){
 const candidate=archivedSupervisorCandidate(protocol,row.field_id,row.review_id)
 return candidate&&candidate.input.revision===row.source_revision&&hash(config,actor,candidate.source)===row.source_hash?candidate:null
}
export function validateArchiveQualityRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!['review','revoke'].includes(input.action)||Object.keys(input).length!==5||!Object.keys(input).every(k=>['action','protocolId','fieldId','confirmed','scope'].includes(k))||input.confirmed!==true||input.scope!==ARCHIVE_REVIEW_SCOPE||!field(input.fieldId))throw invalid()
 return {...input,protocolId:requireId(input.protocolId)}
}
export async function readCoachArchiveQuality(config,actor,protocolId,env=process.env){
 const id=requireId(protocolId)
 return transaction(config,actor,async db=>{
  const protocol=await readProtocol(db,config,actor,id)
  const reviews=[]
  if(storageReady(env)){
   const rows=(await db.query('select field_id,review_id,source_revision,source_hash,state,payload_ciphertext,(expires_at>now()) as lease_active from app_private.my_coach_archive_reviews where account_id=$1 and protocol_id=$2 order by field_id limit 64',[actor.id,id])).rows
   for(const row of rows){
    if(!validRow(config,actor,protocol,row))continue
    if(row.state==='reviewed'){
     const value=openSealed(row.payload_ciphertext,qaContext(actor,row.review_id),config)
     if(value?.sourceHash!==row.source_hash||value?.fieldId!==row.field_id)throw new AppError('COACH_QUALITY_SOURCE_UNAVAILABLE',503)
     reviews.push({fieldId:row.field_id,state:'reviewed',verdict:value.review?.verdict})
    }else reviews.push({fieldId:row.field_id,state:row.state==='reserved'&&!row.lease_active?'unavailable':row.state})
   }
  }
  return archiveQualityProjection(protocol,reviews,storageReady(env)&&Boolean(createGroqCoachSupervisorInvoker(env)))
 })
}
// One explicit owner click authorizes this one field and no other context.
// Revoke creates a tombstone even if a concurrent reserve has not started.
export async function revokeCoachArchiveQuality(config,actor,raw,env=process.env){
 const input=validateArchiveQualityRequest(raw)
 if(input.action!=='revoke'||!storageReady(env))throw missing()
 const {protocolId:id,fieldId}=input
 await transaction(config,actor,async db=>{
  await lock(db,actor,id)
  const protocol=await readProtocol(db,config,actor,id)
  const candidate=archivedSupervisorCandidate(protocol,fieldId,randomUUID())
  if(!candidate)throw conflict()
  await db.query("insert into app_private.my_coach_archive_reviews(account_id,protocol_id,field_id,review_id,source_revision,source_hash,state,expires_at) values($1,$2,$3,$4,$5,$6,'revoked',now()) on conflict(account_id,protocol_id,field_id) do update set state='revoked',payload_ciphertext=null,updated_at=now()",[actor.id,id,fieldId,candidate.input.reviewId,candidate.input.revision,hash(config,actor,candidate.source)])
 })
 return {revoked:true}
}
export async function runCoachArchiveQuality(config,actor,raw,env=process.env){
 const input=validateArchiveQualityRequest(raw)
 const invoke=storageReady(env)?createGroqCoachSupervisorInvoker(env):null
 if(input.action!=='review'||!invoke)throw missing()
 const {protocolId:id,fieldId}=input,reviewId=randomUUID()
 const candidate=await transaction(config,actor,async db=>archivedSupervisorCandidate(await readProtocol(db,config,actor,id),fieldId,reviewId))
 if(!candidate)throw conflict()
 const sourceHash=hash(config,actor,candidate.source)
 let reserved=false
 const recheck=async(db)=>{
  const current=archivedSupervisorCandidate(await readProtocol(db,config,actor,id),fieldId,reviewId)
  return current&&hash(config,actor,current.source)===sourceHash
 }
 const authorize=async binding=>transaction(config,actor,async db=>{
  if(binding.reviewId!==reviewId||binding.sessionId!==candidate.input.sessionId||binding.revision!==candidate.input.revision||binding.fieldId!==fieldId||!await recheck(db))return false
  const row=await rowFor(db,actor,id,fieldId)
  return reserved?row?.review_id===reviewId&&row.source_hash===sourceHash&&row.state==='reserved'&&row.lease_active===true:!row
 })
 const reserve=async()=> {
  const inserted=await transaction(config,actor,async db=>{
   await lock(db,actor,id)
   if(!await recheck(db))return false
   const result=await db.query("insert into app_private.my_coach_archive_reviews(account_id,protocol_id,field_id,review_id,source_revision,source_hash,state,expires_at) values($1,$2,$3,$4,$5,$6,'reserved',now()+interval '30 seconds') on conflict(account_id,protocol_id,field_id) do nothing returning review_id",[actor.id,id,fieldId,reviewId,candidate.input.revision,sourceHash])
   return result.rows.length===1
  })
  if(!inserted)return false
  reserved=true
  // Conservative initial caps. No external call if any budget is exhausted.
  // A failed attempt is not retried and its one-use reservation remains spent.
  await consumeRateBatch(config,[
   {bucket:{op:'coach-supervisor-archive-global'},limit:60,seconds:3600},
   {bucket:{op:'coach-supervisor-archive-owner',actor:actor.id},limit:6,seconds:3600},
   {bucket:{op:'coach-supervisor-archive-protocol',actor:actor.id,id},limit:8,seconds:86400},
  ])
  return true
 }
 const reviewed=await reviewCoachCandidate(candidate.input,{authorize,reserve,invoke})
 if(!reserved)throw conflict()
 const clean=archiveReviewStoredVerdict(candidate,reviewed)
 // No DB transaction is held while the provider runs. Re-read consent lease
 // and immutable source before publishing a result. Revoked/deleted records
 // can never be recreated by a late provider response.
 await transaction(config,actor,async db=>{
  await lock(db,actor,id)
  if(!await recheck(db))throw conflict()
  const row=await rowFor(db,actor,id,fieldId)
  if(row?.review_id!==reviewId||row.source_hash!==sourceHash||row.state!=='reserved')throw conflict()
  const stored=clean&&row.lease_active===true?seal({fieldId,sourceHash,review:clean},qaContext(actor,reviewId),config):null
  const result=await db.query("update app_private.my_coach_archive_reviews set state=$4,payload_ciphertext=$5,updated_at=now() where account_id=$1 and protocol_id=$2 and field_id=$3 and review_id=$6 and state='reserved' returning review_id",[actor.id,id,fieldId,stored?'reviewed':'unavailable',stored,reviewId])
  if(result.rows.length!==1)throw conflict()
 })
 return {reviewed:true}
}
