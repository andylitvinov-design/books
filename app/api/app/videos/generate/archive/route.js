import {NextResponse} from "next/server";
import {getAppConfig,requestOrigin,requireSameOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {readBody,PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {AppError,onlyKeys} from "@/lib/assessments/contracts";
import {videoAiEnabled} from "@/lib/mandala/video-ai-heygen.mjs";
import {getVideoJob} from "@/lib/mandala/video-ai-repository";
import {archiveVideoAiJob,privateVideoArchiveEnabled} from "@/lib/mandala/video-ai-archive";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function POST(request){
  let auth;
  try{
    const config=getAppConfig();
    requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    if(request.headers.get("x-hh-account-id")!==actor.id)
      throw new AppError("ACCOUNT_CHANGED",409);
    // Explicit consent to STORE a completed video; never on page load.
    const body=await readBody(request,4096);
    onlyKeys(body,["jobId","consentStore"]);
    if(body.consentStore!==true)throw new AppError("VIDEO_STORAGE_CONSENT_REQUIRED",403);
    if(!privateVideoArchiveEnabled()||!videoAiEnabled())
      throw new AppError("VIDEO_ARCHIVE_DISABLED",503);
    const job=await getVideoJob(config,actor,body.jobId);
    if(job.status!=="completed")throw new AppError("VIDEO_NOT_READY",409);
    const result=await archiveVideoAiJob(config,actor,job.id,{
      key:process.env.HH_VIDEO_HEYGEN_API_KEY,
    });
    return auth.apply(NextResponse.json(result,{headers:PRIVATE_HEADERS}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
