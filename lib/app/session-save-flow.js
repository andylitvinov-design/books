import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {operationHash} from './crypto.js'
import {getPublishedClientSession} from '../clients/session-delivery-service.js'

// An Account can claim this one published session, never an entire legacy client.
const unavailable=()=>{throw new AppError('SESSION_UNAVAILABLE',404)}
const stamp=value=>value instanceof Date?value.toISOString().slice(0,10):String(value||'').slice(0,10)
export function sessionSaveSourceHash(config,{sessionId,clientId,revision,grantId,version}){
  return 'sha256:'+operationHash({purpose:'save-one-session:v1',sessionId,clientId,revision,grantId,version},config)
}
export async function createSessionSaveIntent(config,authorized,operationId,browserHash){
  requireUUID(operationId)
  const {session,clientId,sessionId,grantId,accessVersion}=authorized||{}
  requireUUID(sessionId);requireUUID(clientId);requireUUID(grantId)
  if(!Number.isSafeInteger(accessVersion)||accessVersion<1||
    session?.id!==sessionId||session?.clientId!==clientId||
    session.status!=='published'||!Number.isSafeInteger(session.publishedRevision))unavailable()
  const sourceHash=sessionSaveSourceHash(config,{
    sessionId,clientId,revision:session.publishedRevision,grantId,version:accessVersion
  })
  const operation=operationHash({kind:'client_session',sessionId,clientId,grantId,
    accessVersion,revision:session.publishedRevision},config)
  return transaction(config,null,async db=>{
    const grant=(await db.query(
      "select g.id from app_private.client_session_share_grants g join app_private.client_delivery_sessions s on s.id=g.session_id and s.legacy_client_id=g.legacy_client_id where g.id=$1 and g.session_id=$2 and g.legacy_client_id=$3 and g.access_version=$4 and g.revoked_at is null and g.expires_at>now() and s.status='published' and s.published_revision=$5 for share",
      [grantId,sessionId,clientId,accessVersion,session.publishedRevision]
    )).rows[0]
    if(!grant)unavailable()
    const prior=(await db.query('select * from app_private.save_intents where operation_id=$1',[operationId])).rows[0]
    if(prior){
      if(prior.source_kind!=='client_session'||prior.operation_hash!==operation||
        prior.source_id!==sessionId||prior.source_session_grant_id!==grantId||
        prior.source_legacy_client_id!==clientId||prior.source_revision!==session.publishedRevision)
        throw new AppError('IDEMPOTENCY_CONFLICT',409)
      return {id:prior.id,sourceKind:prior.source_kind,sourceId:prior.source_id,
        status:prior.status,expiresAt:prior.expires_at,resourceId:prior.resource_id}
    }
    const id=randomUUID()
    const row=(await db.query(
      "insert into app_private.save_intents (id,browser_secret_hash,source_kind,source_id,source_revision,source_legacy_client_id,source_hash,source_session_grant_id,source_session_access_version,status,operation_id,operation_hash,expires_at) values($1,$2,'client_session',$3,$4,$5,$6,$7,$8,'pending',$9,$10,now()+interval '15 minutes') returning *",
      [id,browserHash(id),sessionId,session.publishedRevision,clientId,sourceHash,grantId,accessVersion,operationId,operation]
    )).rows[0]
    return {id:row.id,sourceKind:row.source_kind,sourceId:row.source_id,
      status:row.status,expiresAt:row.expires_at,resourceId:row.resource_id}
  },{server:true})
}
export async function commitSessionSaveIntent(config,store,actor,intentId,browserProof){
  requireUUID(intentId)
  if(typeof browserProof!=='string'||!/^[a-f0-9]{64}$/.test(browserProof))
    throw new AppError('SAVE_INTENT_REQUIRED',401)
  const prepared=await transaction(config,actor,async db=>{
    const account=(await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0]
    if(account?.status!=='active')throw new AppError('ACCOUNT_UNAVAILABLE',403)
    if(account.onboarding_state!=='active')throw new AppError('CONSENT_REQUIRED',403)
    const row=(await db.query(
      "select * from app_private.save_intents where id=$1 and browser_secret_hash=$2 and source_kind='client_session' for share",
      [intentId,browserProof]
    )).rows[0]
    if(!row)throw new AppError('SAVE_INTENT_REQUIRED',401)
    return row
  })
  if(prepared.status==='committed'){
    if(prepared.target_account_id!==actor.id)throw new AppError('SAVE_UNAVAILABLE',409)
    return transaction(config,actor,async db=>{
      const prev=(await db.query(
        'select id,saved_at from app.saved_sessions where id=$1 and account_id=$2 and removed_at is null',
        [prepared.resource_id,actor.id]
      )).rows[0]
      if(!prev)unavailable()
      return {id:prev.id,savedAt:prev.saved_at}
    })
  }
  if(prepared.status!=='pending'||Date.parse(prepared.expires_at)<=Date.now())
    throw new AppError('SAVE_INTENT_EXPIRED',409)

  await getPublishedClientSession(config,store,prepared.source_legacy_client_id,prepared.source_id)
  try {
    return await transaction(config,actor,async db=>{
      const intent=(await db.query(
        'select * from app_private.save_intents where id=$1 and browser_secret_hash=$2 for update',
        [intentId,browserProof]
      )).rows[0]
      if(!intent||intent.source_kind!=='client_session')throw new AppError('SAVE_INTENT_REQUIRED',401)
      if(intent.status==='committed'){
        if(intent.target_account_id!==actor.id)throw new AppError('SAVE_UNAVAILABLE',409)
        const prev=(await db.query(
          'select id,saved_at from app.saved_sessions where id=$1 and account_id=$2 and removed_at is null',
          [intent.resource_id,actor.id]
        )).rows[0]
        if(!prev)unavailable()
        return {id:prev.id,savedAt:prev.saved_at}
      }
      if(intent.status!=='pending'||Date.parse(intent.expires_at)<=Date.now())
        throw new AppError('SAVE_INTENT_EXPIRED',409)
      const source=(await db.query(
        "select g.id as grant_id,g.access_version,g.revoked_at,g.expires_at,s.id,s.legacy_client_id,s.status,s.published_revision,s.occurred_on from app_private.client_delivery_sessions s join app_private.client_session_share_grants g on g.session_id=s.id and g.legacy_client_id=s.legacy_client_id where s.id=$1 and s.legacy_client_id=$2 and g.id=$3 for share of s,g",
        [intent.source_id,intent.source_legacy_client_id,intent.source_session_grant_id]
      )).rows[0]
      if(!source||source.status!=='published'||source.revoked_at||
        Date.parse(source.expires_at)<=Date.now()||
        source.access_version!==intent.source_session_access_version||
        source.published_revision!==intent.source_revision||
        intent.source_hash!==sessionSaveSourceHash(config,{
          sessionId:intent.source_id,clientId:intent.source_legacy_client_id,
          revision:intent.source_revision,grantId:intent.source_session_grant_id,
          version:intent.source_session_access_version
        }))throw new AppError('SAVE_UNAVAILABLE',409)
      const account=(await db.query(
        'select status,onboarding_state from app.accounts where id=$1 for share',[actor.id]
      )).rows[0]
      if(account?.status!=='active'||account.onboarding_state!=='active')
        throw new AppError('CONSENT_REQUIRED',403)
      // One session is claimed by at most one Account, including if later
      // removed. No implicit full-client binding from a shareable invitation.
      const saved=(await db.query(
        'insert into app.saved_sessions (account_id,session_id,legacy_client_id,source_revision,occurred_on) values($1,$2,$3,$4,$5) on conflict(session_id) do update set removed_at=null,source_revision=excluded.source_revision where app.saved_sessions.account_id=excluded.account_id returning id,saved_at',
        [actor.id,source.id,source.legacy_client_id,source.published_revision,stamp(source.occurred_on)]
      )).rows[0]
      if(!saved)throw new AppError('SESSION_ALREADY_CLAIMED',409)
      await db.query(
        "update app_private.save_intents set status='committed',target_account_id=$2,resource_id=$3,committed_at=now() where id=$1",
        [intent.id,actor.id,saved.id]
      )
      return {id:saved.id,savedAt:saved.saved_at}
    })
  } catch(error) {
    if(error?.code==='23505')throw new AppError('SESSION_ALREADY_CLAIMED',409)
    throw error
  }
}
export async function readSavedSession(config,store,actor,savedId,{markOpened=true}={}){
  requireUUID(savedId)
  const ref=await transaction(config,actor,async db=>{
    const row=(await db.query(
      'select * from app.saved_sessions where id=$1 and account_id=$2 and removed_at is null',
      [savedId,actor.id]
    )).rows[0]
    if(!row)throw new AppError('NOT_FOUND',404)
    return row
  })
  const session=await getPublishedClientSession(config,store,ref.legacy_client_id,ref.session_id)
  if(session.status!=='published'||session.publishedRevision<ref.source_revision)unavailable()
  if(markOpened)await transaction(config,actor,db=>db.query(
    'update app.saved_sessions set opened_at=coalesce(opened_at,now()) where id=$1 and account_id=$2 and removed_at is null',
    [savedId,actor.id]
  ))
  return {id:ref.id,savedAt:ref.saved_at,session,clientId:ref.legacy_client_id}
}
export async function removeSavedSession(config,actor,savedId){
  requireUUID(savedId)
  return transaction(config,actor,async db=>{
    const row=(await db.query(
      'update app.saved_sessions set removed_at=coalesce(removed_at,now()) where id=$1 and account_id=$2 returning id,removed_at',
      [savedId,actor.id]
    )).rows[0]
    if(!row)throw new AppError('NOT_FOUND',404)
    return {id:row.id,removedAt:row.removed_at}
  })
}
