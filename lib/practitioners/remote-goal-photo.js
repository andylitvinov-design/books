import 'server-only'
import sharp from 'sharp'
import {transaction} from '../app/database.js'
import {AppError,requireUUID} from '../assessments/contracts.js'
import {createPrivateStorageClient} from '../clients/session-delivery-storage.js'

const BUCKET='hh-remote-goal-photos'
const MAX_BYTES=2_750_000
const MIME=new Set(['image/jpeg','image/png','image/webp'])
const notFound=()=>{throw new AppError('NOT_FOUND',404)}
const pathFor=(account,id)=>account+'/'+id+'/goal.jpg'

async function lookup(config,actor,id,{write=false}={}){
  requireUUID(id)
  return transaction(config,actor,async db=>{
    const found=(await db.query(
      "select r.id,r.account_id,r.status,r.remote_booking,p.trusted_auth_user_id as master_account " +
      "from app.consultation_requests r join app.practitioners p on p.id=r.recipient_practitioner_id " +
      "where r.id=$1 and (r.account_id=$2 or (p.trusted_auth_user_id=$2 and p.active " +
      "and p.status in ('approved','submitted','changes_requested'))) " +
      (write?"for update of r":""),
      [id,actor.id],
    )).rows[0]
    if(!found||!found.remote_booking)notFound()
    return found
  })
}
async function storage(config){
  if(!config.secretKey)throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED',503)
  const service=createPrivateStorageClient(config).storage.from(BUCKET)
  return service
}
export const GOAL_PHOTO_MAX_BYTES=MAX_BYTES

export async function saveGoalPhoto(config,actor,id,file,consent){
  if(consent!==true)throw new AppError('PHOTO_CONSENT_REQUIRED',400)
  if(!file||!MIME.has(file.type)||file.size<128||file.size>MAX_BYTES)
    throw new AppError('INVALID_IMAGE',415)
  const record=await lookup(config,actor,id,{write:true})
  if(record.account_id!==actor.id||!['requested','reschedule_proposed','confirmed'].includes(record.status))
    notFound()
  let jpeg
  try{
    jpeg=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:20_000_000,failOn:'error'})
      .rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true})
      .jpeg({quality:78,mozjpeg:true}).toBuffer()
  }catch{throw new AppError('INVALID_IMAGE',415)}
  if(jpeg.length<128||jpeg.length>MAX_BYTES)throw new AppError('PHOTO_TOO_LARGE',413)
  const object=pathFor(actor.id,id)
  const bucket=await storage(config)
  const {error}=await bucket.upload(object,jpeg,{
    upsert:true,contentType:'image/jpeg',cacheControl:'0'
  })
  if(error)throw new AppError('PHOTO_STORAGE_UNAVAILABLE',503)
  try{
    await transaction(config,actor,async db=>{
      const row=(await db.query(
        "select id from app.consultation_requests where id=$1 and account_id=$2 " +
        "and remote_booking is not null and status in ('requested','reschedule_proposed','confirmed') for update",
        [id,actor.id],
      )).rows[0]
      if(!row)notFound()
      await db.query(
        "update app.consultation_requests set remote_booking=jsonb_set("+
        "jsonb_set(remote_booking,'{photoPath}',to_jsonb($3::text),true),"+
        "'{photoUploadedAt}',to_jsonb(now()::text),true),revision=revision+1,updated_at=now() "+
        "where id=$1 and account_id=$2",
        [id,actor.id,object],
      )
    })
  }catch(error){
    await bucket.remove([object]).catch(()=>{})
    throw error
  }
  return {uploaded:true,photoAvailable:true}
}
export async function getGoalPhoto(config,actor,id){
  const row=await lookup(config,actor,id)
  const path=row.remote_booking?.photoPath
  if(!path||path!==pathFor(row.account_id,id)||['cancelled','declined'].includes(row.status))
    notFound()
  const bucket=await storage(config)
  const {data,error}=await bucket.download(path)
  if(error||!data)notFound()
  const image=Buffer.from(await data.arrayBuffer())
  if(image.length>MAX_BYTES||image.length<128)notFound()
  return image
}
export async function deleteGoalPhoto(config,actor,id){
  const row=await lookup(config,actor,id,{write:true})
  if(row.account_id!==actor.id)notFound()
  const object=pathFor(actor.id,id)
  const bucket=await storage(config)
  const {error}=await bucket.remove([object])
  if(error)throw new AppError('PHOTO_STORAGE_UNAVAILABLE',503)
  await transaction(config,actor,async db=>{
    await db.query(
      "update app.consultation_requests set remote_booking=(remote_booking - 'photoPath' - 'photoUploadedAt'),"+
      "revision=revision+1,updated_at=now() where id=$1 and account_id=$2 and remote_booking is not null",
      [id,actor.id],
    )
  })
  return {removed:true}
}

/** Small bounded retention batch, called by the existing authorized daily
 * housekeeping job. Canceled/declined images expire immediately; completed
 * session images expire after 30 days. Never surface private path or contents. */
export async function purgeExpiredGoalPhotos(config){
  const rows=await transaction(config,null,async db=>(await db.query(
    "select id,account_id,remote_booking->>'photoPath' as photo_path " +
    "from app.consultation_requests where remote_booking ? 'photoPath' " +
    "and (status in ('cancelled','declined') or " +
    "(status='completed' and (remote_booking->>'completedAt')::timestamptz < now()-interval '30 days')) " +
    "order by updated_at,id limit 15"
  )).rows,{server:true,moderator:true})
  if(!rows.length)return 0
  const bucket=await storage(config)
  let removed=0
  for(const item of rows){
    if(item.photo_path!==pathFor(item.account_id,item.id))continue
    const {error}=await bucket.remove([item.photo_path])
    if(error)continue
    const count=await transaction(config,null,async db=>(await db.query(
      "update app.consultation_requests set remote_booking=(remote_booking-'photoPath'-'photoUploadedAt'), " +
      "revision=revision+1,updated_at=now() " +
      "where id=$1 and remote_booking->>'photoPath'=$2 " +
      "and (status in ('cancelled','declined') or " +
      "(status='completed' and (remote_booking->>'completedAt')::timestamptz < now()-interval '30 days'))",
      [item.id,item.photo_path],
    )).rowCount,{server:true,moderator:true})
    removed+=count?1:0
  }
  return removed
}
