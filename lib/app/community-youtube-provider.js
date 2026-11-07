import 'server-only'
import {AppError} from '../assessments/contracts.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {seal,openSealed} from './crypto.js'
import {communityManagerTx,adminInspectCommunityVideo} from './community-video-publishing.js'
import {COMMUNITY_CHANNEL,VIDEO_ID,UUID,GOOGLE_SCOPES,communityFlags,
 verifiedGoogleChannel,verifiedCommunityVideo,validCommunitySessionUrl,nextResumableOffset,secureHashEqual} from './community-video-model.mjs'

const OAUTH_CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'community_youtube_refresh'}
const RETRYABLE='YOUTUBE_TRANSFER_UNCERTAIN'
const fail=(code,status=409)=>{throw new AppError(code,status)}
function oauthConfig(env=process.env){
 const clientId=env.HH_OWNER_VIDEO_GOOGLE_CLIENT_ID||''
 const secret=env.HH_OWNER_VIDEO_GOOGLE_CLIENT_SECRET||''
 if(!/^[A-Za-z0-9_-]{20,170}\.apps\.googleusercontent\.com$/.test(clientId)||secret.length<10)
  fail('COMMUNITY_OAUTH_NOT_CONFIGURED',503)
 return {clientId,secret}
}
export function communityOauthConfigured(env=process.env){
 try{oauthConfig(env);return Boolean(communityFlags(env).channelId)}catch{return false}
}
async function jsonFromGoogle(url,token,{method='GET',headers={},body}={}){
 let response
 try{response=await fetch(url,{method,headers:{authorization:`Bearer ${token}`,...headers},
  ...(body===undefined?{}:{body}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})}
 catch{fail('YOUTUBE_PROVIDER_UNAVAILABLE',503)}
 if([401,403].includes(response.status))fail('YOUTUBE_PERMISSION_REQUIRED',403)
 if(response.status===429)fail('YOUTUBE_QUOTA_REACHED',429)
 if(!response.ok)fail('YOUTUBE_PROVIDER_UNAVAILABLE',503)
 try{return await response.json()}catch{fail('YOUTUBE_INVALID_RESPONSE',503)}
}
export async function verifyCommunityGrantChannel(token,expected){
 const data=await jsonFromGoogle('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',token)
 try{return verifiedGoogleChannel(data,expected)}catch{fail('YOUTUBE_CHANNEL_MISMATCH')}
}
export async function preflightCommunityProvider(config){
 if(!communityFlags().uploadsEnabled)fail('FEATURE_UNAVAILABLE',503)
 const auth=await youtubeToken(config)
 return {channelId:auth.channelId,verified:true}
}
export async function saveCommunityOauth(config,{refreshToken,accessToken,scopes,actorId=null}){
 const expected=communityFlags().channelId
 if(!expected||typeof refreshToken!=='string'||refreshToken.length<10||
  !GOOGLE_SCOPES.every(scope=>scopes.includes(scope)))fail('YOUTUBE_PERMISSION_REQUIRED')
 await verifyCommunityGrantChannel(accessToken,expected)
 const secret=seal(refreshToken,OAUTH_CONTEXT,config)
 await communityManagerTx(config,db=>db.query(`insert into app_private.community_youtube_oauth
   (channel_id,encrypted_refresh_token,scopes,connected_by) values($1,$2,$3,$4)
   on conflict(channel_id) do update set encrypted_refresh_token=excluded.encrypted_refresh_token,
    scopes=excluded.scopes,connected_by=excluded.connected_by,created_at=now(),revoked_at=null`,
   [expected,secret,scopes,actorId]))
 return {channelId:expected,connected:true}
}
async function youtubeToken(config){
 const expected=communityFlags().channelId
 if(!expected)fail('YOUTUBE_CHANNEL_NOT_CONFIGURED',503)
 const row=await communityManagerTx(config,async db=>(await db.query(`select encrypted_refresh_token,scopes
  from app_private.community_youtube_oauth where channel_id=$1 and revoked_at is null`,[expected])).rows[0])
 if(!row||!GOOGLE_SCOPES.every(scope=>row.scopes?.includes(scope)))fail('COMMUNITY_OAUTH_REQUIRED',503)
 const refreshToken=openSealed(row.encrypted_refresh_token,OAUTH_CONTEXT,config)
 const oauth=oauthConfig()
 const response=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:oauth.clientId,client_secret:oauth.secret,
   refresh_token:refreshToken,grant_type:'refresh_token'}),
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)}).catch(()=>null)
 if(!response?.ok)fail('COMMUNITY_OAUTH_RECONNECT_REQUIRED',503)
 const data=await response.json().catch(()=>null)
 if(typeof data?.access_token!=='string'||data.access_token.length<20)fail('COMMUNITY_OAUTH_RECONNECT_REQUIRED',503)
 await verifyCommunityGrantChannel(data.access_token,expected)
 return {token:data.access_token,channelId:expected}
}
function readVideoInfo(payload,id,channelId){
 try{return verifiedCommunityVideo(payload,id,channelId)}
 catch{fail('YOUTUBE_RECEIPT_NOT_VERIFIED',409)}
}
async function providerVideo(config,videoId){
 const auth=await youtubeToken(config)
 const r=await jsonFromGoogle('https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id='+encodeURIComponent(videoId),auth.token)
 return readVideoInfo(r,videoId,auth.channelId)
}
async function setUncertain(config,id,code=RETRYABLE){
 await communityManagerTx(config,db=>db.query(`update app_private.community_video_publications
  set provider_state='uncertain',last_error_code=$2,updated_at=now(),version=version+1
  where id=$1 and provider_state in ('claimed','initiating','sending','uncertain')`,[id,code]))
}
async function getAttempt(config,id){
 return communityManagerTx(config,async db=>{
  const r=(await db.query(`select p.*,a.id attempt_id,a.session_ciphertext,a.google_receipt_video_id,
    a.bytes_sent from app_private.community_video_publications p
    join app_private.community_video_upload_attempts a on a.publication_id=p.id
    where p.id=$1`,[id])).rows[0]
  if(!r)fail('NOT_FOUND',404)
  return r
 })
}
// Exactly one atomic CAS claim and one provider videos.insert initiation per source,
// even if Vercel stops, a Google timeout happens, or the user double-clicks.
export async function claimCommunityUpload(config,id){
 if(!UUID.test(id))fail('NOT_FOUND',404)
 const flags=communityFlags()
 if(!flags.uploadsEnabled)fail('FEATURE_UNAVAILABLE',503)
 return communityManagerTx(config,async db=>{
  await db.query('select pg_advisory_xact_lock(589426122)')
  const n=(await db.query(`select count(*)::int n from app_private.community_video_upload_attempts
   where claimed_at>=date_trunc('day',now() at time zone 'utc')`)).rows[0].n
  if(n>=5)fail('COMMUNITY_DAILY_UPLOAD_LIMIT',429)
  const p=(await db.query(`update app_private.community_video_publications p
   set provider_state='claimed',youtube_channel_id=$2,updated_at=now(),version=version+1
   where p.id=$1 and p.moderation_state='approved' and p.provider_state='none'
     and p.branding_verified_at is not null and p.branding_variant<>'not_verified'
     and p.site_hidden_at is null and p.takedown_requested_at is null
     and exists(select 1 from app_private.personal_videos v where v.id=p.source_video_id
      and v.account_id=p.owner_account_id and v.status='ready') returning p.*`,
   [id,flags.channelId])).rows[0]
  if(!p)fail('UPLOAD_NOT_APPROVED')
  const attempt=(await db.query(`insert into app_private.community_video_upload_attempts
   (publication_id,source_sha256) values($1,$2) returning id`,[id,p.source_sha256])).rows[0]
  return {publicationId:p.id,attemptId:attempt.id}
 })
}
async function validateReadySource(config,publicationId){
 const row=await communityManagerTx(config,async db=>{
  const r=(await db.query(`select v.* from app_private.community_video_publications p
   join app_private.personal_videos v on v.id=p.source_video_id and v.account_id=p.owner_account_id
   where p.id=$1 and v.status='ready' and p.moderation_state='approved'
   and p.site_hidden_at is null and p.takedown_requested_at is null`,[publicationId])).rows[0]
  if(!r)fail('VIDEO_SOURCE_MISSING')
  return r
 })
 return row
}
async function saveReceipt(config,id,videoId){
 if(!VIDEO_ID.test(videoId))fail('YOUTUBE_INVALID_RECEIPT',503)
 return communityManagerTx(config,async db=>{
  const attempt=await db.query(`update app_private.community_video_upload_attempts
   set google_receipt_video_id=$2,state='processing',last_checked_at=now()
   where publication_id=$1 and (google_receipt_video_id is null or google_receipt_video_id=$2) returning id`,[id,videoId])
  if(attempt.rowCount!==1)fail('YOUTUBE_RECEIPT_CONFLICT')
  const publication=await db.query(`update app_private.community_video_publications set youtube_video_id=$2,
    provider_state=case when moderation_state='withdrawn' or takedown_requested_at is not null
      then 'takedown_pending' else 'processing' end,
    updated_at=now(),version=version+1 where id=$1
    and (youtube_video_id is null or youtube_video_id=$2)`,[id,videoId])
  if(publication.rowCount!==1)fail('YOUTUBE_RECEIPT_CONFLICT')
  return {videoId,providerState:'processing',verified:false}
 })
}
async function saveSession(config,id,attemptId,sessionUrl){
 const safe=validCommunitySessionUrl(sessionUrl)
 if(!safe){await setUncertain(config,id,'YOUTUBE_SESSION_UNTRUSTED');fail('YOUTUBE_SESSION_INVALID',503)}
 const ciphertext=seal(safe,{accountId:PRACTITIONER_ID,recordId:attemptId,field:'community_upload_session'},config)
 await communityManagerTx(config,async db=>{
  const u=await db.query(`update app_private.community_video_upload_attempts set
     session_ciphertext=$2,state='session_created',last_checked_at=now()
     where id=$1 and session_ciphertext is null and state='initiating' returning id`,[attemptId,ciphertext])
  if(!u.rowCount)fail('UPLOAD_ALREADY_ATTEMPTED')
  const publication=await db.query(`update app_private.community_video_publications set
   provider_state='sending',version=version+1,updated_at=now()
   where id=$1 and provider_state='initiating' and moderation_state='approved'
   and takedown_requested_at is null and site_hidden_at is null returning id`,[id])
  if(!publication.rowCount)fail('UPLOAD_HOLD')
 })
 return safe
}
async function transmitSameSession(config,id,sessionUrl,bytes,offset,token){
 if(!validCommunitySessionUrl(sessionUrl)||offset<0||offset>=bytes.length)fail('YOUTUBE_SESSION_INVALID')
 // Recheck the live consent/withdrawal before every next PUT. No new bytes
 // should be sent once the user has revoked publication.
 const stillAllowed=await communityManagerTx(config,async db=>(await db.query(`select 1
  from app_private.community_video_publications where id=$1 and moderation_state='approved'
  and provider_state='sending' and site_hidden_at is null and takedown_requested_at is null`,[id])).rowCount===1)
 if(!stillAllowed)fail('UPLOAD_HOLD')
 const length=bytes.length
 let r
 try{r=await fetch(sessionUrl,{method:'PUT',headers:{authorization:'Bearer '+token,
  'content-type':'video/mp4','content-length':String(length-offset),
  'content-range':`bytes ${offset}-${length-1}/${length}`},
  body:bytes.subarray(offset),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(90000)})}
 catch{await setUncertain(config,id);return {uncertain:true,canResumeSameSession:true}}
 if(r.status===308){
  let n
  try{n=nextResumableOffset(r.status,r.headers.get('range'),length)}
  catch{await setUncertain(config,id,'GOOGLE_RANGE_UNRELIABLE');return {uncertain:true}}
  await communityManagerTx(config,db=>db.query(`update app_private.community_video_upload_attempts
    set bytes_sent=$2,state='sending',last_checked_at=now() where publication_id=$1`,[id,n]))
  // Do not infer that 308 means a failed video; continue the SAME session.
  return {partial:true,offset:n}
 }
 if(!r.ok){await setUncertain(config,id,'GOOGLE_RESPONSE_UNCERTAIN');return {uncertain:true}}
 const receipt=await r.json().catch(()=>null)
 if(!VIDEO_ID.test(receipt?.id)){await setUncertain(config,id,'GOOGLE_RECEIPT_UNKNOWN');return {uncertain:true}}
 return saveReceipt(config,id,receipt.id)
}
async function probeSameSession(config,id,sessionUrl,total,token){
 let r
 try{r=await fetch(sessionUrl,{method:'PUT',headers:{authorization:'Bearer '+token,
  'content-length':'0','content-range':`bytes */${total}`},
  cache:'no-store',redirect:'error',signal:AbortSignal.timeout(18000)})}
 catch{await setUncertain(config,id);return {uncertain:true}}
 if(r.status===308){
  try{return {offset:nextResumableOffset(308,r.headers.get('range'),total)}}
  catch{await setUncertain(config,id,'GOOGLE_RANGE_UNRELIABLE');return {uncertain:true}}
 }
 if(r.ok){
  const receipt=await r.json().catch(()=>null)
  if(VIDEO_ID.test(receipt?.id))return saveReceipt(config,id,receipt.id)
 }
 await setUncertain(config,id,'GOOGLE_SESSION_RECONCILIATION_REQUIRED')
 return {uncertain:true}
}
export async function executeCommunityUpload(config,id,{resume=false}={}){
 if(!UUID.test(id))fail('NOT_FOUND',404)
 const flags=communityFlags()
 if(!flags.uploadsEnabled)fail('FEATURE_UNAVAILABLE',503)
 let a=await getAttempt(config,id)
 if(a.takedown_requested_at||a.moderation_state!=='approved'||
  !['claimed','initiating','sending','uncertain'].includes(a.provider_state))fail('UPLOAD_HOLD')
 const source=await validateReadySource(config,id)
 const actual=await adminInspectCommunityVideo(config,id)
 if(!secureHashEqual(actual.sha256,a.source_sha256)||source.bytes!==actual.bytes.length||
   !a.branding_verified_at||a.branding_variant==='not_verified')fail('VIDEO_SOURCE_CHANGED')
 const auth=await youtubeToken(config)
 if(auth.channelId!==a.youtube_channel_id)fail('YOUTUBE_CHANNEL_MISMATCH')
 let session
 if(resume){
  if(!a.session_ciphertext)fail('OPERATOR_RECONCILIATION_REQUIRED')
  session=openSealed(a.session_ciphertext,{accountId:PRACTITIONER_ID,recordId:a.attempt_id,field:'community_upload_session'},config)
  if(!validCommunitySessionUrl(session))fail('YOUTUBE_SESSION_INVALID')
  const status=await probeSameSession(config,id,session,actual.bytes.length,auth.token)
  if(status.uncertain||status.videoId)return status
  return transferFrom(config,id,session,actual.bytes,status.offset,auth.token)
 }
 // Initial insert only from the first atomic claim, never on a repaired/uncertain state.
 if(a.provider_state!=='claimed'||a.session_ciphertext)fail('UPLOAD_ALREADY_ATTEMPTED')
 // Persist a one-way initiation fence before contacting Google. If the process
 // dies between this commit and Google response, only manual reconciliation is
 // permitted; never repeat videos.insert, even with a new Vercel invocation.
 const fenced=await communityManagerTx(config,async db=>{
  const updated=await db.query(`update app_private.community_video_upload_attempts
   set state='initiating',last_checked_at=now() where id=$1 and state='claimed'
   and session_ciphertext is null returning id`,[a.attempt_id])
  if(!updated.rowCount)return false
  const p=await db.query(`update app_private.community_video_publications
   set provider_state='initiating',updated_at=now(),version=version+1
   where id=$1 and provider_state='claimed' and moderation_state='approved'
   and takedown_requested_at is null and site_hidden_at is null returning id`,[id])
  if(!p.rowCount)fail('UPLOAD_HOLD')
  return true
 })
 if(!fenced)fail('UPLOAD_ALREADY_ATTEMPTED')
 let response
 try{
  response=await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false',{
   method:'POST',headers:{authorization:`Bearer ${auth.token}`,'content-type':'application/json; charset=UTF-8',
    'x-upload-content-type':'video/mp4','x-upload-content-length':String(actual.bytes.length)},
   body:JSON.stringify({snippet:{title:a.title,description:a.description,categoryId:'27',
    defaultLanguage:a.audio_language},status:{privacyStatus:'unlisted',
    selfDeclaredMadeForKids:a.made_for_kids==='yes',containsSyntheticMedia:a.contains_synthetic_media}}),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)})
 }catch{await setUncertain(config,id,'GOOGLE_INIT_UNCERTAIN');return {uncertain:true,mayHaveInitiated:true}}
 if(!response.ok){await setUncertain(config,id,'GOOGLE_INIT_UNKNOWN');return {uncertain:true}}
 session=await saveSession(config,id,a.attempt_id,response.headers.get('location'))
 return transferFrom(config,id,session,actual.bytes,0,auth.token)
}
async function transferFrom(config,id,session,bytes,offset,token){
 let result
 for(let n=0;n<5;n++){
  result=await transmitSameSession(config,id,session,bytes,offset,token)
  if(result.partial){offset=result.offset;continue}
  return result
 }
 await setUncertain(config,id,'GOOGLE_RESUME_MANUAL_REVIEW')
 return {uncertain:true,partial:true}
}
export async function verifyCommunityPublished(config,id){
 if(!UUID.test(id))fail('NOT_FOUND',404)
 const p=await communityManagerTx(config,db=>db.query(`select * from app_private.community_video_publications where id=$1`,[id]).then(r=>r.rows[0]))
 if(!p?.youtube_video_id||!VIDEO_ID.test(p.youtube_video_id))fail('YOUTUBE_RECEIPT_MISSING')
 if(!communityFlags().schemaReady)fail('FEATURE_UNAVAILABLE',503)
 const info=await providerVideo(config,p.youtube_video_id)
 return communityManagerTx(config,async db=>{
  const current=(await db.query(`select * from app_private.community_video_publications where id=$1 for update`,[id])).rows[0]
  if(!current||current.youtube_video_id!==info.videoId)fail('CONFLICT')
  if(info.removedFromPublic){
   if(!current.takedown_requested_at)fail('YOUTUBE_PRIVACY_MISMATCH')
   await db.query(`update app_private.community_video_publications set provider_state='takedown_confirmed',
    youtube_privacy_readback='private',youtube_upload_status_readback=$2,
    takedown_confirmed_at=now(),site_hidden_at=coalesce(site_hidden_at,now()),
    updated_at=now(),version=version+1 where id=$1`,[id,info.uploadStatus])
   return {videoId:info.videoId,takedownConfirmed:true}
  }
  if(!info.processed)return {videoId:info.videoId,providerState:'processing',verified:false}
  if(current.moderation_state!=='approved'||current.takedown_requested_at||current.site_hidden_at){
   await db.query(`update app_private.community_video_publications set provider_state='takedown_pending',
    youtube_privacy_readback='unlisted',youtube_upload_status_readback='processed',
    youtube_confirmed_at=coalesce(youtube_confirmed_at,now()),
    updated_at=now(),version=version+1 where id=$1`,[id])
   return {videoId:info.videoId,takedownPending:true,verified:false}
  }
  await db.query(`update app_private.community_video_publications set
   provider_state='processed',youtube_privacy_readback='unlisted',
   youtube_upload_status_readback='processed',youtube_confirmed_at=now(),
   last_error_code=null,updated_at=now(),version=version+1 where id=$1`,[id])
  await db.query(`update app_private.community_video_upload_attempts set state='processed',
   closed_at=now(),last_checked_at=now() where publication_id=$1`,[id])
  return {videoId:info.videoId,channelId:info.channelId,privacyStatus:'unlisted',
   uploadStatus:'processed',verified:true}
 })
}
