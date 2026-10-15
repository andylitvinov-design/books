import 'server-only'
import {createHash,createHmac,randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {operationHash} from './crypto.js'
import {hashCapability} from './guest-session.js'
import {getPublishedClientSession} from '../clients/session-delivery-service.js'
import {guestSessionProjection} from '../clients/delivery-model.js'

const deny=()=>{throw new AppError('SESSION_UNAVAILABLE',404)}
const sourceHash=row=>'sha256:'+createHash('sha256').update(row.published_payload||'').digest('hex')
const occurredOn=v=>v instanceof Date?v.toISOString().slice(0,10):String(v).slice(0,10)
const browserHash=(id,config)=>hashCapability(createHmac('sha256',config.encryptionKey)
  .update('holistichouse:save-intent:v1:'+id).digest('base64url'))
function requireProof(proof){if(typeof proof!=='string'||!/^[a-f0-9]{64}$/.test(proof))throw new AppError('SAVE_INTENT_REQUIRED',401)}
async function live(config,store,clientId,sessionId){
  requireUUID(clientId);requireUUID(sessionId)
  const session=await getPublishedClientSession(config,store,clientId,sessionId)
  const row=await transaction(config,null,async db=>(await db.query(
    "select id,legacy_client_id,status,published_revision,published_payload,occurred_on from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 and status='published' and published_payload is not null",
    [sessionId,clientId])).rows[0],{server:true})
  if(!row||!Number.isSafeInteger(row.published_revision)||row.published_revision<1)deny()
  return {row,session,hash:sourceHash(row)}
}

// A guest only has one session grant; a legacy Cabinet visitor is separately
// authenticated for this exact Client before its session ID is accepted.
export async function createSessionSaveIntent(config,store,access,operationId){
  requireUUID(operationId);requireUUID(access?.clientId);requireUUID(access?.sessionId)
  const {clientId,sessionId}=access
  const grantId=access.grantId||null,grantVersion=access.grantVersion||null,
    cabinetSelector=access.cabinetSelector||null
  if(Boolean(grantId)===Boolean(cabinetSelector)||
     (grantId&&(!Number.isInteger(grantVersion)||grantVersion<1))||
     (cabinetSelector&&(!/^[A-Za-z0-9_-]{22}$/.test(cabinetSelector)||grantVersion!==null)))
    throw new AppError('SAVE_UNAVAILABLE',409)
  const current=await live(config,store,clientId,sessionId)
  const revision=current.row.published_revision,hash=current.hash
  const fingerprint=operationHash({kind:'client_session',clientId,sessionId,
    revision,hash,grantId,grantVersion,cabinetSelector},config)
  return transaction(config,null,async db=>{
    if(grantId){
      const g=(await db.query(
        "select id from app_private.client_session_share_grants where id=$1 and session_id=$2 and legacy_client_id=$3 and access_version=$4 and revoked_at is null and expires_at>now() for share",
        [grantId,sessionId,clientId,grantVersion])).rows[0]
      if(!g)deny()
    }
    const prior=(await db.query('select * from app_private.save_intents where operation_id=$1',
      [operationId])).rows[0]
    if(prior){
      if(prior.source_kind!=='client_session'||prior.operation_hash!==fingerprint)
        throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {id:prior.id,sourceKind:prior.source_kind,status:prior.status,
        expiresAt:prior.expires_at,resourceId:prior.resource_id}
    }
    // Freeze the exact approved publication, not a draft or a later revision.
    const source=(await db.query(
      'select status,published_payload,published_revision from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 for share',
      [sessionId,clientId])).rows[0]
    if(!source||source.status!=='published'||source.published_revision!==revision||
      sourceHash(source)!==hash)deny()
    const id=randomUUID()
    const row=(await db.query(
      "insert into app_private.save_intents (id,browser_secret_hash,source_kind,source_id,source_revision,source_legacy_client_id,source_hash,source_session_grant_id,source_session_grant_version,source_cabinet_selector,operation_id,operation_hash,status,expires_at) values($1,$2,'client_session',$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',now()+interval '15 minutes') returning *",
      [id,browserHash(id,config),sessionId,revision,clientId,hash,grantId,grantVersion,
        cabinetSelector,operationId,fingerprint])).rows[0]
    return {id:row.id,sourceKind:'client_session',status:row.status,
      expiresAt:row.expires_at,resourceId:null}
  },{server:true})
}

export async function sessionSaveIntentSummary(config,store,row){
  const current=await live(config,store,row.source_legacy_client_id,row.source_id)
  if(current.row.published_revision!==row.source_revision||current.hash!==row.source_hash)
    return null
  return {title:current.session.title,occurredOn:current.session.occurredOn}
}

export async function commitSessionSaveIntent(config,store,actor,intentId,browserProof){
  requireUUID(intentId);requireProof(browserProof)
  const prepared=await transaction(config,actor,async db=>{
    const account=(await db.query('select status,onboarding_state from app.accounts where id=$1',
      [actor.id])).rows[0]
    if(account?.status!=='active')throw new AppError('ACCOUNT_UNAVAILABLE',403)
    if(account.onboarding_state!=='active')throw new AppError('CONSENT_REQUIRED',403)
    const intent=(await db.query(
      "select * from app_private.save_intents where id=$1 and browser_secret_hash=$2 and source_kind='client_session' for share",
      [intentId,browserProof])).rows[0]
    if(!intent)throw new AppError('SAVE_INTENT_REQUIRED',401)
    return intent
  })
  if(prepared.status==='committed'){
    if(prepared.target_account_id!==actor.id)throw new AppError('SAVE_UNAVAILABLE',409)
    const prior=await transaction(config,actor,async db=>(await db.query(
      'select id,saved_at from app.saved_sessions where id=$1 and account_id=$2 and removed_at is null',
      [prepared.resource_id,actor.id])).rows[0])
    if(!prior)deny()
    return {id:prior.id,savedAt:prior.saved_at}
  }
  if(prepared.status!=='pending'||Date.parse(prepared.expires_at)<=Date.now())
    throw new AppError('SAVE_INTENT_EXPIRED',409)
  if(prepared.source_cabinet_selector){
    // The original full-cabinet cookie must remain valid after Google OAuth.
    const {authorizeCabinetRequest}=await import('../clients/session.js')
    const access=await authorizeCabinetRequest(prepared.source_cabinet_selector)
    if(!access||access.client?.id!==prepared.source_legacy_client_id)deny()
  }
  const current=await live(config,store,prepared.source_legacy_client_id,prepared.source_id)
  if(current.row.published_revision!==prepared.source_revision||current.hash!==prepared.source_hash)
    throw new AppError('SESSION_CHANGED',409)
  try{
    const row=await transaction(config,actor,async db=>{
      const account=(await db.query(
        'select status,onboarding_state from app.accounts where id=$1 for share',[actor.id])).rows[0]
      if(account?.status!=='active'||account.onboarding_state!=='active')
        throw new AppError('CONSENT_REQUIRED',403)
      const intent=(await db.query(
        "select * from app_private.save_intents where id=$1 and browser_secret_hash=$2 and source_kind='client_session' for update",
        [intentId,browserProof])).rows[0]
      if(!intent)throw new AppError('SAVE_INTENT_REQUIRED',401)
      if(intent.status==='committed'){
        if(intent.target_account_id!==actor.id)throw new AppError('SAVE_UNAVAILABLE',409)
        return (await db.query(
          'select * from app.saved_sessions where id=$1 and account_id=$2 and removed_at is null',
          [intent.resource_id,actor.id])).rows[0]
      }
      if(intent.status!=='pending'||Date.parse(intent.expires_at)<=Date.now())
        throw new AppError('SAVE_INTENT_EXPIRED',409)
      if(intent.source_id!==prepared.source_id||intent.source_revision!==prepared.source_revision||
        intent.source_hash!==prepared.source_hash||intent.source_legacy_client_id!==prepared.source_legacy_client_id||
        intent.source_session_grant_id!==prepared.source_session_grant_id||
        intent.source_session_grant_version!==prepared.source_session_grant_version||
        intent.source_cabinet_selector!==prepared.source_cabinet_selector)
        throw new AppError('SAVE_UNAVAILABLE',409)
      const src=(await db.query(
        'select status,published_revision,published_payload,occurred_on from app_private.client_delivery_sessions where id=$1 and legacy_client_id=$2 for share',
        [intent.source_id,intent.source_legacy_client_id])).rows[0]
      if(!src||src.status!=='published'||src.published_revision!==intent.source_revision||
        sourceHash(src)!==intent.source_hash)throw new AppError('SESSION_CHANGED',409)
      if(intent.source_session_grant_id){
        const g=(await db.query(
          "select id from app_private.client_session_share_grants where id=$1 and session_id=$2 and legacy_client_id=$3 and access_version=$4 and revoked_at is null and expires_at>now() for share",
          [intent.source_session_grant_id,intent.source_id,intent.source_legacy_client_id,
            intent.source_session_grant_version])).rows[0]
        if(!g)deny()
      }
      // Respect a Client identity explicitly linked via other verified workflows,
      // without linking unrelated appointments to this new Account.
      const bound=(await db.query(
        'select account_id from app_private.client_account_bindings where legacy_client_id=$1 for share',
        [intent.source_legacy_client_id])).rows[0]
      if(bound&&bound.account_id!==actor.id)throw new AppError('CLIENT_ACCOUNT_ALREADY_LINKED',409)
      const saved=(await db.query(
        'insert into app.saved_sessions (account_id,source_session_id,legacy_client_id,source_revision,source_hash,source_grant_id,occurred_on) values($1,$2,$3,$4,$5,$6,$7) on conflict(source_session_id) do update set removed_at=null,source_revision=excluded.source_revision,source_hash=excluded.source_hash,source_grant_id=excluded.source_grant_id,saved_at=now(),opened_at=null,consented_at=now() where app.saved_sessions.account_id=excluded.account_id returning *',
        [actor.id,intent.source_id,intent.source_legacy_client_id,intent.source_revision,
          intent.source_hash,intent.source_session_grant_id,occurredOn(src.occurred_on)])).rows[0]
      if(!saved)throw new AppError('SAVE_UNAVAILABLE',409)
      await db.query(
        "update app_private.save_intents set status='committed',target_account_id=$2,resource_id=$3,committed_at=now() where id=$1",
        [intent.id,actor.id,saved.id])
      return saved
    })
    if(!row)deny()
    return {id:row.id,savedAt:row.saved_at}
  }catch(e){
    if(e?.code==='23505'||e?.code==='23503')throw new AppError('SAVE_UNAVAILABLE',409)
    throw e
  }
}

export async function readSavedSession(config,store,actor,savedId,{markOpened=true}={}){
  requireUUID(savedId)
  const ref=await transaction(config,actor,async db=>(await db.query(
    'select * from app.saved_sessions where id=$1 and account_id=$2 and removed_at is null',
    [savedId,actor.id])).rows[0])
  if(!ref)deny()
  const current=await live(config,store,ref.legacy_client_id,ref.source_session_id)
  if(current.row.published_revision!==ref.source_revision||current.hash!==ref.source_hash)
    throw new AppError('SESSION_CHANGED',409)
  if(markOpened)await transaction(config,actor,db=>db.query(
    'update app.saved_sessions set opened_at=coalesce(opened_at,now()) where id=$1 and account_id=$2 and removed_at is null',
    [savedId,actor.id]))
  return {id:ref.id,savedAt:ref.saved_at,session:guestSessionProjection(current.session),
    source:{clientId:ref.legacy_client_id,sessionId:ref.source_session_id}}
}
export async function removeSavedSession(config,actor,savedId){
  requireUUID(savedId)
  const row=await transaction(config,actor,async db=>(await db.query(
    'update app.saved_sessions set removed_at=coalesce(removed_at,now()) where id=$1 and account_id=$2 and removed_at is null returning id,removed_at',
    [savedId,actor.id])).rows[0])
  if(!row)deny()
  return {id:row.id,removedAt:row.removed_at}
}
