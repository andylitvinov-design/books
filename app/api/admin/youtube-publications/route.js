import {after} from 'next/server'
import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {requireSameOrigin} from '@/lib/app/config'
import {onlyKeys} from '@/lib/assessments/contracts'
import {ownerVideoYoutubeConnected} from '@/lib/practitioners/owner-telegram-video-service'
import {listOwnerYoutubeCandidates,ownerApprovePublication,ownerDeclinePublication,
  uploadOwnerApprovedPublication,verifyOwnerPublication}
 from '@/lib/youtube/owner-publication-service'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=300

export async function GET(request){
 return ownerMaterialRequest(request,async({config})=>
   privateJson({...await listOwnerYoutubeCandidates(config),
     connected:await ownerVideoYoutubeConnected(config)}))
}
export async function POST(request){
 return ownerMaterialRequest(request,async({config,data})=>{
   requireSameOrigin(request,config)
   if(data.action==='approve'){
     onlyKeys(data,['action','requestId','sourceId','sourceType','title',
       'rightsConfirmed','privacyConfirmed'])
     if(!await ownerVideoYoutubeConnected(config))
       return privateJson({error:'YOUTUBE_NOT_CONNECTED'},409)
     const result=await ownerApprovePublication(config,data)
     if(result.start){
       after(async()=>{try{
         await uploadOwnerApprovedPublication(config,result.request.id)
       }catch{console.error('HH_OWNER_PUBLICATION_AFTER_FAILED')}})
     }
     return privateJson({...result,queued:result.start},202)
   }
   if(data.action==='start'){
     onlyKeys(data,['action','id'])
     // Only CAS-approved jobs can start; never restart unknown provider outcomes.
     after(async()=>{try{
       await uploadOwnerApprovedPublication(config,data.id)
     }catch{console.error('HH_OWNER_PUBLICATION_AFTER_FAILED')}})
     return privateJson({queued:true},202)
   }
   if(data.action==='verify'){
     onlyKeys(data,['action','id'])
     // Read-only verification of a known YouTube ID, never an upload.
     after(async()=>{try{
       await verifyOwnerPublication(config,data.id)
     }catch{console.error('HH_OWNER_PUBLICATION_READBACK_FAILED')}})
     return privateJson({queued:true,readOnly:true},202)
   }
   if(data.action==='decline'){
     onlyKeys(data,['action','id'])
     return privateJson({request:await ownerDeclinePublication(config,data.id)})
   }
   return privateJson({error:'INVALID_ACTION'},400)
 },{body:true})
}
