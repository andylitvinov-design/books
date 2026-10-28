import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {previewOwnerConsentedPresentation} from '@/lib/youtube/owner-publication-service'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
async function handler(request,{params}){
 const {id}=await params
 return ownerMaterialRequest(request,async({config})=>
   previewOwnerConsentedPresentation(config,id,request))
}
export const GET=handler
export const HEAD=handler
