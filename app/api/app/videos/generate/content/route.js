import {NextResponse} from "next/server";
import {getAppConfig,requestOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {AppError} from "@/lib/assessments/contracts";
import {videoAiEnabled,fetchVideoAiContent} from "@/lib/mandala/video-ai-heygen.mjs";
import {getVideoJob} from "@/lib/mandala/video-ai-repository";
import {signedPrivateVideoAsset} from "@/lib/mandala/video-ai-archive";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export async function GET(request){
  let auth;
  try{
    const config=getAppConfig();
    requestOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    // Standard HTML video elements do not send custom account-id headers.
    // The verified session + private account-scoped DB lookup is authoritative.
    const supplied=request.headers.get("x-hh-account-id");
    if(supplied&&supplied!==actor.id)throw new AppError("ACCOUNT_CHANGED",409);
    const id=new URL(request.url).searchParams.get("id");
    const job=await getVideoJob(config,actor,id);
    if(job.status!=="completed")throw new AppError("VIDEO_NOT_READY",409);
    if(job.storage_state==="ready"){
      const url=await signedPrivateVideoAsset(config,actor,job);
      const response=NextResponse.redirect(url,307);
      for(const [key,value] of Object.entries(PRIVATE_HEADERS))response.headers.set(key,value);
      return auth.apply(response);
    }
    // If generation is paused, archived media remains available above;
    // otherwise do not request the unarchived provider URL.
    if(!videoAiEnabled()||!job.external_id)
      throw new AppError("VIDEO_NOT_ARCHIVED",503);
    const provider=await fetchVideoAiContent(job.external_id,{
      key:process.env.HH_VIDEO_HEYGEN_API_KEY,
    });
    const headers={...PRIVATE_HEADERS,
      "Content-Type":"video/mp4",
      "Content-Disposition":'inline; filename="holistic-house-ai-clip.mp4"',
      "X-Content-Type-Options":"nosniff"};
    return auth.apply(new NextResponse(provider.body,{headers}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
