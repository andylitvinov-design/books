/**
 * Consent-only free OpenRouter prompt enhancement for the first video.
 * Never renders media or triggers paid provider / XP billing.
 * No client photo, profile, tests or audio enters the provider request.
 */
import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { generateFreeFirstVideoPrompt, freeFirstVideoProviders } from "@/lib/mandala/first-video-free-providers.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

const allowedFields = ["locale","wish","theme","style","aspect","durationSeconds","consent"];
const locales = ["en","ru","es"];
const themes = ["auto","money","energy","relationships","goals","life","health"];
const styles = ["warm","nature","dream","minimal"];
const aspects = ["landscape","portrait","square"];
const unavailable = code => new AppError(code, 503);

function validateBody(body) {
  onlyKeys(body,allowedFields);
  if(body.consent !== true)throw new AppError("VIDEO_PROMPT_CONSENT_REQUIRED",403);
  if(!locales.includes(body.locale) ||
     !themes.includes(body.theme) ||
     !styles.includes(body.style) ||
     !aspects.includes(body.aspect) ||
     ![20,30,60].includes(body.durationSeconds) ||
     typeof body.wish !== "string" ||
     body.wish.length < 3 || body.wish.length > 800 ||
     body.wish.trim().length < 3 ||
     /[\u0000-\u0008\u000B-\u001F\u007F]/u.test(body.wish))
    throw new AppError("INVALID_VIDEO_PROMPT",400);
  return {
    locale:body.locale, theme:body.theme, style:body.style,
    aspect:body.aspect, durationSeconds:body.durationSeconds,
    wish:body.wish.trim(),
  };
}

export async function POST(request) {
  try {
    const config=getAppConfig();
    requireSameOrigin(request,config);
    const input=validateBody(await readBody(request,3500));
    // Only confirmed free-tier Gemini and free OpenRouter; no paid fallback.
    if(process.env.HH_FIRST_VIDEO_AI_ENABLED!=="true" ||
       !freeFirstVideoProviders(process.env).length)
      throw unavailable("VIDEO_PROMPT_FREE_AI_DISABLED");

    // Atomic database quotas shared across public anonymous users.
    await consumeRate(config,{op:"first-video-prompt-global-day"},30,86400);
    await consumeRate(config,{op:"first-video-prompt-global-minute"},5,60);
    const result=await generateFreeFirstVideoPrompt(input,process.env);
    if(result.error)throw unavailable(result.error);
    return NextResponse.json(result,{headers:PRIVATE_HEADERS});
  }catch(error){
    const e=safeError(error);
    return NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
  }
}
