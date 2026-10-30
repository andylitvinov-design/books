import {NextResponse} from "next/server";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {createRequestAuth} from "@/lib/app/session";
import {readBody,PRIVATE_HEADERS,safeError} from "@/lib/app/http";
import {AppError,onlyKeys} from "@/lib/assessments/contracts";
import {videoAiEnabled} from "@/lib/mandala/video-ai-openrouter.mjs";
import {issueVideoCode} from "@/lib/mandala/video-ai-repository";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
// Admin-only, after manual payment receipt verification; no self-service code minting.
export async function POST(request){
  let auth;
  try{
    if(!await requireAdminRequest())throw new AppError("ACCESS_DENIED",403);
    const config=getAppConfig();
    requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    if(request.headers.get("x-hh-account-id")!==actor.id)
      throw new AppError("ACCOUNT_CHANGED",409);
    if(!videoAiEnabled())throw new AppError("VIDEO_AI_NOT_ENABLED",503);
    const body=await readBody(request,2048);
    onlyKeys(body,["tier","kind","ownerVerified","paymentChannel",
      "paymentReference","recipientId","expiresDays"]);
    const created=await issueVideoCode(config,actor,body);
    // This is the only time the plaintext code is shown. Send it privately
    // after the owner verifies the payment, never in a URL, logs or public page.
    return auth.apply(NextResponse.json(created,{headers:PRIVATE_HEADERS}));
  }catch(error){
    const safe=safeError(error);
    const response=NextResponse.json({error:safe.code},
      {status:safe.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
