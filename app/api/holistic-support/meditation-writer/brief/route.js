/**
 * Consent-gated, authenticated meditation preview.
 * An optional Gemini-free path sees only anonymous, server-owned enums.
 * All personal input stays in the original private preflight; model output
 * remains a review-required draft, never auto-published or billed.
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
import { writeMeditationDraft } from "@/lib/holistic-support/meditation-writer/writer.mjs";
import { createAnonymousGeminiSegmentProvider } from "@/lib/holistic-support/meditation-writer/free-gemini.mjs";
import { createAnonymousOpenRouterSegmentProvider } from "@/lib/holistic-support/meditation-writer/free-openrouter.mjs";
import { freeWriterProviders } from "@/lib/holistic-support/meditation-writer/free-json.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=25;
const FIELDS=["locale","focus","mode","durationMinutes","intentionCode","motifId",
  "symbolId","styleId","channel","avoidElements","noImagery","clientPhrase",
  "desiredExperience","problemFrame","resourceImageryOptIn",
  "generationMode","externalModelOptIn","providerPreference"];
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
    const {resourceImageryOptIn,generationMode="template",
      externalModelOptIn=false,providerPreference="auto",...requested}=body;
    if(!["template","llm"].includes(generationMode) ||
       typeof externalModelOptIn!=="boolean")
      throw new AppError("WRITER_INVALID_MODE",400);
    if(generationMode==="llm" && externalModelOptIn!==true)
      throw new AppError("AI_EXTERNAL_OPT_IN_REQUIRED",403);
    if(!["auto","gemini","openrouter"].includes(providerPreference))
      throw new AppError("AI_PROVIDER_INVALID",400);
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
    let payload={
      status:"template_ready",generationMode:"template",modelUsed:false,
      disclaimer:"resource_self_guided_preview_not_clinical_treatment",
      title:template.title,locale:normalized.locale,
      plannedDurationSeconds:template.plannedDurationSeconds,
      motifId:template.motifId,styleId:outcome.brief.styleId,
      // Concrete, curated action is shared by both template and LLM drafts.
      // Self-reported check-ins remain optional and are never persisted here.
      goalCode:outcome.brief.goal,
      practice:outcome.brief.practice?{
        methodId:outcome.brief.practice.methodId,
        title:outcome.brief.practice.title,
        steps:[...outcome.brief.practice.steps],
        transferAction:outcome.brief.practice.transferAction,
        reflectionQuestion:outcome.brief.practice.reflectionQuestion,
        beforeCheckinPrompt:outcome.brief.practice.beforeCheckinPrompt,
        afterCheckinPrompt:outcome.brief.practice.afterCheckinPrompt,
        optional:true,needsExplicitStart:true,
        clinicalProtocol:false,efficacyClaim:false,
      }:null,
      segments:template.segments.map(s=>({
        id:s.id,text:s.text,optionalSilenceSeconds:s.optionalSilenceSeconds,
        maySkip:true,
      })),
      audioAssetId:null,rendered:false,published:false,
      canPauseOrSkip:true,requiresEditorialReview:true,
    };
    if(generationMode==="llm"){
      const providers=freeWriterProviders(process.env,providerPreference);
      if(providers.length){
        await consumeRate(config,{op:"meditation-writer-free-hour",actorId:actor.id},3,3600);
        await consumeRate(config,{op:"meditation-writer-free-global-day"},30,86400);
        let accepted=false;
        for(let i=0;i<providers.length;i++){
          const candidate=providers[i];
          const writer=candidate.id==="gemini_free"?
            createAnonymousGeminiSegmentProvider({key:candidate.key}):
            createAnonymousOpenRouterSegmentProvider({key:candidate.key});
          // Two bounded sequential attempts must fit the 25-second function.
          const draft=await writeMeditationDraft(outcome,{
            writeSegments:writer,signal:AbortSignal.timeout(i===0?11500:7500),
          });
          if(draft.status==="draft_review_required"){
            payload={...payload,status:draft.status,generationMode:"llm",
              modelUsed:true,provider:candidate.id,
              segments:draft.segments.map(s=>({
                id:s.beatId,text:s.text,
                optionalSilenceSeconds:Math.round(s.pauseAfterMs/1000),maySkip:true,
              })),
              estimatedDurationSeconds:draft.estimatedDurationSeconds,
              requiresEditorialReview:true,published:false,
            };
            accepted=true;
            break;
          }
        }
        if(!accepted)
          payload={...payload,fallbackReason:"AI_FREE_UNAVAILABLE"};
      } else {
        payload={...payload,fallbackReason:"AI_FREE_NOT_CONFIGURED"};
      }
    }
    const reply=NextResponse.json(payload,{headers:PRIVATE_HEADERS});
    return auth.apply(reply);
  } catch(error) {
    const e=safeError(error);
    const result=NextResponse.json({error:e.code},
      {status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(result):result;
  }
}
