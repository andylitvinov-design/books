import 'server-only'
import {randomUUID} from 'node:crypto'
import {AppError,onlyKeys,requireUUID} from '../assessments/contracts.js'
import {transaction} from '../app/database.js'
import {privateStorageClient,sniffPrivateMedia} from '../clients/session-delivery-storage.js'
import {MEDITATION_BUCKET,meditationMime,meditationMetadata,meditationModerationAction,
  meditationCanModerate,meditationForOwner} from './meditation-studio-contract.mjs'

const TABLE='app_private.practitioner_meditation_drafts'
const fail=(code,status=400)=>{throw new AppError(code,status)}
function validate(fn){try{return fn()}catch(error){
  if(error instanceof AppError)throw error
  fail(/^[A-Z_]+$/.test(error?.message||'')?error.message:'INVALID_MEDITATION_INPUT',400)
}}
async function bucket(config){
  const client=privateStorageClient(config).storage
  const {data,error}=await client.getBucket(MEDITATION_BUCKET)
  if(error||!data||data.public!==false)fail('MEDITATION_STORAGE_UNAVAILABLE',503)
  return client.from(MEDITATION_BUCKET)
}
async function activePractitioner(db,actor){
  const account=(await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0]
  if(account?.status!=='active'||account?.onboarding_state!=='active')fail('ACCOUNT_REQUIRED',401)
  const p=(await db.query("select id from app.practitioners where trusted_auth_user_id=$1 and active and status not in ('suspended','rejected','archived')",[actor.id])).rows[0]
  if(!p)fail('PRACTITIONER_REQUIRED',403)
  return p
}
const map=rows=>rows.map(meditationForOwner)
function storageIntent(config,id,path,mime,bytes,token){
  return {assetId:id,objectKey:path,mime,maxBytes:bytes,provider:'supabase',
    token,bucket:MEDITATION_BUCKET,supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey}
}
async function verifyObject(config,path,mime,bytes){
  const storage=await bucket(config)
  const {data,error}=await storage.info(path)
  if(error||!data)fail('MEDITATION_UPLOAD_MISSING',409)
  const size=Number(data.size??data.metadata?.size)
  const contentType=(data.content_type||data.contentType||data.mimetype||data.metadata?.mimetype||'').split(';')[0].toLowerCase()
  if(size!==Number(bytes))fail('MEDIA_SIZE_NOT_ALLOWED',413)
  if(mime!==contentType)fail('MEDIA_TYPE_NOT_ALLOWED',415)
  await sniffPrivateMedia(storage,path,mime,config.supabaseUrl)
}
export async function meditationMine(config,actor){
  return transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    const rows=(await db.query(`select * from ${TABLE} where owner_auth_user_id=$1
      order by created_at desc limit 60`,[actor.id])).rows
    return map(rows)
  })
}
export async function meditationSourceIntent(config,actor,input){
  onlyKeys(input,['mime','bytes'])
  const media=validate(()=>meditationMime(input.mime,input.bytes))
  const storage=await bucket(config)
  return transaction(config,actor,async db=>{
    const p=await activePractitioner(db,actor)
    const limits=(await db.query(`select count(*)::integer as total,
      count(*) filter(where not source_ready and created_at>now()-interval '2 hours')::integer as incomplete
      from ${TABLE} where owner_auth_user_id=$1`,[actor.id])).rows[0]
    if(limits.total>=60||limits.incomplete>=3)fail('MEDITATION_UPLOAD_LIMIT',429)
    const id=randomUUID(),path=actor.id+'/'+id+'/source.'+media.ext
    const {data,error}=await storage.createSignedUploadUrl(path)
    if(error||!data?.token)fail('MEDITATION_STORAGE_UNAVAILABLE',503)
    await db.query(`insert into ${TABLE}
      (id,practitioner_id,owner_auth_user_id,kind,source_mime,source_path,source_bytes)
      values($1,$2,$3,$4,$5,$6,$7)`,
      [id,p.id,actor.id,media.kind,media.mime,path,media.bytes])
    return {id,intent:storageIntent(config,id,path,media.mime,media.bytes,data.token)}
  })
}
export async function meditationCompleteSource(config,actor,id){
  requireUUID(id)
  const row=await transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    return (await db.query(`select * from ${TABLE} where id=$1 and owner_auth_user_id=$2`,[id,actor.id])).rows[0]
  })
  if(!row)fail('MEDITATION_NOT_FOUND',404)
  if(row.source_ready)return {item:meditationForOwner(row)}
  if(row.status!=='draft')fail('MEDITATION_LOCKED',409)
  await verifyObject(config,row.source_path,row.source_mime,row.source_bytes)
  return transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    const done=(await db.query(`update ${TABLE} set source_ready=true,updated_at=now()
      where id=$1 and owner_auth_user_id=$2 and status='draft' returning *`,[id,actor.id])).rows[0]
    if(!done)fail('MEDITATION_LOCKED',409)
    return {item:meditationForOwner(done)}
  })
}
export async function meditationVideoIntent(config,actor,input){
  onlyKeys(input,['id','mime','bytes'])
  requireUUID(input.id)
  const media=validate(()=>meditationMime(input.mime,input.bytes,'video'))
  const storage=await bucket(config)
  return transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    const row=(await db.query(`select * from ${TABLE}
      where id=$1 and owner_auth_user_id=$2 for update`,[input.id,actor.id])).rows[0]
    if(!row)fail('MEDITATION_NOT_FOUND',404)
    if(!row.source_ready||row.status!=='draft'||row.video_path)fail('MEDITATION_LOCKED',409)
    const path=actor.id+'/'+row.id+'/video.'+media.ext
    const {data,error}=await storage.createSignedUploadUrl(path)
    if(error||!data?.token)fail('MEDITATION_STORAGE_UNAVAILABLE',503)
    await db.query(`update ${TABLE} set video_path=$3,video_mime=$4,video_bytes=$5,updated_at=now()
      where id=$1 and owner_auth_user_id=$2`,[row.id,actor.id,path,media.mime,media.bytes])
    return {id:row.id,intent:storageIntent(config,row.id,path,media.mime,media.bytes,data.token)}
  })
}
export async function meditationCompleteVideo(config,actor,id){
  requireUUID(id)
  const row=await transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    return (await db.query(`select * from ${TABLE} where id=$1 and owner_auth_user_id=$2`,[id,actor.id])).rows[0]
  })
  if(!row)fail('MEDITATION_NOT_FOUND',404)
  if(row.video_ready)return {item:meditationForOwner(row)}
  if(!row.video_path||row.status!=='draft')fail('MEDITATION_LOCKED',409)
  await verifyObject(config,row.video_path,row.video_mime,row.video_bytes)
  return transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    const done=(await db.query(`update ${TABLE} set video_ready=true,updated_at=now()
      where id=$1 and owner_auth_user_id=$2 and status='draft' returning *`,[id,actor.id])).rows[0]
    if(!done)fail('MEDITATION_LOCKED',409)
    return {item:meditationForOwner(done)}
  })
}
export async function meditationSubmit(config,actor,input){
  onlyKeys(input,['id','metadata'])
  requireUUID(input.id)
  const meta=validate(()=>meditationMetadata(input.metadata))
  return transaction(config,actor,async db=>{
    await activePractitioner(db,actor)
    const row=(await db.query(`select * from ${TABLE}
      where id=$1 and owner_auth_user_id=$2 for update`,[input.id,actor.id])).rows[0]
    if(!row)fail('MEDITATION_NOT_FOUND',404)
    if(!['draft','changes_requested'].includes(row.status)||!row.source_ready)fail('MEDITATION_NOT_READY',409)
    const saved=(await db.query(`update ${TABLE} set
      title=$3,description=$4,language=$5,music=$6,scene=$7,mode=$8,
      rights_confirmed=true,status='submitted',review_note='',submitted_at=now(),updated_at=now()
      where id=$1 and owner_auth_user_id=$2 returning *`,
      [row.id,actor.id,meta.title,meta.description,meta.language,meta.music,meta.scene,meta.mode])).rows[0]
    return {item:meditationForOwner(saved)}
  })
}
export async function meditationAdminList(config){
  return transaction(config,null,async db=>{
    const rows=(await db.query(`select m.*,coalesce(p.public_profile->>'displayName',
      p.draft_profile->>'displayName','Practitioner') as practitioner_name
      from ${TABLE} m join app.practitioners p on p.id=m.practitioner_id
      where m.status<>'draft' order by m.submitted_at desc nulls last limit 150`)).rows
    return rows.map(r=>({...meditationForOwner(r),practitionerName:r.practitioner_name,
      canUpload: r.status==='approved'&&(r.video_ready||r.kind==='video')&&
        (r.video_ready?r.video_mime:r.source_mime)==='video/mp4'}))
  },{server:true,moderator:true})
}
export async function meditationAdminModerate(config,input){
  onlyKeys(input,['id','action','note'])
  requireUUID(input.id)
  const action=validate(()=>meditationModerationAction(input.action,input.note||''))
  return transaction(config,null,async db=>{
    const row=(await db.query(`select * from ${TABLE} where id=$1 for update`,[input.id])).rows[0]
    if(!row)fail('MEDITATION_NOT_FOUND',404)
    if(!meditationCanModerate(row.status,action.action))fail('MEDITATION_LOCKED',409)
    const status=action.action==='approve'?'approved':action.action
    const saved=(await db.query(`update ${TABLE} set status=$2,review_note=$3,
      approved_at=case when $2='approved' then now() else null end,updated_at=now()
      where id=$1 returning *`,[input.id,status,action.note])).rows[0]
    return {item:meditationForOwner(saved)}
  },{server:true,moderator:true})
}
export async function meditationMediaLocation(config,{id,actor=null,admin=false,video=false}){
  requireUUID(id)
  const row=await transaction(config,actor,async db=>{
    if(!admin)await activePractitioner(db,actor)
    return (await db.query(`select * from ${TABLE} where id=$1
      ${admin?'':'and owner_auth_user_id=$2'}`,
      admin?[id]:[id,actor.id])).rows[0]
  },admin?{server:true,moderator:true}:{})
  if(!row)fail('MEDITATION_NOT_FOUND',404)
  if(video?!row.video_ready:!row.source_ready)fail('MEDITATION_NOT_READY',409)
  const path=video?row.video_path:row.source_path
  const storage=await bucket(config)
  const {data,error}=await storage.createSignedUrl(path,60)
  if(error||!data?.signedUrl)fail('MEDITATION_STORAGE_UNAVAILABLE',503)
  const url=new URL(data.signedUrl)
  if(url.protocol!=='https:'||url.origin!==new URL(config.supabaseUrl).origin)fail('MEDITATION_STORAGE_UNAVAILABLE',503)
  return url.toString()
}
