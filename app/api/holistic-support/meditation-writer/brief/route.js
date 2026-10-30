/**
 * Consent-gated, authenticated source-only meditation preview (NOT a
 * generative LLM endpoint). Does not save a personal profile or audio.
 * Default disabled; explicit production approval required.
 */
import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { interpretSupportUtterance } from "@/lib/holistic-support/guide-dialogue.mjs";
import { buildPsychologyProgram } from "@/lib/holistic-support/psychologist-mind.mjs";
import { normalizeWriterRequest } from "@/lib/holistic-support/meditation-writer/contract.mjs";
import { prepareMeditationCreativeBrief } from "@/lib/holistic-support/meditation-writer/brief.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=20;
const FIELDS=["locale","focus","mode","durationMinutes","intentionCode","motifId",
  "symbolId","styleId","channel","avoidElements","noImagery","clientPhrase",
  "desiredExperience","problemFrame","resourceImageryOptIn"];
const stopped = /\b(?:stop|please stop|i feel worse|getting worse|me siento peor|no quiero continuar)\b|(?:мне стало хуже|становится хуже|хочу остановиться|хочу умереть|самоповреждение)/iu;
const preflight = (texts,locale)=>{
  for(const text of texts){
    if(stopped.test(text))return false;
    for(let i=0;i<text.length;i+=170)
      if(interpretSupportUtterance(text.slice(i,i+240),locale).kind==="safety")
        return false;
  }
  return true;
};
export async function POST(request) {
  let auth;
  try {
    if(process.env.HH_MEDITATION_WRITER_BRIEF_ENABLED!=="true" ||
       (process.env.VERCEL_ENV==="production" &&
        process.env.HH_MEDITATION_WRITER_PRODUCTION_APPROVED!=="true"))
      throw new AppError("WRITER_PREVIEW_DISABLED",503);
    const config=getAppConfig();
    requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    const body=await readBody(request,4000);
    onlyKeys(body,FIELDS);
    const {resourceImageryOptIn,...requested}=body;
    const normalized=normalizeWriterRequest(requested);
    if(normalized.status!=="valid")
      throw new AppError(normalized.code,400);
    if(resourceImageryOptIn!==true)
      throw new AppError("IMAGERY_OPT_IN_REQUIRED",403);
    await consumeRate(config,{op:"meditation-writer-preview",actorId:actor.id},5,60);
    const userText=[normalized.problemFrame,normalized.clientPhrase,
      normalized.desiredExperience];
    if(!preflight(userText,normalized.locale))
      throw new AppError("HUMAN_REVIEW_REQUIRED",422);
    // Only this one user's explicit per-request consent is used. No saved
    // profile, medical data or model inference is read or sent anywhere.
    const program=buildPsychologyProgram({
      locale:normalized.locale,
      intent:{focus:normalized.focus,rawUtterance:userText.filter(Boolean).join(". ")},
      safety:{status:"clear"},
      access:{authenticated:true,ownerScoped:true},
      consent:{resourceImagery:true},
    });
    const outcome=prepareMeditationCreativeBrief({
      program,consent:{resourceImagery:true},request:requested,
    });
    if(outcome.status!=="brief_ready"){
      const e=new AppError(outcome.status==="invalid_input"?
        outcome.code:outcome.status,
        outcome.status==="invalid_input"?400:422);
      throw e;
    }
    const template=outcome.template;
    const reply=NextResponse.json({
      status:"template_ready",generationMode:"template",modelUsed:false,
      disclaimer:"resource_self_guided_preview_not_clinical_treatment",
      title:template.title,locale:normalized.locale,
      plannedDurationSeconds:template.plannedDurationSeconds,
      motifId:template.motifId,styleId:outcome.brief.styleId,
      segments:template.segments.map(s=>({
        id:s.id,text:s.text,optionalSilenceSeconds:s.optionalSilenceSeconds,
        maySkip:true,
      })),
      audioAssetId:null,rendered:false,published:false,
      canPauseOrSkip:true,requiresEditorialReview:true,
    },{headers:PRIVATE_HEADERS});
    return auth.apply(reply);
  } catch(error) {
    const e=safeError(error);
    const result=NextResponse.json({error:e.code},
      {status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(result):result;
  }
}
