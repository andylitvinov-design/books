import 'server-only'
import { randomUUID } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { operationHash, seal } from '../app/crypto.js'
import { AppError } from '../assessments/contracts.js'
import { businessHash, providerMessageHash } from './messenger-store.js'
import { telegramBotBusinessId, channelTransportReady, telegramPilotReady } from './messenger-policy.js'
import { telegramDiagnosticReady } from './telegram-diagnostic.mjs'
import { verifyTelegramWebAppInitData } from './telegram-webapp-auth.mjs'
import { buildTelegramCoachingSummary } from '../coaching/diagnostic-enquiry.mjs'

/**
 * No lead is created here. Only a signed Telegram Mini App user with an
 * existing opt-in V2 chat, scoped owner, and non-suppressed CRM thread may
 * append a completed questionnaire into that exact thread.
 */
export async function linkedTelegramCoaching(config, { initData, action, questionnaire }, env=process.env) {
  if (!['context','submit'].includes(action) || typeof initData !== 'string')
    throw new AppError('INVALID_REQUEST',400)
  const identity=verifyTelegramWebAppInitData(initData,env.HH_CRM_MSG_TELEGRAM_TOKEN)
  if (!identity || !telegramDiagnosticReady(env) || !channelTransportReady('telegram',env))
    throw new AppError('TELEGRAM_LINK_UNAVAILABLE',401)
  const botId=telegramBotBusinessId(env)
  if (!botId) throw new AppError('TELEGRAM_LINK_UNAVAILABLE',401)
  const accountDigest=businessHash('telegram',botId,config)
  const userHash=operationHash({
    scope:'crm-msg-user',provider:'telegram',accountDigest,userId:identity.userId,
  },config)
  // Validation precedes all database writes; no contact, phone or PII fields
  // are accepted from a Mini App request.
  let payload=null
  try {
    if (action==='submit') payload=buildTelegramCoachingSummary(questionnaire)
    else if (questionnaire !== undefined) throw new Error('UNEXPECTED_QUESTIONNAIRE')
  } catch { throw new AppError('INVALID_COACHING_ENQUIRY',400) }

  const db=await databasePool(config).connect()
  try {
    await db.query('begin')
    const role=(await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
    if (!config.test && (role?.rolsuper || role?.rolbypassrls))
      throw new AppError('DATABASE_ROLE_UNSAFE',503)
    await db.query('set local role hh_app_inbox')
    const account=(await db.query(
      'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
      ['telegram',accountDigest],
    )).rows[0]
    if (!account) throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404)
    const session=(await db.query(
      'select stage,consent_at,locale,topic,flow_version,pilot_access_until '+
      'from app_private.crm_tg_diagnostic_sessions where business_hash=$1 and user_hash=$2',
      [accountDigest,userHash],
    )).rows[0]
    if (!session || session.stage !== 'done' || !session.consent_at ||
        Number(session.flow_version)!==2)
      throw new AppError('TELEGRAM_LINK_UNAVAILABLE',404)
    if (telegramPilotReady(env) && identity.userId !== env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID &&
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
      await db.query('commit')
      return {linked:true,topic:session.topic||'personal',locale:session.locale}
    }
    // One original, encrypted CRM thread. No second public enquiry/CRM lead.
    const itemId=randomUUID(), contactId=randomUUID()
    const messageId='tgform:'+payload.operationId
    const eventHash=operationHash({
      scope:'crm-msg-event',provider:'telegram',accountDigest,eventId:messageId,
    },config)
    const providerHash=providerMessageHash('telegram',messageId,config)
    const owner=account.owner_id, accountId=account.account_id
    const userCipher=seal({externalId:identity.userId},
      {accountId:owner,recordId:accountId,field:'crm.msgidentity'},config)
    const displayCipher=seal({name:'Telegram participant'},
      {accountId:owner,recordId:accountId,field:'crm.msgdisplay'},config)
    const contactCipher=seal({displayName:'Telegram participant',email:'',phone:''},
      {accountId:owner,recordId:contactId,field:'crm.contact'},config)
    const contactEmailHash=operationHash({
      scope:'crm-msg-contact',owner,accountDigest,userHash,
    },config)
    const bodyCipher=seal({
      text:payload.referenceCode+' · Telegram coaching questionnaire\n\n'+payload.text,
    },{accountId:owner,recordId:itemId,field:'crm.msgbody'},config)
    // Existing definer is used only AFTER verifying the existing thread.
    // A retry with the same operation ID is deduplicated by both hashes.
    await db.query(
      'select app_private.crm_msg_ingest($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) as saved',
      ['telegram',accountDigest,userHash,userCipher,displayCipher,
        contactId,contactCipher,contactEmailHash,payload.locale,itemId,
        bodyCipher,providerHash,eventHash,new Date().toISOString(),false],
    )
    await db.query('commit')
    return {saved:true,referenceCode:payload.referenceCode,linked:true}
  } catch(error) {
    await db.query('rollback').catch(()=>{})
    throw error
  } finally { db.release() }
}
