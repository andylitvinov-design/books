import {after} from 'next/server'
import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {requireSameOrigin} from '@/lib/app/config'
import {onlyKeys} from '@/lib/assessments/contracts'
import {ownerVideoYoutubeConnected} from '@/lib/practitioners/owner-telegram-video-service'
import {getHeygenEnglishPublication,queueHeygenEnglishPublication,
  runHeygenEnglishPublication,verifyHeygenEnglishPublication}
 from '@/lib/youtube/heygen-en-service'
import {validHeygenVideoId} from '@/lib/youtube/heygen-en-upload.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=300
const knownErrors=new Set(['HEYGEN_API_KEY_MISSING','HEYGEN_INVALID_VIDEO_ID',
 'HEYGEN_INVALID_MEDIA_URL','HEYGEN_INVALID_TITLE','HEYGEN_INVALID_DESCRIPTION',
 'HEYGEN_APPROVAL_REQUIRED','VIDEO_YOUTUBE_EN_PAIRING_REQUIRED',
 'VIDEO_YOUTUBE_EN_NOT_CONNECTED','YOUTUBE_EN_CHANNEL_CHANGED',
 'YOUTUBE_EN_QUEUE_UNAVAILABLE','YOUTUBE_EN_PUBLICATION_NOT_FOUND'])
export async function GET(request){
 return ownerMaterialRequest(request,async({config})=>{
   const videoId=new URL(request.url).searchParams.get('videoId')||''
   const connected=await ownerVideoYoutubeConnected(config,process.env,'en')
   if(!videoId)return privateJson({connected,
     heygenApiConfigured:Boolean(process.env.HH_HEYGEN_API_KEY||process.env.HEYGEN_API_KEY)})
   if(!validHeygenVideoId(videoId))return privateJson({error:'HEYGEN_INVALID_VIDEO_ID'},400)
   const job=await getHeygenEnglishPublication(videoId)
   return privateJson({connected,job})
 })
}
export async function POST(request){
 return ownerMaterialRequest(request,async({config,data})=>{
   requireSameOrigin(request,config)
   if(data.action==='publish'){
     onlyKeys(data,['action','videoId','title','description','mediaUrl',
       'rightsConfirmed','privacyConfirmed'])
     if(!await ownerVideoYoutubeConnected(config,process.env,'en'))
       return privateJson({error:'VIDEO_YOUTUBE_EN_NOT_CONNECTED'},409)
     let result
     try{result=await queueHeygenEnglishPublication(config,data)}
     catch(error){
       if(knownErrors.has(error?.message))
         return privateJson({error:error.message},409)
       throw error
     }
     if(result.start){
       // The after callback downloads from the signed HeyGen CDN privately.
       // No file, access token or signed URL enters GitHub or browser history.
       after(async()=>{try{
         await runHeygenEnglishPublication(config,result.job.videoId,{mediaUrl:result.mediaUrl})
       }catch{console.error('HH_HEYGEN_EN_PUBLICATION_AFTER_FAILED')}})
     }
     return privateJson({queued:result.start,job:result.job},202)
   }
   if(data.action==='verify'){
     onlyKeys(data,['action','videoId'])
     if(!validHeygenVideoId(data.videoId))
       return privateJson({error:'HEYGEN_INVALID_VIDEO_ID'},400)
     // Exact known YouTube ID only; never creates a new media upload.
     return privateJson({job:await verifyHeygenEnglishPublication(config,data.videoId)})
   }
   return privateJson({error:'INVALID_ACTION'},400)
 },{body:true})
}
