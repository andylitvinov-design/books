import 'server-only'
import {transaction} from '../app/database.js'
import {seal} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {VIDEO_RU_CHANNEL_ID} from './owner-telegram-video-model.mjs'
export {ownerVideoOauthConfigured} from './owner-telegram-video-oauth-config.mjs'

// Minimal consent persistence boundary: no renderer or story catalogue imports.
const ENCRYPTION_CONTEXT={accountId:PRACTITIONER_ID,recordId:PRACTITIONER_ID,field:'telegram_video_oauth'}
const ENCRYPTION_CONTEXT_EN={...ENCRYPTION_CONTEXT,field:'telegram_video_oauth_en'}
function fail(code){throw Error(code)}
async function dbVideo(config,fn){
 return transaction(config,null,async db=>{
   await db.query("select set_config('hh.owner_video_manager','1',true)")
   return fn(db)
 },{server:true})
}

export async function ownerYoutubeExpectedChannel(target='ru'){
 if(target==='ru')return VIDEO_RU_CHANNEL_ID
 if(target!=='en')fail('VIDEO_YOUTUBE_INVALID_TARGET')
 const {getYoutubeHistoryStore}=await import('../youtube/upload-history-store.js')
 const store=getYoutubeHistoryStore()
 const channels=store?await store.channels():null
 const id=channels?.en?.id
 if(!/^UC[A-Za-z0-9_-]{22}$/.test(id||''))
   fail('VIDEO_YOUTUBE_EN_PAIRING_REQUIRED')
 return id
}
export async function saveOwnerVideoYoutubeConsent(config,refreshToken,channelId,{visibility=false,target='ru'}={}){
 if(typeof refreshToken!=='string'||refreshToken.length<10||refreshToken.length>4096)
   fail('VIDEO_YOUTUBE_WRONG_CHANNEL')
 if(target==='ru'){
   if(channelId!==VIDEO_RU_CHANNEL_ID)fail('VIDEO_YOUTUBE_WRONG_CHANNEL')
   const encrypted=seal({refreshToken,visibility:visibility===true},ENCRYPTION_CONTEXT,config)
   await dbVideo(config,async db=>{
     await db.query(
       'insert into app_private.telegram_owner_video_oauth '+
       " (practitioner_id,target,channel_id,token_ciphertext) values($1,'ru',$2,$3) "+
       'on conflict(practitioner_id,target) do update set '+
       'channel_id=excluded.channel_id,token_ciphertext=excluded.token_ciphertext,updated_at=now()',
       [PRACTITIONER_ID,channelId,encrypted])
   })
   return
 }
 if(target!=='en'||channelId!==await ownerYoutubeExpectedChannel('en'))
   fail('VIDEO_YOUTUBE_WRONG_CHANNEL')
 const encrypted=seal({refreshToken,visibility:visibility===true},ENCRYPTION_CONTEXT_EN,config)
 await dbVideo(config,async db=>{
   await db.query(
     'insert into app_private.telegram_owner_video_oauth '+
     " (practitioner_id,target,channel_id,token_ciphertext) values($1,'en',$2,$3) "+
     'on conflict(practitioner_id,target) do update set '+
     'channel_id=excluded.channel_id,token_ciphertext=excluded.token_ciphertext,updated_at=now()',
     [PRACTITIONER_ID,channelId,encrypted])
 })
}
