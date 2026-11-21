import 'server-only';
import {randomUUID} from 'node:crypto';
import {PRACTITIONER_ID} from '../../data/app-services.js';
import {consumeRate} from '../app/database.js';
import {waveTelegramVoiceReady,validWaveTelegramVoiceMeta,
  waveTelegramVoiceCopy,transcribeWaveTelegramVoice} from './telegram-wave-voice.mjs';
import {seal,openSealed,operationHash} from '../app/crypto.js';
import {businessHash} from './messenger-store.js';
import {channelTransportReady,telegramBotBusinessId,telegramPilotReady,telegramPublicDiagnosticReady} from './messenger-policy.js';
import {webhookTransaction,ingestMessengerEventInTransaction} from './messenger-webhook.js';
import {detectConversationLocale} from '../holistic-support/conversation-locale.mjs';
import {V3_COPY,V3_LABELS,v3Locale,v3StartLocale,v3IsStop,v3Action,
  v3Context,v3ButtonsFor,v3VoiceOfferValid,v3CanStart,v3CanChat,v3ServiceIntakeReady,v3CanCallModel,v3DailyReplyCount,v3WantsGeneralChat,V3_CHAT_COPY,v3ChatPreConsentSafetyReply,v3ServiceStart,v3ServiceCopy,v3PsychologistStart,v3FreeDiagnosticStart,v3SupportStart,v3AssistantStart,SECRETARY_PSYCHOLOGIST_COPY} from './telegram-ai-diagnostic-v3.mjs';
import {SECRETARY_MODES} from '../assist/secretary-modes.mjs';
import {aliBusinessLinkReference,aliBusinessLinkCopy}
  from '../assist/ali-business-diagnostic-link.mjs';
import {resolveAliSecretaryAlgorithm,aliDiagnosticServiceIntro} from '../assist/ali-secretary-algorithms.mjs';
import {wavePsychologistNativeTurn,wavePsychologistNativeSummary} from '../assist/wave-psychologist-native.mjs';
import {telegramSupportIntro,telegramSupportFirstQuestion,telegramSupportSummary} from './telegram-support-quiz.mjs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary,aliIntakeStageFromTurns} from '../assist/ali-guided-intake.mjs';
import {aliServiceSecretaryFirst,aliServiceSecretaryQuestion} from '../assist/ali-service-secretary.mjs';
import {aliServiceScenario} from '../assist/ali-service-scenario.mjs';
import {FREE_DIAGNOSTIC_MODE,aliFreeDiagnosticTurn,aliFreeDiagnosticSummary,
  aliFreeDiagnosticIntro,aliFreeDiagnosticFirst,aliFreeDiagnosticEmpty} from '../assist/ali-free-diagnostic.mjs';
import {freeDiagnosticCopy} from '../assist/ali-free-diagnostic-library.mjs';
import {aliSecretaryInitialServiceIntent,aliSecretaryOfferActionHint} from '../assist/ali-secretary-offer-journeys.mjs';
import {aliWelcomePhotoKey} from './telegram-welcome-photo-catalog.mjs';
import {telegramServiceMenuAnswer,telegramServiceMenuIntent} from './telegram-service-intro.mjs';
import {v3Generate} from './telegram-ai-diagnostic-v3-model.mjs';
import {publicEnquiryReference} from '../practitioners/public-service-enquiry-input.mjs';
import {retrievePrivateTelegramPhoto} from './messenger-provider.js';
import {issueTelegramFreeDiagnosticHandoff,freeDiagnosticFormUrl} from '../coaching/telegram-free-diagnostic-handoff.mjs';
import {freePackageCopy,validFreeMedia,safeFreeMediaReceipt,acceptedFreeMedia,
  freeProgressStepTransition,freePackageStatusMessage,freePackageStatusIntent,freeFormReceiptIntent,freePackageCaseReference,freeCoreAnswersReady,freeCoreQuestion,reviewPackageStatus}
  from './ali-free-package-receipts.mjs';
import {waveTelegramLocalReply} from './telegram-wave-local-reply.mjs';
import {waveNativeTurn} from '../holistic-support/wave-native-router.mjs';
import {composeTelegramWavePublicReply,composeTelegramAliServiceReply} from './telegram-secretary-offers.mjs';

const TABLE='app_private.crm_tg_diagnostic_sessions';
const iso=()=>new Date().toISOString();
const today=()=>iso().slice(0,10);
const validId=value=>/^[0-9]{1,25}$/.test(String(value||''));
const safeNumber=id=>Number.isSafeInteger(id)&&id>=0;
const consentWords=new Set(['да','yes','sí','si','конечно','sure']);
const cappedText=text=>String(text||'').trim().slice(0,1200);
const voiceConsentValid=ctx=>{
  const at=Date.parse(ctx?.voiceConsentAt||'');
  return Number.isFinite(at)&&at<=Date.now()&&Date.now()-at<30*86400*1000;
};
const isExplicitYes=value=>consentWords.has(String(value||'').trim().toLowerCase().replace(/[!. ]+$/,''));
const danger=value=>/(?:хочу покончить с собой|убью себя|не могу дышать|боль в груди|suicide|kill myself|cannot breathe|chest pain|suicid|no puedo respirar)/iu.test(String(value||''));
const dayCount=row=>v3DailyReplyCount(row,today());
const cryptoContext=row=>({accountId:row.owner_id,recordId:row.ai_context_id,field:'crm.tg.ai'});
const openContext=(row,config)=>v3Context(row.ai_context_ciphertext
  ?openSealed(row.ai_context_ciphertext,cryptoContext(row),config):null);
const encryptContext=(row,context,config)=>seal(v3Context(context),cryptoContext(row),config);
const readRow=(db,business,user)=>db.query('select * from '+TABLE+
  ' where business_hash=$1 and user_hash=$2 for update',[business,user])
  .then(r=>r.rows[0]||null);
const updateRow=(db,business,user,fields,params)=>db.query(
  'update '+TABLE+' set '+fields+',updated_at=now() where business_hash=$1 and user_hash=$2',
  [business,user,...params]);
const response=(event,lang,reply,keyboard=[])=>({
  handled:true,to:String(event.userId),reply,keyboard,locale:lang,
  callbackId:event.callbackId||null,approvedPilotGuest:false,
});
const supported=(env)=>env.HH_CRM_TG_AI_V3_SCHEMA_READY==='true' &&
  channelTransportReady('telegram',env) &&
  (telegramPublicDiagnosticReady(env)||telegramPilotReady(env));
const chatKeys=(event,config,env)=>{
  const bot=telegramBotBusinessId(env);
  if(!validId(bot)||!validId(event.userId))return null;
  const business=businessHash('telegram',bot,config);
  const user=operationHash({scope:'crm-msg-user',provider:'telegram',
    accountDigest:business,userId:String(event.userId)},config);
  return {business,user};
};
const languageFrom=(event,previous,start)=>{
  if(start)return start;
  if(event.inlineLocale)return v3Locale(event.inlineLocale);
  const text=String(event.rawText||'').trim();
  if(!text||text.startsWith('/'))return v3Locale(previous||event.language?.slice(0,2));
  return detectConversationLocale(text,v3Locale(previous||event.language?.slice(0,2)));
};
const promptResult=(event,lang,text,keys,job=null)=>({
  ...response(event,lang,text,keys),...(job?{generate:job}:{}),
});

/** Called ONLY inside the exact secret-verified CRM Telegram webhook.
 * No LLM call or Telegram send takes place inside the DB transaction.
 */
export async function processTelegramAiV3(event,config,env=process.env){
  if(!supported(env)||event?.type!=='incoming'||
     !/^tg:\d+$/.test(String(event.eventId||''))||!validId(event.userId))
    return {handled:false};
  const updateId=Number(String(event.eventId).slice(3));
  if(!safeNumber(updateId))return {handled:true};
  const keys=chatKeys(event,config,env);
  if(!keys)return {handled:true};
  const raw=cappedText(event.rawText),serviceStart=v3ServiceStart(raw),psychStart=v3PsychologistStart(raw),freeStart=v3FreeDiagnosticStart(raw),supportStart=v3SupportStart(raw),assistantStart=v3AssistantStart(raw),
    start=v3StartLocale(raw)||psychStart?.locale||serviceStart?.locale||supportStart?.locale||assistantStart?.locale,stop=v3IsStop(raw)||event.stop;
  const allowed=v3CanStart(env),chatAllowed=v3CanChat(env),serviceAllowed=v3ServiceIntakeReady(env);
  const supportChatStart=Boolean(supportStart&&supportStart.selection.modeIndex>0);
  const supportSecretaryStart=Boolean(supportStart&&supportStart.selection.modeIndex===0);
  // High-confidence initial inquiry, before data collection, only for a new
  // signed Telegram user. Never hijack an existing interview or direct chat.
  const naturalServiceCandidate=!start&&!event.inlineAction&&!event.photoFileId&&!stop
    ?aliSecretaryInitialServiceIntent(raw,languageFrom(event,null,null)):null;
  return webhookTransaction(config,async db=>{
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [keys.business+':'+keys.user]);
    const connected=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',keys.business])).rows[0];
    if(!connected)return {handled:false};
    const row=await readRow(db,keys.business,keys.user);
    const serviceEntry=serviceStart||(!row?naturalServiceCandidate:null);
    const entryStart=start||(!row?naturalServiceCandidate?.locale:null);
    // Signed, published free review -> Secretary Diagnostician. This is only
    // a planned role; the existing V3 consent gate still controls activation.
    const entryAlgorithm=resolveAliSecretaryAlgorithm({
      locale:serviceEntry?.locale||freeStart?.locale||psychStart?.locale||languageFrom(event,null,null),
      service:serviceEntry?.service||null,offerId:serviceEntry?.offerId||null,
      requestedMode:freeStart?SECRETARY_MODES.DIAGNOSTICIAN:
        psychStart?SECRETARY_MODES.PSYCHOLOGIST:null,
      entryVerified:Boolean(serviceEntry||freeStart||psychStart),
    });
    const diagnosticServiceEntry=Boolean(serviceEntry&&chatAllowed&&
      entryAlgorithm.mode===SECRETARY_MODES.DIAGNOSTICIAN);
    const active=Number(row?.flow_version)===3&&row?.chat_mode!=='direct';
    // A user who arrived with a concrete service must not lose that choice
    // simply by typing a greeting/question before tapping consent. Consent
    // for GENERAL chat is a different purpose, not implicit in free text.
    const activeServiceConsent=active&&row?.stage==='consent'&&
      Boolean(openContext({...row,owner_id:connected.owner_id},config).serviceRequest);
    const activeSupportConsent=active&&row?.stage==='consent'&&
      Boolean(openContext({...row,owner_id:connected.owner_id},config).supportSelection);
    const activeFreeConsent=active&&row?.stage==='consent'&&
      openContext({...row,owner_id:connected.owner_id},config).mode===FREE_DIAGNOSTIC_MODE;
    const activePsychConsent=active&&row?.stage==='consent'&&
      openContext({...row,owner_id:connected.owner_id},config).mode===SECRETARY_MODES.PSYCHOLOGIST;
    const generalStart=chatAllowed&&!entryStart&&!event.inlineAction&&
      !activeServiceConsent&&!activeFreeConsent&&!activeSupportConsent&&!activePsychConsent&&
      (v3WantsGeneralChat(raw)||Boolean(event.voiceNote))&&
      (!row||(active&&row.stage==='consent'));
    if(!active&&!generalStart&&(!entryStart||!((freeStart||supportChatStart||supportSecretaryStart||assistantStart)?chatAllowed:serviceEntry?serviceAllowed:allowed)))return {handled:false};
    if(telegramPilotReady(env)&&String(event.userId)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID){
      if(!row?.pilot_access_until||Date.parse(row.pilot_access_until)<=Date.now())
        return {handled:false};
    }
    if(row&&Number(row.last_update_id)>=updateId)
      return {handled:true,callbackId:event.callbackId||null,duplicate:true};
    const lang=languageFrom(event,row?.locale,entryStart);
    const copy=V3_COPY[lang],chat=V3_CHAT_COPY[lang],count=dayCount(row),canReply=count<40;
    const nextCount=canReply?count+1:count;
    if(row?.stage==='stopped')return {handled:true,callbackId:event.callbackId||null};
    if(generalStart){
      const prior=row?openContext({...row,owner_id:connected.owner_id},config):null;
      const urgent=v3ChatPreConsentSafetyReply(raw,lang);
      // A signed unconsented emergency cue must never be suppressed by the
      // normal diagnostic or new-chat consent nudge. No external model call.
      if(urgent&&prior?.conversationKind==='general'){
        await updateRow(db,keys.business,keys.user,
          'locale=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
          [lang,updateId,today(),nextCount]);
        return response(event,lang,canReply?urgent:null);
      }
      if(prior?.conversationKind!=='general'){
        // No unconsented client text is stored or forwarded to any model.
        const id=row?.ai_context_id||randomUUID();
        const cipher=encryptContext({owner_id:connected.owner_id,ai_context_id:id},
          {turns:[],pending:null,summary:null,conversationKind:'general'},config);
        if(row)await updateRow(db,keys.business,keys.user,
          'locale=$3,ai_context_ciphertext=$4,ai_consent_at=null,'+
          'last_update_id=$5,reply_day=$6,reply_count=$7',
          [lang,cipher,updateId,today(),nextCount]);
        else await db.query(
          'insert into '+TABLE+' (business_hash,user_hash,stage,locale,last_update_id,'+
          'flow_version,chat_mode,ai_context_id,reply_day,reply_count,ai_context_ciphertext) '+
          "values($1,$2,'consent',$3,$4,3,'diagnostic',$5,$6,$7,$8)",
          [keys.business,keys.user,lang,updateId,id,today(),nextCount,cipher]);
        return {...response(event,lang,canReply?(urgent||chat.intro):null,
          urgent?[]:v3ButtonsFor(lang,'chat_consent')),
          ...(canReply&&!urgent?{welcomePhotoKey:'chat'}:{})};
      }
    }
    // A repeated start while consent is still pending is not a new interview.
    // Preserve the privacy explanation already shown; never re-send its wall of text.
    if(start&&active&&row?.stage==='consent'){
      if(!serviceStart&&!psychStart&&!freeStart&&!supportStart&&!assistantStart){
      await updateRow(db,keys.business,keys.user,
        'locale=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
        [lang,updateId,today(),nextCount]);
      const priorCtx=openContext({...row,owner_id:connected.owner_id},config);
      const priorService=priorCtx.serviceMenuShown&&
        v3ServiceCopy(lang,priorCtx.serviceRequest,priorCtx.offerId);
      return response(event,lang,canReply?(priorService?priorService.intro:copy.nudge):null,
        v3ButtonsFor(lang,priorService?'service_menu':'consent'));
      }
    }
    if(entryStart){
      // An explicit deep link or a high-confidence fresh service inquiry
      // starts V3. Existing sessions are never reclassified by text.
      // continue on their original path for every ordinary message.
      const contextId=randomUUID();
      const seeded=serviceEntry||psychStart||freeStart||supportStart||assistantStart?encryptContext(
        {owner_id:connected.owner_id,ai_context_id:contextId},
        {turns:[],pending:null,summary:null,
          ...(serviceEntry?{serviceRequest:serviceEntry.service,
            ...(serviceEntry.offerId?{offerId:serviceEntry.offerId}:{}),
            ...(!diagnosticServiceEntry?{serviceMenuShown:true}:{})}:{}),
          ...(supportStart?{supportSelection:supportStart.selection.digits,
            ...(supportChatStart?{conversationKind:'general'}:
               supportStart.selection.topic==='business_support'?{serviceRequest:'business'}:
               supportStart.selection.formatIndex===0?{serviceRequest:'general'}:{})}:{}),
          ...(assistantStart?{conversationKind:'general'}:{}),
          ...(psychStart?{mode:SECRETARY_MODES.PSYCHOLOGIST,
            intakeStage:'situation',intakeSlots:{}}:{}),
          ...(freeStart?{mode:FREE_DIAGNOSTIC_MODE,intakeStage:'goal',intakeSlots:{},
            verifiedTelegramUserId:String(event.userId)}:{}),
          ...(diagnosticServiceEntry?{mode:SECRETARY_MODES.DIAGNOSTICIAN,
            intakeStage:'goal',intakeSlots:{},verifiedTelegramUserId:String(event.userId)}:{})},config):null;
      if(row)await updateRow(db,keys.business,keys.user,
        "stage='consent',locale=$3,flow_version=3,chat_mode='diagnostic',"+
        'last_update_id=$4,ai_context_id=$5,ai_context_ciphertext=$8,'+
        'ai_consent_at=null,ai_review_consent_at=null,consent_at=null,'+
        'topic=null,reply_day=$6,reply_count=$7,service_handoff=false,service_offering_id=null',
        [lang,updateId,contextId,today(),nextCount,seeded]);
      else await db.query(
        'insert into '+TABLE+' (business_hash,user_hash,stage,locale,last_update_id,'+
        'flow_version,chat_mode,ai_context_id,reply_day,reply_count,ai_context_ciphertext) '+
        "values($1,$2,'consent',$3,$4,3,'diagnostic',$5,$6,$7,$8)",
        [keys.business,keys.user,lang,updateId,contextId,today(),nextCount,seeded]);
      const introduction=serviceEntry&&v3ServiceCopy(lang,serviceEntry.service,serviceEntry.offerId);
      const greeting=response(event,lang,canReply?(diagnosticServiceEntry
        ?aliDiagnosticServiceIntro(lang,introduction?.title||'')
        :introduction?.intro||
        (assistantStart?chat.intro:supportStart?telegramSupportIntro(lang,supportStart.selection.digits):
        psychStart?SECRETARY_PSYCHOLOGIST_COPY[lang].intro:
        freeStart?aliFreeDiagnosticIntro(lang):copy.intro)):null,
        v3ButtonsFor(lang,(supportChatStart||assistantStart)?'chat_consent':freeStart?'free_consent':
           serviceEntry&&!diagnosticServiceEntry?'service_menu':'consent'));
      // Photo only on the first V3 entry after the idempotency lock.
      // Free Review retains its dedicated Andrey portrait and booking option.
      if(!canReply)return greeting;
      if(freeStart)return {...greeting,freeWelcomePhoto:true};
      const welcomePhotoKey=aliWelcomePhotoKey({
        service:serviceEntry?.service||null,offerId:serviceEntry?.offerId||null,
        supportTopic:supportStart?.selection.topic||null,
        mode:psychStart?'psychologist':assistantStart?'chat':'general',
      });
      return {...greeting,welcomePhotoKey,
        ...(serviceEntry?{serviceWelcome:true}:{})};
    }
    if(!active)return {handled:false};
    const current={...row,owner_id:connected.owner_id};
    const ctx=openContext(current,config);
    // Existing pre-upgrade Free Diagnostic conversations retain their answers.
    // Recover the original Telegram identity only from this authenticated
    // webhook's session-bound sender; never trust free text or an h2 link.
    if(ctx.mode===FREE_DIAGNOSTIC_MODE&&!ctx.verifiedTelegramUserId)
      ctx.verifiedTelegramUserId=String(event.userId);
    const serviceCopy=v3ServiceCopy(lang,ctx.serviceRequest,ctx.offerId);
    if(stop){
      await db.query('select app_private.crm_tg_suppress_existing($1,$2)',
        [keys.business,keys.user]);
      await updateRow(db,keys.business,keys.user,
        "stage='stopped',ai_consent_at=null,ai_review_consent_at=null,"+
        'ai_context_ciphertext=null,consent_at=null,last_update_id=$3,'+
        'marketing_opt_out_at=now(),reply_day=$4,reply_count=$5',
        [updateId,today(),nextCount]);
      return response(event,lang,canReply?copy.stopped:null);
    }
    // Never let old V1/V2 or unrelated Home callbacks authorize AI or CRM.
    if(event.inlineAction&&!event.inlineAction.startsWith('v3:'))
      return {handled:true,callbackId:event.callbackId||null};
    const action=v3Action(event);
    // Booking remains in this SAME signed Telegram V3 session. A "Book" tap
    // is explicit intent, but NEVER consent to store or send a paid enquiry.
    if(action==='book'&&['consent','interview','review_confirm'].includes(row.stage)&&
       !(row.stage==='consent'&&ctx.serviceRequest)){
      const offer=ctx.serviceRequest||'general';
      const selectedCopy=v3ServiceCopy(lang,offer,ctx.offerId);
      if(!row.ai_consent_at||row.stage==='consent'||ctx.conversationKind==='general'){
        // Consent for a free review/general chat cannot silently become
        // consent for a new consultation request. Start one new local purpose.
        const fresh={turns:[],pending:null,summary:null,serviceRequest:offer,
          intakeStage:'goal',intakeSlots:{}};
        await updateRow(db,keys.business,keys.user,
          "stage='consent',locale=$3,ai_context_ciphertext=$4,ai_consent_at=null,"+
          'ai_review_consent_at=null,consent_at=null,last_update_id=$5,'+
          'reply_day=$6,reply_count=$7',
          [lang,encryptContext(current,fresh,config),updateId,today(),nextCount]);
        return response(event,lang,canReply?selectedCopy.intro:null,
          v3ButtonsFor(lang,'consent'));
      }
      const summary=ctx.mode===SECRETARY_MODES.PSYCHOLOGIST
        ?wavePsychologistNativeSummary({locale:lang,slots:ctx.intakeSlots||{}})
        :ctx.mode===FREE_DIAGNOSTIC_MODE
          ?aliFreeDiagnosticSummary({locale:lang,slots:ctx.intakeSlots||{}})
          :aliGuidedIntakeSummary({locale:lang,slots:ctx.intakeSlots||{},
            turns:ctx.turns,serviceRequest:ctx.serviceRequest,offerId:ctx.offerId,
            supportSelection:ctx.supportSelection});
      const words=ctx.turns.some(t=>t.role==='user'&&t.text?.trim());
      const prepared=summary&&words?summary:null;
      const updated={...ctx,serviceRequest:offer,
        summary:prepared||null,pending:null};
      await updateRow(db,keys.business,keys.user,
        'stage=$3,locale=$4,ai_context_ciphertext=$5,last_update_id=$6,'+
        'reply_day=$7,reply_count=$8',
        [prepared?'review_confirm':'interview',lang,
          encryptContext(current,updated,config),updateId,today(),nextCount]);
      if(!canReply)return {handled:true};
      if(prepared)return response(event,lang,
        selectedCopy.reviewTitle+prepared+selectedCopy.reviewQuestion,
        v3ButtonsFor(lang,'review_confirm',0,offer));
      return response(event,lang,aliServiceSecretaryFirst(lang));
    }
    if(row.stage==='consent'){
      const emergency=v3ChatPreConsentSafetyReply(raw,lang);
      if(emergency){
        // No unconsented text is stored, profiled or forwarded to any model.
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        return response(event,lang,canReply?emergency:null);
      }
      const general=ctx.conversationKind==='general';
      if((general&&(action==='chatlater'||action==='decline'))||(!general&&action==='decline')){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        return response(event,lang,canReply?(general?chat.later:copy.later):null);
      }
      // This published service is handled by Ali's own local, bounded
      // Secretary/Empathy minds. The first explicit "Let's talk" button is
      // sufficient to begin the protected chat; no second OpenRouter/AI wall.
      // Accept the older second-stage button for existing consented sessions.
      const agrees=general?action==='chatagree':
        serviceCopy?(action==='agree'||action==='serviceagree'||
          (!event.inlineAction&&isExplicitYes(raw))):
        (action==='agree'||(!event.inlineAction&&isExplicitYes(raw)));
      const purposeReady=general||ctx.mode===FREE_DIAGNOSTIC_MODE||
        (ctx.supportSelection&&ctx.conversationKind!=='general')?chatAllowed:serviceAllowed;
      if(!agrees||!purposeReady){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        const reminder=general?(chatAllowed?chat.nudge:copy.notReady):
          (purposeReady?(serviceCopy?serviceCopy.welcomeNudge:copy.nudge):copy.notReady);
        return response(event,lang,canReply?reminder:null,
          purposeReady?v3ButtonsFor(lang,general?'chat_consent':
            serviceCopy?'consent':ctx.mode===FREE_DIAGNOSTIC_MODE?'free_consent':'consent'):[]);
      }
      await updateRow(db,keys.business,keys.user,
        "stage='interview',locale=$3,ai_consent_at=now(),last_update_id=$4,"+
        'reply_day=$5,reply_count=$6',
        [lang,updateId,today(),nextCount]);
      return response(event,lang,canReply?(general?
        (ctx.supportSelection?telegramSupportFirstQuestion(lang,ctx.supportSelection):chat.first):
        ctx.supportSelection?aliServiceSecretaryFirst(lang):
        ctx.mode===FREE_DIAGNOSTIC_MODE?aliFreeDiagnosticFirst(lang):serviceCopy?.first||
        (ctx.mode===SECRETARY_MODES.PSYCHOLOGIST?SECRETARY_PSYCHOLOGIST_COPY[lang].first:
         ctx.mode===FREE_DIAGNOSTIC_MODE?aliFreeDiagnosticFirst(lang):copy.first)):null,
        ctx.mode===FREE_DIAGNOSTIC_MODE?v3ButtonsFor(lang,'free_interview',0):[]);
    }
    if(!row.ai_consent_at||!((ctx.conversationKind==='general'||ctx.mode===FREE_DIAGNOSTIC_MODE||
       ctx.supportSelection&&ctx.mode!==SECRETARY_MODES.PSYCHOLOGIST)?chatAllowed:serviceAllowed))
      return response(event,lang,copy.notReady);
    if(row.stage==='done'){
      if(!row.consent_at)return {handled:true};
      if(ctx.mode===FREE_DIAGNOSTIC_MODE){
        const copyPack=freePackageCopy(lang);
        // Both the Business enquiry and the bot review have already passed
        // their OWN signed consent + Confirm Send. Cross-channel joining is
        // NEVER inferred from a code in an ordinary message or shared URL.
        if(/^\/link\b/i.test(raw)){
          const ref=aliBusinessLinkReference(raw);
          if(!ref){
            await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
            return response(event,lang,aliBusinessLinkCopy(lang,'format'));
          }
          if(ctx.linkedBusinessReference&&ctx.linkedBusinessReference!==ref){
            await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
            return response(event,lang,aliBusinessLinkCopy(lang,'other'));
          }
          // Business chat and official bot both prove the SAME Telegram ID,
          // but they use intentionally unrelated CRM user hashes. Recompute
          // the trusted Business digest from this signed bot sender instead
          // of matching on a reference code alone.
          const peer=operationHash({scope:'hh-telegram-business-peer',
            id:String(event.userId)},config);
          const validSender=ctx.verifiedTelegramUserId===String(event.userId);
          // The signed inbox role can only SELECT practitioners after fixed
          // first-party practitioner RLS scope is set in this transaction.
          if(validSender)await db.query(
            "select pg_catalog.set_config('hh.practitioner_id',$1,true)",
            [String(PRACTITIONER_ID)]);
          const linked=validSender?(await db.query(
            'select b.reference_code from app_private.crm_tg_business_service_sessions b '+
            'join app.practitioners p on p.id=b.practitioner_id '+
            'where b.reference_code=$1 and b.telegram_peer_hash=$2 '+
            "and b.service_key='personal_review' and b.stage='submitted' "+
            "and b.consent_at is not null and b.delivery_format='async' "+
            'and p.trusted_auth_user_id=$3 limit 1',
            [ref,peer,connected.owner_id])).rows[0]:null;
          if(linked?.reference_code!==ref){
            await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
            return response(event,lang,aliBusinessLinkCopy(lang,'unverified'));
          }
          if(ctx.linkedBusinessReference===ref){
            await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
            return response(event,lang,aliBusinessLinkCopy(lang,'already',ref));
          }
          const message='[Verified client-authorized cross-channel link] '+
            'Telegram Business enquiry '+ref+' belongs to this same Telegram '+
            'participant and practitioner. No booking, photo or form receipt is implied.';
          const stored=await ingestMessengerEventInTransaction(db,'telegram',{
            ...event,eventId:event.eventId+':business-link',
            messageId:event.messageId+':business-link',body:message,
            telegramPhotoFileId:null,diagnosticLocale:lang,stop:false,
          },config,keys.business);
          if(stored!==true)throw new Error('ALI_BUSINESS_LINK_CRM_CONFIRM_FAILED');
          await updateRow(db,keys.business,keys.user,
            'ai_context_ciphertext=$3,last_update_id=$4',
            [encryptContext(current,{...ctx,linkedBusinessReference:ref},config),updateId]);
          return response(event,lang,aliBusinessLinkCopy(lang,'linked',ref));
        }
        if(action==='status'||freePackageStatusIntent(raw)){
          await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
          return response(event,lang,freePackageStatusMessage(ctx,lang));
        }
        if(freeFormReceiptIntent(raw)){
          await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
          return response(event,lang,ctx.formReceipt?.status==='received'
            ?copyPack.formAccepted+'\n\n'+(ctx.mediaStep==='portrait'?copyPack.portrait:copyPack.completed)
            :copyPack.formRetry);
        }
        if(action==='form'){
          await updateRow(db,keys.business,keys.user,
            'ai_context_ciphertext=$3,last_update_id=$4',
            [encryptContext(current,ctx,config),updateId]);
          if(ctx.formReceipt?.status==='received')
            return response(event,lang,copyPack.formAccepted+'\n\n'+
              (ctx.mediaStep==='portrait'?copyPack.portrait:copyPack.completed),
              ctx.mediaStep==='portrait'?v3ButtonsFor(lang,'free_portrait'):[]);
          const token=issueTelegramFreeDiagnosticHandoff({
            ownerId:connected.owner_id,contextId:row.ai_context_id,
            businessHash:keys.business,userHash:keys.user,locale:lang},config);
          return response(event,lang,copyPack.pendingForm+'\n'+
            freeDiagnosticFormUrl(lang,token));
        }
        // The five-stage Free Diagnostic collects the hand-drawn sketch
        // first, verifies the native questionnaire second, then requests the
        // personal photo as the final optional media step. No stage is marked
        // received based on the client's claim alone.
        if(ctx.mediaStep==='portrait'&&ctx.formReceipt?.status==='received'){
          const skipped=freeProgressStepTransition(ctx,action);
          if(skipped){
            const stored=await ingestMessengerEventInTransaction(db,'telegram',{
              ...event,eventId:event.eventId+':portrait-skipped',
              messageId:event.messageId+':portrait-skipped',
              body:'[Client voluntarily skipped personal photo]\n'+
                freePackageStatusMessage(skipped,lang),
              telegramPhotoFileId:null,diagnosticLocale:lang,stop:false,
            },config,keys.business);
            if(stored!==true)throw new Error('FREE_PORTRAIT_SKIP_CRM_NOT_CONFIRMED');
            await updateRow(db,keys.business,keys.user,
              'ai_context_ciphertext=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
              [encryptContext(current,skipped,config),updateId,today(),nextCount]);
            return {...response(event,lang,
              copyPack.portraitSkipped+'\n\n'+copyPack.completed),
              ownerProgress:{business:keys.business,user:keys.user,
                ownerId:connected.owner_id,contextId:row.ai_context_id,
                updateId,locale:lang,codes:['portrait_skipped','complete']}};
          }
          if(ctx.mediaPending&&Date.now()-Number(ctx.mediaPending.at||0)<120000){
            await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
            return response(event,lang,copyPack.verifying);
          }
          if(validFreeMedia(event)){
            const pending={updateId,step:'portrait',fileId:event.photoFileId,
              bytes:event.photoBytes??0,messageId:event.messageId,at:Date.now()};
            await updateRow(db,keys.business,keys.user,
              'ai_context_ciphertext=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
              [encryptContext(current,{...ctx,mediaPending:pending},config),
                updateId,today(),nextCount]);
            return {...response(event,lang,canReply?copyPack.verifying:null),
              photoVerify:{business:keys.business,user:keys.user,ownerId:connected.owner_id,
                contextId:row.ai_context_id,updateId,locale:lang,to:String(event.userId)}};
          }
          await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
          return response(event,lang,event.photoFileId?copyPack.portraitRetry:copyPack.portrait,
            v3ButtonsFor(lang,'free_portrait'));
        }
        if(ctx.mediaStep==='form_pending'&&ctx.formReceipt?.status!=='received'){
          await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
          const token=issueTelegramFreeDiagnosticHandoff({
            ownerId:connected.owner_id,contextId:row.ai_context_id,
            businessHash:keys.business,userHash:keys.user,locale:lang},config);
          return response(event,lang,copyPack.pendingForm+'\n'+
            freeDiagnosticFormUrl(lang,token));
        }
        if(event.photoFileId){
          await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
          return response(event,lang,copyPack.completed);
        }
      }
      // Explicit retry of the SAME signed, previously consented operation.
      // Does not record a second transcript, lead or notification.
      if(serviceCopy&&raw==='/retry_request'){
        await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
        return {...response(event,lang,null),serviceFinalize:{
          business:keys.business,user:keys.user,ownerId:connected.owner_id,
          accountId:connected.account_id,contextId:row.ai_context_id,
          updateId,locale:lang,
        }};
      }
      if(event.photoFileId)return response(event,lang,copy.photo);
      if(!v3CanCallModel(raw))return {handled:true};
      // Owner replies continue through the original verified CRM thread.
      await ingestMessengerEventInTransaction(db,'telegram',{
        ...event,body:raw,diagnosticLocale:lang,stop:false,
        telegramPhotoFileId:null,
      },config,keys.business);
      await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
      return {handled:true};
    }
    if(row.stage==='review_confirm'){
      if(ctx.mode===FREE_DIAGNOSTIC_MODE&&
        (action==='status'||freePackageStatusIntent(raw))){
        await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
        return response(event,lang,freePackageStatusMessage(ctx,lang));
      }
      if(action==='send'){
        if(ctx.mode===FREE_DIAGNOSTIC_MODE&&
          (!freeCoreAnswersReady(ctx)||ctx.mediaStep!=='review'))
          return response(event,lang,freeCoreQuestion(ctx,lang)||freePackageStatusMessage(ctx,lang));
        if(!ctx.summary)return response(event,lang,copy.empty);
        // The initial CRM contact is created ONLY after this separate
        // explicit personal-review handoff. The full client-authored turn
        // history is transferred once into the EXISTING owner-encrypted CRM.
        // A reviewed Send approves the visible summary, NOT the raw interview.
        // Do not copy unreviewed chat turns into CRM; the encrypted session
        // retains its own history and archive consent remains independent.
        const notes=[];
        const images=ctx.mode===FREE_DIAGNOSTIC_MODE
          ?['portrait','drawing'].flatMap(step=>{
            const receipt=ctx.mediaReceipts?.[step];
            return receipt?.status==='received'? [{
              body:step==='portrait'?'[Client personal photo for private review]':
                '[ME — GOAL — OBSTACLE drawing for private review]',
              eventId:event.eventId+':media:'+step,
              messageId:event.messageId+':media:'+step,
              telegramPhotoFileId:receipt.fileId,
              telegramPhotoPurpose:step,
            }]:[];
          }):[];
        // A client-approved Secretary/Psychologist brief is a first-party
        // service enquiry too. Free Review alone remains a separate free path.
        const handoff=serviceCopy||(ctx.mode===FREE_DIAGNOSTIC_MODE?null:
          v3ServiceCopy(lang,'general'));
        const savedContext=handoff&&!ctx.serviceRequest
          ?{...ctx,serviceRequest:'general'}:ctx;
        const serviceRef=handoff?publicEnquiryReference(row.ai_context_id):null;
        const messages=[...(handoff?[{
          body:'Confirmed service request '+serviceRef+': '+handoff.title+'. Reply in this verified CRM Telegram thread. Booking and payment are not confirmed.',
          eventId:event.eventId+':service',messageId:event.messageId+':service',
        }]:[]),...notes.map((turn,i)=>({
          body:'Клиент / Client: '+turn.text.slice(0,1080),
          eventId:event.eventId+':ai:'+i,messageId:event.messageId+':ai:'+i,
        })),{
          body:(ctx.mode===FREE_DIAGNOSTIC_MODE?'Case / Заявка: '+
            freePackageCaseReference(row.ai_context_id,config)+'\n':'')+
            'AI draft confirmed by client / Запрос подтверждён клиентом:\n'+ctx.summary.slice(0,950),
          eventId:event.eventId+':summary',messageId:event.messageId+':summary',
        },...images];
        for(const item of messages){
          const saved=await ingestMessengerEventInTransaction(db,'telegram',{
            ...event,...item,stop:false,diagnosticLocale:lang,
            telegramPhotoFileId:item.telegramPhotoFileId||null,
            telegramPhotoPurpose:item.telegramPhotoPurpose||null,
          },config,keys.business);
          if(saved!==true)throw new Error('FREE_REVIEW_CRM_ITEM_NOT_CONFIRMED');
        }
        await updateRow(db,keys.business,keys.user,
          "stage='done',locale=$3,ai_review_consent_at=now(),consent_at=now(),"+
          'last_update_id=$4,reply_day=$5,reply_count=$6,ai_context_ciphertext=$7',
          [lang,updateId,today(),nextCount,encryptContext(current,savedContext,config)]);
        if(ctx.mode===FREE_DIAGNOSTIC_MODE){
          await updateRow(db,keys.business,keys.user,'ai_context_ciphertext=$3',
            [encryptContext(current,{...ctx,mediaStep:'form_pending',
              mediaPending:null},config)]);
          const token=issueTelegramFreeDiagnosticHandoff({
            ownerId:connected.owner_id,contextId:row.ai_context_id,
            businessHash:keys.business,userHash:keys.user,locale:lang},config);
          const pack=freePackageCopy(lang);
          return {...response(event,lang,(canReply?copy.submitted+'\n\n':'')+
            pack.pendingForm+'\n'+freeDiagnosticFormUrl(lang,token)),
            ownerProgress:{business:keys.business,user:keys.user,
              ownerId:connected.owner_id,contextId:row.ai_context_id,
              updateId,locale:lang,codes:['answers','portrait','drawing','form_pending']}};

        }
        if(handoff)return {...response(event,lang,null),serviceFinalize:{
          business:keys.business,user:keys.user,ownerId:connected.owner_id,
          accountId:connected.account_id,contextId:row.ai_context_id,
          updateId,locale:lang,
        }};
        return response(event,lang,canReply?copy.submitted:null);
      }
      if(action==='edit'||action==='cancel'||action==='continue'){
        const cleared={...ctx,summary:null,pending:null};
        await updateRow(db,keys.business,keys.user,
          "stage='interview',locale=$3,ai_context_ciphertext=$4,"+
          'last_update_id=$5,reply_day=$6,reply_count=$7',
          [lang,encryptContext(current,cleared,config),updateId,today(),nextCount]);
        return response(event,lang,canReply?(action==='cancel'?copy.declined:copy.unclear):null);
      }
      if(!event.inlineAction&&v3CanCallModel(raw)){
        // Natural-language corrections go straight back into the adaptive
        // interview without resubmitting or generating a second CRM lead.
        const amended={...ctx,summary:null,pending:{id:updateId,kind:'question',text:raw,queuedAt:Date.now()}};
        await updateRow(db,keys.business,keys.user,
          "stage='interview',locale=$3,ai_context_ciphertext=$4,last_update_id=$5",
          [lang,encryptContext(current,amended,config),updateId]);
        return promptResult(event,lang,null,[],{
          business:keys.business,user:keys.user,to:String(event.userId),
          ownerId:connected.owner_id,contextId:row.ai_context_id,
          updateId,locale:lang,
        });
      }
      return response(event,lang,canReply?(serviceCopy?
          serviceCopy.reviewTitle+ctx.summary+serviceCopy.reviewQuestion:
          copy.reviewTitle+ctx.summary+copy.reviewQuestion):null,
        v3ButtonsFor(lang,'review_confirm',0,ctx.serviceRequest));
    }
    if(row.stage!=='interview')return {handled:true};
    if(ctx.mode===FREE_DIAGNOSTIC_MODE&&
      (action==='status'||freePackageStatusIntent(raw))){
      await updateRow(db,keys.business,keys.user,
        'locale=$3,last_update_id=$4',[lang,updateId]);
      return response(event,lang,freePackageStatusMessage(ctx,lang));
    }
    if(ctx.mode===FREE_DIAGNOSTIC_MODE){
      const pack=freePackageCopy(lang);
      const media=ctx.mediaStep;
      if(media==='portrait'||media==='drawing'){
        const skipped=freeProgressStepTransition(ctx,action);
        if(skipped){
          await updateRow(db,keys.business,keys.user,
            'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
            [lang,encryptContext(current,skipped,config),updateId,today(),nextCount]);
          return {...response(event,lang,
            (media==='portrait'?pack.portraitSkipped:pack.drawingSkipped)+'\n\n'+
            pack.review,
            [[V3_LABELS[lang].finish]]),
            ownerProgress:{business:keys.business,user:keys.user,
              ownerId:connected.owner_id,contextId:row.ai_context_id,
              updateId,locale:lang,codes:[media+'_skipped']}};
        }
        if(ctx.mediaPending&&Date.now()-Number(ctx.mediaPending.at||0)<120000){
          await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
          return response(event,lang,pack.verifying);
        }
        if(validFreeMedia(event)){
          const pending={updateId,step:media,fileId:event.photoFileId,
            bytes:event.photoBytes??0,messageId:event.messageId,at:Date.now()};
          await updateRow(db,keys.business,keys.user,
            'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
            [lang,encryptContext(current,{...ctx,mediaPending:pending},config),
              updateId,today(),nextCount]);
          return {...response(event,lang,canReply?pack.verifying:null),photoVerify:{
            business:keys.business,user:keys.user,ownerId:connected.owner_id,
            contextId:row.ai_context_id,updateId,locale:lang,to:String(event.userId)}};
        }
        await updateRow(db,keys.business,keys.user,
          'locale=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
          [lang,updateId,today(),nextCount]);
        return response(event,lang,media==='portrait'?pack.portraitRetry:pack.drawingRetry,
          v3ButtonsFor(lang,media==='portrait'?'free_portrait':'free_drawing'));
      }
      if(action==='finish'&&!media){
        if(!freeCoreAnswersReady(ctx))
          return response(event,lang,freeCoreQuestion(ctx,lang));
        if(!aliFreeDiagnosticSummary({locale:lang,slots:ctx.intakeSlots}))
          return response(event,lang,pack.missingAnswers);
        const next={...ctx,mediaStep:'drawing'};
        await updateRow(db,keys.business,keys.user,
          'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
          [lang,encryptContext(current,next,config),updateId,today(),nextCount]);
        return response(event,lang,pack.drawing,v3ButtonsFor(lang,'free_drawing'));
      }
      if(action==='finish'&&media==='form_pending'){
        await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
        return response(event,lang,pack.pendingForm);
      }
    }
    // /voice_on is new explicit typed consent. Inline Allow Voice belongs
    // ONLY to the recently sent and DB-bound official Telegram offer message.
    // Old buttons cannot undo /voice_off or STOP.
    const callbackApproval=action==='voiceagree';
    const voiceOn=callbackApproval||raw==='/voice_on';
    const voiceOff=action==='voicedecline'||raw==='/voice_off';
    if(voiceOn||voiceOff){
      const approved=!callbackApproval||v3VoiceOfferValid(ctx,event.callbackMessageId);
      const enabled=voiceOn&&approved&&waveTelegramVoiceReady(env);
      const amended={...ctx,voiceConsentAt:voiceOff?null:enabled?iso():ctx.voiceConsentAt,
        voiceOfferUpdateId:null,voiceOfferAt:null,voiceOfferMessageId:null,
        voiceDeliveryPendingId:voiceOff?null:ctx.voiceDeliveryPendingId,
        pending:voiceOff&&ctx.pending?.voice?null:ctx.pending};
      await updateRow(db,keys.business,keys.user,
        'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
        [lang,encryptContext(current,amended,config),updateId,today(),nextCount]);
      const text=voiceOff?'disabled':!approved?'intro':enabled?'enabled':'unavailable';
      return response(event,lang,canReply?waveTelegramVoiceCopy(lang,text):null);
    }
    if(ctx.pending&&Date.now()-Number(ctx.pending.queuedAt||0)<120000){
      await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
      return response(event,lang,canReply?copy.busy:null);
    }
    // A crashed / timed-out Next.after task cannot freeze this session forever.
    // Drop only stale unsent work; it will never be replayed automatically.
    if(ctx.pending)ctx.pending=null;
    if(event.voiceNote){
      const respond=async(key,buttons=[])=>{
        await updateRow(db,keys.business,keys.user,
          'locale=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
          [lang,updateId,today(),nextCount]);
        return response(event,lang,canReply?waveTelegramVoiceCopy(lang,key):null,buttons);
      };
      if(!validWaveTelegramVoiceMeta(event.voiceNote))
        return respond('invalid');
      if(!voiceConsentValid(ctx)){
        if(!canReply)return {handled:true};
        // Store an expiring offer in the encrypted session, but authorize no
        // callback until the official sent bot message_id is bound below.
        const offer={...ctx,voiceOfferUpdateId:updateId,voiceOfferAt:iso(),
          voiceOfferMessageId:null};
        await updateRow(db,keys.business,keys.user,
          'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
          [lang,encryptContext(current,offer,config),updateId,today(),nextCount]);
        return {...response(event,lang,waveTelegramVoiceCopy(lang,'intro'),
          v3ButtonsFor(lang,'voice_consent')),
          voiceOffer:{business:keys.business,user:keys.user,updateId,
            ownerId:connected.owner_id,contextId:row.ai_context_id}};
      }
      if(!waveTelegramVoiceReady(env))return respond('unavailable');
      if(!canReply){await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
        return {handled:true};}
      const next={...ctx,pending:{id:updateId,kind:'question',text:'',
        queuedAt:Date.now(),voice:true}};
      await updateRow(db,keys.business,keys.user,
        'locale=$3,ai_context_ciphertext=$4,last_update_id=$5',
        [lang,encryptContext(current,next,config),updateId]);
      return promptResult(event,lang,null,[],{
        business:keys.business,user:keys.user,to:String(event.userId),
        ownerId:connected.owner_id,contextId:row.ai_context_id,
        updateId,locale:lang,voiceNote:event.voiceNote,
      });
    }
    if(action==='continue'){
      await updateRow(db,keys.business,keys.user,
        'locale=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
        [lang,updateId,today(),nextCount]);
      return response(event,lang,canReply?copy.unclear:null);
    }
    if(action==='skip'&&ctx.mode===SECRETARY_MODES.PSYCHOLOGIST){
      let planned=wavePsychologistNativeTurn({message:'skip',locale:lang,
        stage:ctx.intakeStage||'situation',slots:ctx.intakeSlots||{},
        turns:ctx.turns});
      if(!planned?.reply)return response(event,lang,copy.unclear);
      if(planned.stage==='ready'&&
         !wavePsychologistNativeSummary({locale:lang,slots:planned.slots}))
        planned={...planned,stage:'situation',
          reply:SECRETARY_PSYCHOLOGIST_COPY[lang].first};
      const state={...ctx,intakeStage:planned.stage,intakeSlots:planned.slots,
        turns:[...ctx.turns,{role:'assistant',text:planned.reply}].slice(-30)};
      await updateRow(db,keys.business,keys.user,
        'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
        [lang,encryptContext(current,state,config),updateId,today(),nextCount]);
      return response(event,lang,canReply?planned.reply:null,
        v3ButtonsFor(lang,'psych_interview',ctx.turns.filter(x=>x.role==='user').length));
    }
    if(action==='skip'&&ctx.mode===FREE_DIAGNOSTIC_MODE){
      let planned=aliFreeDiagnosticTurn({action:'skip',locale:lang,
        stage:ctx.intakeStage||'goal',slots:ctx.intakeSlots||{},
        retryStage:ctx.freeRetryStage||null,turns:ctx.turns});
      if(planned.stage==='ready'&&
         !aliFreeDiagnosticSummary({locale:lang,slots:planned.slots})){
        // Skipping every question cannot create an empty CRM lead or an
        // unreachable "Finish" button. Keep the optional intake open.
        planned={...planned,stage:'goal',retryStage:null,
          reply:aliFreeDiagnosticEmpty(lang)+' '+aliFreeDiagnosticFirst(lang)};
      }
      const state={...ctx,intakeStage:planned.stage,intakeSlots:planned.slots,
        freeRetryStage:planned.retryStage,
        turns:[...ctx.turns,{role:'assistant',text:planned.reply}].slice(-20)};
      await updateRow(db,keys.business,keys.user,
        'locale=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
        [lang,encryptContext(current,state,config),updateId,today(),nextCount]);
      return response(event,lang,canReply?planned.reply:null,
        v3ButtonsFor(lang,planned.stage==='ready'?'free_ready':'free_interview',
          ctx.turns.filter(x=>x.role==='user').length));
    }
    if(event.photoFileId){
      await updateRow(db,keys.business,keys.user,
        'last_update_id=$3,reply_day=$4,reply_count=$5',
        [updateId,today(),nextCount]);
      return response(event,lang,canReply?copy.photo:null);
    }
    const finishing=action==='finish';
    if(finishing&&ctx.conversationKind==='general'){
      await updateRow(db,keys.business,keys.user,
        "stage='consent',ai_consent_at=null,ai_context_ciphertext=$3,"+
        'last_update_id=$4,reply_day=$5,reply_count=$6',
        [encryptContext(current,{turns:[],pending:null,summary:null,
          conversationKind:'general'},config),updateId,today(),nextCount]);
      return response(event,lang,canReply?chat.ended:null);
    }
    if(finishing&&(!ctx.turns.some(x=>x.role==='user')||
      (ctx.mode===FREE_DIAGNOSTIC_MODE&&
        !aliFreeDiagnosticSummary({locale:lang,slots:ctx.intakeSlots}))||
      (ctx.mode===SECRETARY_MODES.PSYCHOLOGIST&&
        !wavePsychologistNativeSummary({locale:lang,slots:ctx.intakeSlots}))||
      (ctx.conversationKind!=='general'&&
       ![SECRETARY_MODES.PSYCHOLOGIST,FREE_DIAGNOSTIC_MODE].includes(ctx.mode)&&
        !aliGuidedIntakeSummary({locale:lang,slots:ctx.intakeSlots,turns:ctx.turns,
          serviceRequest:ctx.serviceRequest,offerId:ctx.offerId,
          supportSelection:ctx.supportSelection}))))
      return response(event,lang,ctx.mode===FREE_DIAGNOSTIC_MODE?aliFreeDiagnosticEmpty(lang):
        (ctx.serviceRequest||ctx.supportSelection)?
          aliServiceSecretaryQuestion(lang,ctx.intakeStage||'goal',
            aliServiceScenario(ctx.serviceRequest,lang,ctx.offerId)?.journeyKind||'session'):
          copy.empty);
    if(finishing&&ctx.mode===FREE_DIAGNOSTIC_MODE&&!freeCoreAnswersReady(ctx))
      return response(event,lang,freeCoreQuestion(ctx,lang));
    if(!finishing&&!v3CanCallModel(raw))
      return response(event,lang,copy.unclear);
    if(!canReply)return {handled:true};
    if(ctx.conversationKind!=='general'&&ctx.turns.filter(x=>x.role==='user').length>=(ctx.serviceRequest?5:ctx.mode===SECRETARY_MODES.PSYCHOLOGIST?15:ctx.mode===FREE_DIAGNOSTIC_MODE?12:12)&&!finishing)
      return response(event,lang,ctx.serviceRequest?
      (lang==='ru'?'Спасибо! Теперь можно завершить интервью и проверить заявку.':lang==='es'?'Gracias. Ahora puedes revisar tu solicitud.':'Thank you. You can now finish and review your request.'):
      copy.unclear,ctx.serviceRequest?[[V3_LABELS[lang].finish]]:v3ButtonsFor(lang,'interview',4));
    // Fast native Secretary Mind: service intake needs neither a cloud model
    // nor a second post-commit DB transaction. Compute the same bounded
    // Empathy/Guided Intake answer under the signed update lock and emit ONE
    // Telegram reply after commit. This also removes the "typing" dead time.
    if((serviceCopy||ctx.supportSelection)&&ctx.mode!==SECRETARY_MODES.PSYCHOLOGIST&&
       ctx.mode!==FREE_DIAGNOSTIC_MODE&&ctx.conversationKind!=='general'&&!event.voiceNote){
      const urgent=v3ChatPreConsentSafetyReply(raw,lang);
      if(urgent){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        return response(event,lang,canReply?urgent:null);
      }
      const plan=finishing?null:aliGuidedIntakeTurn({
        message:raw,locale:lang,serviceRequest:ctx.serviceRequest,
        offerId:ctx.offerId||null,supportSelection:ctx.supportSelection||null,
        stage:ctx.intakeStage||
          aliIntakeStageFromTurns(ctx.turns,true),
        slots:ctx.intakeSlots||{},turns:ctx.turns,
      });
      if(!finishing&&!plan?.reply)return response(event,lang,copy.unclear);
      const turns=finishing?ctx.turns:[
        ...ctx.turns,{role:'user',text:raw},{role:'assistant',text:plan.reply},
      ].slice(-20);
      const slots=plan?.slots||ctx.intakeSlots||{};
      const sourceDraft=(finishing||plan?.stage==='ready')
        ?aliGuidedIntakeSummary({locale:lang,slots,turns,
          serviceRequest:ctx.serviceRequest,offerId:ctx.offerId,
          supportSelection:ctx.supportSelection}):null;
      const draft=sourceDraft&&ctx.supportSelection
        ?(sourceDraft+'\n\n'+telegramSupportSummary(lang,ctx.supportSelection)).slice(0,950)
        :sourceDraft;
      const review=typeof draft==='string'&&Boolean(draft.trim());
      const amended={...ctx,turns,summary:review?draft:null,pending:null,
        intakeStage:plan?.stage||ctx.intakeStage||'ready',intakeSlots:slots};
      await updateRow(db,keys.business,keys.user,
        'stage=$3,ai_context_ciphertext=$4,last_update_id=$5,reply_day=$6,reply_count=$7',
        [review?'review_confirm':'interview',
          encryptContext(current,amended,config),updateId,today(),nextCount]);
      // The course / free resource can be started immediately; sending the
      // separate practitioner request remains optional and consent-gated.
      const offerHint=review&&ctx.offerId
        ?aliSecretaryOfferActionHint(ctx.offerId,ctx.serviceRequest,lang):null;
      const text=review?((serviceCopy
          ?serviceCopy.reviewTitle+draft+serviceCopy.reviewQuestion
          :copy.reviewTitle+draft+copy.reviewQuestion)+
            (offerHint?'\n\n'+offerHint:'')):
        (plan?.reply||((serviceCopy||ctx.supportSelection)?
          aliServiceSecretaryQuestion(lang,ctx.intakeStage||'goal',
            aliServiceScenario(ctx.serviceRequest,lang,ctx.offerId)?.journeyKind||'session'):
          copy.empty));
      return response(event,lang,canReply?text.slice(0,1170):null,
        review?v3ButtonsFor(lang,'review_confirm',0,ctx.serviceRequest):
          v3ButtonsFor(lang,'interview',turns.filter(x=>x.role==='user').length));
    }
    const pending={id:updateId,kind:finishing?'summary':'question',
      text:finishing?'':raw,queuedAt:Date.now()};
    const next={...ctx,pending};
    const encrypted=encryptContext(current,next,config);
    await updateRow(db,keys.business,keys.user,
      'locale=$3,ai_context_ciphertext=$4,last_update_id=$5',
      [lang,encrypted,updateId]);
    return promptResult(event,lang,null,[],{
      business:keys.business,user:keys.user,to:String(event.userId),
      ownerId:connected.owner_id,contextId:row.ai_context_id,
      updateId,locale:lang,
    });
  });
}

/** Bind a fresh voice-offer to the ACTUAL official Telegram bot message.
 * A failed/late/unconfirmed send cannot create valid consent from stale keys. */
export async function bindTelegramWaveVoiceOffer(config,offer,providerId){
  const messageId=Number(providerId);
  if(!offer||!Number.isSafeInteger(messageId)||messageId<=0||
     !Number.isSafeInteger(offer.updateId)||offer.updateId<=0)return false;
  return webhookTransaction(config,async db=>{
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [offer.business+':'+offer.user]);
    const row=await readRow(db,offer.business,offer.user);
    if(!row||row.stage!=='interview'||!row.ai_consent_at||
       row.ai_context_id!==offer.contextId)return false;
    const current={...row,owner_id:offer.ownerId},ctx=openContext(current,config);
    const at=Date.parse(ctx.voiceOfferAt||'');
    if(ctx.voiceOfferUpdateId!==offer.updateId||
       !Number.isFinite(at)||at>Date.now()||Date.now()-at>5*60*1000||
       voiceConsentValid(ctx))return false;
    await updateRow(db,offer.business,offer.user,'ai_context_ciphertext=$3',
      [encryptContext(current,{...ctx,voiceOfferMessageId:messageId},config)]);
    return true;
  });
}

/** Bounded post-commit processing, never executed inside the signed webhook's
 * PostgreSQL transaction. Consent/STOP are rechecked both before and after AI.
 */
export async function finishTelegramAiV3(config,job,env=process.env){
  if(!job||!supported(env))return null;
  const prior=await webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||
      !row.ai_consent_at||row.ai_context_id!==job.contextId)return null;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.pending?.id!==job.updateId)return null;
    return {ctx,locale:row.locale};
  });
  if(!prior||!((prior.ctx.conversationKind==='general'||prior.ctx.mode===FREE_DIAGNOSTIC_MODE||
       prior.ctx.supportSelection&&prior.ctx.mode!==SECRETARY_MODES.PSYCHOLOGIST)?v3CanChat(env):v3ServiceIntakeReady(env)))return null;
  if(prior.ctx.pending.voice&&(!voiceConsentValid(prior.ctx)||!waveTelegramVoiceReady(env)))return null;
  let result=null,error=false;
  const turns=[...prior.ctx.turns];
  if(prior.ctx.pending.kind==='question')
    turns.push({role:'user',text:prior.ctx.pending.text});
  try{
    // Apply the same deterministic emergency response AFTER consent too.
    // The model must never be the sole responder to explicit danger cues.
    const urgentDuringChat=v3ChatPreConsentSafetyReply(prior.ctx.pending.text,prior.locale);
    if(urgentDuringChat){
      result={text:urgentDuringChat,freeCostVerified:true};
    }else if(danger(prior.ctx.pending.text)){
      result={text:prior.locale==='ru'
        ?'Если есть непосредственная опасность, обратись в местную экстренную службу или к человеку, которому доверяешь. Я могу выслушать, но не заменяю срочную помощь.'
        :prior.locale==='es'
          ?'Si estás en peligro inmediato, contacta con emergencias locales o alguien de confianza. No sustituyo la ayuda urgente.'
          :'If you are in immediate danger, contact local emergency services or someone you trust. I cannot replace urgent help.',
        freeCostVerified:true};
    }else if(prior.ctx.conversationKind!=='general'&&
      prior.ctx.mode===FREE_DIAGNOSTIC_MODE){
      // Source-faithful free review, with six adaptive questions. No model
      // access, paid provider, automatic interpretation or CRM side effect.
      if(prior.ctx.pending.kind==='summary'){
        const draft=aliFreeDiagnosticSummary({locale:prior.locale,
          slots:prior.ctx.intakeSlots||{}});
        if(!draft)throw Object.assign(new Error('EMPTY_FREE_REVIEW'),{
          code:'EMPTY_FREE_REVIEW'});
        result={text:draft,provider:'ali-free-diagnostic',freeCostVerified:true};
      }else{
        const plan=aliFreeDiagnosticTurn({message:prior.ctx.pending.text,
          locale:prior.locale,stage:prior.ctx.intakeStage||'goal',
          slots:prior.ctx.intakeSlots||{},turns:prior.ctx.turns,
          retryStage:prior.ctx.freeRetryStage||null});
        if(!plan?.reply)throw Object.assign(new Error('FREE_REVIEW_UNAVAILABLE'),{
          code:'FREE_REVIEW_UNAVAILABLE'});
        result={text:plan.reply,intakePlan:plan,provider:'ali-free-diagnostic',freeCostVerified:true};
      }
    }else if(prior.ctx.conversationKind!=='general'&&
      prior.ctx.mode===SECRETARY_MODES.PSYCHOLOGIST){
      // First-party Secretary Psychologist: adaptive questions and factual
      // summary, no OpenRouter/Qwen request, offsite form or extra model.
      if(prior.ctx.pending.kind==='summary'){
        const draft=wavePsychologistNativeSummary({locale:prior.locale,
          slots:prior.ctx.intakeSlots||{}});
        if(!draft)throw Object.assign(new Error('EMPTY_PSYCHOLOGIST_SUMMARY'),{
          code:'EMPTY_PSYCHOLOGIST_SUMMARY'});
        result={text:draft,provider:'wave-psychologist-native',freeCostVerified:true};
      }else{
        const plan=wavePsychologistNativeTurn({
          message:prior.ctx.pending.text,locale:prior.locale,
          stage:prior.ctx.intakeStage||'situation',
          slots:prior.ctx.intakeSlots||{},turns:prior.ctx.turns});
        if(!plan?.reply)throw Object.assign(new Error('PSYCHOLOGIST_NATIVE_UNAVAILABLE'),{
          code:'PSYCHOLOGIST_NATIVE_UNAVAILABLE'});
        result={text:plan.reply,intakePlan:plan,
          provider:'wave-psychologist-native',freeCostVerified:true};
      }
    }else if(prior.ctx.conversationKind!=='general'){
      // The short Secretary interview is a real, bounded phase machine.
      // Only consented text enters this pure planner; no provider/API call.
      if(prior.ctx.pending.kind==='summary'){
        const draft=aliGuidedIntakeSummary({locale:prior.locale,
          slots:prior.ctx.intakeSlots,turns:prior.ctx.turns,
          serviceRequest:prior.ctx.serviceRequest,offerId:prior.ctx.offerId,
          supportSelection:prior.ctx.supportSelection});
        if(!draft)throw Object.assign(new Error('EMPTY_INTAKE_SUMMARY'),{
          code:'EMPTY_INTAKE_SUMMARY'});
        result={text:(prior.ctx.supportSelection?
          (draft+'\n\n'+telegramSupportSummary(prior.locale,prior.ctx.supportSelection)).slice(0,950):draft),
          provider:'ali-guided-intake',freeCostVerified:true};
      }else{
        const plan=aliGuidedIntakeTurn({message:prior.ctx.pending.text,
           serviceRequest:prior.ctx.serviceRequest,
          offerId:prior.ctx.offerId||null,supportSelection:prior.ctx.supportSelection||null,
          locale:prior.locale,
          stage:prior.ctx.intakeStage||
            aliIntakeStageFromTurns(prior.ctx.turns,Boolean(prior.ctx.serviceRequest)),
          slots:prior.ctx.intakeSlots||{},turns:prior.ctx.turns});
        if(!plan?.reply)throw Object.assign(new Error('INTAKE_UNAVAILABLE'),{
          code:'INTAKE_UNAVAILABLE'});
        result={text:plan.reply,intakePlan:plan,
          provider:'ali-guided-intake',freeCostVerified:true};
      }
    }else{
      // Use reviewed, fixed first-party public links before optional model
      // inference. The V3 chat consent, voice STOP/nonce, and rate limits
      // are unchanged; course discovery does not create an order or lead.
      const publicCatalogue=prior.ctx.conversationKind==='general'&&
        prior.ctx.pending.kind==='question'
        ?composeTelegramWavePublicReply(prior.ctx.pending.text,prior.locale):null;
      // Ali's already-reviewed Sales/Consultant decisions precede inference.
      // The consented chat history stays in this server's encrypted context.
      const aliService=prior.ctx.conversationKind==='general'&&
        prior.ctx.pending.kind==='question'
        ?composeTelegramAliServiceReply(prior.ctx.pending.text,prior.locale,prior.ctx.turns):null;
      if(publicCatalogue){
        result={text:publicCatalogue.text,provider:'wave-public-catalogue',freeCostVerified:true};
      }else if(aliService){
        result={text:aliService.text,provider:aliService.source,freeCostVerified:true};
      }else{
        const native=prior.ctx.conversationKind==='general'&&prior.ctx.pending.kind==='question'
          ?waveNativeTurn({message:prior.ctx.pending.text,locale:prior.locale,
            history:prior.ctx.turns}):null;
        if(native)result={text:native.reply,provider:'wave-native',freeCostVerified:true};
        else result=await v3Generate({
          kind:prior.ctx.conversationKind==='general'?'chat':prior.ctx.pending.kind,
          locale:prior.locale,turns,serviceRequest:prior.ctx.serviceRequest,
          mode:prior.ctx.mode||SECRETARY_MODES.SECRETARY,
          supportSelection:prior.ctx.supportSelection||null,
        },env);
      }
      if(typeof result?.text!=='string'||!result.text.trim())
        throw Object.assign(new Error('EMPTY_MODEL_REPLY'),{code:'EMPTY_MODEL_REPLY'});
    }
  }catch(cause){
    error=true;
    const code=typeof cause?.code==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(cause.code)
      ?cause.code:'GENERATION_FAILED';
    if(prior.ctx.conversationKind==='general'&&prior.ctx.pending.kind==='question'){
      // Already consented. The first-party fallback has NO external inference,
      // preserves the same encrypted chat context and never fabricates actions.
      result={text:waveTelegramLocalReply({locale:prior.locale,turns})};
      error=!result.text;
    }
    // Privacy-safe status only: never log user text, chat ID, IP, prompts or keys.
    console.warn('wave_telegram_inference',JSON.stringify({
      code,kind:prior.ctx.conversationKind==='general'?'chat':'intake',
      fallbackDelivered:!error,
    }));
  }
  return webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||
      !row.ai_consent_at||row.ai_context_id!==job.contextId)return null;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.pending?.id!==job.updateId)return null;
    if(ctx.pending.voice&&(!voiceConsentValid(ctx)||!waveTelegramVoiceReady(env)))return null;
    const locale=v3Locale(row.locale);
    const copy=V3_COPY[locale],chat=V3_CHAT_COPY[locale],kind=ctx.pending.kind;
    const serviceCopy=v3ServiceCopy(locale,ctx.serviceRequest,ctx.offerId);
    const nextTurns=[...ctx.turns];
    if(kind==='question'){
      nextTurns.push({role:'user',text:ctx.pending.text});
      if(!error&&result?.text)
        nextTurns.push({role:'assistant',text:result.text});
    }
    // A selected consultation moves straight to a factual review after
    // two useful answers (or an explicit booking request). A separate Send
    // action remains mandatory before any CRM record or practitioner notice.
    const quickDraft=kind==='question'&&!error&&serviceCopy&&
      result?.intakePlan?.stage==='ready'&&
      ['goal','challenge','situation'].some(key=>result.intakePlan.slots?.[key])
        ?ctx.mode===SECRETARY_MODES.PSYCHOLOGIST
          ?wavePsychologistNativeSummary({locale,slots:result.intakePlan.slots})
          :ctx.mode===FREE_DIAGNOSTIC_MODE
            ?aliFreeDiagnosticSummary({locale,slots:result.intakePlan.slots})
            :aliGuidedIntakeSummary({locale,slots:result.intakePlan.slots,turns:nextTurns,
              serviceRequest:ctx.serviceRequest,offerId:ctx.offerId,
              supportSelection:ctx.supportSelection})
        :null;
    const reviewText=quickDraft||(kind==='summary'&&!error?result?.text:null);
    const nextContext={
      ...ctx,turns:nextTurns.slice(ctx.mode===SECRETARY_MODES.PSYCHOLOGIST?-30:-20),pending:null,
      // Only a consented voice job receives a final-send marker. Typed text
      // remains on the existing post-commit delivery path.
      voiceDeliveryPendingId:ctx.pending.voice===true?job.updateId:null,
      summary:reviewText||ctx.summary,
      ...(kind==='question'&&result?.intakePlan&&!error?{
        intakeStage:result.intakePlan.stage,
        intakeSlots:result.intakePlan.slots,
        ...(ctx.mode===FREE_DIAGNOSTIC_MODE?{
          freeRetryStage:result.intakePlan.retryStage||null}:{}),
      }:{}),
    };
    const review=Boolean(reviewText)&&!error;
    const count=dayCount(row),canReply=count<40;
    await updateRow(db,job.business,job.user,
      'stage=$3,ai_context_ciphertext=$4,reply_day=$5,reply_count=$6',
      [review?'review_confirm':'interview',
        encryptContext({...row,owner_id:job.ownerId},nextContext,config),
        today(),canReply?count+1:count]);
    if(!canReply)return null;
    const message=error?(ctx.conversationKind==='general'?chat.failed:copy.providerError):review
      ?(serviceCopy?serviceCopy.reviewTitle+reviewText+serviceCopy.reviewQuestion:
          copy.reviewTitle+reviewText+copy.reviewQuestion):result.text;
    if(!message)return null;
    const newFreeCodes=ctx.mode===FREE_DIAGNOSTIC_MODE&&kind==='question'&&
      !error&&result?.intakePlan
      ?['goal','challenge','situation','impact','attempts','support'].filter(key=>
        typeof nextContext.intakeSlots?.[key]==='string'&&
        nextContext.intakeSlots[key]!==ctx.intakeSlots?.[key]):[];
    const readyForReview=!review&&!error&&ctx.conversationKind!=='general'&&
      nextContext.intakeStage==='ready';
    const freeInterview=!review&&!error&&ctx.mode===FREE_DIAGNOSTIC_MODE;
    const psychInterview=!review&&!error&&ctx.mode===SECRETARY_MODES.PSYCHOLOGIST;
    return {to:job.to,locale,reply:message.slice(0,1170),
      keyboard:ctx.conversationKind==='general'?[]:
        (error?[[V3_LABELS[locale].finish]]:
        readyForReview?(ctx.mode===FREE_DIAGNOSTIC_MODE
          ?v3ButtonsFor(locale,'free_ready')
          :ctx.mode===SECRETARY_MODES.PSYCHOLOGIST
            ?[[V3_LABELS[locale].finish,V3_LABELS[locale].book]]
            :[[V3_LABELS[locale].finish]]):v3ButtonsFor(locale,
        freeInterview?'free_interview':psychInterview?'psych_interview':
          review?'review_confirm':'interview',
        nextTurns.filter(x=>x.role==='user').length,ctx.serviceRequest)),
      approvedPilotGuest:false,
      ...(newFreeCodes.length?{ownerProgress:{
        business:job.business,user:job.user,ownerId:job.ownerId,
        contextId:job.contextId,updateId:job.updateId,
        locale,codes:newFreeCodes}}:{})};
  });
}

/** Verify actual private Telegram JPEG/PNG bytes BEFORE confirming a receipt.
 * No image is interpreted, made public, or moved to the practitioner's CRM
 * until the client separately approves the summary. STOP wins during download.
 */
export async function finishTelegramFreePackagePhoto(config,job,env=process.env){
  if(!job||!supported(env)||!/^\d+$/.test(String(job.to||'')))return null;
  const before=await webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||!(row.stage==='interview'||(row.stage==='done'&&row.ai_review_consent_at))||
       !row.ai_consent_at||row.ai_context_id!==job.contextId)return null;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.mode!==FREE_DIAGNOSTIC_MODE||
       (row.stage==='done'&&ctx.formReceipt?.status!=='received')||
       ctx.mediaPending?.updateId!==job.updateId||
       ctx.mediaPending?.step!==ctx.mediaStep)return null;
    return ctx.mediaPending;
  });
  if(!before)return null;
  let bytes=0,valid=false;
  try{
    const verified=await retrievePrivateTelegramPhoto(before.fileId,env);
    bytes=verified.bytes.length;
    valid=['image/jpeg','image/png'].includes(verified.contentType)&&
      bytes>0&&bytes<=5*1024*1024;
  }catch{/* No false receipt, no raw file/token in logs. */}
  return webhookTransaction(config,async db=>{
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [job.business+':'+job.user]);
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||!(row.stage==='interview'||(row.stage==='done'&&row.ai_review_consent_at))||
       !row.ai_consent_at||row.ai_context_id!==job.contextId)return null;
    const current={...row,owner_id:job.ownerId},ctx=openContext(current,config);
    const pending=ctx.mediaPending;
    if(ctx.mode!==FREE_DIAGNOSTIC_MODE||
       (row.stage==='done'&&ctx.formReceipt?.status!=='received')||
       pending?.updateId!==job.updateId||
       pending?.messageId!==before.messageId||
       pending?.step!==ctx.mediaStep)return null;
    const copy=freePackageCopy(row.locale),step=pending.step;
    const proof=valid?safeFreeMediaReceipt({
      fileId:pending.fileId,messageId:pending.messageId,bytes}):null;
    const next=proof?acceptedFreeMedia(ctx,step,proof):{...ctx,mediaPending:null};
    if(proof&&row.stage==='done'&&step==='portrait'){
      // A portrait uploaded after the form must reach the SAME encrypted
      // practitioner CRM thread, not only the user's private V3 ledger.
      // Do not acknowledge a photo before its owner-only CRM reference commits.
      const stored=await ingestMessengerEventInTransaction(db,'telegram',{
        type:'incoming',userId:ctx.verifiedTelegramUserId,
        eventId:'tg:'+job.updateId+':verified-portrait',
        messageId:'tg:verified-portrait:'+pending.messageId,
        name:'Telegram participant',
        sentAt:new Date().toISOString(),diagnosticLocale:row.locale,
        body:'[Verified voluntary personal photo for private review]\n'+
          freePackageStatusMessage(next,row.locale),
        telegramPhotoFileId:proof.fileId,telegramPhotoPurpose:'portrait',
        stop:false,
      },config,job.business);
      if(stored!==true)throw new Error('FREE_PORTRAIT_CRM_STORAGE_NOT_CONFIRMED');
    }
    await updateRow(db,job.business,job.user,
      'ai_context_ciphertext=$3,reply_day=$4,reply_count=$5',
      [encryptContext(current,next,config),today(),Math.min(40,dayCount(row)+1)]);
    const reply=proof
      ?(step==='portrait'?copy.portraitAccepted:copy.drawingAccepted)+'\n\n'+
        (row.stage==='done'&&step==='portrait'?copy.completed:copy.review)
      :(step==='portrait'?copy.portraitRetry:copy.drawingRetry);
    return {to:job.to,locale:row.locale,reply,approvedPilotGuest:false,
      keyboard:proof?row.stage==='done'?[]:[[V3_LABELS[row.locale].finish]]:
        v3ButtonsFor(row.locale,step==='portrait'?'free_portrait':'free_drawing'),
      ...(proof?{ownerProgress:{business:job.business,user:job.user,
        ownerId:job.ownerId,contextId:job.contextId,
        updateId:job.updateId,locale:row.locale,
        codes:next.mediaStep==='complete'?[step,'complete']:[step]}}:{})};
  });
}

/** Voice originates only from a signed Telegram private-chat update, never
 * from user-supplied text. Pending state and voice consent are checked before
 * download, after STT and again by the normal Wave reply path.
 */
export async function finishTelegramWaveVoiceV3(config,job,env=process.env){
  if(!job?.voiceNote||!supported(env))return null;
  const active=async()=>webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||
       !row.ai_consent_at||row.ai_context_id!==job.contextId)return false;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    return ctx.pending?.id===job.updateId&&ctx.pending.voice===true&&
      voiceConsentValid(ctx);
  });
  if(!await active())return null;
  const failVoice=async(key)=>webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||row.stage!=='interview'||!row.ai_consent_at||
       row.ai_context_id!==job.contextId)return null;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.pending?.id!==job.updateId||ctx.pending.voice!==true||
       !voiceConsentValid(ctx))return null;
    await updateRow(db,job.business,job.user,
      'ai_context_ciphertext=$3',[encryptContext({...row,owner_id:job.ownerId},
        {...ctx,pending:null,voiceDeliveryPendingId:job.updateId},config)]);
    return {to:job.to,locale:row.locale,
      reply:waveTelegramVoiceCopy(row.locale,key),keyboard:[],
      approvedPilotGuest:false};
  });
  if(!waveTelegramVoiceReady(env))return failVoice('unavailable');
  let transcript;
  try{
    // Share the existing Studio free Whisper quota, never add paid overage.
    await consumeRate(config,{op:'audio-stt-free-global-day'},20,86400);
    await consumeRate(config,{op:'audio-stt-free-global-minute'},3,60);
    await consumeRate(config,{op:'tg-wave-voice-chat-day',
      business:job.business,user:job.user},8,86400);
    if(!await active())return null;
    transcript=await transcribeWaveTelegramVoice(job.voiceNote,{
      token:env.HH_CRM_MSG_TELEGRAM_TOKEN,
      key:env.HH_FIRST_VIDEO_GROQ_API_KEY,locale:job.locale});
  }catch{
    // No provider retry; never log transcripts, tokens, file IDs or chat IDs.
    return failVoice('failed');
  }
  const accepted=await webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||row.stage!=='interview'||!row.ai_consent_at||
       row.ai_context_id!==job.contextId)return false;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.pending?.id!==job.updateId||ctx.pending.voice!==true||
       !voiceConsentValid(ctx)||!waveTelegramVoiceReady(env))return false;
    const next={...ctx,pending:{...ctx.pending,text:transcript}};
    await updateRow(db,job.business,job.user,'ai_context_ciphertext=$3',
      [encryptContext({...row,owner_id:job.ownerId},next,config)]);
    return true;
  });
  if(!accepted)return null;
  const answer=await finishTelegramAiV3(config,job,env);
  if(!answer?.reply)return answer;
  return {...answer,reply:(waveTelegramVoiceCopy(answer.locale,'heard')+
    ': '+transcript.slice(0,180)+'\n\n'+answer.reply).slice(0,1170)};
}


/** Exactly one bounded Telegram voice send under the same per-session DB lock
 * used by /voice_off and STOP. No network retries after an uncertain result.
 * Telegram send has the existing 9-second abort deadline in messenger-provider.
 * A transaction failure or revoked consent fails closed (no delivery claim). */
export async function deliverTelegramWaveVoiceV3(config,job,reply,send,env=process.env){
  if(!job?.voiceNote||!supported(env)||!reply?.reply||typeof send!=='function')
    return false;
  return webhookTransaction(config,async db=>{
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [job.business+':'+job.user]);
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||
       !row.ai_consent_at||row.ai_context_id!==job.contextId)return false;
    const current={...row,owner_id:job.ownerId},ctx=openContext(current,config);
    if(!voiceConsentValid(ctx)||ctx.voiceDeliveryPendingId!==job.updateId)
      return false;
    // Consume intent even if Telegram's outcome becomes uncertain; never
    // replay a provider request for the same voice update.
    await updateRow(db,job.business,job.user,'ai_context_ciphertext=$3',
      [encryptContext(current,{...ctx,voiceDeliveryPendingId:null},config)]);
    try{
      // The lock is deliberately held through the ONE bounded send attempt.
      // A concurrent STOP or /voice_off cannot commit between check and send.
      await send({to:reply.to,text:reply.reply,keyboard:reply.keyboard,
        locale:reply.locale,approvedPilotGuest:reply.approvedPilotGuest});
      return true;
    }catch{
      console.error('HH_TG_VOICE_FINAL_SEND_UNCONFIRMED');
      return false;
    }
  });
}
