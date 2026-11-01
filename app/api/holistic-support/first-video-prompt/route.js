/**
 * Consent-only free Gemini + OpenRouter TEXT enhancement for the first video.
 * Never renders media or triggers paid provider / XP billing.
 * No client photo, profile, tests or audio enters the provider request.
 */
import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { generateFreeFirstVideoPrompt, freeFirstVideoProviders } from "@/lib/mandala/first-video-free-providers.mjs";
import { FIRST_VIDEO_PROMPT_ALLOWED_FIELDS, parseFirstVideoPromptInput } from "@/lib/mandala/first-video-prompt-contract.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const unavailable = code => new AppError(code, 503);

function validateBody(body) {
  // Single allowlist shared by the client contract and every provider.
  onlyKeys(body,FIRST_VIDEO_PROMPT_ALLOWED_FIELDS);
  if(body.consent!==true)throw new AppError("VIDEO_PROMPT_CONSENT_REQUIRED",403);
  const input=parseFirstVideoPromptInput(body);
  if(!input)throw new AppError("INVALID_VIDEO_PROMPT",400);
  return input;
}

export async function POST(request) {
  try {
    const config=getAppConfig();
    requireSameOrigin(request,config);
    const input=validateBody(await readBody(request,6000));
    // Only confirmed free-tier Gemini and free OpenRouter; no paid fallback.
    if(process.env.HH_FIRST_VIDEO_AI_ENABLED!=="true" ||
       !freeFirstVideoProviders(process.env).length)
      throw unavailable("VIDEO_PROMPT_FREE_AI_DISABLED");

    // Bounded anonymous free-text quota; 10/min + 60/day globally. Provider\n    // free-tier quotas may be lower, and the UI still falls back locally.
    await consumeRate(config,{op:"first-video-prompt-global-day"},60,86400);
    await consumeRate(config,{op:"first-video-prompt-global-minute"},10,60);
    const result=await generateFreeFirstVideoPrompt(input,process.env);
    if(result.error){
      // Restricted server logs only: coarse provider/status codes, never
      // the visitor wish, provider body, authorization key or model output.
      if(result.diagnostics?.length)
        console.warn("HH_FIRST_VIDEO_FREE_PROVIDER_STATUS",JSON.stringify(result.diagnostics));
      throw unavailable(result.error);
    }
    // Observability when a backup successfully rescued a failed model.
    // Only coarse, allowlisted provider/model/status info; no user text, keys,
    // prompt body or upstream response is logged or returned in JSON.
    if(result.diagnostics?.length)
      console.info("HH_FIRST_VIDEO_FREE_PROVIDER_RECOVERY",
        JSON.stringify({provider:result.provider,model:result.model,
          attempts:result.diagnostics}));
    // Explicit success allowlist: internal diagnostics never reach visitors.
    return NextResponse.json({prompt:result.prompt,provider:result.provider,
      model:result.model,mediaGenerated:false,localAssemblyOnly:true},
      {headers:PRIVATE_HEADERS});
  }catch(error){
    const e=safeError(error);
    return NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
  }
}
