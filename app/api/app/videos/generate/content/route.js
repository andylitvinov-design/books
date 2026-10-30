import {NextResponse} from "next/server";
import {getAppConfig,requestOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {AppError} from "@/lib/assessments/contracts";
import {videoAiEnabled,fetchVideoAiContent} from "@/lib/mandala/video-ai-heygen.mjs";
import {getVideoJob} from "@/lib/mandala/video-ai-repository";
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
    if(request.headers.get("x-hh-account-id")!==actor.id)
      throw new AppError("ACCOUNT_CHANGED",409);
    if(!videoAiEnabled())throw new AppError("VIDEO_AI_NOT_ENABLED",503);
    const id=new URL(request.url).searchParams.get("id");
    const job=await getVideoJob(config,actor,id);
    if(job.status!=="completed"||!job.external_id)
      throw new AppError("VIDEO_NOT_READY",409);
    const provider=await fetchVideoAiContent(job.external_id,{
      key:process.env.HH_VIDEO_HEYGEN_API_KEY,
    });
    const disposition='attachment; filename="holistic-house-ai-clip.mp4"';
    const headers={...PRIVATE_HEADERS,
      "Content-Type":provider.headers.get("content-type")||"video/mp4",
      "Content-Disposition":disposition,
      "X-Content-Type-Options":"nosniff"};
    return auth.apply(new NextResponse(provider.body,{headers}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
