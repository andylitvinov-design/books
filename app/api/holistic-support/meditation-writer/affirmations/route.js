/**
 * Authenticated, zero-price-only short affirmation drafting.
 * Raw notes, personal phrases, test scores, profile, and clinical records
 * are NEVER read or forwarded. Only server-validated enum codes go out.
 */
import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { compileAnonymousAffirmationStrategy,
  createAnonymousFreeAffirmationProvider } from "@/lib/holistic-support/meditation-writer/affirmation-writer.mjs";
import { freeWriterProviders } from "@/lib/holistic-support/meditation-writer/free-json.mjs";
import { buildPsychologyProgram } from "@/lib/holistic-support/psychologist-mind.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=25;
const FIELDS=["locale","theme","problemIndex","goalId","tone","focus",
  "externalModelOptIn"];
const unavailable=(reason)=>({
  status:"free_unavailable",modelUsed:false,provider:null,
  phrases:[],fallbackReason:reason,requiresEditorialReview:true,
});
export async function POST(request) {
  let auth;
  try {
    if(process.env.HH_MEDITATION_WRITER_BRIEF_ENABLED!=="true" ||
       (process.env.VERCEL_ENV==="production" &&
         process.env.HH_MEDITATION_WRITER_PRODUCTION_APPROVED!=="true"))
      throw new AppError("FREE_WRITER_DISABLED",503);
    const config=getAppConfig();
    requireSameOrigin(request,config);
    auth=createRequestAuth(request,config);
    const actor=await auth.verified();
    const body=await readBody(request,1200);
    onlyKeys(body,FIELDS);
    if(body.externalModelOptIn!==true)
      throw new AppError("AI_EXTERNAL_OPT_IN_REQUIRED",403);
    // Unknown/forged strategy, medical text and arbitrary client phrases fail
    // closed instead of being silently copied into the model prompt.
    let strategy;
    try {
      strategy=compileAnonymousAffirmationStrategy({
        locale:body.locale,theme:body.theme,problemIndex:body.problemIndex,
        goalId:body.goalId,tone:body.tone,focus:body.focus,
      });
    }catch{
      throw new AppError("AFFIRMATION_STRATEGY_INVALID",400);
    }
    // Psychologist Mind must independently approve the non-clinical focus.
    // Never send full psychological programmes or personal notes to free AI.
    const themeFocus={
      energy:"stress",money:"self_worth",relationships:"relationships",
      goals:"meaning",life:"meaning",health:"stress",
    };
    const themeApproach={
      stress:"cbt",self_worth:"cbt",relationships:"interpersonal",meaning:"act",
    };
    const expectedFocus=themeFocus[strategy.themeCode];
    const programme=buildPsychologyProgram({
      locale:strategy.locale,
      intent:{focus:expectedFocus},
      safety:{status:"clear"},
      access:{authenticated:true,ownerScoped:true},
      consent:{resourceImagery:false,profilePersonalization:false},
    });
    if(!expectedFocus || programme.status!=="ready" ||
       programme.mode!=="self_guided" ||
       programme.focus!==expectedFocus ||
       programme.primaryApproach!==themeApproach[expectedFocus] ||
       programme.requiresHumanReview===true)
      throw new AppError("AFFIRMATION_DIRECTOR_NOT_READY",422);
    const providers=freeWriterProviders(process.env);
    let payload=unavailable("AI_FREE_NOT_CONFIGURED");
    if(providers.length){
      await consumeRate(config,{op:"affirmations-free-hour",actorId:actor.id},3,3600);
      await consumeRate(config,{op:"meditation-writer-free-global-day"},30,86400);
      payload=unavailable("AI_FREE_UNAVAILABLE");
      for(let i=0;i<providers.length;i++){
        const candidate=providers[i];
        try {
          const writer=createAnonymousFreeAffirmationProvider({
            provider:candidate.id,key:candidate.key,
          });
          payload=await writer({strategy},{signal:AbortSignal.timeout(i===0?11000:7000)});
          break;
        }catch{
          // Fail closed and try a second provider only if explicitly enabled.
          // Never publish a non-validated provider result or expose error text.
        }
      }
    }
    const reply=NextResponse.json(payload,{headers:PRIVATE_HEADERS});
    return auth.apply(reply);
  }catch(error){
    const e=safeError(error);
    const response=NextResponse.json({error:e.code},
      {status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
