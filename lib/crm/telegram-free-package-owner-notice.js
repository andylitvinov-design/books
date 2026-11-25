import 'server-only';
import {seal,openSealed,operationHash} from '../app/crypto.js';
import {webhookTransaction,ingestMessengerEventInTransaction} from './messenger-webhook.js';
import {v3Context} from './telegram-ai-diagnostic-v3.mjs';
import {FREE_DIAGNOSTIC_MODE} from '../assist/ali-free-diagnostic-library.mjs';
import {freePackageCaseReference} from './ali-free-package-receipts.mjs';
import {telegramOwnerPilotReady,telegramClientBotUsername} from '../app/client-telegram-policy.js';
import {verifyClientBot,sendOwnerTelegramEventMessage} from '../app/client-telegram-transport.js';
import {resolvedOwnerTelegramEnv} from '../practitioners/telegram-owner-pairing.js';
import {verifyOwnerTelegram,ownerBotCredentials} from '../practitioners/telegram-hub.mjs';

const TABLE='app_private.crm_tg_diagnostic_sessions';
const HASH=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const CODES=new Set(['goal','challenge','situation','impact','attempts','support','answers','portrait','drawing','portrait_skipped','drawing_skipped','form_pending','form','complete']);
const evidence=(row,ctx,code)=>{
 if(row.stage==='stopped'||!row.ai_consent_at||
   ctx.mode!==FREE_DIAGNOSTIC_MODE)return false;
 if(code==='answers')return row.stage==='done'&&!!row.ai_review_consent_at&&
   typeof ctx.summary==='string'&&ctx.summary.trim().length>=5;
 if(code==='form')return row.stage==='done'&&ctx.formReceipt?.status==='received';
 if(code==='complete')return row.stage==='done'&&ctx.mediaStep==='complete'&&
   ctx.formReceipt?.status==='received'&&['goal','challenge','situation'].every(key=>
     typeof ctx.intakeSlots?.[key]==='string'&&ctx.intakeSlots[key].trim().length>=2)&&
   ['drawing','portrait'].every(key=>['received','skipped'].includes(ctx.mediaReceipts?.[key]?.status));
 if(code==='form_pending')return row.stage==='done'&&ctx.mediaStep==='form_pending'&&
   ctx.formReceipt?.status!=='received';
 if(code==='portrait'||code==='drawing')
   return ctx.mediaReceipts?.[code]?.status==='received';
 if(code==='portrait_skipped'||code==='drawing_skipped')
   return ctx.mediaReceipts?.[code.replace('_skipped','')]?.status==='skipped';
 return typeof ctx.intakeSlots?.[code]==='string'&&
   ctx.intakeSlots[code].trim().length>=2;
};
/** Only an existing verified, opted-in @Andydotbot owner chat can receive
 * neutral stage notices. No raw replies, photos, customer name or chat IDs
 * appear in a message, URL or log. Never invent delivery confirmation.
 */
export async function notifyOwnerAliFreePackage(config,job,env=process.env){
 if(!job||!HASH.test(job.business||'')||!HASH.test(job.user||'')||
   !UUID.test(job.ownerId||'')||!UUID.test(job.contextId||'')||
   !Array.isArray(job.codes)||job.codes.length>12)
   return {attempted:0,accepted:0,reason:'invalid_proof'};
 const codes=[...new Set(job.codes)].filter(code=>CODES.has(code));
 let reference;
 try{reference=freePackageCaseReference(job.contextId,config);}
 catch{return {attempted:0,accepted:0,reason:'secure_reference_unavailable'};}
 if(!codes.length)return {attempted:0,accepted:0,reason:'no_stages'};
 // The signed Telegram intake reaches the private owner CRM even if
 // external owner-bot delivery is temporarily unavailable. No client words,
 // images, email or document bytes are copied into these progress markers.
 let ownerChat=null;
 if(telegramOwnerPilotReady(env)&&String(telegramClientBotUsername(env)||'').toLowerCase()==='andydotbot'){
   try{
     const paired=await resolvedOwnerTelegramEnv(config,env);
     const identity=await verifyOwnerTelegram(paired);
     await verifyClientBot(env);
     const credentials=ownerBotCredentials(paired);
     if(identity.verified&&identity.chatVerified&&identity.botVerified&&
       credentials&&/^[1-9][0-9]{4,19}$/.test(String(credentials.chat||'')))
       ownerChat=String(credentials.chat);
   }catch{/* CRM remains authoritative, owner-bot transport may be offline. */}
 }
 let attempted=0,accepted=0;
 for(const code of codes){
   const allowed=await webhookTransaction(config,async db=>{
     await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
       [job.business+':'+job.user]);
     const account=(await db.query(
       "select owner_id from app_private.crm_msg_resolve($1,$2)",
       ['telegram',job.business])).rows[0];
     if(account?.owner_id!==job.ownerId)return false;
     const row=(await db.query('select * from '+TABLE+
       ' where business_hash=$1 and user_hash=$2 for update',
       [job.business,job.user])).rows[0];
     if(!row||Number(row.flow_version)!==3||
       row.ai_context_id!==job.contextId)return false;
     const crypto={accountId:job.ownerId,recordId:job.contextId,field:'crm.tg.ai'};
     const ctx=v3Context(row.ai_context_ciphertext?
       openSealed(row.ai_context_ciphertext,crypto,config):null);
     if(!evidence(row,ctx,code)||Number.isSafeInteger(ctx.ownerNotices?.[code]))return false;
     if(!/^[1-9][0-9]{0,24}$/.test(ctx.verifiedTelegramUserId||'')||
       operationHash({scope:'crm-msg-user',provider:'telegram',
         accountDigest:job.business,userId:ctx.verifiedTelegramUserId},config)!==job.user)
       return false;
     // Every completed step is recorded as an anonymous SYSTEM progress
     // message in the same owner-only CRM Messenger thread. The event ID
     // is stable across retries; the signed session is required.
     const status=code.endsWith('_skipped')?'skipped':
       code==='form_pending'?'pending':'received';
     const label=code.replace(/_skipped$/,'');
     const accepted=await ingestMessengerEventInTransaction(db,'telegram',{
       type:'incoming',userId:ctx.verifiedTelegramUserId,
       name:'Free review '+reference,
       eventId:'hhfree:'+job.contextId+':'+code,
       messageId:'hhfree:'+job.contextId+':'+code,
       body:'[Holistic House · automated Free Diagnostic progress]\n'+
         'Case / Заявка: '+reference+'\n'+
         'Stage: '+label+' · '+status+'\n'+
         'No private answers or photos are included.',
       sentAt:new Date().toISOString(),stop:false,diagnosticLocale:row.locale,
       telegramPhotoFileId:null,telegramPhotoPurpose:null,
     },config,job.business);
     if(accepted!==true)throw new Error('CRM_FREE_STAGE_RECEIPT_UNCONFIRMED');
     // Reserve once BEFORE the uncertain external send: no duplicate alerts
     // after webhook retries or competing workers. The original receipt stays
     // in the encrypted CRM context even if provider delivery is unavailable.
     const next=v3Context({...ctx,ownerNotices:{
       ...(ctx.ownerNotices||{}),[code]:Number(row.last_update_id)||1}});
     await db.query('update '+TABLE+
       ' set ai_context_ciphertext=$3,updated_at=now()'+
       ' where business_hash=$1 and user_hash=$2',
       [job.business,job.user,seal(next,crypto,config)]);
     return true;
   });
   if(!allowed)continue;
   attempted++;
   if(ownerChat)try{
     // External Telegram delivery is optional. The private CRM checkpoint
     // above is already committed, independently of provider acceptance.
     const sent=await sendOwnerTelegramEventMessage({
       chatId:ownerChat,locale:job.locale,event:'free_stage',stage:code,reference},env);
     if(sent.accepted===true)accepted++;
   }catch{
     console.error('HH_ALI_FREE_OWNER_STAGE_NOTICE_UNCONFIRMED');
   }
 }
 return {attempted,accepted};
}
