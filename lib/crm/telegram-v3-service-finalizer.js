import 'server-only'
import {webhookTransaction} from './messenger-webhook.js'
import {operationHash,openSealed} from '../app/crypto.js'
import {createPublicServiceEnquiry} from '../practitioners/public-service-enquiry.js'
import {v3Context,v3ServiceTitle,v3ServiceCopy} from './telegram-ai-diagnostic-v3.mjs'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {telegramOwnerPilotReady,telegramClientBotUsername} from '../app/client-telegram-policy.js'
import {verifyClientBot} from '../app/client-telegram-transport.js'
import {dispatchPublicServiceEnquiryTelegram} from '../app/public-enquiry-telegram.js'

const HASH=/^[a-f0-9]{64}$/
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LANGUAGES=new Set(['ru','en','es'])
const notSaved=locale=>({saved:false,
  message:locale==='ru'
    ?'Пока не удалось подтвердить сохранение заявки. Отправьте /retry_request — повтор не создаст дубликат.'
    :locale==='es'
      ?'Aún no puedo confirmar tu solicitud. Envía /retry_request para reintentar sin duplicados.'
      :'I cannot confirm your request yet. Send /retry_request to check again without a duplicate.'})
const valid=i=>i&&HASH.test(i.business)&&HASH.test(i.user)&&
 UUID.test(i.ownerId)&&UUID.test(i.accountId)&&UUID.test(i.contextId)&&
 Number.isSafeInteger(i.updateId)&&i.updateId>=0&&LANGUAGES.has(i.locale)

/** Called only after a secret-verified customer Send and a committed V3
 * CRM transcript. Independently recheck account, stage, explicit consent and
 * practitioner thread under the narrow signed-webhook role.
 */
export async function finalizeTelegramV3Service(config,intent){
 if(!valid(intent))return notSaved(intent?.locale)
 const selected=await webhookTransaction(config,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
   [intent.business+':'+intent.user])
  const account=(await db.query(
   'select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
   ['telegram',intent.business])).rows[0]
  if(!account||account.owner_id!==intent.ownerId||account.account_id!==intent.accountId)
    return null
  const row=(await db.query(
   'select stage,locale,flow_version,ai_context_id,ai_context_ciphertext,ai_review_consent_at,consent_at '+
   'from app_private.crm_tg_diagnostic_sessions '+
   'where business_hash=$1 and user_hash=$2 for update',
   [intent.business,intent.user])).rows[0]
  if(!row||row.stage!=='done'||Number(row.flow_version)!==3||
     !row.ai_review_consent_at||!row.consent_at||
     row.ai_context_id!==intent.contextId||row.locale!==intent.locale||
     !row.ai_context_ciphertext)return null
  const ctx=v3Context(openSealed(row.ai_context_ciphertext,{
   accountId:account.owner_id,recordId:row.ai_context_id,field:'crm.tg.ai'},config))
  const title=v3ServiceTitle(ctx.serviceRequest,row.locale,ctx.offerId)
  if(!title||typeof ctx.summary!=='string'||ctx.summary.trim().length<10||
     !ctx.turns.some(t=>t.role==='user'))return null
  // Existing narrow RLS policy permits precisely this signed account/peer.
  await db.query("select set_config('hh.telegram_handoff_owner',$1,true)",[account.owner_id])
  await db.query("select set_config('hh.telegram_handoff_account',$1,true)",[account.account_id])
  await db.query("select set_config('hh.telegram_handoff_user',$1,true)",[intent.user])
  const thread=(await db.query(
   'select id from app.crm_msg_threads where owner_id=$1 and account_id=$2 '+
   'and user_hash=$3 and not suppressed limit 1',
   [account.owner_id,account.account_id,intent.user])).rows[0]
  if(!thread?.id)return null
  return {ownerId:account.owner_id,business:intent.business,user:intent.user,
   contextId:row.ai_context_id,threadId:thread.id,
   service:ctx.serviceRequest,serviceTitle:title,offerId:ctx.offerId||null,locale:row.locale,
   summary:ctx.summary.trim().slice(0,950)}
 })
 if(!selected)return notSaved(intent.locale)
 const digest=operationHash({scope:'hh-telegram-v3-confirmed-service-v1',
  owner:selected.ownerId,business:selected.business,user:selected.user,
  id:selected.contextId,service:selected.service,locale:selected.locale,
  summary:selected.summary},config)
 // The backend helper rechecks current, non-suppressed contact/thread,
 // stage='done', same ai_context_id, V3+review consent and practitioner RLS.
 // It also serializes STOP with the SAME session advisory lock.
 const enquiry=await createPublicServiceEnquiry(config,{
  operationId:selected.contextId,serviceTitle:selected.serviceTitle,
  description:selected.summary,sourcePath:'/'+selected.locale+'/services',
  locale:selected.locale},null,{linkedTelegram:{
    purpose:'v3_service',ownerId:selected.ownerId,threadId:selected.threadId,
    businessHash:selected.business,userHash:selected.user,
    digest,locale:selected.locale}})
 if(!enquiry?.saved||!UUID.test(enquiry.id))return notSaved(selected.locale)
 return {saved:true,enquiryId:enquiry.id,operationId:selected.contextId,
  referenceCode:enquiry.referenceCode,service:selected.service,
  serviceTitle:selected.serviceTitle,locale:selected.locale,
  practitionerId:PRACTITIONER_ID,
  message:v3ServiceCopy(selected.locale,selected.service,selected.offerId)?.submitted(enquiry.referenceCode)||null}
}

/** Uses only verified @Andydotbot + EXISTING owner-booking opt-in and
 * private notification outbox. No user message, summary, symptom or contact
 * appears in the notification. Provider acceptance is not delivery proof.
 */
export async function notifyOwnerTelegramV3Service(config,finished,env=process.env){
 if(!finished?.saved||!UUID.test(finished.enquiryId)||
    !UUID.test(finished.operationId)||finished.practitionerId!==PRACTITIONER_ID)
  return {attempted:0,accepted:0,reason:'not_confirmed'}
 if(!telegramOwnerPilotReady(env)||
    String(telegramClientBotUsername(env)||'').toLowerCase()!=='andydotbot')
  return {attempted:0,accepted:0,reason:'andydot_not_activated'}
 try{await verifyClientBot(env)}
 catch{return {attempted:0,accepted:0,reason:'andydot_identity_unconfirmed'}}
 return dispatchPublicServiceEnquiryTelegram(config,
  finished.enquiryId,finished.operationId,env)
}
