import 'server-only'
import {randomBytes} from 'node:crypto'
import {transaction} from '../app/database.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {ownerVideoMetadataValue} from './owner-telegram-video-metadata.mjs'
import {ownerRuYoutubeAccessToken,ownerRuYoutubeVisibilityAccessToken}
 from './owner-telegram-video-service.js'
import {ownerRuYoutubeMetadata,changeOwnerRuYoutubeMetadata}
 from './owner-telegram-video-visibility.mjs'

const TABLE='app_private.telegram_owner_video_jobs'
const invalid=()=>{throw Error('VIDEO_METADATA_NOT_ALLOWED')}
async function dbVideo(config,fn){
 return transaction(config,null,async db=>{
   await db.query("select set_config('hh.owner_video_manager','1',true)")
   return fn(db)
 },{server:true})
}
// Staging a title/description while a Dot MP4 is still private changes
// no YouTube metadata; the later per-video publish approval is the gate.
// Once published, only a short-lived one-use callback can reserve an edit.
export async function stageOwnerDotMetadata(config,{field,raw,updateId}={}){
 const value=ownerVideoMetadataValue(field,raw)
 if(value===null||!Number.isSafeInteger(updateId)||updateId<0)return {state:'invalid'}
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select job_id,state,youtube_video_id,last_update_id,metadata_edit_state '+
     'from '+TABLE+' where practitioner_id=$1 for update',[PRACTITIONER_ID])).rows[0]
   if(!row||updateId<=Number(row.last_update_id))return {state:'stale'}
   if(['applying','uncertain'].includes(row.metadata_edit_state))
     return {state:'metadata_uncertain'}
   if(['collecting','preview'].includes(row.state)){
     const [column,data]=field==='title'?['youtube_title',value]:['youtube_description',value]
     await db.query(
       'update '+TABLE+' set '+column+'=$2,last_update_id=greatest(last_update_id,$3),'+
       'updated_at=now() where practitioner_id=$1 and job_id=$4',
       [PRACTITIONER_ID,data,updateId,row.job_id])
     return {state:'saved_private',field,value,jobId:row.job_id}
   }
   if(row.state!=='uploaded'||!row.youtube_video_id)
     return {state:'video_not_ready'}
   const nonce=randomBytes(7).toString('hex')
   await db.query(
     'update '+TABLE+' set metadata_edit_field=$2,metadata_edit_value=$3,'+
     "metadata_edit_nonce=$4,metadata_edit_state='pending',"+
     "metadata_edit_expires_at=now()+interval '10 minutes',"+
     'last_update_id=greatest(last_update_id,$5),updated_at=now() '+
     'where practitioner_id=$1 and job_id=$6',
     [PRACTITIONER_ID,field,value,nonce,updateId,row.job_id])
   return {state:'pending',jobId:row.job_id,nonce,field,value}
 })
}
export async function ownerDotMetadataState(config,jobId=null){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     'select job_id,state,youtube_video_id,youtube_title,youtube_description,'+
     'metadata_edit_field,metadata_edit_value,metadata_edit_nonce,'+
     'metadata_edit_state,metadata_edit_expires_at from '+TABLE+
     ' where practitioner_id=$1',[PRACTITIONER_ID])).rows[0]
   if(!row||jobId&&jobId!==row.job_id)return null
   return row
 })
}
export async function cancelOwnerDotMetadata(config,{jobId,nonce}={}){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     "update "+TABLE+" set metadata_edit_field=null,metadata_edit_value=null,"+
     "metadata_edit_nonce=null,metadata_edit_state=null,metadata_edit_expires_at=null,"+
     "updated_at=now() where practitioner_id=$1 and job_id=$2 "+
     "and metadata_edit_nonce=$3 and metadata_edit_state='pending' returning job_id",
     [PRACTITIONER_ID,jobId,nonce])).rows[0]
   return {state:row?'cancelled':'stale'}
 })
}
export async function reserveOwnerDotMetadata(config,{jobId,nonce}={}){
 return dbVideo(config,async db=>{
   const row=(await db.query(
     "update "+TABLE+" set metadata_edit_state='applying',updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and state='uploaded' "+
     "and youtube_video_id is not null and metadata_edit_state='pending' "+
     "and metadata_edit_nonce=$3 and metadata_edit_expires_at>now() "+
     "returning job_id,youtube_video_id,metadata_edit_field,metadata_edit_value,metadata_edit_nonce",
     [PRACTITIONER_ID,jobId,nonce])).rows[0]
   return row?{state:'reserved',jobId:row.job_id,videoId:row.youtube_video_id,
     field:row.metadata_edit_field,value:row.metadata_edit_value,nonce:row.metadata_edit_nonce}:
     {state:'stale'}
 })
}
async function complete(config,batch){
 return dbVideo(config,async db=>{
   const column=batch.field==='title'?'youtube_title':'youtube_description'
   const row=(await db.query(
     'update '+TABLE+' set '+column+'=$4,'+
     'metadata_edit_field=null,metadata_edit_value=null,metadata_edit_nonce=null,'+
     "metadata_edit_state=null,metadata_edit_expires_at=null,updated_at=now() "+
     "where practitioner_id=$1 and job_id=$2 and youtube_video_id=$3 "+
     "and metadata_edit_nonce=$5 and metadata_edit_state in ('applying','uncertain') "+
     'returning job_id',
     [PRACTITIONER_ID,batch.jobId,batch.videoId,batch.value,batch.nonce])).rows[0]
   return Boolean(row)
 })
}
async function uncertain(config,batch){
 await dbVideo(config,db=>db.query(
   "update "+TABLE+" set metadata_edit_state='uncertain',updated_at=now() "+
   "where practitioner_id=$1 and job_id=$2 and youtube_video_id=$3 "+
   "and metadata_edit_nonce=$4 and metadata_edit_state='applying'",
   [PRACTITIONER_ID,batch.jobId,batch.videoId,batch.nonce]))
}
export async function applyOwnerDotMetadata(config,batch,{fetcher=fetch}={}){
 if(batch?.state!=='reserved'||!['title','description'].includes(batch.field))invalid()
 try{
   const token=await ownerRuYoutubeVisibilityAccessToken(config,fetcher)
   const done=await changeOwnerRuYoutubeMetadata(
     batch.videoId,token,batch.field,batch.value,fetcher)
   if(!await complete(config,batch))return {state:'stale'}
   return {state:'applied',videoId:done.id,field:batch.field,value:done.value}
 }catch(error){
   await uncertain(config,batch).catch(()=>{})
   return {state:'uncertain',errorCode:String(error?.message||'VIDEO_YOUTUBE_METADATA_UNCONFIRMED')}
 }
}
// A read-only recovery for an ambiguous YouTube videos.update outcome.
// Never send an additional PUT after a timeout or unknown provider receipt.
export async function verifyUncertainOwnerDotMetadata(config,{fetcher=fetch}={}){
 const row=await ownerDotMetadataState(config)
 if(row?.state!=='uploaded'||row.metadata_edit_state!=='uncertain'||
   !row.youtube_video_id)return {state:'nothing_pending'}
 try{
   const token=await ownerRuYoutubeAccessToken(config,fetcher)
   const provider=await ownerRuYoutubeMetadata(row.youtube_video_id,token,fetcher)
   const actual=row.metadata_edit_field==='title'?provider.title:provider.description
   if(actual!==row.metadata_edit_value)
     return {state:'still_uncertain',field:row.metadata_edit_field}
   const saved=await complete(config,{jobId:row.job_id,videoId:row.youtube_video_id,
     nonce:row.metadata_edit_nonce,field:row.metadata_edit_field,
     value:row.metadata_edit_value})
   return {state:saved?'applied':'stale',videoId:row.youtube_video_id,
     field:row.metadata_edit_field,value:actual}
 }catch{return {state:'still_uncertain'}}
}
