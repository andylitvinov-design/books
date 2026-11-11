import { NextResponse } from "next/server";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { createRequestAuth } from "@/lib/app/session";
import { createAppRepository } from "@/lib/app/repository";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS, readBody, safeError } from "@/lib/app/http";
import { coreServiceOffers } from "@/data/core-service-offers";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import reviewedMeditationCandidates from "@/data/academy/meditation-catalog-candidates-20261028.json";
import { publicReikiIntroAudio } from "@/lib/academy/reiki-intro-audio-store";
import { listVideoProgress } from "@/lib/app/video-progress";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { buildPortraitRecommendations } from "@/lib/profile/portrait-recommendations";
import { AXIS_REFS, publishedAxisOffers } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { interpretSupportUtterance, explainUserQuestion } from "@/lib/holistic-support/guide-dialogue.mjs";
import { ruleConversationReply } from "@/lib/holistic-support/rule-conversation.mjs";
import { resolveConversationFocus } from "@/lib/holistic-support/conversation-context.mjs";
import { detectConversationLocale } from "@/lib/holistic-support/conversation-locale.mjs";
import { planJudgmentTurn } from "@/lib/holistic-support/judgment-mind.mjs";
import { signJudgmentChoice, verifyJudgmentChoice } from "@/lib/holistic-support/judgment-token.mjs";
import { buildHolisticGuidedTurn } from "@/lib/holistic-support/holistic-guide-adapter.mjs";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import { generateOwnedOllama, validatedOllamaConfig } from "@/lib/holistic-support/owned-ollama.mjs";
import { readMyAgentMemory } from "@/lib/holistic-support/agent-memory-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 25;
const GOALS = new Set(["energy","relationships","money","goals","meaning"]);
const LOCALES = new Set(["ru","en","es"]);
const MODES = new Set(["rules","device","owned"]);
const GUIDE_FORMATS = new Set(["video","audio","test","course","service"]);
const SAFE_CONTENT_ID = /^[a-z][a-z0-9_-]*:[A-Za-z0-9_:-]{1,85}$/;
// These factual, side-effect-free intents can answer promptly without running
// the media catalogue; all origin, auth, rate and safety checks still apply.
const FAST_RULE_IDS = new Set([
  "hello","thanks","bye","restart","identity","capabilities","language",
  "price","privacy","login","technical","orders","video_status",
  "video_delivery","video_download","video_definition","human_help",
  // Reviewed factual FAQ: no orders, results, uploads, payments or network sends.
  "chat_guest","chat_modes","chat_bug","chat_keyboard","chat_history",
  "chat_delete","chat_telegram","chat_whatsapp","video_render_queue",
  "video_export","video_license","video_orientation",
]);
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
    "chosenAxes","usePrivateProfile","usePrivateHistory","preferredFormat","feedback","useAgentMemory",
    "judgmentContext","judgmentChoice"]);
  if (!LOCALES.has(body.locale) || typeof body.message !== "string" ||
    !body.message.trim() || body.message.length > 3000 ||
    !MODES.has(body.mode) || typeof body.ownedInferenceConsent !== "boolean" ||
    (body.selectedGoal !== null && body.selectedGoal !== undefined &&
      !GOALS.has(body.selectedGoal)) ||
    (body.useAgentMemory !== undefined && typeof body.useAgentMemory !== "boolean") ||
    (body.usePrivateProfile !== undefined && typeof body.usePrivateProfile !== "boolean") ||
    (body.usePrivateHistory !== undefined && typeof body.usePrivateHistory !== "boolean") ||
    (body.chosenAxes !== undefined && !validatedAxes(body.chosenAxes)) ||
    (body.preferredFormat !== undefined && body.preferredFormat !== null &&
      !GUIDE_FORMATS.has(body.preferredFormat)) ||
    (body.feedback !== undefined && !validFeedback(body.feedback)) ||
    (body.judgmentContext !== undefined && body.judgmentContext !== null &&
      (typeof body.judgmentContext !== "string" || body.judgmentContext.length > 1600 ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body.judgmentContext))) ||
    (body.judgmentChoice !== undefined && body.judgmentChoice !== null &&
      (!["a","b","helpful","not_helpful"].includes(body.judgmentChoice) ||
        !body.judgmentContext)))
    throw new AppError("INVALID_AGENT_INPUT",400);
  if (!Array.isArray(body.history) || body.history.length > 6 ||
    body.history.some(row => !row || !["user","assistant"].includes(row.role) ||
      typeof row.text !== "string" || row.text.length > 4000 ||
      Object.keys(row).some(key => !["role","text"].includes(key))))
    throw new AppError("INVALID_AGENT_HISTORY",400);
  return body;
}
function preflight(text,locale) {
  // Preliminary conservative lexical gate only, NOT a clinical risk diagnosis.
  // Acute medical/violence cues strengthen escalation; absence is not clearance.
  if(/(?:боль в груди|не могу дышать|трудно дышать|меня бьют|физическое насилие|chest pain|can(?:not|t) breathe|trouble breathing|domestic violence|dolor en el pecho|no puedo respirar|violencia domestica)/iu.test(text))
    return {status:"human_review"};
  // This pilot is non-clinical and remains feature-flagged until evaluated.
  if (/(?:не хочу (?:больше )?жить(?:[.!?]|$)|i do not want to live(?:[.!?]|$)|i dont want to live(?:[.!?]|$)|ya no quiero vivir(?:[.!?]|$))/iu.test(text))
    return {status:"urgent"};
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
    // The verified, non-clinical rules guide has no model, billing or external sends.
    // Experimental browser/owned inference still needs the explicit production gate.
    const config = getAppConfig();
    requireSameOrigin(request,config);
    auth = createRequestAuth(request,config);
    const actor = await auth.verified();
    const repository = createAppRepository(config);
    await repository.ensureAccount(actor);
    const body = inputOf(await readBody(request,32000));
    if(body.judgmentChoice==null)body.locale=detectConversationLocale(body.message,body.locale);
    const experimentalEnabled=process.env.HH_AGENT_CHAT_ENABLED==="true" &&
      (process.env.VERCEL_ENV!=="production" ||
        process.env.HH_AGENT_PRODUCTION_APPROVED==="true");
    if(body.mode!=="rules"&&!experimentalEnabled)
      throw new AppError("AGENT_DISABLED",503);
    await consumeRate(config,{op:"holistic-agent-turn",actorId:actor.id},10,60);
    await consumeRate(config,{op:"holistic-agent-daily",actorId:actor.id},100,86400);
    const safety = preflight(body.message,body.locale);
    // Earlier unsafe user turns in the supplied working window may only
    // strengthen the safety gate, never override one. Durable safety state
    // must be server-bound before a clinical/public rollout.
    const recentUnsafe = body.history.some(turn => turn.role==="user" &&
      preflight(turn.text,body.locale).status!=="clear");
    if (recentUnsafe && safety.status==="clear") safety.status="human_review";
    // A short reviewed FAQ should not depend on media scans or paid inference.
    // Safety and authorization have already been verified for this exact turn.
    const fastRule=body.mode==="rules"&&safety.status==="clear"&&!recentUnsafe
      ? ruleConversationReply({message:body.message,locale:body.locale,history:body.history})
      : null;
    if(fastRule&&FAST_RULE_IDS.has(fastRule.id)){
      return auth.apply(NextResponse.json({
        status:"clarify",reply:fastRule.reply,modelUsed:false,
        source:"rules",memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,
        browserModelAllowed:false,
        decision:{status:"clarify",message:fastRule.reply,question:null,suggestions:[]},
      },{headers:PRIVATE_HEADERS}));
    }
    // Tentative, nonclinical decision assistance only after owner, rate
    // and safety preflight. No profile read, storage, booking or inferred diagnosis.
    if (body.mode==="rules" && safety.status==="clear" && !recentUnsafe) {
      const context=body.judgmentContext
        ? verifyJudgmentChoice({config,actor,token:body.judgmentContext,history:body.history})
        : null;
      if(body.judgmentContext && !context)throw new AppError("INVALID_JUDGMENT_CONTEXT",400);
      const judgment=planJudgmentTurn({
        message:body.message,locale:body.locale,safety,history:body.history,
        pending:context?.pending||null,choiceId:body.judgmentChoice||null,
      });
      if(judgment.status!=="abstain") {
        const signed=judgment.pending ? signJudgmentChoice({
          config,actor,pending:judgment.pending,reply:judgment.reply,
          revision:(context?.conversationRevision||0)+1,
        }) : null;
        const publicJudgment={...judgment,pending:null,
          token:signed?.token||null,
          turnId:signed?.turnId||null,
          conversationRevision:signed?.conversationRevision||null};
        return auth.apply(NextResponse.json({
          status:judgment.status==="handoff"?"safety_handoff":"clarify",
          reply:judgment.reply,modelUsed:false,source:"judgment-rules",
          memorySaved:false,userAuthorized:true,suggestions:[],
          usedSavedTestEvidence:false,usedSavedVideoHistory:false,
          browserModelAllowed:false,judgment:publicJudgment,
          decision:{status:"clarify",message:judgment.reply,question:null,suggestions:[]},
        },{headers:PRIVATE_HEADERS}));
      }
    }
    // A client's boolean request is not consent or account proof. The server
    // checks the signed-in account, durable consent and memory-use flag afresh.
    // Unsafe turns must not read this optional personal context.
    let approvedMemory=null;
    if(body.useAgentMemory===true && safety.status==="clear" && !recentUnsafe &&
       process.env.HH_AGENT_MEMORY_ENABLED==="true"){
      try{
        const saved=await readMyAgentMemory(config,actor);
        if(saved.consent===true && saved.useInDialogue===true && Array.isArray(saved.items)){
          const allowed=new Set(["preferred_name","response_length","avoid_format"]);
          approvedMemory=Object.fromEntries(saved.items
            .filter(row=>allowed.has(row.kind)&&typeof row.value==="string")
            .map(row=>[row.kind,row.value]));
        }
      }catch{
        // A memory outage must not stop the nonclinical chat or expose notes.
        approvedMemory=null;
      }
    }
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
    const verifiedPublished=publishedVideos(body.locale);
    const axisOffers=publishedAxisOffers({
      locale:body.locale, services, videos:verifiedPublished,
    });
    // Only original records already present in the published site/Academy
    // manifest may be suggested without a profile axis. Candidate-only and
    // external YouTube recommendations remain excluded.
    const publishedSourceIds=[...new Set(verifiedPublished
      .map(item=>item.id||item.youtubeId)
      .filter(id=>typeof id==="string"&&/^[A-Za-z0-9_-]{11}$/.test(id)))];
    const trustedIds=new Set(publishedSourceIds);
    const meditationVideos=reviewedMeditationCandidates.videos.filter(item=>
      item.source_kind==="original"&&item.metadata_confidence==="owner_source"&&
      trustedIds.has(item.youtube_id));
    // A chosen format is a hard user constraint, not a licence to fill empty
    // results with another medium. Public course introductions remain distinct
    // from nonplayable editor soundtracks and private practitioner recordings.
    const enabledFormats=body.preferredFormat ? [body.preferredFormat] :
      ["video","test","course","service"].filter(kind=>
        kind!==approvedMemory?.avoid_format);
    // Reuse only client-affirmed watched/mastered videos from the EXISTING
    // My Progress read model. This separate consent is opt-in per request and
    // the private database read never occurs on unsafe turns.
    const useHistory=body.usePrivateHistory===true && safety.status==="clear" && !recentUnsafe;
    const completedIds=useHistory
      ? (await listVideoProgress(config,actor)).records.filter(row=>
          ["watched","mastered"].includes(row.status) &&
          /^[A-Za-z0-9_-]{11}$/.test(row.videoId))
        .slice(0,80).map(row=>"youtube:"+row.videoId)
      : [];
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
        profilePersonalization:useMeasurements,practiceHistory:useHistory},
      profile:{measurements},
      history:{completedIds},
      feedback:body.feedback||{},
      safety, catalogs:{services,axisOffers,publishedReikiAudio:publicAudio,
        meditationVideos,publishedSourceIds},
    });
    const enabled=process.env.HH_AGENT_OWNED_ENABLED==="true";
    const configured=enabled && validatedOllamaConfig({
      endpoint:process.env.HH_AGENT_OLLAMA_ENDPOINT,
      model:process.env.HH_AGENT_OLLAMA_MODEL,
      production:process.env.NODE_ENV==="production",
    }) !== null && (process.env.HH_AGENT_OLLAMA_TOKEN||"").length >= 20;
    const allowOwned=body.mode==="owned"&&body.ownedInferenceConsent===true&&configured;
    const explanation=explainUserQuestion(body.message,body.locale,decision,body.history);
    const spokenDecision=explanation?{...decision,message:explanation}:decision;
    const envelope=prepareNaturalDialogue({
      locale:body.locale,message:body.message,history:body.history,decision:spokenDecision,
      access:{authenticated:true,ownerScoped:true},
      consent:{ownedInference:allowOwned,browserInference:false,
        agentMemory:Boolean(approvedMemory)},
      memory:approvedMemory?{
        preferredName:approvedMemory.preferred_name||undefined,
        preferredStyle:approvedMemory.response_length==="short"?"concise":
          approvedMemory.response_length==="detailed"?"structured":"warm",
      }:{},
      channel:allowOwned?"owned":"none",
    });
    const generated=await finishNaturalDialogue(envelope,allowOwned?async prompt=>{
      // A revocation or preference edit during catalogue work MUST invalidate
      // the already prepared model prompt before any owned-model network call.
      if(approvedMemory!==null){
        const latest=await readMyAgentMemory(config,actor);
        const current=new Map(Array.isArray(latest?.items)?
          latest.items.map(row=>[row.kind,row.value]):[]);
        const same=["preferred_name","response_length","avoid_format"]
          .every(kind=>(current.get(kind)||null)===(approvedMemory[kind]||null));
        if(latest?.consent!==true||latest?.useInDialogue!==true||!same)
          throw Error("MEMORY_CONSENT_CHANGED");
      }
      return generateOwnedOllama(prompt,{
        endpoint:process.env.HH_AGENT_OLLAMA_ENDPOINT,
        model:process.env.HH_AGENT_OLLAMA_MODEL,
        bearerToken:process.env.HH_AGENT_OLLAMA_TOKEN,
        production:process.env.NODE_ENV==="production",
        signal:AbortSignal.timeout(16000),
      });
    }:undefined);
    const suggestions=(Array.isArray(decision.suggestions)?decision.suggestions:[])
      .slice(0,3).map(({id,kind,href,title})=>({id,kind,href,title}));
    return auth.apply(NextResponse.json({
      status:decision.status, reply:generated.text, modelUsed:generated.modelUsed,
      source:generated.provider, decision:{status:decision.status,message:decision.message,
        suggestions,question:decision.question||null},
      suggestions, memorySaved:false, userAuthorized:true,
      usedSavedTestEvidence:useMeasurements && measurements.length>0,
      usedSavedVideoHistory:useHistory && completedIds.length>0,
      // Browser presentation may use a local model AFTER separate on-device opt-in.
      browserModelAllowed:experimentalEnabled && body.mode!=="owned" && safety.status==="clear" && !recentUnsafe,
    },{headers:PRIVATE_HEADERS}));
  } catch (error) {
    const e=safeError(error);
    const response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
