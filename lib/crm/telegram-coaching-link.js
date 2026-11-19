import 'server-only'
import { randomUUID } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { operationHash, seal, openSealed } from '../app/crypto.js'
import {verifyTelegramFreeDiagnosticHandoff} from '../coaching/telegram-free-diagnostic-handoff.mjs'
import {v3Context,v3CanChat,v3ButtonsFor} from './telegram-ai-diagnostic-v3.mjs'
import {freePackageCopy,freePackageStatusMessage} from './ali-free-package-receipts.mjs'
import {FREE_DIAGNOSTIC_MODE} from '../assist/ali-free-diagnostic-library.mjs'
import { AppError } from '../assessments/contracts.js'
import { businessHash, providerMessageHash } from './messenger-store.js'
import { telegramBotBusinessId, channelTransportReady, telegramPilotReady } from './messenger-policy.js'
import { telegramDiagnosticReady } from './telegram-diagnostic.mjs'
import { verifyTelegramWebAppInitData } from './telegram-webapp-auth.mjs'
import { buildTelegramCoachingSummary } from '../coaching/diagnostic-enquiry.mjs'
import { coachingMessageChunks } from './telegram-coaching-chunks.mjs'

/**
 * No lead is created here. Only a signed Telegram Mini App user with an
 * existing opt-in V2 chat, scoped owner, and non-suppressed CRM thread may
 * append a completed questionnaire into that exact thread.
 */
export async function linkedTelegramCoaching(config, { initData, handoff, action, questionnaire }, env=process.env) {
  const verifiedHandoff=handoff===undefined?null:verifyTelegramFreeDiagnosticHandoff(handoff,config);
  const v3Free=!!verifiedHandoff;
  if(handoff!==undefined&&!v3Free)throw new AppError('INVALID_TELEGRAM_HANDOFF',409);
  if (env.HH_CRM_TG_MINIAPP_ENABLED !== 'true' && !v3Free)
    throw new AppError('TELEGRAM_LINK_UNAVAILABLE',503);
  if(!['context','submit'].includes(action)||
     (v3Free?initData!==undefined:typeof initData!=='string'))
    throw new AppError('INVALID_REQUEST',400);
  const identity=v3Free?null:verifyTelegramWebAppInitData(initData,env.HH_CRM_MSG_TELEGRAM_TOKEN);
  if(!channelTransportReady('telegram',env)||
     (v3Free?!v3CanChat(env):!identity||!telegramDiagnosticReady(env)))
    throw new AppError('TELEGRAM_LINK_UNAVAILABLE',401);
  const botId=telegramBotBusinessId(env)
  if (!botId) throw new AppError('TELEGRAM_LINK_UNAVAILABLE',401)
  const accountDigest=businessHash('telegram',botId,config)
  if(v3Free&&verifiedHandoff.businessHash!==accountDigest)
    throw new AppError('INVALID_TELEGRAM_HANDOFF',409);
  const userHash=v3Free?verifiedHandoff.userHash:operationHash({
    scope:'crm-msg-user',provider:'telegram',accountDigest,userId:identity.userId,
  },config)
  // Validation precedes all database writes; no contact, phone or PII fields
  // are accepted from a Mini App request.
  let payload=null
  try {
    if (action==='submit') payload=v3Free
      ?buildTelegramCoachingSummary(questionnaire,{allowReplyEmail:true})
      :buildTelegramCoachingSummary(questionnaire)
    else if (questionnaire !== undefined) throw new Error('UNEXPECTED_QUESTIONNAIRE')
  } catch { throw new AppError('INVALID_COACHING_ENQUIRY',400) }

  const db=await databasePool(config).connect()
  try {
    await db.query('begin')
    const role=(await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
    if (!config.test && (role?.rolsuper || role?.rolbypassrls))
      throw new AppError('DATABASE_ROLE_UNSAFE',503)
    await db.query('set local role hh_app_inbox')
    // Serialize identical retries and STOP with the same advisory key as the Telegram webhook.
    await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
      [accountDigest+':'+userHash])
    const account=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',accountDigest],
    )).rows[0]
    if (!account||v3Free&&account.owner_id!==verifiedHandoff.ownerId)
      throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404);
    const session=(await db.query(
      'select stage,consent_at,locale,topic,flow_version,pilot_access_until,'+
      'ai_review_consent_at,ai_context_id,ai_context_ciphertext '+
      'from app_private.crm_tg_diagnostic_sessions where business_hash=$1 and user_hash=$2',
      [accountDigest,userHash],
    )).rows[0]
    if (!session || session.stage !== 'done' || !session.consent_at ||
        (v3Free?Number(session.flow_version)!==3||!session.ai_review_consent_at||
          session.ai_context_id!==verifiedHandoff.contextId||
          session.locale!==verifiedHandoff.locale:
          Number(session.flow_version)!==2))
      throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404);
    const v3Crypto=v3Free?{accountId:account.owner_id,
      recordId:session.ai_context_id,field:'crm.tg.ai'}:null;
    const v3Ctx=v3Free?v3Context(session.ai_context_ciphertext
      ?openSealed(session.ai_context_ciphertext,v3Crypto,config):null):null;
    if(v3Free&&(v3Ctx.mode!==FREE_DIAGNOSTIC_MODE||
       (payload&&payload.offer!=='free')||
       !v3Ctx.summary||!v3Ctx.intakeSlots||!v3Ctx.mediaStep||
       !['form_pending','complete'].includes(v3Ctx.mediaStep)))
      throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404);
    // The encrypted user ID was set ONLY by the signed Telegram inbound
    // webhook. The signed handoff must match this original participant.
    if(v3Free&&(!/^[1-9][0-9]{0,24}$/.test(v3Ctx.verifiedTelegramUserId||'')||
       operationHash({scope:'crm-msg-user',provider:'telegram',
         accountDigest,userId:v3Ctx.verifiedTelegramUserId},config)!==userHash))
      throw new AppError('TELEGRAM_LINK_IDENTITY_MISMATCH',403);
    if (payload && !v3Free && payload.topic !== (session.topic || 'personal'))
      throw new AppError('INVALID_COACHING_ENQUIRY',400);
    if(telegramPilotReady(env) &&
        (v3Free?v3Ctx.verifiedTelegramUserId:identity.userId)!==
          env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID &&
        !(session.pilot_access_until && Date.parse(session.pilot_access_until)>Date.now()))
      throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404)
    // The SECURITY DEFINER guard locks the exact thread against deletion for
    // this transaction. Without the migration, fail closed; never fall back to
    // the old crm_msg_ingest CREATE CONTACT behavior.
    const existing=(await db.query(
      'select app_private.crm_tg_existing_thread($1,$2) as found',
      [accountDigest,userHash],
    )).rows[0]?.found
    if (existing!==true) throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404)
    if (action==='context') {
      await db.query('commit');
      return {linked:true,topic:v3Free?'other':session.topic||'personal',locale:session.locale};
    }
    if(v3Free&&v3Ctx.formReceipt?.status==='received'){
      await db.query('commit');
      return {saved:true,referenceCode:v3Ctx.formReceipt.referenceCode,
        linked:true,duplicate:true};
    }
    // Do not widen the existing CRM ingest limit or weaken owner RLS.
    // Store all questionnaire answers as lossless, bounded encrypted pieces in
    // the SAME existing consented thread; commit all or none.
    const verifiedStatus=v3Free?freePackageStatusMessage(v3Context({
      ...v3Ctx,formReceipt:{status:'received',referenceCode:payload.referenceCode},
      mediaStep:'portrait',
    }),session.locale):null;
    const messageText=payload.referenceCode+' · Telegram coaching questionnaire\n\n'+
      (verifiedStatus?verifiedStatus+'\n\n':'')+payload.text
    let pieces
    try { pieces=coachingMessageChunks(messageText) }
    catch { throw new AppError('INVALID_COACHING_ENQUIRY',400) }
    const digest=operationHash({
      scope:'crm-tg-coaching-body',accountDigest,userHash,id:payload.operationId,
      locale:payload.locale,topic:payload.topic,offer:payload.offer,text:messageText,
    },config)
    const messages=pieces.map((body,index)=>{
      const messageId='tgform:'+payload.operationId+':'+String(index+1)
      return {
        itemId:randomUUID(),
        providerHash:providerMessageHash('telegram',messageId,config),
        eventHash:operationHash({
          scope:'crm-msg-event',provider:'telegram',accountDigest,userHash,
          eventId:messageId,contentDigest:digest,
        },config),
        text:pieces.length===1 ? body :
          payload.referenceCode+' · Coaching questionnaire · '+String(index+1)+'/'+String(pieces.length)+'\n\n'+body,
      }
    })
    const owner=account.owner_id, accountId=account.account_id,contactId=randomUUID()
    const userCipher=seal({externalId:v3Free?v3Ctx.verifiedTelegramUserId:identity.userId},
      {accountId:owner,recordId:accountId,field:'crm.msgidentity'},config)
    const displayCipher=seal({name:'Telegram participant'},
      {accountId:owner,recordId:accountId,field:'crm.msgdisplay'},config)
    const contactCipher=seal({displayName:'Telegram participant',email:'',phone:''},
      {accountId:owner,recordId:contactId,field:'crm.contact'},config)
    const contactEmailHash=operationHash({
      scope:'crm-msg-contact',owner,accountDigest,userHash,
    },config)
    const providerHashes=messages.map(item=>item.providerHash)
    const eventHashes=messages.map(item=>item.eventHash)
    // Exact replay attestation: same signed Telegram thread, immutable operation
    // UUID AND the whole questionnaire digest. This definer returns false for a
    // mismatched body, another user, a missing/partial write or a stopped thread.
    const alreadySaved=(await db.query(
      'select app_private.crm_tg_questionnaire_seen($1,$2,$3::text[],$4::text[]) as seen',
      [accountDigest,userHash,providerHashes,eventHashes],
    )).rows[0]?.seen
    if (alreadySaved===true) {
      await db.query('commit')
      return {saved:true,referenceCode:payload.referenceCode,linked:true,duplicate:true}
    }
    // Explicit chronological order even when all encrypted parts are saved in one millisecond.
    const timestampBase=Date.now()-messages.length-10
    for (const [index,item] of messages.entries()) {
      const bodyCipher=seal({text:item.text},
        {accountId:owner,recordId:item.itemId,field:'crm.msgbody'},config)
      // The existing SECURITY DEFINER function rejects ciphertext >16,000
      // characters with saved=false, without throwing. Never falsely ACK it.
      if (bodyCipher.length>15000) throw new AppError('COACHING_STORAGE_REJECTED',503)
      const accepted=(await db.query(
        'select app_private.crm_msg_ingest($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) as saved',
        ['telegram',accountDigest,userHash,userCipher,displayCipher,
          contactId,contactCipher,contactEmailHash,payload.locale,item.itemId,
          bodyCipher,item.providerHash,item.eventHash,new Date(timestampBase+index).toISOString(),false],
      )).rows[0]?.saved
      if (accepted!==true) throw new AppError('COACHING_STORAGE_REJECTED',503)
    }
    if(v3Free){
      const portraitDone=['received','skipped'].includes(v3Ctx.mediaReceipts?.portrait?.status);
      const amended=v3Context({...v3Ctx,
        mediaStep:portraitDone?'complete':'portrait',
        formReceipt:{status:'received',referenceCode:payload.referenceCode}});
      const updated=await db.query(
        "update app_private.crm_tg_diagnostic_sessions set "+
        "ai_context_ciphertext=$3,updated_at=now() "+
        "where business_hash=$1 and user_hash=$2 and flow_version=3 "+
        "and stage='done' and ai_review_consent_at is not null "+
        "and ai_context_id=$4",
        [accountDigest,userHash,seal(amended,v3Crypto,config),
          verifiedHandoff.contextId]);
      if(updated.rowCount!==1)throw new AppError('COACHING_RECEIPT_NOT_CONFIRMED',503);
    }
    await db.query('commit')
    return {saved:true,referenceCode:payload.referenceCode,linked:true,
      ...(v3Free?{ownerProgress:{business:accountDigest,user:userHash,
        ownerId:account.owner_id,contextId:verifiedHandoff.contextId,
        locale:session.locale,codes:portraitDone?['form','complete']:['form']},
        clientPrompt:{
          to:v3Ctx.verifiedTelegramUserId,locale:session.locale,
          text:freePackageCopy(session.locale).formAccepted+'\n\n'+
            (portraitDone?freePackageCopy(session.locale).completed:
              freePackageCopy(session.locale).portrait),
          keyboard:portraitDone?[]:v3ButtonsFor(session.locale,'free_portrait'),
        }}:{})}
  } catch(error) {
    await db.query('rollback').catch(()=>{})
    throw error
  } finally { db.release() }
}
