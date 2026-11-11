import 'server-only';
import {randomUUID} from 'node:crypto';
import {seal,openSealed,operationHash} from '../app/crypto.js';
import {businessHash} from './messenger-store.js';
import {channelTransportReady,telegramBotBusinessId,telegramPilotReady,telegramPublicDiagnosticReady} from './messenger-policy.js';
import {webhookTransaction,ingestMessengerEventInTransaction} from './messenger-webhook.js';
import {detectConversationLocale} from '../holistic-support/conversation-locale.mjs';
import {V3_COPY,V3_LABELS,v3Locale,v3StartLocale,v3IsStop,v3Action,
  v3Context,v3ButtonsFor,v3CanStart,v3CanCallModel} from './telegram-ai-diagnostic-v3.mjs';
import {v3Generate} from './telegram-ai-diagnostic-v3-model.mjs';

const TABLE='app_private.crm_tg_diagnostic_sessions';
const iso=()=>new Date().toISOString();
const today=()=>iso().slice(0,10);
const validId=value=>/^[0-9]{1,25}$/.test(String(value||''));
const safeNumber=id=>Number.isSafeInteger(id)&&id>=0;
const consentWords=new Set(['да','yes','sí','si','конечно','sure']);
const cappedText=text=>String(text||'').trim().slice(0,1200);
const isExplicitYes=value=>consentWords.has(String(value||'').trim().toLowerCase().replace(/[!. ]+$/,''));
const danger=value=>/(?:хочу покончить с собой|убью себя|не могу дышать|боль в груди|suicide|kill myself|cannot breathe|chest pain|suicid|no puedo respirar)/iu.test(String(value||''));
const dayCount=row=>String(row?.reply_day||'').slice(0,10)===today()?Math.max(0,Number(row.reply_count)||0):0;
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
  const raw=cappedText(event.rawText),start=v3StartLocale(raw),stop=v3IsStop(raw)||event.stop;
  const allowed=v3CanStart(env);
  return webhookTransaction(config,async db=>{
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [keys.business+':'+keys.user]);
    const connected=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',keys.business])).rows[0];
    if(!connected)return {handled:false};
    const row=await readRow(db,keys.business,keys.user);
    const active=Number(row?.flow_version)===3&&row?.chat_mode!=='direct';
    if(!active&&(!start||!allowed))return {handled:false};
    if(telegramPilotReady(env)&&String(event.userId)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID){
      if(!row?.pilot_access_until||Date.parse(row.pilot_access_until)<=Date.now())
        return {handled:false};
    }
    if(row&&Number(row.last_update_id)>=updateId)
      return {handled:true,callbackId:event.callbackId||null,duplicate:true};
    const lang=languageFrom(event,row?.locale,start);
    const copy=V3_COPY[lang],count=dayCount(row),canReply=count<40;
    const nextCount=canReply?count+1:count;
    if(row?.stage==='stopped')return {handled:true,callbackId:event.callbackId||null};
    if(start){
      // Only an explicit new Start opts into V3. Existing V1/V2 sessions
      // continue on their original path for every ordinary message.
      const contextId=randomUUID();
      if(row)await updateRow(db,keys.business,keys.user,
        "stage='consent',locale=$3,flow_version=3,chat_mode='diagnostic',"+
        'last_update_id=$4,ai_context_id=$5,ai_context_ciphertext=null,'+
        'ai_consent_at=null,ai_review_consent_at=null,consent_at=null,'+
        'topic=null,reply_day=$6,reply_count=$7,service_handoff=false,service_offering_id=null',
        [lang,updateId,contextId,today(),nextCount]);
      else await db.query(
        'insert into '+TABLE+' (business_hash,user_hash,stage,locale,last_update_id,'+
        'flow_version,chat_mode,ai_context_id,reply_day,reply_count) '+
        "values($1,$2,'consent',$3,$4,3,'diagnostic',$5,$6,$7)",
        [keys.business,keys.user,lang,updateId,contextId,today(),nextCount]);
      return response(event,lang,canReply?copy.intro:null,v3ButtonsFor(lang,'consent'));
    }
    if(!active)return {handled:false};
    const current={...row,owner_id:connected.owner_id};
    const ctx=openContext(current,config);
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
      if(action==='decline'){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        return response(event,lang,canReply?copy.later:null);
      }
      const agrees=action==='agree'||(!event.inlineAction&&isExplicitYes(raw));
      if(!agrees||!allowed){
        await updateRow(db,keys.business,keys.user,
          'last_update_id=$3,reply_day=$4,reply_count=$5',
          [updateId,today(),nextCount]);
        return response(event,lang,canReply?(allowed?copy.intro:copy.notReady):null,
          allowed?v3ButtonsFor(lang,'consent'):[]);
      }
      await updateRow(db,keys.business,keys.user,
        "stage='interview',locale=$3,ai_consent_at=now(),last_update_id=$4,"+
        'reply_day=$5,reply_count=$6',
        [lang,updateId,today(),nextCount]);
      return response(event,lang,canReply?copy.first:null);
    }
    if(!row.ai_consent_at||!allowed)
      return response(event,lang,copy.notReady);
    if(row.stage==='done'){
      if(!row.consent_at)return {handled:true};
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
        const messages=[...notes.map((turn,i)=>({
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
      return response(event,lang,canReply?copy.reviewTitle+ctx.summary+copy.reviewQuestion:null,
        v3ButtonsFor(lang,'review_confirm'));
    }
    if(row.stage!=='interview')return {handled:true};
    if(ctx.pending&&Date.now()-Number(ctx.pending.queuedAt||0)<120000){
      await updateRow(db,keys.business,keys.user,'last_update_id=$3',[updateId]);
      return response(event,lang,canReply?copy.busy:null);
    }
    // A crashed / timed-out Next.after task cannot freeze this session forever.
    // Drop only stale unsent work; it will never be replayed automatically.
    if(ctx.pending)ctx.pending=null;
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
    if(finishing&&!ctx.turns.some(x=>x.role==='user'))
      return response(event,lang,copy.empty);
    if(!finishing&&!v3CanCallModel(raw))
      return response(event,lang,copy.unclear);
    if(!canReply)return {handled:true};
    if(ctx.turns.filter(x=>x.role==='user').length>=12&&!finishing)
      return response(event,lang,copy.unclear,v3ButtonsFor(lang,'interview',4));
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

/** Bounded post-commit processing, never executed inside the signed webhook's
 * PostgreSQL transaction. Consent/STOP are rechecked both before and after AI.
 */
export async function finishTelegramAiV3(config,job,env=process.env){
  if(!job||!supported(env)||!v3CanStart(env))return null;
  const prior=await webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||
      !row.ai_consent_at||row.ai_context_id!==job.contextId)return null;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.pending?.id!==job.updateId)return null;
    return {ctx,locale:row.locale};
  });
  if(!prior)return null;
  let result=null,error=false;
  const turns=[...prior.ctx.turns];
  if(prior.ctx.pending.kind==='question')
    turns.push({role:'user',text:prior.ctx.pending.text});
  try{
    if(danger(prior.ctx.pending.text)){
      result={text:prior.locale==='ru'
        ?'Если есть непосредственная опасность, обратись в местную экстренную службу или к человеку, которому доверяешь. Я могу выслушать, но не заменяю срочную помощь.'
        :prior.locale==='es'
          ?'Si estás en peligro inmediato, contacta con emergencias locales o alguien de confianza. No sustituyo la ayuda urgente.'
          :'If you are in immediate danger, contact local emergency services or someone you trust. I cannot replace urgent help.',
        freeCostVerified:true};
    }else{
      result=await v3Generate({
        kind:prior.ctx.pending.kind,locale:prior.locale,turns,
      },env);
    }
  }catch{
    error=true;
  }
  return webhookTransaction(config,async db=>{
    const row=await readRow(db,job.business,job.user);
    if(!row||Number(row.flow_version)!==3||row.stage!=='interview'||
      !row.ai_consent_at||row.ai_context_id!==job.contextId)return null;
    const ctx=openContext({...row,owner_id:job.ownerId},config);
    if(ctx.pending?.id!==job.updateId)return null;
    const locale=v3Locale(row.locale);
    const copy=V3_COPY[locale],kind=ctx.pending.kind;
    const nextTurns=[...ctx.turns];
    if(kind==='question'){
      nextTurns.push({role:'user',text:ctx.pending.text});
      if(!error&&result?.text)
        nextTurns.push({role:'assistant',text:result.text});
    }
    const nextContext={
      turns:nextTurns.slice(-20),pending:null,
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
    const message=error?copy.providerError:review
      ?copy.reviewTitle+result.text+copy.reviewQuestion:result.text;
    if(!message)return null;
    return {to:job.to,locale,reply:message.slice(0,1170),
      keyboard:error?[[V3_LABELS[locale].finish]]:v3ButtonsFor(locale,
        review?'review_confirm':'interview',
        nextTurns.filter(x=>x.role==='user').length),approvedPilotGuest:false};
  });
}
