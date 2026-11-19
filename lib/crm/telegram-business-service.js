import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {operationHash,seal,openSealed} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {publicEnquiryReference} from '../practitioners/public-service-enquiry-input.mjs'
import {webhookTransaction} from './messenger-webhook.js'
import {businessHash} from './messenger-store.js'
import {telegramBotBusinessId} from './messenger-policy.js'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {telegramBusinessMessageFromUpdate,telegramBusinessClientChoice,
  telegramBusinessConversationReply,telegramBusinessServiceTitle} from '../assist/telegram-business-request.mjs'
import {AppError} from '../assessments/contracts.js'
import {telegramAiSecretaryQuestion,telegramAiSecretaryStep,telegramAiSecretaryAnswer,telegramAiSecretarySummary,telegramAiSecretaryIntent} from '../assist/telegram-ai-secretary-intake.mjs'
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from './telegram-secretary-offers.mjs'

const TABLE='app_private.crm_tg_business_service_sessions'
const LOCK='hh-tg-business-service-session:'
const today=()=>new Date().toISOString().slice(0,10)
const response=(event,locale,service,type,other={})=>({
  handled:true,connectionId:event.connectionId,to:event.chatId,serviceKey:service,
  reply:telegramBusinessConversationReply(type,{locale,service,...other}),
  updateId:event.updateId,messageId:event.messageId,
  terminal:['submitted','cancelled','stopped','unavailable'].includes(type),
})
function keys(event,config){
 const business=operationHash({scope:'hh-tg-business-connection',id:event.connectionId},config)
 const user=operationHash({scope:'hh-tg-business-user',business,id:event.chatId},config)
 // Signed private business_message: Telegram sender ID == private chat ID.
 // Hash only; it is NOT a phone number or a website login.
 const peer=operationHash({scope:'hh-telegram-business-peer',id:event.chatId},config)
 return {business,user,peer,lock:LOCK+business+':'+user}
}
async function lock(db,key){
 await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',[key])
}
async function stage(event,config,k){
 return webhookTransaction(config,async db=>{
  await lock(db,k.lock)
  const old=(await db.query('select * from '+TABLE+
    ' where business_hash=$1 and user_hash=$2 for update',[k.business,k.user])).rows[0]
  if(old&&Number(old.last_update_id)>=event.updateId)return {handled:true}
  const action=telegramBusinessClientChoice(event.text),request=event.request
  if(old?.stage==='stopped')return {handled:true}
  if(action?.kind==='stop'){
    if(!old)return {handled:true}
    await db.query("update "+TABLE+" set stage='stopped',last_update_id=$3,updated_at=now() "+
      "where business_hash=$1 and user_hash=$2",[k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'stopped')
  }
  // A request about the AI-secretary PRODUCT starts in the real human
  // Telegram Business chat. No /start, external model, marketing opt-in or
  // extra 'Confirm' step is required for this customer-initiated enquiry.
  if(request?.service==='ai_secretary'&&(!old||old.stage==='submitted'||
     old.stage==='cancelled'||old.service_key!=='ai_secretary'||old.locale!==request.locale)){
    const operationId=randomUUID()
    await db.query('insert into '+TABLE+
      ' (business_hash,user_hash,telegram_peer_hash,operation_id,practitioner_id,service_key,locale,stage,last_update_id,intake_answers_ciphertext) '+
      "values($1,$2,$3,$4,$5,$6,$7,'ai_q1',$8,null) "+
      'on conflict(business_hash,user_hash) do update set '+
      'operation_id=excluded.operation_id,telegram_peer_hash=excluded.telegram_peer_hash,'+
      'practitioner_id=excluded.practitioner_id,service_key=excluded.service_key,'+
      "locale=excluded.locale,stage='ai_q1',last_update_id=excluded.last_update_id,"+
      'delivery_format=null,consent_at=null,reference_code=null,contact_id=null,'+
      'intake_answers_ciphertext=null,created_at=now(),updated_at=now()',
      [k.business,k.user,k.peer,operationId,PRACTITIONER_ID,
       request.service,request.locale,event.updateId])
    const reply=response(event,request.locale,request.service,'ai_question',{questionIndex:0})
    return old?reply:{...reply,welcomePhoto:true}
  }
  if(request&&(!old||old.stage==='submitted'||old.stage==='cancelled'||
     old.service_key!==request.service||old.locale!==request.locale)){
    await db.query('insert into '+TABLE+
      ' (business_hash,user_hash,telegram_peer_hash,operation_id,practitioner_id,service_key,locale,stage,last_update_id) '+
      "values($1,$2,$3,$4,$5,$6,$7,'format',$8) "+
      'on conflict(business_hash,user_hash) do update set '+
      'operation_id=excluded.operation_id,telegram_peer_hash=excluded.telegram_peer_hash,practitioner_id=excluded.practitioner_id, '+
      'service_key=excluded.service_key,locale=excluded.locale,stage=excluded.stage, '+
      'last_update_id=excluded.last_update_id,delivery_format=null,consent_at=null, '+
      'reference_code=null,created_at=now(),updated_at=now()',
      [k.business,k.user,k.peer,randomUUID(),PRACTITIONER_ID,
        request.service,request.locale,event.updateId])
    // Only the first ever recognized request in this hashed Business chat gets
    // a photo. Persisting the session precedes provider sends, so duplicate
    // webhooks and new enquiries from the same person cannot repeat it.
    const reply=response(event,request.locale,request.service,'format')
    return old?reply:{...reply,welcomePhoto:true}
  }
  if(!old)return {handled:false}
  // Avoid hijacking ordinary human chat or catalogue queries. Only an
  // active, explicit AI-secretary intake may consume natural-language answers.
  if(!request&&!action&&
     (old.service_key!=='ai_secretary'||telegramAiSecretaryStep(old.stage)===null))
    return {handled:false}
  const update='update '+TABLE+' set last_update_id=$3,updated_at=now() '
    +'where business_hash=$1 and user_hash=$2'
  if(action?.kind==='cancel'&&old.stage!=='submitted'){
    await db.query("update "+TABLE+" set stage='cancelled',last_update_id=$3,"+
       'updated_at=now() where business_hash=$1 and user_hash=$2',
       [k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'cancelled')
  }
  const aiStep=old.service_key==='ai_secretary'?telegramAiSecretaryStep(old.stage):null
  if(aiStep!==null){
    // A new customer question is NOT a completed interview answer.
    // Preserve the stage and encrypted answers; use reviewed local FAQ copy,
    // with no external model call, marketing permission or CRM handoff.
    const question=telegramAiSecretaryQuestion(old.locale,aiStep-1)
    const message=String(event.text||'')
    const query=classifyTelegramSecretaryQuery(message,old.locale)
    if(query?.kind==='faq'||query?.kind==='safety'){
      const planned=composeTelegramSecretaryAnswer(query,[])
      if(planned?.text){
        await db.query(update,[k.business,k.user,event.updateId])
        const paused=query.kind==='safety'||['human','stop_help','status'].includes(query.topic)
        // Replace a FAQ's generic follow-up with the pending intake question.
        const answerText=planned.text.replace(/\s[^.!?？\n]*[?？]\s*$/u,'').trim()
        return {...response(event,old.locale,old.service_key,'ai_question',{questionIndex:aiStep-1}),
          reply:paused?planned.text:answerText+'\n\n'+question,buttons:planned.buttons||[]}
      }
    }
    if(message.length<=400&&/[?¿？]/u.test(message)){
      // Unknown operational questions are handled without inventing facts or
      // accidentally storing the question as the next answer.
      await db.query(update,[k.business,k.user,event.updateId])
      const note=old.locale==='ru'?'Это лучше уточнить у мастера. Продолжим заявку:'
        :old.locale==='es'?'El profesional puede confirmar ese detalle. Sigamos con tu solicitud:'
        :'The practitioner can confirm that detail. To continue your request:'
      return {...response(event,old.locale,old.service_key,'ai_question',{questionIndex:aiStep-1}),
        reply:note+'\n\n'+question}
    }
    // Only an actual customer answer advances one step. Private answers
    // remain encrypted for the practitioner, never sent to external AI.
    const answer=telegramAiSecretaryAnswer(event.text)
    if(answer===null){
      await db.query(update,[k.business,k.user,event.updateId])
      return response(event,old.locale,old.service_key,'ai_question',{questionIndex:aiStep-1})
    }
    const context={accountId:PRACTITIONER_ID,recordId:old.operation_id,
      field:'tg_business.ai_secretary.answers'}
    const previous=old.intake_answers_ciphertext
      ?openSealed(old.intake_answers_ciphertext,context,config):{answers:[]}
    if(!Array.isArray(previous?.answers)||previous.answers.length!==aiStep-1)
      throw new AppError('INVALID_AI_SECRETARY_INTAKE',409)
    const answers=[...previous.answers,answer]
    const sealed=seal({answers},context,config)
    if(aiStep<5){
      await db.query('update '+TABLE+
        ' set stage=$3,intake_answers_ciphertext=$4,last_update_id=$5,updated_at=now() '+
        'where business_hash=$1 and user_hash=$2',
        [k.business,k.user,'ai_q'+(aiStep+1),sealed,event.updateId])
      return response(event,old.locale,old.service_key,'ai_question',{questionIndex:aiStep})
    }
    // Five customer-authored answers = a requested written proposal,
    // NOT an appointment, payment, website login or marketing subscription.
    await db.query('update '+TABLE+
      " set stage='committing',delivery_format='async',consent_at=now(),"+
      'intake_answers_ciphertext=$3,last_update_id=$4,updated_at=now() '+
      'where business_hash=$1 and user_hash=$2',
      [k.business,k.user,sealed,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,peer:k.peer,service:'ai_secretary',locale:old.locale,format:'async',
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='format'&&['format','confirm'].includes(old.stage)){
    await db.query('update '+TABLE+
      " set stage='confirm',delivery_format=$3,last_update_id=$4,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2',
      [k.business,k.user,action.value,event.updateId])
    return response(event,old.locale,old.service_key,'confirm',{format:action.value})
  }
  if(action?.kind==='confirm'&&old.stage==='confirm'&&old.delivery_format){
    // The customer explicitly approved both this service and this format.
    // This is consent to a single reply, not marketing, Cabinet or payment.
    await db.query('update '+TABLE+
      " set stage='committing',consent_at=now(),last_update_id=$3,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2',
      [k.business,k.user,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,peer:k.peer,service:old.service_key,locale:old.locale,format:old.delivery_format,
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='confirm'&&old.stage==='committing'&&old.consent_at){
    await db.query(update,[k.business,k.user,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,peer:k.peer,service:old.service_key,locale:old.locale,format:old.delivery_format,
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='confirm'&&old.stage==='submitted'&&old.reference_code){
    await db.query(update,[k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'submitted',
      {referenceCode:old.reference_code})
  }
  await db.query(update,[k.business,k.user,event.updateId])
  return {handled:true}
 })
}
// A real business order is inserted only after the signed Telegram message
// explicitly confirmed it. No browser-provided identity, product price,
// clinical text, arbitrary consultant or consent can reach this transaction.
async function saveConfirmedEnquiry(config,intent){
 return transaction(config,null,async db=>{
  await lock(db,intent.lock)
  await db.query("select set_config('hh.tg_business_operation',$1,true)",
    [String(intent.operationId)])
  const state=(await db.query('select operation_id,practitioner_id,service_key,locale,delivery_format,contact_id,telegram_peer_hash,intake_answers_ciphertext '+
    'from '+TABLE+" where operation_id=$1 and business_hash=$2 and user_hash=$3 "+
    "and stage='committing' and consent_at is not null and consent_at>now()-interval '15 minutes'",
    [intent.operationId,intent.business,intent.user])).rows[0]
  if(!state||state.practitioner_id!==PRACTITIONER_ID||
     state.service_key!==intent.service||state.locale!==intent.locale||
     state.delivery_format!==intent.format||state.telegram_peer_hash!==intent.peer)
    throw new AppError('BUSINESS_CONFIRMATION_REQUIRED',409)
  const title=telegramBusinessServiceTitle(intent.service,intent.locale)
  if(!title)throw new AppError('INVALID_SERVICE_ENQUIRY',400)
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",
    [String(intent.operationId)])
  const digest=operationHash({scope:'hh-tg-business-enquiry',operationId:intent.operationId,
    business:intent.business,user:intent.user,service:intent.service,
    locale:intent.locale,format:intent.format},config)
  // Atomic finalize: CRM and session state share one backend transaction.
  // Cancel/STOP use the same advisory lock and can never race between commits.
  const finalize=async(id,referenceCode,contactId)=>{
    const marked=await db.query(
      'update '+TABLE+" set stage='submitted',reference_code=$4,contact_id=$5,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2 and operation_id=$3 '+
      "and stage='committing' and consent_at is not null "+
      "and consent_at>now()-interval '15 minutes'",
      [intent.business,intent.user,intent.operationId,referenceCode,contactId])
    if(marked.rowCount!==1)throw new AppError('BUSINESS_CONFIRMATION_REQUIRED',409)
    return {id,referenceCode}
  }
  const prior=(await db.query(
    'select id,reference_code,operation_hash from app.public_service_enquiries where operation_id=$1',
    [intent.operationId])).rows[0]
  if(prior){
    if(prior.operation_hash!==digest)throw new AppError('IDEMPOTENCY_CONFLICT',409)
    // Legacy receipts remain immutable; no invented contact on replay.
    return finalize(prior.id,prior.reference_code,state.contact_id||null)
  }
  const practitioner=(await db.query(
    "select id,trusted_auth_user_id as owner_id from app.practitioners where id=$1 and active "+
    "and status in ('approved','submitted','changes_requested') and public_profile<>'{}'::jsonb",
    [PRACTITIONER_ID])).rows[0]
  if(!practitioner?.owner_id)throw new AppError('PRACTICE_UNAVAILABLE',503)
  // A fixed public recommendation may not correspond to a moderated master
  // listing. In that case store the honest unlinked service title.
  const matching=(await db.query(
    'select id from app.service_offerings where practitioner_id=$1 and active=true '+
    "and status='published' and (localized_copy->$2->>'title')=$3 order by id limit 2",
    [PRACTITIONER_ID,intent.locale,title])).rows
  const offeringId=matching.length===1?matching[0].id:null
  const id=randomUUID(),ref=publicEnquiryReference(id)
  const ctx=(field)=>({accountId:PRACTITIONER_ID,recordId:id,field})
  let message='A customer confirmed a Telegram Business enquiry for "'+title+
    '", format '+intent.format+'. Reply in the existing @holistichouse chat. '+
    'This is not a booked session or verified payment.'
  if(intent.service==='ai_secretary'){
    const context={accountId:PRACTITIONER_ID,recordId:intent.operationId,
      field:'tg_business.ai_secretary.answers'}
    const payload=state.intake_answers_ciphertext
      ?openSealed(state.intake_answers_ciphertext,context,config):null
    const questions=telegramAiSecretarySummary(intent.locale,payload?.answers)
    if(!questions)throw new AppError('AI_SECRETARY_INTAKE_INCOMPLETE',409)
    message='Customer requested an AI secretary business implementation. '+
      'The following five answers were supplied in the verified personal Telegram Business chat. '+
      'No appointment, paid order or marketing permission was created.\\n\\n'+
      questions.map((question,index)=>question+'\\n'+payload.answers[index]).join('\\n\\n')
  }
  // No raw chat ID, Telegram username, arbitrary free text, symptoms or
  // reports are stored. Telegram reply identity remains at the provider.
  const contact={displayName:'Telegram customer',email:'',phone:'',
    submittedByVisitor:true,replyConsent:'tg_business_single_enquiry_v1'}
  const proof=operationHash({scope:'hh-tg-business-consent',operationId:intent.operationId,
    business:intent.business,user:intent.user},config)
  const inserted=(await db.query(
    'insert into app.public_service_enquiries '+
    '(id,recipient_practitioner_id,service_title,source_path,locale,reference_code,'+
    'description_ciphertext,contact_ciphertext,contact_channel,operation_id,operation_hash,'+
    'service_offering_id,telegram_handoff_digest) '+
    'values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id',
    [id,PRACTITIONER_ID,title,'/'+intent.locale+'/services',intent.locale,ref,
      seal(message,ctx('public_lead.message'),config),
      seal(contact,ctx('public_lead.contact'),config),'telegram',
      intent.operationId,digest,offeringId,proof])).rows[0]
  if(!inserted)throw new AppError('REQUEST_FAILED',503)
  // Stable, verified peer hash deduplicates CRM contacts even if a Business
  // connection is replaced. The entire enquiry/contact/link is atomic.
  const ownerId=practitioner.owner_id
  // The first signed Business message already created an encrypted CRM lead.
  // Use exactly the same stable CRM contact key at confirmation; avoid a
  // second contact/lead for the same person or a rotated Business connection.
  const botId=telegramBotBusinessId()
  if(!botId)throw new AppError('CHANNEL_NOT_CONNECTED',503)
  const accountDigest=businessHash('telegram',botId,config)
  const crmUserHash=operationHash({scope:'crm-msg-user',provider:'telegram_business',
    accountDigest,userId:intent.chatId},config)
  const emailHash=operationHash({scope:'crm-msg-contact',owner:ownerId,
    accountDigest,userHash:crmUserHash},config)
  await db.query("select set_config('hh.tg_business_contact_hash',$1,true)",[emailHash])
  await db.query("select set_config('hh.telegram_verified_peer_hash',$1,true)",[intent.peer])
  const known=(await db.query(
    'select id,suppressed from app.crm_contacts where owner_id=$1 and email_hash=$2 limit 1',
    [ownerId,emailHash])).rows[0]
  if(known?.suppressed)throw new AppError('CUSTOMER_SUPPRESSED',409)
  if(state.contact_id&&known&&state.contact_id!==known.id)
    throw new AppError('TELEGRAM_CONTACT_CONFLICT',409)
  const contactId=state.contact_id||known?.id||randomUUID()
  if(!state.contact_id&&!known){
    const context={accountId:ownerId,recordId:contactId,field:'crm.contact'}
    const record={displayName:'Telegram customer',email:'',phone:'',
      enquiry:{referenceCode:ref,serviceTitle:title,sourcePath:'/'+intent.locale+'/services'},
      channel:'telegram',origin:'telegram_business',replyConsent:'tg_business_single_enquiry_v1'}
    const created=await db.query(
      "insert into app.crm_contacts (id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source) "+
      "values($1,$2,$3,$4,null,$5,'lead','website') on conflict(owner_id,email_hash) do nothing",
      [contactId,ownerId,seal(record,context,config),emailHash,intent.locale])
    if(created.rowCount!==1)throw new AppError('TELEGRAM_CONTACT_CONFLICT',409)
  }
  const linked=await db.query(
    "insert into app_private.public_enquiry_contact_links "+
    "(enquiry_id,owner_id,contact_id,evidence) values($1,$2,$3,'verified_telegram_business_enquiry')",
    [id,ownerId,contactId])
  if(linked.rowCount!==1)throw new AppError('CRM_LINK_FAILED',503)
  // Persist the owner alert intent in this SAME protected transaction:
  // a successful HH acknowledgement must never be lost if the post-commit
  // Telegram dispatcher crashes or the provider is temporarily unavailable.
  // The existing owner-only notifier uses on-conflict dedupe and may then
  // send a neutral reference, never the customer's private answers.
  await db.query(
    'insert into app_private.notification_public_enquiry_intents '+
    '(enquiry_id,owner_id) values($1,$2) on conflict do nothing',
    [id,ownerId])
  return finalize(id,ref,contactId)
 },{server:true})
}
export async function processTelegramBusinessConversation(update,config,env=process.env){
 if(env.HH_CRM_TG_CHAT_AUTOMATION_ENABLED!=='true')return {handled:false}
 const event=telegramBusinessMessageFromUpdate(update)
 if(!event)return {handled:false}
 // Natural interest in the AI-secretary product remains in this same
 // verified human Business chat; general private text is not an order.
 if(!event.request)event.request=telegramAiSecretaryIntent(event.text)
 // A natural text response to an active AI-secretary interview is not a
 // Telegram command. The private signed-session gate decides if it belongs
 // to this intake. Unrelated human chats remain untouched.
 if(!event.request&&!telegramBusinessClientChoice(event.text)&&
    !telegramAiSecretaryAnswer(event.text))return {handled:false}
 // The connected user's ID/rights must be checked at the provider before any
 // session lookup or write. No credential, chat text or IDs are logged.
 try{
   await assertHolisticBusinessConnection({connectionId:event.connectionId,
     to:event.chatId},env)
 }catch{return {handled:true}}
 const k=keys(event,config)
 const result=await stage(event,config,k)
 if(!result.commit)return result
 try{
   const saved=await saveConfirmedEnquiry(config,result.commit)
   // Both records are committed atomically before acknowledging the client.
   return response(event,result.commit.locale,result.commit.service,'submitted',
     {referenceCode:saved.referenceCode})
 }catch{
   // A competing Cancel/STOP may have won the lock before the CRM transaction.
   // Never send a retry nudge to an already terminal conversation.
   let stillPending=false
   try{
     stillPending=await webhookTransaction(config,async db=>{
       await lock(db,result.commit.lock)
       const row=(await db.query('select stage,operation_id from '+TABLE+
         ' where business_hash=$1 and user_hash=$2',
         [result.commit.business,result.commit.user])).rows[0]
       return row?.stage==='committing'&&row.operation_id===result.commit.operationId
     })
   }catch{}
   return stillPending
     ?response(event,result.commit.locale,result.commit.service,'unavailable')
     :{handled:true}
 }
}
