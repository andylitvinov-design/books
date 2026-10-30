import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { createAppRepository } from "@/lib/app/repository";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { coreServiceOffers } from "@/data/core-service-offers";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { publicReikiIntroAudio } from "@/lib/academy/reiki-intro-audio-store";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { buildPortraitRecommendations } from "@/lib/profile/portrait-recommendations";
import { AXIS_REFS, publishedAxisOffers } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { interpretSupportUtterance } from "@/lib/holistic-support/guide-dialogue.mjs";
import { resolveConversationFocus } from "@/lib/holistic-support/conversation-context.mjs";
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
const GUIDE_FORMATS = new Set(["video","audio","test","course","service"]);
const SAFE_CONTENT_ID = /^[a-z][a-z0-9_-]*:[A-Za-z0-9_:-]{1,85}$/;
function validFeedback(value) {
  return value && typeof value==="object" && !Array.isArray(value) &&
    Object.keys(value).every(k=>["dismissedIds","completedIds"].includes(k)) &&
    ["dismissedIds","completedIds"].every(k=>value[k]===undefined ||
      Array.isArray(value[k]) && value[k].length<=20 &&
      value[k].every(id=>typeof id==="string" && SAFE_CONTENT_ID.test(id)));
}
function publishedVideos(locale) {
  return locale === "ru"
    ? freeMeditationVideos("ru").map(item => ({...item,sourceLanguage:"ru"}))
    : englishGuidedMeditations.filter(item=>item.youtubeId)
      .map(item=>({...item,sourceLanguage:"en"}));
}
function validatedAxes(value) {
  return Array.isArray(value) && value.length<=3 &&
    value.every(ref=>typeof ref==="string" && Object.hasOwn(AXIS_REFS,ref)) &&
    new Set(value).size===value.length;
}

function inputOf(body) {
  onlyKeys(body,["locale","message","history","mode","ownedInferenceConsent","selectedGoal",
    "chosenAxes","usePrivateProfile","preferredFormat","feedback"]);
  if (!LOCALES.has(body.locale) || typeof body.message !== "string" ||
    !body.message.trim() || body.message.length > 3000 ||
    !MODES.has(body.mode) || typeof body.ownedInferenceConsent !== "boolean" ||
    (body.selectedGoal !== null && body.selectedGoal !== undefined &&
      !GOALS.has(body.selectedGoal)) ||
    (body.usePrivateProfile !== undefined && typeof body.usePrivateProfile !== "boolean") ||
    (body.chosenAxes !== undefined && !validatedAxes(body.chosenAxes)) ||
    (body.preferredFormat !== undefined && body.preferredFormat !== null &&
      !GUIDE_FORMATS.has(body.preferredFormat)) ||
    (body.feedback !== undefined && !validFeedback(body.feedback)))
    throw new AppError("INVALID_AGENT_INPUT",400);
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
export async function POST(request) {
  let auth;
  try {
    // Off by default: installing source code does not publish a clinical agent.
    if (process.env.HH_AGENT_CHAT_ENABLED !== "true" ||
      (process.env.VERCEL_ENV === "production" &&
        process.env.HH_AGENT_PRODUCTION_APPROVED !== "true"))
      throw new AppError("AGENT_DISABLED",503);
    const config = getAppConfig();
    requireSameOrigin(request,config);
    auth = createRequestAuth(request,config);
    const actor = await auth.verified();
    const repository = createAppRepository(config);
    await repository.ensureAccount(actor);
    const body = inputOf(await readBody(request,12000));
    await consumeRate(config,{op:"holistic-agent-turn",actorId:actor.id},10,60);
    await consumeRate(config,{op:"holistic-agent-daily",actorId:actor.id},100,86400);
    const safety = preflight(body.message,body.locale);
    // Earlier unsafe user turns in the supplied working window may only
    // strengthen the safety gate, never override one. Durable safety state
    // must be server-bound before a clinical/public rollout.
    const recentUnsafe = body.history.some(turn => turn.role==="user" &&
      preflight(turn.text,body.locale).status!=="clear");
    if (recentUnsafe && safety.status==="clear") safety.status="human_review";
    const focus=resolveConversationFocus({message:body.message,locale:body.locale,
      history:body.history,selectedGoal:body.selectedGoal});
    const goal=focus.goal;
    // Read the owner's existing verified portrait ONLY for a clear, non-urgent
    // turn when the signed-in client explicitly opts in AND selects exact axes.
    // No score, result ID, note or source is sent to the language model.
    const chosenAxes=Array.isArray(body.chosenAxes)?body.chosenAxes:[];
    const useMeasurements=body.usePrivateProfile===true &&
      chosenAxes.length>0 && safety.status==="clear" && !recentUnsafe;
    const measurements=useMeasurements
      ? buildPortraitRecommendations(
          (await repository.bootstrap(actor,{view:"portrait"})).results,body.locale,
        ).measurements
      : [];
    // Existing published source manifests and core offers only. No speculative
    // provider/video IDs, invented prices, bookings or private client media.
    const services=coreServiceOffers(body.locale);
    const axisOffers=publishedAxisOffers({
      locale:body.locale, services, videos:publishedVideos(body.locale),
    });
    // A chosen format is a hard user constraint, not a licence to fill empty
    // results with another medium. Public course introductions remain distinct
    // from nonplayable editor soundtracks and private practitioner recordings.
    const enabledFormats=body.preferredFormat ? [body.preferredFormat] :
      ["video","test","course","service"];
    const publicAudio=body.preferredFormat==="audio" && body.locale!=="es" &&
      safety.status==="clear" && !recentUnsafe
      ? (await Promise.all(["flight","tantra","kundalini","yggdrasil","initiation"]
        .map(async lesson=>{
          const published=await publicReikiIntroAudio(lesson,body.locale);
          return published ? {...published,locale:body.locale,lesson,
            verifiedPublicManifest:true} : null;
        }))).filter(Boolean)
      : [];
    const decision=buildHolisticGuidedTurn({
      locale:body.locale,
      intent:{goal,rawUtterance:body.message,chosenAxes,
        enabledFormats,preferredFormat:body.preferredFormat||undefined,
        paymentPreference:"free"},
      access:{authenticated:true,ownerScoped:true},
      consent:{paidSuggestions:false,measuredPersonalization:useMeasurements,
        profilePersonalization:useMeasurements},
      profile:{measurements},
      feedback:body.feedback||{},
      safety, catalogs:{services,axisOffers,publishedReikiAudio:publicAudio},
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
      usedSavedTestEvidence:useMeasurements && measurements.length>0,
      // Browser presentation may use a local model AFTER separate on-device opt-in.
      browserModelAllowed:body.mode==="device" && safety.status==="clear",
    },{headers:PRIVATE_HEADERS}));
  } catch (error) {
    const e=safeError(error);
    const response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
