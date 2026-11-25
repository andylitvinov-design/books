import {NextResponse} from 'next/server';
import {AppError} from '@/lib/assessments/contracts';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config';
import {createRequestAuth} from '@/lib/app/session';
import {consumeRate} from '@/lib/app/database';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {createVideoPaidOrderService} from '@/lib/mandala/video-paid-orders';
import {submitVeoScene,queryVeoScene,quoteVeoScene} from '@/lib/veo-video.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
function providerConfig(){return {
 projectId:process.env.HH_VEO_GCP_PROJECT_ID||'',
 outputGcsUri:process.env.HH_VEO_GCS_OUTPUT_URI||'',
 serviceAccountJson:process.env.HH_VEO_SERVICE_ACCOUNT_JSON||'',
}}
async function handle(request,write){
 let auth;
 try{
  if(!await requireAdminRequest())throw new AppError('ACCESS_DENIED',403);
  const cfg=getAppConfig();
  if(write)requireSameOrigin(request,cfg);else requestOrigin(request,cfg);
  auth=createRequestAuth(request,cfg);
  const actor=await auth.verified();
  if(request.headers.has('x-hh-account-id')&&request.headers.get('x-hh-account-id')!==actor.id)
   throw new AppError('ACCOUNT_CHANGED',409);
  await consumeRate(cfg,{op:write?'video-paid-admin-change':'video-paid-admin-read',id:actor.id},write?12:40,3600);
  const service=createVideoPaidOrderService(cfg);
  if(!write)return auth.apply(NextResponse.json(await service.adminList(actor),{headers:PRIVATE_HEADERS}));
  const input=await readBody(request,1800);
  let result,status=200;
  if(input.action==='verify')result=await service.verifyReceipt(actor,input);
  else if(input.action==='deliver')result=await service.deliver(actor,input);
  else if(input.action==='submit'){
   if(!service.settings().providerReady)throw new AppError('VIDEO_PAID_PROVIDER_DISABLED',503);
   const staged=await service.reserveScene(actor,input);
   if(staged.existing)return auth.apply(NextResponse.json(staged,{headers:PRIVATE_HEADERS}));
   const scene={mode:'text',prompt:staged.prompt,duration:6,
     aspectRatio:staged.aspectRatio,resolution:'1080p',generateAudio:false,publicContentApproved:true};
   try {
    if(quoteVeoScene(scene).estimatedUsdCents!==input.approvedMaxUsdCents)
     throw new AppError('VIDEO_QUOTE_CHANGED',409);
    const provider=await submitVeoScene(scene,providerConfig());
    result=await service.markScene(actor,staged.scene.id,{status:'pending',externalId:provider.operationName});
   }catch{
    // An interrupted POST may be accepted and billed. Persist UNKNOWN; never blindly retry.
    await service.markScene(actor,staged.scene.id,{status:'unknown'}).catch(()=>{});
    result={jobId:staged.scene.id,status:'unknown',retryAllowed:false,
      error:'VIDEO_OWNER_RECONCILIATION_REQUIRED'};
    status=202;
   }
  }else if(input.action==='check'){
   if(!service.settings().providerReady)throw new AppError('VIDEO_PAID_PROVIDER_DISABLED',503);
   if(!input||typeof input.jobId!=='string'||
     Object.keys(input).some(k=>!['action','jobId'].includes(k)))
    throw new AppError('INVALID_VIDEO_PAID_SCENE',400);
   const task=await service.task(actor,input.jobId);
   if(!['pending','in_progress'].includes(task.status)||!task.external_id)
     return auth.apply(NextResponse.json({scene:{id:task.id,status:task.status}},{headers:PRIVATE_HEADERS}));
   const provider=await queryVeoScene(task.external_id,providerConfig());
   result=await service.markScene(actor,task.id,{
     status:provider.status==='succeeded'?'completed':provider.status==='failed'?'failed':'in_progress',
     externalId:task.external_id,
     assetUri:provider.status==='succeeded'?provider.videoGcsUri:null,
   });
  }else throw new AppError('INVALID_VIDEO_PAID_ACTION',400);
  return auth.apply(NextResponse.json(result,{status,headers:PRIVATE_HEADERS}));
 }catch(e){
  const safe=safeError(e);
  const response=NextResponse.json({error:safe.code},{status:safe.status,headers:PRIVATE_HEADERS});
  return auth?auth.apply(response):response;
 }
}
export async function GET(request){return handle(request,false)}
export async function POST(request){return handle(request,true)}
