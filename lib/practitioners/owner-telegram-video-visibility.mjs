// Visibility controls for one existing owner-consented RU YouTube upload.
// Never creates a video or modifies a media file. Requires youtube.force-ssl.
import {VIDEO_RU_CHANNEL_ID} from './owner-telegram-video-model.mjs'
import {ownerVideoMetadataValue} from './owner-telegram-video-metadata.mjs'

const API='https://www.googleapis.com/youtube/v3/videos'
const VID=/^[A-Za-z0-9_-]{11}$/
const TARGETS=new Set(['public','unlisted'])
const FIELDS=['license','embeddable','publicStatsViewable',
  'selfDeclaredMadeForKids','containsSyntheticMedia']
const fail=code=>{throw Error(code)}

async function videoDetails(id,token,fetcher){
 if(!VID.test(id)||typeof token!=='string'||token.length<20)
   fail('VIDEO_YOUTUBE_INVALID_ID')
 let response
 try{response=await fetcher(API+'?part=snippet,status&id='+encodeURIComponent(id),{
   headers:{Authorization:'Bearer '+token},cache:'no-store',credentials:'omit',
   redirect:'error',signal:AbortSignal.timeout(12000)
 })}catch{fail('VIDEO_YOUTUBE_VISIBILITY_READBACK_FAILED')}
 if(!response.ok)fail('VIDEO_YOUTUBE_VISIBILITY_READBACK_FAILED')
 let json
 try{json=await response.json()}catch{fail('VIDEO_YOUTUBE_VISIBILITY_READBACK_FAILED')}
 const item=json.items?.find(x=>x?.id===id)
 if(!item)fail('VIDEO_YOUTUBE_VISIBILITY_READBACK_FAILED')
 if(item.snippet?.channelId!==VIDEO_RU_CHANNEL_ID)
   fail('VIDEO_YOUTUBE_WRONG_CHANNEL')
 if(item.status?.uploadStatus!=='processed')
   fail('VIDEO_YOUTUBE_UPLOAD_UNCONFIRMED')
 if(!['unlisted','public','private'].includes(item.status?.privacyStatus))
   fail('VIDEO_YOUTUBE_VISIBILITY_READBACK_FAILED')
 return item
}

export async function ownerRuYoutubeVisibility(id,token,fetcher=fetch){
 const resource=await videoDetails(id,token,fetcher)
 return {id,channelId:VIDEO_RU_CHANNEL_ID,
   privacyStatus:resource.status.privacyStatus,
   title:String(resource.snippet?.title||'').slice(0,100)}
}

// A status update on YouTube is *replacing* the mutable "status" part.
// Explicitly retain all existing mutable status fields, never the read-only
// uploadStatus or rejection details, and never change title/description.
export function ownerRuStatusUpdateBody(resource,target){
 if(!VID.test(resource?.id)||resource.snippet?.channelId!==VIDEO_RU_CHANNEL_ID||
   !TARGETS.has(target)||!TARGETS.has(resource.status?.privacyStatus)||
   resource.status?.uploadStatus!=='processed'||resource.status?.publishAt)
   fail('VIDEO_YOUTUBE_VISIBILITY_NOT_ALLOWED')
 const status={privacyStatus:target}
 for(const field of FIELDS)
   if(resource.status[field]!==undefined&&resource.status[field]!==null)
     status[field]=resource.status[field]
 return {id:resource.id,status}
}

export async function changeOwnerRuYoutubeVisibility(id,token,target,fetcher=fetch){
 if(!TARGETS.has(target))fail('VIDEO_YOUTUBE_VISIBILITY_NOT_ALLOWED')
 const current=await videoDetails(id,token,fetcher)
 if(current.status.privacyStatus===target)
   return {id,channelId:VIDEO_RU_CHANNEL_ID,privacyStatus:target,changed:false}
 const body=ownerRuStatusUpdateBody(current,target)
 // This PUT is allowed only after the owner's separate per-video Telegram
 // confirmation. A timeout has an uncertain outcome; never retry PUT blindly.
 let response
 try{response=await fetcher(API+'?part=status',{
   method:'PUT',headers:{Authorization:'Bearer '+token,
     'Content-Type':'application/json; charset=UTF-8'},
   body:JSON.stringify(body),cache:'no-store',credentials:'omit',
   redirect:'error',signal:AbortSignal.timeout(20000)
 })}catch{fail('VIDEO_YOUTUBE_VISIBILITY_UNCONFIRMED')}
 if(!response.ok){
   if(response.status===401)fail('VIDEO_YOUTUBE_VISIBILITY_CONSENT_REQUIRED')
   if(response.status===403){
     // A forbidden privacy change can be a YouTube policy/permission hold,
     // not an OAuth problem. Do not advise repeated Google consent blindly.
     const denial=await response.json().catch(()=>null)
     const reason=String(denial?.error?.errors?.[0]?.reason||'')
     if(['insufficientPermissions','authError'].includes(reason))
       fail('VIDEO_YOUTUBE_VISIBILITY_CONSENT_REQUIRED')
     fail('VIDEO_YOUTUBE_VISIBILITY_BLOCKED')
   }
   fail('VIDEO_YOUTUBE_VISIBILITY_UNCONFIRMED')
 }
 const result=await videoDetails(id,token,fetcher)
 if(result.status.privacyStatus!==target)
   fail('VIDEO_YOUTUBE_VISIBILITY_UNCONFIRMED')
 return {id,channelId:VIDEO_RU_CHANNEL_ID,privacyStatus:target,changed:true}
}


// videos.update(part=snippet) requires BOTH title and categoryId and replaces
// omitted mutable snippet values. Preserve description, tags and language even
// when editing only one field; never change status/privacy during metadata edits.
export function ownerRuSnippetUpdateBody(resource,field,raw){
 const value=ownerVideoMetadataValue(field,raw)
 if(value===null||!VID.test(resource?.id)||
   resource.snippet?.channelId!==VIDEO_RU_CHANNEL_ID||
   resource.status?.uploadStatus!=='processed'||
   !['public','unlisted'].includes(resource.status?.privacyStatus))
   fail('VIDEO_YOUTUBE_METADATA_NOT_ALLOWED')
 const previous=resource.snippet
 const title=field==='title'?value:previous.title
 const description=field==='description'?value:String(previous.description??'')
 const category=String(previous.categoryId??'')
 if(!title||title.length>100||!/^\d{1,6}$/.test(category))
   fail('VIDEO_YOUTUBE_METADATA_NOT_ALLOWED')
 const snippet={title,description,categoryId:category}
 if(Array.isArray(previous.tags)&&previous.tags.every(t=>typeof t==='string'))
   snippet.tags=[...previous.tags]
 if(typeof previous.defaultLanguage==='string'&&previous.defaultLanguage)
   snippet.defaultLanguage=previous.defaultLanguage
 return {id:resource.id,snippet}
}
export async function ownerRuYoutubeMetadata(id,token,fetcher=fetch){
 const record=await videoDetails(id,token,fetcher)
 return {id,channelId:VIDEO_RU_CHANNEL_ID,
   privacyStatus:record.status.privacyStatus,
   title:String(record.snippet?.title??''),
   description:String(record.snippet?.description??''),
   categoryId:String(record.snippet?.categoryId??'')}
}
export async function changeOwnerRuYoutubeMetadata(id,token,field,raw,fetcher=fetch){
 const current=await videoDetails(id,token,fetcher)
 const body=ownerRuSnippetUpdateBody(current,field,raw)
 const expected=field==='title'?body.snippet.title:body.snippet.description
 if(String(current.snippet?.[field]??'')===expected)
   return {id,field,value:expected,changed:false}
 let response
 try{response=await fetcher(API+'?part=snippet',{
   method:'PUT',headers:{Authorization:'Bearer '+token,
     'Content-Type':'application/json; charset=UTF-8'},
   body:JSON.stringify(body),cache:'no-store',credentials:'omit',
   redirect:'error',signal:AbortSignal.timeout(20000)
 })}catch{fail('VIDEO_YOUTUBE_METADATA_UNCONFIRMED')}
 if(!response.ok){
   if(response.status===401)fail('VIDEO_YOUTUBE_VISIBILITY_CONSENT_REQUIRED')
   if(response.status===403){
     const deny=await response.json().catch(()=>null)
     const reason=String(deny?.error?.errors?.[0]?.reason||'')
     if(['insufficientPermissions','authError'].includes(reason))
       fail('VIDEO_YOUTUBE_VISIBILITY_CONSENT_REQUIRED')
     fail('VIDEO_YOUTUBE_METADATA_BLOCKED')
   }
   fail('VIDEO_YOUTUBE_METADATA_UNCONFIRMED')
 }
 const updated=await videoDetails(id,token,fetcher)
 if(String(updated.snippet?.[field]??'')!==expected)
   fail('VIDEO_YOUTUBE_METADATA_UNCONFIRMED')
 return {id,field,value:expected,changed:true}
}
