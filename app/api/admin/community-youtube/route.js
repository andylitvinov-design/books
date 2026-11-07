import {after,NextResponse} from 'next/server'
import {AppError} from '@/lib/assessments/contracts'
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config'
import {readBody,PRIVATE_HEADERS,safeError} from '@/lib/app/http'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {communityAdminQueue,adminInspectCommunityVideo,adminModerateCommunityVideo,communityManagerTx}
 from '@/lib/app/community-video-publishing'
import {preflightCommunityProvider,claimCommunityUpload,executeCommunityUpload,verifyCommunityPublished}
 from '@/lib/app/community-youtube-provider'
import {communityFlags,UUID} from '@/lib/app/community-video-model.mjs'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const revalidate=0
export const maxDuration=300
const json=(data,status=200)=>NextResponse.json(data,{status,headers:PRIVATE_HEADERS})
async function handle(request){
 try{
  const config=getAppConfig()
  if(request.method==='GET')requestOrigin(request,config)
  else requireSameOrigin(request,config)
  if(!await requireAdminRequest())throw new AppError('SIGN_IN_REQUIRED',401)
  if(request.method==='GET')return json(await communityAdminQueue(config))
  const body=await readBody(request,4096)
  if(!body||!UUID.test(body.id||''))throw new AppError('INVALID_PUBLICATION_ID',400)
  let result
  if(body.action==='inspect'){
   const inspected=await adminInspectCommunityVideo(config,body.id)
   result={sha256:inspected.sha256,bytes:inspected.bytes.length,previewUrl:`/api/admin/community-youtube/${body.id}/preview`}
  }else if(['attest','approve','reject'].includes(body.action)){
   result=await adminModerateCommunityVideo(config,body.id,body.action,body)
  }else if(body.action==='hide'||body.action==='requestTakedown'){
   if(!communityFlags().schemaReady)throw new AppError('FEATURE_UNAVAILABLE',503)
   result=await communityManagerTx(config,async db=>{
    const p=(await db.query(`update app_private.community_video_publications set
      site_hidden_at=coalesce(site_hidden_at,now()),
      takedown_requested_at=case when $2 then coalesce(takedown_requested_at,now()) else takedown_requested_at end,
      provider_state=case when $2 and provider_state<>'none' then 'takedown_pending' else provider_state end,
      updated_at=now(),version=version+1 where id=$1 returning id,provider_state`,
      [body.id,body.action==='requestTakedown'])).rows[0]
    if(!p)throw new AppError('NOT_FOUND',404)
    return {id:p.id,siteHidden:true,providerState:p.provider_state,takedownPending:body.action==='requestTakedown'}
   })
  }else if(body.action==='start'){
   // No automatic upload from moderation. Owner click claims one CAS attempt.
   await preflightCommunityProvider(config)
   await claimCommunityUpload(config,body.id)
   after(async()=>{try{await executeCommunityUpload(config,body.id)}catch{/* Unknown result stays claimed for manual reconciliation. */}})
   return json({claimed:true,uploadConfirmed:false},202)
  }else if(body.action==='resume'){
   after(async()=>{try{await executeCommunityUpload(config,body.id,{resume:true})}catch{/* Do not start a second videos.insert. */}})
   return json({checkingExistingSession:true,uploadConfirmed:false},202)
  }else if(body.action==='verify'){
   // Read-only exact-provider verification, never a new upload.
   result=await verifyCommunityPublished(config,body.id)
  }else throw new AppError('INVALID_ACTION',400)
  return json(result)
 }catch(error){const safe=safeError(error);return json({error:safe.code},safe.status)}
}
export async function GET(request){return handle(request)}
export async function POST(request){return handle(request)}
