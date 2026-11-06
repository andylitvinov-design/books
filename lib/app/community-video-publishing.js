import 'server-only'
import {createHash} from 'node:crypto'
import {AppError} from '../assessments/contracts.js'
import {transaction} from './database.js'
import {createPrivateStorageClient} from '../clients/session-delivery-storage.js'
import {personalVideoCloudEnabled} from './personal-videos.js'
import {pilotVideoExportCapability} from '../mandala/video-branding-policy.mjs'
import {COMMUNITY_POLICY,UUID,VIDEO_ID,communityFlags,normalizedCommunityIntent,
 buildCommunityMetadata,secureHashEqual} from './community-video-model.mjs'

const BUCKET='hh-client-private-media'
const BASE='https://holistichouse.vercel.app'
const ensureUuid=id=>{if(!UUID.test(String(id||'')))throw new AppError('NOT_FOUND',404)}
const fail=(code,status=409)=>{throw new AppError(code,status)}

// Server-only privileged context. HTTP callers must separately verify owner-admin
// or the requester's signed-in account before calling the bounded methods below.
export async function communityManagerTx(config,fn){
 return transaction(config,null,async db=>{
  await db.query("select set_config('hh.community_video_manager','1',true)")
  return fn(db)
 },{server:true})
}
function view(row){
 if(!row)return null
 const hasVerifiedVideo=row.provider_state==='processed'&&row.youtube_privacy_readback==='unlisted'&&
  row.youtube_upload_status_readback==='processed'&&row.moderation_state==='approved'&&
  !row.takedown_requested_at&&!row.site_hidden_at
 return {id:row.id,sourceVideoId:row.source_video_id,title:row.title,authorDisplayName:row.author_display_name,
  visibility:row.visibility,moderationState:row.moderation_state,providerState:row.provider_state,
  statusCode:row.last_error_code||null,brandingVariant:row.branding_variant,
  youtubeVideoId:hasVerifiedVideo?row.youtube_video_id:null,
  youtubeUrl:hasVerifiedVideo?`https://www.youtube.com/watch?v=${row.youtube_video_id}`:null,
  authorProfileUrl:hasVerifiedVideo&&row.visibility==='public_catalog'?row.author_profile_url:null,
  takedownPending:Boolean(row.takedown_requested_at&&!row.takedown_confirmed_at)}
}
async function ownedReady(db,actor,id){
 const result=await db.query(
  "select * from app_private.personal_videos where id=$1 and account_id=$2 and status='ready'",
  [id,actor.id])
 if(!result.rows[0])fail('NOT_FOUND',404)
 return result.rows[0]
}
async function authorFor(db,actor,name){
 await db.query(`insert into app_private.community_video_authors(account_id,display_name)
    values($1,$2) on conflict(account_id) do nothing`,[actor.id,name])
 const author=(await db.query(`select public_slug from app_private.community_video_authors
    where account_id=$1`,[actor.id])).rows[0]
 const master=(await db.query(`select slug from app.practitioners where trusted_auth_user_id=$1
    and status='approved' order by id limit 1`,[actor.id])).rows[0]
 return {slug:author.public_slug,practitionerSlug:master?.slug||null}
}
async function ownedPublication(config,actor,sourceId){
 return transaction(config,actor,async db=>{
  const result=await db.query(`select * from app_private.community_video_publications
    where source_video_id=$1 and owner_account_id=$2`,[sourceId,actor.id])
  return result.rows[0]||null
 })
}
export async function communityVideoState(config,actor,sourceId){
 ensureUuid(sourceId)
 const flags=communityFlags()
 const enabled=flags.requestsEnabled&&personalVideoCloudEnabled()
 if(!flags.schemaReady)return {enabled:false,publication:null}
 const row=await ownedPublication(config,actor,sourceId)
 return {enabled,publication:view(row)}
}
export async function communityPreview(config,actor,sourceId,body){
 ensureUuid(sourceId)
 if(!communityFlags().requestsEnabled||!personalVideoCloudEnabled())fail('FEATURE_UNAVAILABLE',503)
 let intent
 try{intent=normalizedCommunityIntent(body)}catch{fail('INVALID_PUBLICATION_METADATA',400)}
 return transaction(config,actor,async db=>{
  await ownedReady(db,actor,sourceId)
  const author=await authorFor(db,actor,intent.authorDisplayName)
  let prepared
  try{prepared=buildCommunityMetadata(intent,author)}catch{fail('INVALID_PUBLICATION_METADATA',400)}
  return {title:intent.title,description:prepared.snapshot.description,authorUrl:prepared.snapshot.authorUrl,
   metadataHash:prepared.metadataHash,visibility:intent.visibility,
   youtubePrivacy:'unlisted',channelName:'Holistic House community channel (owner verified)',
   isDiscoverableOnSite:intent.visibility==='public_catalog'}
 })
}
export async function downloadCommunityFinal(config,source){
 if(!config.secretKey)fail('MEDIA_STORAGE_UNAVAILABLE',503)
 if(!source?.object_key||!/^personal-videos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/master\.mp4$/.test(source.object_key))
  fail('INVALID_SOURCE',409)
 const {data,error}=await createPrivateStorageClient(config).storage.from(BUCKET).download(source.object_key)
 if(error||!data)fail('MEDIA_STORAGE_UNAVAILABLE',503)
 const bytes=Buffer.from(await data.arrayBuffer())
 if(bytes.length!==Number(source.bytes)||bytes.length>12_000_000||bytes.length<1024||
   bytes.toString('latin1',4,8)!=='ftyp')fail('VIDEO_SOURCE_CHANGED',409)
 const sha256=createHash('sha256').update(bytes).digest('hex')
 return {bytes,sha256}
}
export async function submitCommunityVideo(config,actor,sourceId,body){
 ensureUuid(sourceId)
 if(!communityFlags().requestsEnabled||!personalVideoCloudEnabled())fail('FEATURE_UNAVAILABLE',503)
 let intent
 try{intent=normalizedCommunityIntent(body)}catch{fail('INVALID_PUBLICATION_METADATA',400)}
 if(body.action!=='request'||body.consentPolicyVersion!==COMMUNITY_POLICY||
   !intent.rightsConfirmed||!intent.privacyReviewed||!intent.publishToSharedYoutubeConfirmed||
   (intent.visibility==='public_catalog'&&!intent.siteCatalogConsent))fail('CONSENT_REQUIRED',403)
 const current=await ownedPublication(config,actor,sourceId)
 if(current)return {publication:view(current),duplicate:true}
 const result=await transaction(config,actor,async db=>{
  const source=await ownedReady(db,actor,sourceId)
  const author=await authorFor(db,actor,intent.authorDisplayName)
  const prepared=buildCommunityMetadata(intent,author)
  if(!secureHashEqual(prepared.metadataHash,body.approvedFinalMetadataHash))fail('METADATA_REVIEW_REQUIRED',409)
  // Stable snapshot of only server-owned source metadata. No browser supplied storage keys.
  return {source,metadata:prepared}
 })
 // Read ONLY the final private MP4, never the original photos, voice or prompts.
 const asset=await downloadCommunityFinal(config,result.source)
 return transaction(config,actor,async db=>{
  const source=await ownedReady(db,actor,sourceId)
  if(source.object_key!==result.source.object_key||source.bytes!==result.source.bytes)fail('VIDEO_SOURCE_CHANGED')
  const daily=(await db.query(`select count(*)::int as n from app_private.community_video_publications
    where owner_account_id=$1 and requested_at>now()-interval '1 day'`,[actor.id])).rows[0]
  if(daily.n>=3)fail('SUBMISSION_LIMIT',429)
  const catalog=intent.visibility==='public_catalog'
  if(catalog)await db.query(`update app_private.community_video_authors set
    public_profile_consented_at=coalesce(public_profile_consented_at,now()),updated_at=now()
    where account_id=$1`,[actor.id])
  const {rows}=await db.query(`insert into app_private.community_video_publications
    (owner_account_id,source_video_id,source_sha256,source_bytes,source_aspect,source_duration_seconds,
     title,description,author_display_name,author_profile_url,audio_language,visibility,
     contains_synthetic_media,made_for_kids,metadata_hash,consent_policy_version,
     rights_confirmed_at,privacy_reviewed_at,youtube_consent_at,catalog_consent_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),now(),now(),
      case when $17 then now() else null end)
    on conflict (source_video_id) do nothing returning *`,[
      actor.id,sourceId,asset.sha256,asset.bytes.length,source.aspect,source.duration_seconds,
      intent.title,result.metadata.snapshot.description,intent.authorDisplayName,
      result.metadata.snapshot.authorUrl,intent.audioLanguage,intent.visibility,
      intent.containsRealisticSyntheticMedia,intent.madeForKidsDecision,result.metadata.metadataHash,
      COMMUNITY_POLICY,catalog])
  const saved=rows[0]||(await db.query(`select * from app_private.community_video_publications
    where source_video_id=$1 and owner_account_id=$2`,[sourceId,actor.id])).rows[0]
  if(!saved)fail('NOT_FOUND',404)
  return {publication:view(saved),duplicate:!rows[0]}
 })
}
export async function withdrawCommunityVideo(config,actor,sourceId){
 ensureUuid(sourceId)
 if(!communityFlags().schemaReady)fail('FEATURE_UNAVAILABLE',503)
 return transaction(config,actor,async db=>{
  await db.query("select set_config('hh.community_video_manager','1',true)")
  const result=await db.query(`update app_private.community_video_publications set
    moderation_state='withdrawn',site_hidden_at=now(),
    takedown_requested_at=case when provider_state='none' then null else coalesce(takedown_requested_at,now()) end,
    provider_state=case when provider_state='none' then provider_state else 'takedown_pending' end,
    version=version+1,updated_at=now()
    where source_video_id=$1 and owner_account_id=$2 and moderation_state<>'withdrawn' returning *`,
    [sourceId,actor.id])
  const row=result.rows[0]||(await db.query(`select * from app_private.community_video_publications
    where source_video_id=$1 and owner_account_id=$2`,[sourceId,actor.id])).rows[0]
  if(!row)fail('NOT_FOUND',404)
  return {publication:view(row),externalTakedownPending:Boolean(row.takedown_requested_at)}
 })
}
export async function communityAdminQueue(config){
 const flags=communityFlags()
 if(!flags.schemaReady)return {flags,publications:[],connected:false}
 return communityManagerTx(config,async db=>{
  const rows=(await db.query(`select p.*,a.public_slug from app_private.community_video_publications p
   join app_private.community_video_authors a on a.account_id=p.owner_account_id
   order by p.requested_at desc limit 80`)).rows
  const grant=flags.channelId&&(await db.query(`select 1 from app_private.community_youtube_oauth
   where channel_id=$1 and revoked_at is null limit 1`,[flags.channelId])).rowCount===1
  return {flags,connected:Boolean(grant),publications:rows.map(r=>({
   ...view(r),id:r.id,sourceVideoId:r.source_video_id,sourceSha256:r.source_sha256,
   reviewedSha256:r.branding_verified_at?r.source_sha256:null,
   authorProfileUrl:r.author_profile_url,description:r.description,audioLanguage:r.audio_language,
   rightsConfirmed:Boolean(r.rights_confirmed_at),privacyReviewed:Boolean(r.privacy_reviewed_at),
   youtubeConsent:Boolean(r.youtube_consent_at),catalogConsent:Boolean(r.catalog_consent_at),
   synthetic:r.contains_synthetic_media,madeForKids:r.made_for_kids,
   youtubeVideoId:r.youtube_video_id||null,
   youtubeConfirmedAt:r.youtube_confirmed_at||null,
  }))}
 })
}
export async function adminInspectCommunityVideo(config,id){
 ensureUuid(id)
 const source=await communityManagerTx(config,async db=>(await db.query(`select v.* from app_private.community_video_publications p
  join app_private.personal_videos v on v.id=p.source_video_id and v.account_id=p.owner_account_id
  where p.id=$1 and v.status='ready'`,[id])).rows[0])
 if(!source)fail('VIDEO_SOURCE_MISSING',409)
 return downloadCommunityFinal(config,source)
}
export async function adminModerateCommunityVideo(config,id,action,{variant,sha256,confirmReviewedFinalMp4,confirmBrandStamp,reason}={}){
 ensureUuid(id)
 if(!communityFlags().schemaReady)fail('FEATURE_UNAVAILABLE',503)
 if(action==='attest'){
  if(!confirmReviewedFinalMp4||!['free_watermarked','pro_clear'].includes(variant)||
    (variant==='free_watermarked'&&confirmBrandStamp!==true))fail('BRANDING_REVIEW_REQUIRED',409)
  const actual=await adminInspectCommunityVideo(config,id)
  if(!secureHashEqual(actual.sha256,sha256))fail('VIDEO_SOURCE_CHANGED',409)
  return communityManagerTx(config,async db=>{
   const p=(await db.query(`select * from app_private.community_video_publications where id=$1 for update`,[id])).rows[0]
   if(!p||p.moderation_state!=='pending'||p.provider_state!=='none'||!secureHashEqual(p.source_sha256,actual.sha256))fail('INVALID_PUBLICATION_STATE')
   if(variant==='pro_clear'&&!pilotVideoExportCapability({id:p.owner_account_id}).canExportClean)
    fail('PRO_ENTITLEMENT_REQUIRED',403)
   const row=(await db.query(`update app_private.community_video_publications
    set branding_variant=$2,branding_verified_at=now(),updated_at=now(),version=version+1
    where id=$1 and version=$3 returning *`,[id,variant,p.version])).rows[0]
   if(!row)fail('CONFLICT')
   return view(row)
  })
 }
 if(!['approve','reject'].includes(action))fail('INVALID_ACTION',400)
 return communityManagerTx(config,async db=>{
  const p=(await db.query(`select * from app_private.community_video_publications where id=$1 for update`,[id])).rows[0]
  if(!p||p.moderation_state!=='pending'||p.provider_state!=='none')fail('INVALID_PUBLICATION_STATE')
  if(action==='approve'&&(!p.branding_verified_at||p.branding_variant==='not_verified'||p.made_for_kids==='needs_review'))
   fail('REVIEW_INCOMPLETE')
  const row=(await db.query(`update app_private.community_video_publications
   set moderation_state=$2,moderation_decided_at=now(),moderation_reason=$3,
    version=version+1,updated_at=now() where id=$1 and version=$4 returning *`,
    [id,action==='approve'?'approved':'rejected',action==='approve'?null:String(reason||'Not approved').slice(0,200),p.version])).rows[0]
  if(!row)fail('CONFLICT')
  return view(row)
 })
}
export async function listPublicCommunityVideos(config,{creatorSlug=null,masterSlug=null,limit=60}={}){
 if(!communityFlags().schemaReady)return []
 if(creatorSlug!==null&&!UUID.test(creatorSlug))return []
 if(masterSlug!==null&&!/^[a-z0-9-]{2,90}$/.test(masterSlug))return []
 return communityManagerTx(config,async db=>{
  const rows=(await db.query(`select p.youtube_video_id,p.title,p.author_display_name,p.author_profile_url,
    p.audio_language,p.source_duration_seconds,p.requested_at,p.source_aspect,v.theme,
    a.public_slug,m.slug as practitioner_slug from app_private.community_video_publications p
    join app_private.community_video_authors a on a.account_id=p.owner_account_id
    left join app.practitioners m on m.trusted_auth_user_id=p.owner_account_id and m.status='approved'
    join app_private.personal_videos v on v.id=p.source_video_id and v.account_id=p.owner_account_id
    where p.moderation_state='approved' and p.provider_state='processed'
     and p.youtube_privacy_readback='unlisted' and p.youtube_upload_status_readback='processed'
     and p.visibility='public_catalog' and p.catalog_consent_at is not null
     and p.site_hidden_at is null and p.takedown_requested_at is null
     and (m.slug is not null or a.public_profile_consented_at is not null)
     and ($1::uuid is null or (a.public_slug=$1::uuid and m.slug is null))
     and ($2::text is null or m.slug=$2::text)
    order by p.youtube_confirmed_at desc nulls last,p.requested_at desc limit $3`,
    [creatorSlug,masterSlug,Math.min(60,Math.max(1,limit))])).rows
  const seen=new Set()
  return rows.filter(r=>{
   if(!VIDEO_ID.test(r.youtube_video_id)||seen.has(r.youtube_video_id))return false
   seen.add(r.youtube_video_id);return true
  }).map(r=>({id:r.youtube_video_id,title:r.title,author:r.author_display_name,
    authorUrl:r.author_profile_url,locale:r.audio_language,category:r.theme,
    aspect:r.source_aspect,duration:r.source_duration_seconds,createdAt:r.requested_at,
    url:`https://www.youtube.com/watch?v=${r.youtube_video_id}`,
    thumbnail:`https://i.ytimg.com/vi/${r.youtube_video_id}/hqdefault.jpg`,
    isMaster:Boolean(r.practitioner_slug)}))
 })
}
