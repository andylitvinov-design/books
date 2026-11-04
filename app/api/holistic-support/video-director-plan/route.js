/**
 * Consent-only enhancement of an already executable local four-shot film.
 * Returns validated IDs and timings, never a provider's untrusted prose.
 * All real media remains first-party; no paid render, private files or XP.
 */
import {NextResponse} from "next/server";
import {AppError} from "@/lib/assessments/contracts";
import {getAppConfig,requireSameOrigin} from "@/lib/app/config";
import {consumeRate} from "@/lib/app/database";
import {PRIVATE_HEADERS,readBody,safeError} from "@/lib/app/http";
import {parseAiVideoPlanInput,generateAiVideoPlan} from "@/lib/mandala/video-chat-executable-ai.mjs";
import {freeFirstVideoProviders} from "@/lib/mandala/first-video-free-providers.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=15;

export async function POST(request){
  try{
    const config=getAppConfig();
    requireSameOrigin(request,config);
    const input=parseAiVideoPlanInput(await readBody(request,3200));
    if(!input)throw new AppError("VIDEO_PLAN_INVALID_OR_CONSENT_REQUIRED",400);
    if(process.env.HH_FIRST_VIDEO_AI_ENABLED!=="true"||
       freeFirstVideoProviders(process.env).length===0)
      throw new AppError("VIDEO_PLAN_AI_DISABLED",503);
    // Same global limiter as question wording; one shared free-only budget.
    await consumeRate(config,{op:"video-chat-free-global-day"},60,86400);
    await consumeRate(config,{op:"video-chat-free-global-minute"},10,60);
    const result=await generateAiVideoPlan(input,process.env);
    if(!result.suggestion)throw new AppError(result.error||"VIDEO_PLAN_AI_UNAVAILABLE",503);
    return NextResponse.json({version:"hh-executable-video-scenario-v1",
      suggestion:result.suggestion,provider:result.provider,
      mediaGenerated:false,paymentCharged:false},
      {headers:PRIVATE_HEADERS});
  }catch(error){
    const e=safeError(error);
    return NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
  }
}
