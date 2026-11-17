import 'server-only';
import {randomUUID} from 'node:crypto';
import {consumeRate} from '../app/database.js';
import {waveTelegramVoiceReady,validWaveTelegramVoiceMeta,
  waveTelegramVoiceCopy,transcribeWaveTelegramVoice} from './telegram-wave-voice.mjs';
import {seal,openSealed,operationHash} from '../app/crypto.js';
import {businessHash} from './messenger-store.js';
import {channelTransportReady,telegramBotBusinessId,telegramPilotReady,telegramPublicDiagnosticReady} from './messenger-policy.js';
import {webhookTransaction,ingestMessengerEventInTransaction} from './messenger-webhook.js';
import {detectConversationLocale} from '../holistic-support/conversation-locale.mjs';
import {V3_COPY,V3_LABELS,v3Locale,v3StartLocale,v3IsStop,v3Action,
  v3Context,v3ButtonsFor,v3VoiceOfferValid,v3CanStart,v3CanChat,v3CanCallModel,v3DailyReplyCount,v3WantsGeneralChat,V3_CHAT_COPY,v3ChatPreConsentSafetyReply,v3ServiceStart,v3ServiceCopy} from './telegram-ai-diagnostic-v3.mjs';
import {v3Generate} from './telegram-ai-diagnostic-v3-model.mjs';
import {publicEnquiryReference} from '../practitioners/public-service-enquiry-input.mjs';
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
  const raw=cappedText(event.rawText),serviceStart=v3ServiceStart(raw),
    start=v3StartLocale(raw)||serviceStart?.locale,stop=v3IsStop(raw)||event.stop;
  const allowed=v3CanStart(env),chatAllowed=v3CanChat(env);
  return webhookTransaction(config,async db=>{
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [keys.business+':'+keys.user]);
    const connected=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',keys.business])).rows[0];
    if(!connected)return {handled:false};
    const row=await readRow(db,keys.business,keys.user);
    const active=Number(row?.flow_version)===3&&row?.chat_mode!=='direct';
    const generalStart=chatAllowed&&!start&&!event.inlineAction&&
      (v3WantsGeneralChat(raw)||Boolean(event.voiceNote))&&
      (!row||(active&&row.stage==='consent'));
    if(!active&&!generalStart&&(!start||!allowed))return {handled:false};
    if(telegramPilotReady(env)&&String(event.userId)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID){
      if(!row?.pilot_access_until||Date.parse(row.pilot_access_until)<=Date.now())
        return {handled:false};
    }
    if(row&&Number(row.last_update_id)>=updateId)
      return {handled:true,callbackId:event.callbackId||null,duplicate:true};
    const lang=languageFrom(event,row?.locale,start);
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
        return response(event,lang,canReply?(urgent||chat.intro):null,
          urgent?[]:v3ButtonsFor(lang,'chat_consent'));
      }
    }
    // A repeated start while consent is still pending is not a new interview.
    // Preserve the privacy explanation already shown; never re-send its wall of text.
    if(start&&active&&row?.stage==='consent'){
      if(!serviceStart){
      await updateRow(db,keys.business,keys.user,
        'locale=$3,last_update_id=$4,reply_day=$5,reply_count=$6',
        [lang,updateId,today(),nextCount]);
      return response(event,lang,canReply?copy.nudge:null,v3ButtonsFor(lang,'consent'));
      }
    }
    if(start){
      // Only an explicit new Start opts into V3. Existing V1/V2 sessions
      // continue on their original path for every ordinary message.
      const contextId=randomUUID();
      const seeded=serviceStart?encryptContext(
        {owner_id:connected.owner_id,ai_context_id:contextId},
        {turns:[],pending:null,summary:null,serviceRequest:serviceStart.service},config):null;
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
      const introduction=serviceStart&&v3ServiceCopy(lang,serviceStart.service);
      return response(event,lang,canReply?(introduction?.intro||copy.intro):null,v3ButtonsFor(lang,'consent'));
    }
    if(!active)return {handled:false};
    const current={...row,owner_id:connected.owner_id};
    const ctx=openContext(current,config);
    const serviceCopy=v3ServiceCopy(lang,ctx.serviceRequest);
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
    if(row.stage==='consent'){
      const general=ctx.conversationKind==='general';
      if((general&&(action==='chatlater'||action==='decline'))||(!general&&action==='decline')){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        return response(event,lang,canReply?(general?chat.later:copy.later):null);
      }
      const agrees=general?action==='chatagree':
        (action==='agree'||(!event.inlineAction&&isExplicitYes(raw)));
      const purposeReady=general?chatAllowed:allowed;
      if(!agrees||!purposeReady){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        const reminder=general?(chatAllowed?chat.nudge:copy.notReady):
          (allowed?copy.nudge:copy.notReady);
        return response(event,lang,canReply?reminder:null,
          purposeReady?v3ButtonsFor(lang,general?'chat_consent':'consent'):[]);
      }
      await updateRow(db,keys.business,keys.user,
        "stage='interview',locale=$3,ai_consent_at=now(),last_update_id=$4,"+
        'reply_day=$5,reply_count=$6',
        [lang,updateId,today(),nextCount]);
      return response(event,lang,canReply?(general?chat.first:serviceCopy?.first||copy.first):null);
    }
    if(!row.ai_consent_at||!(ctx.conversationKind==='general'?chatAllowed:allowed))
      return response(event,lang,copy.notReady);
    if(row.stage==='done'){
      if(!row.consent_at)return {handled:true};
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
      if(action==='send'){
        if(!ctx.summary)return response(event,lang,copy.empty);
        // The initial CRM contact is created ONLY after this separate
        // explicit personal-review handoff. The full client-authored turn
        // history is transferred once into the EXISTING owner-encrypted CRM.
        const notes=ctx.turns.filter(x=>x.role==='user').slice(-10);
        const serviceRef=serviceCopy?publicEnquiryReference(row.ai_context_id):null;
        const messages=[...(serviceCopy?[{
          body:'Confirmed service request '+serviceRef+': '+serviceCopy.title+'. Reply in this verified CRM Telegram thread. Booking and payment are not confirmed.',
          eventId:event.eventId+':service',messageId:event.messageId+':service',
        }]:[]),...notes.map((turn,i)=>({
          body:'Клиент / Client: '+turn.text.slice(0,1080),
          eventId:event.eventId+':ai:'+i,messageId:event.messageId+':ai:'+i,
        })),{
          body:'AI draft confirmed by client / Запрос подтверждён клиентом:\n'+ctx.summary.slice(0,1020),
          eventId:event.eventId+':summary',messageId:event.messageId+':summary',
        }];
        for(const item of messages){
          await ingestMessengerEventInTransaction(db,'telegram',{
            ...event,...item,stop:false,diagnosticLocale:lang,telegramPhotoFileId:null,
          },config,keys.business);
        }
        await updateRow(db,keys.business,keys.user,
          "stage='done',locale=$3,ai_review_consent_at=now(),consent_at=now(),"+
          'last_update_id=$4,reply_day=$5,reply_count=$6',
          [lang,updateId,today(),nextCount]);
        if(serviceCopy)return {...response(event,lang,null),serviceFinalize:{
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
    if(finishing&&!ctx.turns.some(x=>x.role==='user'))
      return response(event,lang,copy.empty);
    if(!finishing&&!v3CanCallModel(raw))
      return response(event,lang,copy.unclear);
    if(!canReply)return {handled:true};
    if(ctx.conversationKind!=='general'&&ctx.turns.filter(x=>x.role==='user').length>=(ctx.serviceRequest?5:12)&&!finishing)
      return response(event,lang,ctx.serviceRequest?
      (lang==='ru'?'Спасибо! Теперь можно завершить интервью и проверить заявку.':lang==='es'?'Gracias. Ahora puedes revisar tu solicitud.':'Thank you. You can now finish and review your request.'):
      copy.unclear,ctx.serviceRequest?[[V3_LABELS[lang].finish]]:v3ButtonsFor(lang,'interview',4));
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
  if(!prior||!(prior.ctx.conversationKind==='general'?v3CanChat(env):v3CanStart(env)))return null;
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
    const serviceCopy=v3ServiceCopy(locale,ctx.serviceRequest);
    const nextTurns=[...ctx.turns];
    if(kind==='question'){
      nextTurns.push({role:'user',text:ctx.pending.text});
      if(!error&&result?.text)
        nextTurns.push({role:'assistant',text:result.text});
    }
    const nextContext={
      ...ctx,turns:nextTurns.slice(-20),pending:null,
      // Only a consented voice job receives a final-send marker. Typed text
      // remains on the existing post-commit delivery path.
      voiceDeliveryPendingId:ctx.pending.voice===true?job.updateId:null,
      summary:kind==='summary'&&!error?result.text:ctx.summary,
    };
    const review=kind==='summary'&&!error&&Boolean(result?.text);
    const count=dayCount(row),canReply=count<40;
    await updateRow(db,job.business,job.user,
      'stage=$3,ai_context_ciphertext=$4,reply_day=$5,reply_count=$6',
      [review?'review_confirm':'interview',
        encryptContext({...row,owner_id:job.ownerId},nextContext,config),
        today(),canReply?count+1:count]);
    if(!canReply)return null;
    const message=error?(ctx.conversationKind==='general'?chat.failed:copy.providerError):review
      ?(serviceCopy?serviceCopy.reviewTitle+result.text+serviceCopy.reviewQuestion:
          copy.reviewTitle+result.text+copy.reviewQuestion):result.text;
    if(!message)return null;
    return {to:job.to,locale,reply:message.slice(0,1170),
      keyboard:ctx.conversationKind==='general'?[]:
        (error?[[V3_LABELS[locale].finish]]:v3ButtonsFor(locale,
        review?'review_confirm':'interview',
        nextTurns.filter(x=>x.role==='user').length,ctx.serviceRequest)),approvedPilotGuest:false};
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
