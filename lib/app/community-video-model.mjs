import {createHash,timingSafeEqual} from 'node:crypto'

export const COMMUNITY_POLICY='hh-community-youtube-v2'
export const COMMUNITY_CHANNEL=/^UC[A-Za-z0-9_-]{22}$/
export const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const GOOGLE_SCOPES=Object.freeze([
 'https://www.googleapis.com/auth/youtube.upload',
 'https://www.googleapis.com/auth/youtube.readonly',
])
const OWN_INPUT=new Set(['action','title','description','authorDisplayName','audioLanguage','visibility',
 'rightsConfirmed','privacyReviewed','publishToSharedYoutubeConfirmed','siteCatalogConsent',
 'containsRealisticSyntheticMedia','madeForKidsDecision','approvedFinalMetadataHash','consentPolicyVersion'])

export function communityFlags(env=process.env){
 const selected=String(env.HH_COMMUNITY_YOUTUBE_CHANNEL_ID||'')
 // Production shamanic academy is explicitly forbidden for participant media.
 const channel=selected==='UCjWq6NHZTQkUr3bC3WbXXcw'?'':selected
 const schemaReady=env.HH_COMMUNITY_YOUTUBE_SCHEMA_READY==='true'
 const requestsEnabled=schemaReady&&env.HH_COMMUNITY_YOUTUBE_REQUESTS_ENABLED==='true'
 return {
  channelId:COMMUNITY_CHANNEL.test(channel)?channel:null,
  schemaReady,requestsEnabled,
  uploadsEnabled:requestsEnabled&&env.HH_COMMUNITY_YOUTUBE_UPLOADS_ENABLED==='true'&&COMMUNITY_CHANNEL.test(channel),
 }
}
function clean(value,limit){
 if(typeof value!=='string'||value.trim().length<1||value.length>limit||/[\u0000-\u001f\u007f]/u.test(value))
  throw Error('INVALID_PUBLICATION_METADATA')
 return value.trim()
}
export function normalizedCommunityIntent(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!OWN_INPUT.has(k)))
  throw Error('INVALID_PUBLICATION_METADATA')
 const intent={
  title:clean(body.title,100),description:typeof body.description==='string'?body.description.trim():'',
  authorDisplayName:clean(body.authorDisplayName,100),
  audioLanguage:body.audioLanguage,visibility:body.visibility,
  rightsConfirmed:body.rightsConfirmed,privacyReviewed:body.privacyReviewed,
  publishToSharedYoutubeConfirmed:body.publishToSharedYoutubeConfirmed,
  siteCatalogConsent:body.siteCatalogConsent===true,
  containsRealisticSyntheticMedia:body.containsRealisticSyntheticMedia,
  madeForKidsDecision:body.madeForKidsDecision,
 }
 if(intent.description.length>4200||/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(intent.description)||
   !['en','ru','es'].includes(intent.audioLanguage)||!['link_only','public_catalog'].includes(intent.visibility)||
   typeof intent.containsRealisticSyntheticMedia!=='boolean'||
   !['yes','no','needs_review'].includes(intent.madeForKidsDecision))
  throw Error('INVALID_PUBLICATION_METADATA')
 return intent
}
export function buildCommunityMetadata(intent,{slug,practitionerSlug=null,origin='https://holistichouse.vercel.app'}){
 if(!UUID.test(slug)||!['https://holistichouse.vercel.app'].includes(origin))throw Error('INVALID_AUTHOR_PROFILE')
 const route=practitionerSlug&&/^[a-z0-9-]{2,90}$/.test(practitionerSlug)
  ?'masters/'+practitionerSlug:'creators/'+slug
 const authorUrl=origin+'/'+intent.audioLanguage+'/'+route
 const youtubeDescription=[intent.description,'Author: '+intent.authorDisplayName,
  'Author materials: '+authorUrl].filter(Boolean).join('\n\n')
 if(youtubeDescription.length>5000)throw Error('INVALID_PUBLICATION_METADATA')
 const snapshot={...intent,description:youtubeDescription,authorUrl,
  consentPolicyVersion:COMMUNITY_POLICY,channelPrivacy:'unlisted'}
 const metadataHash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
 return {snapshot,metadataHash}
}
export function secureHashEqual(left,right){
 if(!/^[a-f0-9]{64}$/.test(String(left||''))||!/^[a-f0-9]{64}$/.test(String(right||'')))return false
 return timingSafeEqual(Buffer.from(left,'hex'),Buffer.from(right,'hex'))
}
export function verifiedGoogleChannel(payload,expected){
 if(!COMMUNITY_CHANNEL.test(expected)||payload?.items?.length!==1||payload.items[0]?.id!==expected)
  throw Error('YOUTUBE_CHANNEL_MISMATCH')
 const created=Date.parse(payload.items[0]?.snippet?.publishedAt||'')
 const title=String(payload.items[0]?.snippet?.title||'').slice(0,100)
 // This must be a NEW dedicated Holistic House channel, not an old owner channel.
 if(!Number.isFinite(created)||created<Date.parse('2026-11-06T00:00:00Z')||
   !/holistic\s*house/i.test(title))throw Error('YOUTUBE_NOT_NEW_COMMUNITY_CHANNEL')
 return {channelId:expected,title}
}
export function verifiedCommunityVideo(payload,videoId,channelId){
 if(!VIDEO_ID.test(videoId)||!COMMUNITY_CHANNEL.test(channelId)||
  payload?.items?.length!==1||payload.items[0]?.id!==videoId||
  payload.items[0]?.snippet?.channelId!==channelId)
  throw Error('YOUTUBE_VIDEO_IDENTITY_MISMATCH')
 const privacy=payload.items[0]?.status?.privacyStatus
 const upload=payload.items[0]?.status?.uploadStatus
 if(privacy!=='unlisted'){
  if(privacy==='private')return {videoId,channelId,privacyStatus:privacy,uploadStatus:upload,removedFromPublic:true}
  throw Error('YOUTUBE_PRIVACY_MISMATCH')
 }
 if(upload==='failed'||upload==='rejected'||upload==='deleted')throw Error('YOUTUBE_UPLOAD_REJECTED')
 return {videoId,channelId,privacyStatus:privacy,uploadStatus:upload,processed:upload==='processed'}
}
export function validCommunitySessionUrl(value){
 try{
  const url=new URL(value)
  if(url.username||url.password||url.hash||url.protocol!=='https:')return null
  if(url.origin==='https://www.googleapis.com'&&url.pathname==='/upload/youtube/v3/videos')return url.toString()
  if(url.origin==='https://uploads.googleusercontent.com'&&url.pathname.startsWith('/upload/youtube/v3/videos'))return url.toString()
  return null
 }catch{return null}
}
export function nextResumableOffset(status,range,total){
 if(!Number.isSafeInteger(total)||total<1024||total>12_000_000||status!==308)throw Error('UNEXPECTED_RESUMABLE_STATUS')
 if(range===null)return 0
 const match=/^bytes=0-(\d+)$/.exec(range||'')
 if(!match)throw Error('INVALID_GOOGLE_RANGE')
 const n=Number(match[1])+1
 if(!Number.isSafeInteger(n)||n<=0||n>=total)throw Error('INVALID_GOOGLE_RANGE')
 return n
}
