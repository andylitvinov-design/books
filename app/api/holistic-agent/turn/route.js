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
import { progressConversationTurn,progressDialogueReply } from "@/lib/holistic-support/dialogue-progression.mjs";
import { nativeSecretaryTurn } from "@/lib/holistic-support/native-secretary.mjs";
import { resolveComplaintTurn } from "@/lib/holistic-support/complaint-mind.mjs";
import { consultServiceQuestion, resolveConsultantSuggestion } from "@/lib/assist/consultant-mind.mjs";
import { resolveWisdomRequest } from "@/lib/app/coaching-wisdom.js";
import { resolveConversationFocus } from "@/lib/holistic-support/conversation-context.mjs";
import { detectConversationLocale } from "@/lib/holistic-support/conversation-locale.mjs";
import { planJudgmentTurn } from "@/lib/holistic-support/judgment-mind.mjs";
import { signJudgmentChoice, verifyJudgmentChoice } from "@/lib/holistic-support/judgment-token.mjs";
import { buildHolisticGuidedTurn } from "@/lib/holistic-support/holistic-guide-adapter.mjs";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import { generateOwnedOllama, validatedOllamaConfig } from "@/lib/holistic-support/owned-ollama.mjs";
import { readMyAgentMemory } from "@/lib/holistic-support/agent-memory-store";
import { createNativeDialogueSession, readNativeDialogueSession, advanceNativeDialogueMessage } from "@/lib/holistic-support/native-dialogue-session-store";
import { nativeDialogueEventFromUtterance, understandConversationTurn } from "@/lib/holistic-support/conversation-intelligence.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 25;
const GOALS = new Set(["energy","relationships","money","goals","meaning"]);
const LOCALES = new Set(["ru","en","es"]);
const MODES = new Set(["rules","device","owned"]);
const GUIDE_FORMATS = new Set(["video","audio","test","course","service"]);
const SAFE_CONTENT_ID = /^[a-z][a-z0-9_-]*:[A-Za-z0-9_:-]{1,85}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// These factual, side-effect-free intents can answer promptly without running
// the media catalogue; all origin, auth, rate and safety checks still apply.
// Native first-party secretary is only an informational/social subset of the same chat.
const NATIVE_FAST_IDS = new Set(["hello","thanks","bye","identity","capabilities","price","human_help","technical","privacy"]);
const NATIVE_INTENTS = new Set(["hello","thanks","bye","identity","capabilities","courses","services","pricing","human","booking","technical","privacy","status","smalltalk"]);
const FAST_RULE_IDS = new Set([
  "hello","thanks","bye","restart","identity","capabilities","language",
  "price","privacy","login","technical","orders","video_status","business_hours_unknown",
  "video_delivery","video_download","video_definition","human_help",
  // Reviewed factual FAQ: no orders, results, uploads, payments or network sends.
  "conversation_greeting","conversation_small_talk","conversation_chat_invitation","conversation_rejection",
  "conversation_goodbye","conversation_no_advice","conversation_concise_explanation",
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
function confirmedNativeChoice(id,locale) {
  if(typeof id!=="string" || !SAFE_CONTENT_ID.test(id))return null;
  let title=null,kind=null;
  if(id.startsWith("service:")) {
    const core=coreServiceOffers(locale).find(item=>"service:"+item.id===id)?.title||null;
    const consultant=resolveConsultantSuggestion(id,locale)?.title||null;
    // Different catalogues can share an ID but show different titles.
    if(core&&consultant&&core!==consultant)return {title:null};
    title=core||consultant;
  } else if(id.startsWith("youtube:")) {
    const youtubeId=id.slice("youtube:".length);
    const published=publishedVideos(locale).some(item=>(item.id||item.youtubeId)===youtubeId);
    const reviewed=reviewedMeditationCandidates.videos.find(item=>item.youtube_id===youtubeId &&
      item.source_kind==="original" && item.metadata_confidence==="owner_source");
    if(published && reviewed)title=reviewed.title;
  } else if(id.startsWith("test:") || id.startsWith("course:")) {
    // Rebuild the public, locale-scoped catalogue; the session separately
    // proves this exact ID was actually offered to this client.
    const matches=publishedAxisOffers({locale,services:coreServiceOffers(locale),videos:publishedVideos(locale)})
      .filter(item=>item.id===id && item.status==="published");
    if(matches.length===1){
      const item=matches[0],expectedKind=id.startsWith("test:")?"test":"course";
      if(item.kind===expectedKind && (expectedKind!=="test" || item.href===`/${locale}/client/tests`)){
        title=item.title;kind=expectedKind;
      }
    }
  }
  return typeof title==="string" && title.trim().length>0 && title.length<=180?{title:title.trim(),kind}:null;
}
function validatedAxes(value) {
  return Array.isArray(value) && value.length<=3 &&
    value.every(ref=>typeof ref==="string" && Object.hasOwn(AXIS_REFS,ref)) &&
    new Set(value).size===value.length;
}
function validNativeSession(value) {
  return value && typeof value==="object" && !Array.isArray(value) &&
    Object.keys(value).every(key=>["id","revision","turnId"].includes(key)) &&
    (value.id===null || typeof value.id==="string" && UUID.test(value.id)) &&
    Number.isSafeInteger(value.revision) && value.revision>=0 && value.revision<=256 &&
    (value.id!==null || value.revision===0) &&
    typeof value.turnId==="string" && UUID.test(value.turnId);
}

function inputOf(body) {
  onlyKeys(body,["locale","message","history","mode","ownedInferenceConsent","selectedGoal",
    "chosenAxes","usePrivateProfile","usePrivateHistory","preferredFormat","feedback","useAgentMemory",
    "judgmentContext","judgmentChoice","nativeSession"]);
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
    (body.nativeSession !== undefined && body.nativeSession !== null && !validNativeSession(body.nativeSession)) ||
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
    // Verify signed continuations before reading optional state or producing an
    // early answer. Judgment is evaluated once for this exact safe turn.
    const judgmentEligible=body.mode==="rules"&&safety.status==="clear"&&!recentUnsafe;
    const judgmentContext=judgmentEligible&&body.judgmentContext
      ?verifyJudgmentChoice({config,actor,token:body.judgmentContext,history:body.history}):null;
    if(judgmentEligible&&body.judgmentContext&&!judgmentContext)throw new AppError("INVALID_JUDGMENT_CONTEXT",400);
    const inspectedJudgment=judgmentEligible?planJudgmentTurn({message:body.message,locale:body.locale,safety,history:body.history,
      pending:judgmentContext?.pending||null,choiceId:body.judgmentChoice||null}):null;
    const judgmentPriority=inspectedJudgment!=null&&inspectedJudgment.status!=="abstain";
    // This optional state is created only for verified, safe RU/EN turns with
    // no safety handoff. The browser supplies IDs, never state.
    let nativeFrame=null;
    if(process.env.HH_NATIVE_DIALOGUE_STATE_ENABLED==="true" && body.nativeSession &&
       ["ru","en"].includes(body.locale) &&
       ["abstain","handled","clarify"].includes(inspectedJudgment?.status) &&
       inspectedJudgment?.state!=="safety_handoff") {
      const requested=body.nativeSession;
      const created=requested.id===null?await createNativeDialogueSession(config,actor):null;
      const id=created?.sessionId||requested.id;
      const state=created?.state||await readNativeDialogueSession(config,actor,id,requested.revision);
      nativeFrame={id,state,revision:requested.revision,turnId:requested.turnId};
    }
    // A valid old token cannot revive a choice superseded in this server-owned session.
    if(nativeFrame&&judgmentContext&&nativeFrame.state.pendingJudgmentTurnId!==judgmentContext.turnId)
      throw new AppError('INVALID_JUDGMENT_CONTEXT',400);
    const stateEvent=nativeFrame?nativeDialogueEventFromUtterance({message:body.message,locale:body.locale,state:nativeFrame.state}):null;
    const meditationDeclined=stateEvent?.type==='refuse_meditation' ||
      (nativeFrame?.state.declinedMeditation?.value==='meditation' && stateEvent?.type!=='allow_meditation');
    const finish=async (data,{pendingAdviceConfirmation=false}={})=>{
      if(nativeFrame){
        const clearChoices=['stop','new_question','cancel_to_talk','decline_booking','clear_topic','clear_goal_statement','refuse_advice','pause_topic','choose'].includes(stateEvent.type) ||
          (stateEvent.type==='refuse_meditation'&&!stateEvent.mixed);
        const hidden=new Set([...(body.feedback?.dismissedIds||[]),...(body.feedback?.completedIds||[])]);
        const suggestions=(clearChoices?[]:(Array.isArray(data.suggestions)?data.suggestions:[]))
          .filter(item=>typeof item?.id==='string'&&SAFE_CONTENT_ID.test(item.id)&&!hidden.has(item.id)&&
            !(meditationDeclined&&item.id.startsWith('youtube:'))).slice(0,3);
        const ids=suggestions.map(item=>item.id);
        if(new Set(ids).size!==ids.length)throw new AppError('INVALID_AGENT_SUGGESTIONS',503);
        data={...data,suggestions,...(data.decision?{decision:{...data.decision,suggestions}}:{})};
        const requestedChoice=stateEvent.type==='choose'&&!judgmentPriority&&body.judgmentContext==null&&body.judgmentChoice==null
          ?nativeFrame.state.lastOfferedChoices.filter(id=>!hidden.has(id))[stateEvent.ordinal-1]||null:null;
        const verifiedChoice=requestedChoice?confirmedNativeChoice(requestedChoice,body.locale):null;
        const outcome=await advanceNativeDialogueMessage(config,actor,nativeFrame.id,
          {message:body.message,locale:body.locale,turnId:nativeFrame.turnId,expectedRevision:nativeFrame.revision},
          {offeredChoiceIds:clearChoices||ids.length>0||data.decision?.status==='recommend'?ids:undefined,
            excludedChoiceIds:[...hidden],...(stateEvent.type==='choose'?{verifiedChoiceIds:verifiedChoice?[requestedChoice]:[]}:{}),
            pendingAdviceConfirmation,
            pendingJudgmentTurnId:data.judgment?.token?data.judgment.turnId:null});
        if(stateEvent.type==='choose' && !judgmentPriority && body.judgmentContext==null) {
          const selected=outcome.choiceId===requestedChoice?verifiedChoice:null;
          const reply=selected?(body.locale==='ru'?(selected.title?`Вы выбрали «${selected.title}».`:'Вы выбрали этот вариант.'):
            (selected.title?`You chose “${selected.title}”.`:'You chose that option.')):
            (body.locale==='ru'?"Не могу подтвердить этот вариант среди последних показанных. Уточните, пожалуйста, какой вы имеете в виду.":
              "I cannot verify that option among the last shown choices. Which one do you mean?");
          data={...data,reply,selectedChoiceId:selected?outcome.choiceId:null,
            decision:{status:'clarify',message:reply,question:null,suggestions:[]}};
        }
        data={...data,nativeSession:{id:nativeFrame.id,revision:outcome.state.revision}};
      }
      return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}));
    };
    // A verified current-session refusal applies to later emotional statements.
    // Safety handoffs and signed continuations retain priority; factual and
    // explicitly requested workflows continue through their normal owners.
    if(nativeFrame&&nativeFrame.state.declinedAdvice?.value==='advice'&&
       body.judgmentContext==null&&body.judgmentChoice==null&&stateEvent.type==='ordinary'){
      const reviewed=understandConversationTurn({message:body.message,locale:body.locale,history:body.history});
      if(['disclosure','ambivalence','uncertainty'].includes(reviewed?.act)){
        const reply=/[?？]/u.test(body.message)?(body.locale==='ru'?'Ранее вы просили без советов. Сейчас хотите обсудить возможные шаги?':
          'You asked for no advice earlier. Would you like to discuss possible steps now?'):
          body.locale==='ru'?(nativeFrame.revision%2?'Я рядом и слушаю.':'Понимаю. Я слушаю вас.'):
            (nativeFrame.revision%2?"I'm here and listening.":"I hear you. I'm listening.");
        return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
          suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
          decision:{status:'clarify',message:reply,question:null,suggestions:[]}},{pendingAdviceConfirmation:/[?？]/u.test(body.message)});
      }
    }
    if(nativeFrame&&body.judgmentContext==null&&body.judgmentChoice==null&&stateEvent.type==='retain_advice'){
      const reply=body.locale==='ru'?'Хорошо, продолжим без советов. Я слушаю.':"All right, no advice. I'm listening.";
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    if(nativeFrame&&!judgmentPriority&&body.judgmentContext==null&&body.judgmentChoice==null&&
       stateEvent.type==='allow_advice'&&nativeFrame.state.declinedAdvice?.value==='advice'){
      const reply=body.locale==='ru'?'Хорошо, учту, что вы допускаете совет. О чём хотели бы поговорить?':
        'Understood, advice is welcome now. What would you like to discuss?';
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    if(nativeFrame&&!judgmentPriority&&body.judgmentContext==null&&body.judgmentChoice==null&&
       (stateEvent.type==='set_goal_statement'||stateEvent.type==='clear_goal_statement'||stateEvent.type==='recall_goal'||stateEvent.type==='set_topic'&&stateEvent.newTopic)){
      const goal=stateEvent.type==='set_goal_statement'?stateEvent.value:nativeFrame.state.goalStatement?.value;
      const topicLabels={ru:{relationships:'отношения',work:'работу',energy:'энергию',meaning:'смысл',goals:'цели'},
        en:{relationships:'relationships',work:'work',energy:'energy',meaning:'meaning',goals:'goals'}};
      let reply;
      if(stateEvent.type==='clear_goal_statement')reply=body.locale==='ru'?'Хорошо, не буду удерживать эту цель в текущем разговоре.':
        "Understood, I won't retain that goal in this conversation.";
      else if(stateEvent.type==='set_topic')reply=body.locale==='ru'?`Хорошо, меняем тему на ${topicLabels.ru[stateEvent.value]}. Я слушаю.`:
        `All right, let's switch to ${topicLabels.en[stateEvent.value]}. I'm listening.`;
      else if(stateEvent.type==='set_goal_statement'){
        if(stateEvent.corrected)reply=body.locale==='ru'?`Понял уточнение: «${goal}» С чего вы хотите начать?`:
          `I understand the correction: “${goal}” Where would you like to start?`;
        else if(nativeFrame.revision%2)reply=body.locale==='ru'?`Учту вашу цель: «${goal}» Что сейчас важнее всего?`:
          `We can focus on “${goal}” What matters most right now?`;
        else reply=body.locale==='ru'?`Понял: «${goal}» С чего вы хотите начать?`:
          `I hear you: “${goal}” Where would you like to start?`;
      }
      else reply=goal?(body.locale==='ru'?`Вы назвали такую цель: «${goal}»`:`You described your goal as: “${goal}”`):
        (body.locale==='ru'?'Я не могу восстановить сформулированную цель. Напомните, пожалуйста, что для вас важно?':
          'I cannot recover a stated goal. Could you remind me what matters to you?');
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    if(stateEvent?.type==='choose' && !judgmentPriority && body.judgmentContext==null) {
      return await finish({status:'clarify',reply:'',modelUsed:false,source:'rules',memorySaved:false,
        userAuthorized:true,suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false});
    }
    if(nativeFrame&&!judgmentPriority&&body.judgmentContext==null&&body.judgmentChoice==null&&stateEvent.type==='explain_choice'){
      const excluded=new Set([...(body.feedback?.dismissedIds||[]),...(body.feedback?.completedIds||[])]);
      const selected=excluded.has(nativeFrame.state.selectedChoiceId)?null:confirmedNativeChoice(nativeFrame.state.selectedChoiceId,body.locale);
      const reply=selected?.title?(selected.kind==='test'?(body.locale==='ru'?`Это раздел «${selected.title}», где можно выбрать тесты.`:
        `This opens “${selected.title}”, where you can choose questionnaires.`):
        (body.locale==='ru'?`Это вариант «${selected.title}»; подробности можно посмотреть на его странице.`:
          `That is “${selected.title}”; you can see its details on its page.`)):
        (body.locale==='ru'?'Я не могу подтвердить этот вариант; уточните, пожалуйста, о чём рассказать.':
          'I cannot verify that option; please clarify what you would like to know.');
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    if(nativeFrame&&!judgmentPriority&&body.judgmentContext==null&&body.judgmentChoice==null&&
       stateEvent.type==='ask_time'&&(nativeFrame.state.goal||nativeFrame.state.goalStatement)){
      const reply=body.locale==='ru'?'Я не могу проверить свободное время. Какую встречу вы имеете в виду?':
        'I cannot check available times here. Which meeting do you mean?';
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    if(nativeFrame && !judgmentPriority && body.judgmentContext==null && (['set_time','clear_time','cancel_to_talk','decline_booking','clear_topic','new_question'].includes(stateEvent.type) ||
       stateEvent.type==='set_goal' && (stateEvent.topic||stateEvent.corrected))) {
      const time={ru:{morning:'утром',afternoon:'днём',evening:'вечером'},en:{morning:'morning',afternoon:'afternoon',evening:'evening'}};
      const replies={
        set_time:{ru:stateEvent.bookingDeferred?`Вам удобнее ${time.ru[stateEvent.value]}. Пока не записываю вас.`:
          `Вам удобнее ${time.ru[stateEvent.value]}. Я пока не могу проверить доступное время консультации.`,
          en:stateEvent.bookingDeferred?`You prefer the ${time.en[stateEvent.value]}. I will not book anything yet.`:
            `You prefer the ${time.en[stateEvent.value]}. I cannot check consultation availability here.`},
        clear_time:{ru:'Понял, это время вам не подходит. Какое время удобнее?',en:"Understood, that time doesn't work for you. What time works better?"},
        cancel_to_talk:{ru:'Хорошо, просто поговорим. Я слушаю.',en:"All right, let's just talk. I'm listening."},
        decline_booking:{ru:'Хорошо, не буду вас записывать.',en:"Understood, I won't book anything."},
        set_goal:{ru:stateEvent.corrected?'Понял, вы имели в виду консультацию, а не коучинг. Что вы хотели бы обсудить?':
          'Вы рассматриваете консультацию. Что вы хотели бы на ней прояснить?',
          en:stateEvent.corrected?'Understood, you mean a consultation rather than coaching. What would you like to discuss?':
          'You are considering a consultation. What would you like to clarify in it?'},
        clear_topic:{ru:'Понял, эту тему не продолжаем. Что вы хотели бы обсудить?',en:"Understood, we won't continue that topic. What would you like to discuss?"},
        new_question:{ru:'Конечно. Какой у вас другой вопрос?',en:'Of course. What is your other question?'},
      };
      const reply=replies[stateEvent.type][body.locale];
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    // Preserve the production complaint path after the same safety and consent
    // gates, while committing any verified state through the common finish path.
    const complaint=safety.status==="clear"&&!recentUnsafe &&
      body.judgmentContext==null && body.judgmentChoice==null &&
      body.usePrivateProfile!==true && body.usePrivateHistory!==true &&
      body.useAgentMemory!==true && body.preferredFormat==null &&
      (!body.chosenAxes || body.chosenAxes.length===0) &&
      ["rules","owned"].includes(body.mode)
      ? resolveComplaintTurn({message:body.message,locale:body.locale,history:body.history}) : null;
    if(complaint)return await finish({status:'clarify',reply:complaint.reply,source:complaint.source,
      mindRole:null,modelUsed:false,memorySaved:false,userAuthorized:true,suggestions:[],
      usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
      decision:{status:'clarify',message:complaint.reply,question:null,suggestions:[]}});
    // Explicit opt-in to one wisdom reflection. This is a server-only DB
    // lookup after origin, session, throttles and safety checks. It never
    // overrides signed judgment choices or sends client text to other APIs.
    if (body.mode==="rules" && safety.status==="clear" && !recentUnsafe && !judgmentPriority &&
        body.judgmentContext==null && body.judgmentChoice==null &&
        body.usePrivateProfile!==true && body.usePrivateHistory!==true &&
        body.useAgentMemory!==true && body.preferredFormat==null) {
      const wisdom=await resolveWisdomRequest(config,actor,{
        locale:body.locale,message:body.message,
        turns:body.history.map(row=>({role:row.role,content:row.text})),
      });
      if(wisdom){
        const reply=[wisdom.reflection,wisdom.question].filter(Boolean).join("\n\n");
        return await finish({
          status:"clarify",reply,modelUsed:false,source:"wisdom-library",
          memorySaved:false,userAuthorized:true,suggestions:[],
          usedSavedTestEvidence:false,usedSavedVideoHistory:false,
          browserModelAllowed:false,
          decision:{status:"clarify",message:reply,question:null,suggestions:[]},
        });
      }
    }
    // Preserve the production source-grounded consultant; Judgment and all
    // safety/consent gates remain authoritative before its factual reply.
    const consultation=safety.status==="clear"&&!recentUnsafe&&!judgmentPriority &&
      body.judgmentContext==null && body.judgmentChoice==null &&
      body.usePrivateProfile!==true && body.usePrivateHistory!==true &&
      body.useAgentMemory!==true && body.preferredFormat==null &&
      (!body.chosenAxes || body.chosenAxes.length===0) &&
      ["rules","owned"].includes(body.mode)
      ? consultServiceQuestion({message:body.message,locale:body.locale,history:body.history})
      : null;
    if(consultation)return await finish({
      status:consultation.status,reply:consultation.reply,
      mindRole:"consultant",modelUsed:false,source:"consultant-rules",
      memorySaved:false,userAuthorized:true,suggestions:consultation.suggestions,
      usedSavedTestEvidence:false,usedSavedVideoHistory:false,
      browserModelAllowed:false,
      decision:{status:consultation.status,message:consultation.reply,
        question:null,suggestions:consultation.suggestions},
    });
    if(nativeFrame&&!judgmentPriority&&body.judgmentContext==null&&body.judgmentChoice==null&&
       stateEvent.type==='ask_price'&&(nativeFrame.state.goal||nativeFrame.state.goalStatement)){
      const reply=body.locale==='ru'?'Я не могу подтвердить стоимость без выбранной услуги. Какую услугу вы имеете в виду?':
        'I cannot confirm the price without a specific service. Which service do you mean?';
      return await finish({status:'clarify',reply,modelUsed:false,source:'rules',memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,browserModelAllowed:false,
        decision:{status:'clarify',message:reply,question:null,suggestions:[]}});
    }
    // A short reviewed FAQ should not depend on media scans or paid inference.
    // Safety and authorization have already been verified for this exact turn.
    const fastRule=body.mode==="rules"&&safety.status==="clear"&&!recentUnsafe&&!judgmentPriority&&
      body.judgmentContext==null&&body.judgmentChoice==null
      ? ruleConversationReply({message:body.message,locale:body.locale,history:body.history})
      : null;

    // Keep brief emotional/relationship replies in the conversation instead of
    // resetting a selected theme or prematurely showing service cards. Runs only
    // after origin, verified actor, rate and safety checks; never reads private data.
    const progressive=body.mode==="rules" && safety.status==="clear" && !recentUnsafe && !judgmentPriority &&
      body.judgmentContext==null && body.judgmentChoice==null &&
      body.usePrivateProfile!==true && body.usePrivateHistory!==true &&
      body.useAgentMemory!==true && body.preferredFormat==null &&
      (!body.chosenAxes || body.chosenAxes.length===0)
      ? progressConversationTurn({message:body.message,locale:body.locale,history:body.history})
      : null;
    if(progressive){
      return await finish({
        status:"clarify",reply:progressive.reply,modelUsed:false,
        source:"rules",memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,
        browserModelAllowed:false,
        decision:{status:"clarify",message:progressive.reply,question:null,suggestions:[]},
      });
    }

    // A first-party trained statistical model for simple secretary conversations.
    // The existing signed judgment, safety, user-consented memory, checkout and
    // media workflows remain authoritative. Never treat this as generative LLM.
    const nativeReply=body.mode==="rules" && safety.status==="clear" && !recentUnsafe && !judgmentPriority &&
      body.judgmentContext==null && body.judgmentChoice==null &&
      body.usePrivateProfile!==true && body.usePrivateHistory!==true &&
      body.useAgentMemory!==true && body.preferredFormat==null &&
      (!body.chosenAxes || body.chosenAxes.length===0) &&
      process.env.HH_NATIVE_SECRETARY_ENABLED!=="false"
      ? nativeSecretaryTurn({message:body.message,locale:body.locale,history:body.history}) : null;
    if(nativeReply && NATIVE_INTENTS.has(nativeReply.intent) &&
       (!fastRule || NATIVE_FAST_IDS.has(fastRule.id))){
      return await finish({
        status:"clarify",reply:nativeReply.reply,modelUsed:false,
        source:nativeReply.source,nativeModelUsed:true,
        nativeModelKind:nativeReply.modelKind,nativeModelVersion:nativeReply.modelVersion,
        memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,
        browserModelAllowed:false,
        decision:{status:"clarify",message:nativeReply.reply,question:null,suggestions:[]},
      });
    }
    if(fastRule&&FAST_RULE_IDS.has(fastRule.id)){
      return await finish({
        status:"clarify",reply:fastRule.reply,modelUsed:false,
        source:"rules",memorySaved:false,userAuthorized:true,
        suggestions:[],usedSavedTestEvidence:false,usedSavedVideoHistory:false,
        browserModelAllowed:false,
        decision:{status:"clarify",message:fastRule.reply,question:null,suggestions:[]},
      });
    }
    // Tentative, nonclinical decision assistance only after owner, rate
    // and safety preflight. No profile read, storage, booking or inferred diagnosis.
    if (body.mode==="rules" && safety.status==="clear" && !recentUnsafe) {
      const context=judgmentContext;
      const judgment=inspectedJudgment;
      if(judgment.status!=="abstain") {
        const signed=judgment.pending ? signJudgmentChoice({
          config,actor,pending:judgment.pending,reply:judgment.reply,
          revision:(context?.conversationRevision||0)+1,
        }) : null;
        const publicJudgment={...judgment,pending:null,
          token:signed?.token||null,
          turnId:signed?.turnId||null,
          conversationRevision:signed?.conversationRevision||null};
        return await finish({
          status:judgment.status==="handoff"?"safety_handoff":"clarify",
          reply:judgment.reply,modelUsed:false,source:"judgment-rules",
          memorySaved:false,userAuthorized:true,suggestions:[],
          usedSavedTestEvidence:false,usedSavedVideoHistory:false,
          browserModelAllowed:false,judgment:publicJudgment,
          decision:{status:"clarify",message:judgment.reply,question:null,suggestions:[]},
        });
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
      !meditationDeclined &&
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
    const rawDecision=buildHolisticGuidedTurn({
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
    const decision=meditationDeclined?{...rawDecision,suggestions:(rawDecision.suggestions||[])
      .filter(item=>!item.id?.startsWith('youtube:'))}:rawDecision;
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
      selectedGoal:goal,
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
    // Last-resort repetition gate for model/fallback text, only in ordinary
    // safe clarification. This cannot change safety handoffs or model access.
    const finalReply=safety.status==="clear" && !recentUnsafe &&
      decision.status==="clarify"
      ? progressDialogueReply({message:body.message,locale:body.locale,history:body.history,
          reply:generated.text,intent:fastRule?.id||""})
      : generated.text;
    const suggestions=(Array.isArray(decision.suggestions)?decision.suggestions:[])
      .slice(0,3).map(({id,kind,href,title})=>({id,kind,href,title}));
    return await finish({
      status:decision.status, reply:finalReply, modelUsed:generated.modelUsed,
      mindRole:generated.modelUsed?envelope.mindRole:null,
      source:generated.provider, decision:{status:decision.status,message:decision.message,
        suggestions,question:decision.question||null},
      suggestions, memorySaved:false, userAuthorized:true,
      usedSavedTestEvidence:useMeasurements && measurements.length>0,
      usedSavedVideoHistory:useHistory && completedIds.length>0,
      // Browser presentation may use a local model AFTER separate on-device opt-in.
      browserModelAllowed:experimentalEnabled && body.mode!=="owned" && safety.status==="clear" && !recentUnsafe,
    });
  } catch (error) {
    const e=safeError(error);
    const response=NextResponse.json({error:e.code},{status:e.status,headers:PRIVATE_HEADERS});
    return auth?auth.apply(response):response;
  }
}
