import 'server-only'
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { AppError } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { validSelector, validSecret, validUuid, newSelector } from './delivery-model.js'
import { getPublishedClientSession } from './session-delivery-service.js'

const fail = () => { throw new AppError('SESSION_UNAVAILABLE',404) }
const digest = value => createHash('sha256').update('hh-session-access-v1:'+value).digest('hex')
const same = (a,b) => {
  if(typeof a!=='string'||typeof b!=='string') return false
  const left=Buffer.from(a),right=Buffer.from(b)
  return left.length===right.length && timingSafeEqual(left,right)
}
const derive = (grant,config) => createHmac('sha256',config.encryptionKey)
  .update(['hh-client-session-share-v1',grant.id,grant.selector,grant.access_version].join(':'))
  .digest('base64url')
export function sessionViewerCookieName(selector,env=process.env) {
  if(!validSelector(selector)) fail()
  return (env.NODE_ENV==='production'?'__Host-hh_session_':'hh_session_')+selector
}
export function readSessionViewerCookie(cookieJar,selector,env=process.env) {
  const value=cookieJar.get(sessionViewerCookieName(selector,env))?.value
  const [id,secret,extra]=typeof value==='string'?value.split('.'):[]
  if(extra!==undefined||!validUuid(id)||!validSecret(secret)) return null
  return {id,secretHash:digest(secret)}
}
export function setSessionViewerCookie(response,selector,viewer,env=process.env) {
  response.cookies.set(sessionViewerCookieName(selector,env),viewer.id+'.'+viewer.secret,{
    httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:viewer.maxAge,
  })
  return response
}
export function clearSessionViewerCookie(response,selector,env=process.env) {
  response.cookies.set(sessionViewerCookieName(selector,env),'',{
    httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0,
  })
  return response
}
export async function changeSessionGrant(config,store,clientId,sessionId,action,{days=30}={}) {
  if(!validUuid(clientId)||!validUuid(sessionId)||!['copy','rotate','extend','revoke'].includes(action)) fail()
  if(![7,30,90].includes(Number(days))) throw new AppError('INVALID_EXPIRY',400)
  const published=await getPublishedClientSession(config,store,clientId,sessionId)
  if(published.status!=='published') fail()
  return transaction(config,null,async db=>{
    let grant=(await db.query('select * from app_private.client_session_share_grants where session_id=$1 and legacy_client_id=$2 for update',
      [sessionId,clientId])).rows[0]
    if(!grant) {
      if(action==='revoke'||action==='rotate'||action==='extend') fail()
      grant={id:randomUUID(),selector:newSelector(),access_version:1}
      grant.secret_hash=digest(derive(grant,config))
      grant=(await db.query(
        "insert into app_private.client_session_share_grants(id,session_id,legacy_client_id,selector,secret_hash,access_version,expires_at) values($1,$2,$3,$4,$5,1,now()+interval '30 days') returning *",
        [grant.id,sessionId,clientId,grant.selector,grant.secret_hash])).rows[0]
    } else if(action==='rotate') {
      const next={...grant,selector:newSelector(),access_version:grant.access_version+1}
      const hash=digest(derive(next,config))
      grant=(await db.query(
        "update app_private.client_session_share_grants set selector=$2,access_version=$3,secret_hash=$4,expires_at=now()+($5::integer*interval '1 day'),revoked_at=null where id=$1 returning *",
        [grant.id,next.selector,next.access_version,hash,Number(days)])).rows[0]
      await db.query('update app_private.client_session_viewer_sessions set revoked_at=now() where grant_id=$1 and revoked_at is null',[grant.id])
    } else if(action==='revoke') {
      grant=(await db.query('update app_private.client_session_share_grants set revoked_at=now(),access_version=access_version+1 where id=$1 returning *',
        [grant.id])).rows[0]
      await db.query('update app_private.client_session_viewer_sessions set revoked_at=now() where grant_id=$1 and revoked_at is null',[grant.id])
    } else if(action==='extend') {
      if(grant.revoked_at) fail()
      grant=(await db.query("update app_private.client_session_share_grants set expires_at=now()+($2::integer*interval '1 day') where id=$1 returning *",
        [grant.id,Number(days)])).rows[0]
    }
    const valid= !grant.revoked_at && Date.parse(grant.expires_at)>Date.now()
    const secret=valid?derive(grant,config):null
    if(secret && !same(digest(secret),grant.secret_hash)) fail()
    return {selector:grant.selector,secret:action==='copy'||action==='rotate'?secret:null,
      status:grant.revoked_at?'revoked':valid?'active':'expired',
      expiresAt:grant.expires_at}
  },{server:true})
}
export async function exchangeSessionGuest(config,store,selector,secret) {
  if(!validSelector(selector)||!validSecret(secret)) fail()
  const grant=await transaction(config,null,async db=>(await db.query(
    "select g.* from app_private.client_session_share_grants g join app_private.client_delivery_sessions s on s.id=g.session_id and s.legacy_client_id=g.legacy_client_id where g.selector=$1 and g.secret_hash=$2 and g.revoked_at is null and g.expires_at>now() and s.status='published'",
    [selector,digest(secret)])).rows[0],{server:true})
  if(!grant) fail()
  await getPublishedClientSession(config,store,grant.legacy_client_id,grant.session_id)
  const id=randomUUID(),value=randomBytes(32).toString('base64url')
  const maxAge=Math.max(1,Math.min(86400,Math.floor((Date.parse(grant.expires_at)-Date.now())/1000)))
  if(maxAge<1) fail()
  await transaction(config,null,db=>db.query(
    'insert into app_private.client_session_viewer_sessions(id,grant_id,secret_hash,access_version,expires_at) values($1,$2,$3,$4,$5)',
    [id,grant.id,digest(value),grant.access_version,new Date(Date.now()+maxAge*1000).toISOString()]),{server:true})
  return {id,secret:value,maxAge}
}
export async function authorizeSessionGuest(config,store,selector,credential) {
  if(!validSelector(selector)||!credential?.id||!credential?.secretHash) fail()
  const grant=await transaction(config,null,async db=>(await db.query(
    "select g.* from app_private.client_session_viewer_sessions v join app_private.client_session_share_grants g on g.id=v.grant_id join app_private.client_delivery_sessions s on s.id=g.session_id and s.legacy_client_id=g.legacy_client_id where g.selector=$1 and v.id=$2 and v.secret_hash=$3 and v.access_version=g.access_version and v.revoked_at is null and v.expires_at>now() and g.revoked_at is null and g.expires_at>now() and s.status='published'",
    [selector,credential.id,credential.secretHash])).rows[0],{server:true})
  if(!grant) fail()
  const session=await getPublishedClientSession(config,store,grant.legacy_client_id,grant.session_id)
  return {session,clientId:grant.legacy_client_id,sessionId:grant.session_id}
}
