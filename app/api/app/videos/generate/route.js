import {NextResponse} from "next/server";
import {getAppConfig,requestOrigin,requireSameOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {consumeRate} from "@/lib/app/database";
import {PRIVATE_HEADERS,readBody,safeError} from "@/lib/app/http";
import {AppError,onlyKeys} from "@/lib/assessments/contracts";
import {videoAiEnabled,submitVideoAiJob,readVideoAiJob} from "@/lib/mandala/video-ai-heygen.mjs";
import {claimVideoCode,getVideoJob,listVideoAiJobs,markVideoJobSubmitted,markVideoJobUnknown,syncVideoJob}
  from "@/lib/mandala/video-ai-repository";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

async function actorFor(request,config){
  requestOrigin(request,config);
  const auth=createRequestAuth(request,config);
  const actor=await auth.verified();
  if(request.headers.get("x-hh-account-id")!==actor.id)
    throw new AppError("ACCOUNT_CHANGED",409);
  return {auth,actor};
}
function publicJob(row){
  return {jobId:row.id||row.jobId,status:row.status,
    ready:row.status==="completed",retryAllowed:false};
}
export async function POST(request){
  let auth;
  try{
    const config=getAppConfig();
    requireSameOrigin(request,config);
    const result=await actorFor(request,config);
    auth=result.auth;
    const actor=result.actor;
    if(!videoAiEnabled())throw new AppError("VIDEO_AI_NOT_ENABLED",503);
    await consumeRate(config,"video:claim:"+actor.id,4,600);
    const body=await readBody(request,3000);
    onlyKeys(body,["code","tier","visualPrompt","aspectRatio","consentExternal"]);
    const claimed=await claimVideoCode(config,actor,body);
    if(claimed.existing)return auth.apply(NextResponse.json(publicJob(claimed),
      {headers:PRIVATE_HEADERS}));
    try{
      const provider=await submitVideoAiJob(body,{
        key:process.env.HH_VIDEO_HEYGEN_API_KEY,
        jobKey:claimed.jobId,
      });
      const updated=await markVideoJobSubmitted(config,actor,claimed.jobId,provider);
      return auth.apply(NextResponse.json(publicJob(updated),{headers:PRIVATE_HEADERS}));
    }catch{
      // A timeout can be ACCEPTED upstream. Never auto-redeem the same code.
      await markVideoJobUnknown(config,actor,claimed.jobId).catch(()=>{});
      return auth.apply(NextResponse.json(
        {jobId:claimed.jobId,status:"unknown",error:"VIDEO_REQUIRES_OWNER_REVIEW"},
        {status:202,headers:PRIVATE_HEADERS}));
    }
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
export async function GET(request){
  let auth;
  try{
    const config=getAppConfig();
    const state=await actorFor(request,config);
    auth=state.auth;const actor=state.actor;
    const id=new URL(request.url).searchParams.get("id");
    await consumeRate(config,"video:status:"+actor.id,60,600);
    // Read-only My House library remains available even when new paid
    // generation is switched OFF. This must never submit a paid job.
    if(!id){
      const own=await listVideoAiJobs(config,actor);
      return auth.apply(NextResponse.json({jobs:own},{headers:PRIVATE_HEADERS}));
    }
    let job=await getVideoJob(config,actor,id);
    if(videoAiEnabled()&&["pending","in_progress"].includes(job.status)&&job.external_id){
      const provider=await readVideoAiJob(job.external_id,{
        key:process.env.HH_VIDEO_HEYGEN_API_KEY,
      });
      if(provider.status!==job.status){
        job=await syncVideoJob(config,actor,job.id,provider.status);
      }
    }
    return auth.apply(NextResponse.json({
      ...publicJob(job),
      archived:job.storage_state==="ready",
    },{headers:PRIVATE_HEADERS}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
