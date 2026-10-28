// Narrow owner-only adapter for updating historical YouTube display titles.
// Reuses the existing Redis transport and validation, not a second uploader,
// token store, provider API or public browser endpoint.
import {createYoutubeRedisCommand} from './upload-history-store.js'
import {parseHistoryRecord,validateHistoryRecord,RUSSIAN_CHANNEL_ID} from './upload-history-model.mjs'

const KEY='holistic-house:youtube:phone-history:v1'
export async function updateOwnerYoutubeHistoryTitle(videoId,title,{command=createYoutubeRedisCommand()}={}){
 if(!/^[A-Za-z0-9_-]{11}$/.test(videoId)||
   typeof title!=='string'||!title.trim()||title.length>100)
   throw Error('YOUTUBE_INVALID_TITLE')
 if(!command)return null
 const previous=parseHistoryRecord(await command(['HGET',KEY,videoId]))
 if(!previous)return null
 if(previous.target!=='ru'||previous.channelId!==RUSSIAN_CHANNEL_ID)
   throw Error('YOUTUBE_WRONG_CHANNEL')
 const next=validateHistoryRecord({...previous,title},RUSSIAN_CHANNEL_ID,previous.uploadedAt)
 await command(['HSET',KEY,videoId,JSON.stringify(next)])
 const verified=parseHistoryRecord(await command(['HGET',KEY,videoId]))
 if(verified?.title!==title)throw Error('YOUTUBE_HISTORY_UNCONFIRMED')
 return verified
}
