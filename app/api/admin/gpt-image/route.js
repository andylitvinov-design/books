/**
 * Independent owner-only GPT Image pilot. No customer access, no private data,
 * no paid request without server-side budget acknowledgement and a durable
 * one-per-day database quota. Never exposed to the public Video Studio.
 */
import {NextResponse} from 'next/server';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {getAppConfig,requestOrigin,requireSameOrigin} from '@/lib/app/config';
import {PRIVATE_HEADERS,readBody,safeError} from '@/lib/app/http';
import {consumeRate} from '@/lib/app/database';
import {buildSafeGptImageBrief} from '@/lib/video-generation/safe-visual-brief.mjs';
import {generateOwnerImage,ownerGptImageReadiness} from '@/lib/video-generation/openai-image-provider.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=120;
const OPTIONS=new Set(['theme','style','aspect','locale','durationSeconds','avoidMotifs','dryRun','paidApproved']);
const error=(code,status=400)=>NextResponse.json({error:code},{status,headers:PRIVATE_HEADERS});

export async function GET(request){
  try{
    const config=getAppConfig();requestOrigin(request,config);
    if(!await requireAdminRequest())return error('UNAUTHORIZED',403);
    return NextResponse.json({ownerOnly:true,enabled:ownerGptImageReadiness()==='ready' &&
      process.env.HH_GPT_IMAGE_PROVIDER_BUDGET_VERIFIED==='true',
      availablePerDay:1,model:'gpt-image-2.5-flare',publicAccess:false},
      {headers:PRIVATE_HEADERS});
  }catch(e){const out=safeError(e);return error(out.code,out.status);}
}
export async function POST(request){
  try{
    const config=getAppConfig();requireSameOrigin(request,config);
    if(!await requireAdminRequest())return error('UNAUTHORIZED',403);
    const input=await readBody(request,2000);
    if(!input||typeof input!=='object'||Array.isArray(input)||
      Object.keys(input).some(k=>!OPTIONS.has(k)))return error('INVALID_VISUAL_BRIEF');
    const {dryRun,paidApproved,...selectors}=input;
    // One image per owner request. Caller cannot send a prompt or a plan:
    // the server rebuilds both using its existing trusted scene library.
    const brief=buildSafeGptImageBrief({...selectors,shotNumbers:[1]});
    if(dryRun===true)return NextResponse.json({status:'preview',planHash:brief.planHash,
      shot:brief.shots[0].sceneId,visualPrompt:brief.shots[0].prompt,
      imagesCreated:0,costIncurred:false},{headers:PRIVATE_HEADERS});
    if(paidApproved!==true)return error('PAID_APPROVAL_REQUIRED',403);
    if(ownerGptImageReadiness()!=='ready'||
       process.env.HH_GPT_IMAGE_PROVIDER_BUDGET_VERIFIED!=='true')
      return error('GPT_IMAGE_DISABLED',503);
    // consumeRate is database/transaction backed, global and atomic, *before*
    // any provider request. One attempt in 24h even if the network times out;
    // a timeout could still have been billed and is never blindly retried.
    await consumeRate(config,{op:'hh-owner-gpt-image-daily-probe'},1,86400);
    const image=await generateOwnerImage({brief,shotNumber:1,accountId:'holistic_owner_pilot',
      authorization:{verifiedByServer:true,ownerAuthenticated:true,durableReservation:true,
        oneTimeLeaseAcquired:true,maxImages:1}});
    // Owner-only pilot: return actual JPEG bytes for immediate download. A
    // durable private asset store and customer billing remain future gates.
    if(image.bytes.length>3_000_000)return error('OWNER_IMAGE_TOO_LARGE_NEEDS_REVIEW',503);
    return new NextResponse(new Uint8Array(image.bytes),{status:200,headers:{
      ...PRIVATE_HEADERS,'Content-Type':'image/jpeg',
      'Content-Disposition':'attachment; filename="holistic-gpt-image.jpg"',
      'X-HH-Image-SHA256':image.metadata.sha256,
      'X-HH-Image-Source':'gpt-image-2.5-flare-owner-pilot'}});
  }catch(e){
    const out=safeError(e);
    // The provider may have billed a timed-out request; keep the daily quota
    // consumed and surface an honest non-retryable error.
    const code=String(e?.code||out.code||'GPT_IMAGE_UNAVAILABLE');
    return error(code.slice(0,70),out.status===429?429:503);
  }
}