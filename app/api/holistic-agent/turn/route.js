import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { createAppRepository } from "@/lib/app/repository";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { coreServiceOffers } from "@/data/core-service-offers";
import { interpretSupportUtterance } from "@/lib/holistic-support/guide-dialogue.mjs";
import { buildHolisticGuidedTurn } from "@/lib/holistic-support/holistic-guide-adapter.mjs";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import { generateOwnedOllama, validatedOllamaConfig } from "@/lib/holistic-support/owned-ollama.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 25;
const GOALS = new Set(["energy","relationships","money","goals","meaning"]);
const LOCALES = new Set(["ru","en","es"]);
const MODES = new Set(["rules","device","owned"]);

function inputOf(body) {
  onlyKeys(body,["locale","message","history","mode","ownedInferenceConsent","selectedGoal"]);
  if (!LOCALES.has(body.locale) || typeof body.message !== "string" ||
    !body.message.trim() || body.message.length > 3000 ||
    !MODES.has(body.mode) || typeof body.ownedInferenceConsent !== "boolean" ||
    (body.selectedGoal !== null && body.selectedGoal !== undefined &&
      !GOALS.has(body.selectedGoal))) throw new AppError("INVALID_AGENT_INPUT",400);
  if (!Array.isArray(body.history) || body.history.length > 6 ||
    body.history.some(row => !row || !["user","assistant"].includes(row.role) ||
      typeof row.text !== "string" || row.text.length > 420 ||
      Object.keys(row).some(key => !["role","text"].includes(key))))
    throw new AppError("INVALID_AGENT_HISTORY",400);
  return body;
}
function preflight(text,locale) {
  // Preliminary conservative lexical gate only, NOT a clinical risk diagnosis.
  // This pilot is non-clinical and remains feature-flagged until evaluated.
  if (/мне стало хуже|после упражнения хуже|хочу остановиться|мне страшно продолжать|i feel worse|please stop|after the exercise i feel worse|me siento peor|no quiero continuar/iu.test(text))
    return {status:"human_review"};
  for (let i=0;i<text.length;i+=180) {
    if (interpretSupportUtterance(text.slice(i,i+240),locale).kind==="safety")
      return {status:"urgent"};
  }
  return {status:"clear"};
}
function goalFromRequest(text,locale,explicit) {
  if (GOALS.has(explicit)) return explicit;
  const found = interpretSupportUtterance(text,locale).topic;
  return found==="love"?"relationships":GOALS.has(found)?found:null;
}
export async function POST(request) {
  let auth;
  try {
    // Off by default: installing source code does not publish a clinical agent.
    if (process.env.HH_AGENT_CHAT_ENABLED !== "true") throw new AppError("AGENT_DISABLED",503);
    const config = getAppConfig();
    requireSameOrigin(request,config);
    auth = createRequestAuth(request,config);
    const actor = await auth.verified();
    await createAppRepository(config).ensureAccount(actor);
    const body = inputOf(await readBody(request,12000));
    await consumeRate(config,{op:"holistic-agent-turn",actorId:actor.id},10,60);
    await consumeRate(config,{op:"holistic-agent-daily",actorId:actor.id},100,86400);
    const safety = preflight(body.message,body.locale);
    const goal=goalFromRequest(body.message,body.locale,body.selectedGoal);
    // No private test scores, practitioner notes or saved memories are read
    // by this first vertical slice. Catalog is the existing published service list.
    const decision = buildHolisticGuidedTurn({
      locale:body.locale, intent:{goal,rawUtterance:body.message,
        enabledFormats:["service"],paymentPreference:"free"},
      access:{authenticated:true,ownerScoped:true},
      consent:{paidSuggestions:false,measuredPersonalization:false,profilePersonalization:false},
      safety, catalogs:{services:coreServiceOffers(body.locale)},
    });
    const enabled=process.env.HH_AGENT_OWNED_ENABLED==="true";
    const configured=enabled && validatedOllamaConfig({
      endpoint:process.env.HH_AGENT_OLLAMA_ENDPOINT,
      model:process.env.HH_AGENT_OLLAMA_MODEL,
      production:process.env.NODE_ENV==="production",
    }) !== null && (process.env.HH_AGENT_OLLAMA_TOKEN||"").length >= 20;
    const allowOwned=body.mode==="owned"&&body.ownedInferenceConsent===true&&configured;
    const envelope=prepareNaturalDialogue({
      locale:body.locale,message:body.message,history:body.history,decision,
      access:{authenticated:true,ownerScoped:true},
      consent:{ownedInference:allowOwned,browserInference:false,agentMemory:false},
      channel:allowOwned?"owned":"none",
    });
    const generated=await finishNaturalDialogue(envelope,allowOwned?prompt=>
      generateOwnedOllama(prompt,{
        endpoint:process.env.HH_AGENT_OLLAMA_ENDPOINT,
        model:process.env.HH_AGENT_OLLAMA_MODEL,
        bearerToken:process.env.HH_AGENT_OLLAMA_TOKEN,
        production:process.env.NODE_ENV==="production",
        signal:AbortSignal.timeout(16000),
      }):undefined);
    const suggestions=(Array.isArray(decision.suggestions)?decision.suggestions:[])
      .slice(0,3).map(({id,kind,href,title})=>({id,kind,href,title}));
    return auth.apply(NextResponse.json({
      status:decision.status, reply:generated.text, modelUsed:generated.modelUsed,
      source:generated.provider, decision:{status:decision.status,message:decision.message,
        suggestions,question:decision.question||null},
      suggestions, memorySaved:false, userAuthorized:true,
      // Browser presentation may use a local model AFTER separate on-device opt-in.
      browserModelAllowed:body.mode==="device" && safety.status==="clear",
    },{headers:PRIVATE_HEADERS}));
  } catch (error) {
    const e=safeError(error);
    const response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
