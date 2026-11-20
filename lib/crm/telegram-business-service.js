import 'server-only'
import {randomUUID} from 'node:crypto'
import {transaction} from '../app/database.js'
import {operationHash,seal,openSealed} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {publicEnquiryReference} from '../practitioners/public-service-enquiry-input.mjs'
import {webhookTransaction} from './messenger-webhook.js'
import {assertHolisticBusinessConnection} from './messenger-provider.js'
import {telegramBusinessMessageFromUpdate,telegramBusinessClientChoice,
  telegramBusinessConversationReply,telegramBusinessServiceTitle,detectTelegramMessageLocale} from '../assist/telegram-business-request.mjs'
import {AppError} from '../assessments/contracts.js'
import {telegramAiSecretaryQuestion,telegramAiSecretaryStep,telegramAiSecretaryAnswer,telegramAiSecretarySummary,telegramAiSecretaryIntent} from '../assist/telegram-ai-secretary-intake.mjs'
import {classifyTelegramSecretaryQuery,composeTelegramSecretaryAnswer} from './telegram-secretary-offers.mjs'
import {telegramBusinessReplyFailure} from './telegram-delivery-status.mjs'
import {aliBusinessReviewValidated,aliBusinessReviewConsent,aliBusinessReviewAnswer,aliBusinessReviewSummary}
  from '../assist/ali-business-review-intake.mjs'

const TABLE='app_private.crm_tg_business_service_sessions'
const LOCK='hh-tg-business-service-session:'
const today=()=>new Date().toISOString().slice(0,10)
const reviewContext=operationId=>({accountId:PRACTITIONER_ID,recordId:operationId,
  field:'tg_business.personal_review.answers'})
const reviewedAnswers=(row,config)=>row?.intake_answers_ciphertext
  ?aliBusinessReviewValidated(openSealed(row.intake_answers_ciphertext,
     reviewContext(row.operation_id),config)):null
const response=(event,locale,service,type,other={})=>({
  handled:true,connectionId:event.connectionId,to:event.chatId,serviceKey:service,
  offerId:other.offerId||null,sourcePath:other.sourcePath||null,
  dialogueStage:other.dialogueStage||null,
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
    return response(event,old.locale,old.service_key,'stopped',
      {offerId:old.offer_id,sourcePath:old.source_path,dialogueStage:'stopped'})
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
  if(request?.service==='personal_review'&&(!old||old.stage==='submitted'||old.stage==='cancelled'||old.stage==='stopped'||
     old.service_key!=='personal_review'||old.offer_id!==request.offerId)){
    await db.query('insert into '+TABLE+
      ' (business_hash,user_hash,telegram_peer_hash,operation_id,practitioner_id,service_key,offer_id,source_path,locale,stage,last_update_id) '+
      "values($1,$2,$3,$4,$5,'personal_review',$6,$7,$8,'review_understanding',$9) "+
      'on conflict(business_hash,user_hash) do update set operation_id=excluded.operation_id,'+
      'telegram_peer_hash=excluded.telegram_peer_hash,practitioner_id=excluded.practitioner_id,'+
      "service_key='personal_review',offer_id=excluded.offer_id,source_path=excluded.source_path,"+
      "locale=excluded.locale,stage='review_understanding',last_update_id=excluded.last_update_id,"+
      'delivery_format=null,consent_at=null,reference_code=null,contact_id=null,'+
      'intake_answers_ciphertext=null,created_at=now(),updated_at=now()',
      [k.business,k.user,k.peer,randomUUID(),PRACTITIONER_ID,request.offerId,request.sourcePath,request.locale,event.updateId])
    const reply=response(event,request.locale,'personal_review','review_intro',
      {offerId:request.offerId,titleLocale:request.locale,sourcePath:request.sourcePath,
       dialogueStage:'review_understanding'})
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
  const update='update '+TABLE+' set last_update_id=$3,updated_at=now() '
    +'where business_hash=$1 and user_hash=$2'
  // Avoid hijacking ordinary human chat or catalogue queries. Only an
  // active, explicit AI-secretary intake may consume natural-language answers.
  // This consented service has three meaningful evidence fields. Persist
  // each answer encrypted before advancing. FAQs, claims and short assent
  // do NOT turn into a psychological profile or silently consume a question.
  if(old.service_key==='personal_review'&&
     ['review_understanding','review_outcome','review_action'].includes(old.stage)){
    const language=detectTelegramMessageLocale(event.text,old.locale)
    const progress=reviewedAnswers(old,config)
    const consent=aliBusinessReviewConsent(event.text)
    // Verified urgent cues interrupt the interview without advancing a slot
    // or storing sensitive symptoms as an ordinary booking answer.
    const boundary=classifyTelegramSecretaryQuery(event.text,language)
    if(boundary?.kind==='safety'){
      const guidance=composeTelegramSecretaryAnswer(boundary,[])
      await db.query(update,[k.business,k.user,event.updateId])
      return {...response(event,language,'personal_review','review_intro',{
        offerId:old.offer_id,titleLocale:old.locale,dialogueStage:old.stage}),
        reply:(guidance?.text||'Please contact your local emergency service if you are in immediate danger.').slice(0,600)}
    }
    if(request){
      await db.query(update,[k.business,k.user,event.updateId])
      const type=!progress?'review_intro':
        old.stage==='review_understanding'?'review_first':
        old.stage==='review_outcome'?'review_outcome':'review_action'
      return response(event,language,'personal_review',type,
        {offerId:old.offer_id,titleLocale:old.locale,dialogueStage:old.stage})
    }
    if(action?.kind==='cancel'||consent==='no'){
      await db.query('update '+TABLE+" set stage='cancelled',last_update_id=$3,"+
        "intake_answers_ciphertext=null,updated_at=now() where business_hash=$1 and user_hash=$2",
        [k.business,k.user,event.updateId])
      return response(event,old.locale,'personal_review','cancelled',
        {offerId:old.offer_id,titleLocale:old.locale})
    }
    if(!progress){
      if(consent!=='yes'){
        await db.query(update,[k.business,k.user,event.updateId])
        return response(event,language,'personal_review','review_intro',
          {offerId:old.offer_id,titleLocale:old.locale,dialogueStage:old.stage})
      }
      const newState={version:1,consented:true,answers:{}}
      await db.query('update '+TABLE+
        " set stage='review_understanding',intake_answers_ciphertext=$3,"+
        'last_update_id=$4,updated_at=now() where business_hash=$1 and user_hash=$2',
        [k.business,k.user,seal(newState,reviewContext(old.operation_id),config),event.updateId])
      return response(event,language,'personal_review','review_first',
        {offerId:old.offer_id,titleLocale:old.locale,dialogueStage:'review_understanding'})
    }
    const expected=old.stage==='review_understanding'?'goal':
      old.stage==='review_outcome'?'challenge':'situation'
    // Older sessions can retain a different stage than their encrypted data
    // after a partial failure; next question is determined by missing facts.
    const missing=['goal','challenge','situation'].find(key=>!progress.answers[key])||null
    if(missing!==expected){
      const stageByField={goal:'review_understanding',challenge:'review_outcome',situation:'review_action'}
      if(!missing){
        await db.query(update,[k.business,k.user,event.updateId])
        return response(event,language,'personal_review','review_summary',{
          offerId:old.offer_id,titleLocale:old.locale,
          reviewSummary:aliBusinessReviewSummary(language,progress.answers)})
      }
      await db.query('update '+TABLE+' set stage=$3,last_update_id=$4,updated_at=now() '+
        'where business_hash=$1 and user_hash=$2',
        [k.business,k.user,stageByField[missing],event.updateId])
      return response(event,language,'personal_review',
        missing==='goal'?'review_first':missing==='challenge'?'review_outcome':'review_action',
        {offerId:old.offer_id,titleLocale:old.locale})
    }
    const answer=action?null:aliBusinessReviewAnswer({message:event.text,stage:old.stage})
    if(!answer){
      await db.query(update,[k.business,k.user,event.updateId])
      // Do not treat a question about the form or a claim of uploading a photo
      // as evidence: files require their own verified private flow.
      return response(event,language,'personal_review',
        expected==='goal'?'review_first':expected==='challenge'?'review_outcome':'review_action',
        {offerId:old.offer_id,titleLocale:old.locale,dialogueStage:old.stage})
    }
    const next={version:1,consented:true,answers:{...progress.answers,[answer.field]:answer.text}}
    const nextStage=answer.next
    await db.query('update '+TABLE+
      " set stage=$3,intake_answers_ciphertext=$4,last_update_id=$5,"+
      "delivery_format=case when $3='confirm' then 'async' else delivery_format end,"+
      'updated_at=now() where business_hash=$1 and user_hash=$2',
      [k.business,k.user,nextStage,seal(next,reviewContext(old.operation_id),config),event.updateId])
    return response(event,language,'personal_review',
      nextStage==='confirm'?'review_summary':
      nextStage==='review_outcome'?'review_outcome':'review_action',
      {offerId:old.offer_id,titleLocale:old.locale,dialogueStage:nextStage,
        ...(nextStage==='confirm'?{reviewSummary:aliBusinessReviewSummary(language,next.answers)}:{})})
  }
  // The same Order link while awaiting approval re-shows a preview instead of
  // silently swallowing the signed customer update.
  if(old.service_key==='personal_review'&&old.stage==='confirm'&&
     action?.kind!=='confirm'&&action?.kind!=='cancel'&&action?.kind!=='stop'){
    const language=detectTelegramMessageLocale(event.text,old.locale);
    if(!request&&!action){
      const query=classifyTelegramSecretaryQuery(event.text,language);
      if(query?.kind==='safety'||query?.kind==='faq')return {handled:false};
    }
    await db.query(update,[k.business,k.user,event.updateId]);
    const progress=reviewedAnswers(old,config)
    const draft=progress&&aliBusinessReviewSummary(language,progress.answers)
    return response(event,language,'personal_review',draft?'review_summary':'review_intro',
      {format:'async',offerId:old.offer_id,titleLocale:old.locale,
       reviewSummary:draft,sourcePath:old.source_path,dialogueStage:'confirm'});
  }
if(!request&&!action&&
     (old.service_key!=='ai_secretary'||telegramAiSecretaryStep(old.stage)===null))
    return {handled:false}
  if(action?.kind==='cancel'&&old.stage!=='submitted'){
    await db.query("update "+TABLE+" set stage='cancelled',last_update_id=$3,"+
       'updated_at=now() where business_hash=$1 and user_hash=$2',
       [k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'cancelled',
      {offerId:old.offer_id,sourcePath:old.source_path,dialogueStage:'cancelled'})
  }
  if(action?.kind==='submit'&&old.service_key==='personal_review'&&old.stage==='review_action'){
    await db.query(update,[k.business,k.user,event.updateId])
    return response(event,old.locale,'personal_review','review_action',
      {offerId:old.offer_id,titleLocale:old.locale})
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
      offerId:null,sourcePath:null,dialogueStage:null,
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='format'&&old.service_key!=='personal_review'&&['format','confirm'].includes(old.stage)){
    await db.query('update '+TABLE+
      " set stage='confirm',delivery_format=$3,last_update_id=$4,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2',
      [k.business,k.user,action.value,event.updateId])
    return response(event,old.locale,old.service_key,'confirm',{format:action.value})
  }
  if(action?.kind==='confirm'&&old.stage==='confirm'&&old.delivery_format){
    if(old.service_key==='personal_review'){
      const complete=reviewedAnswers(old,config)
      if(!complete||!aliBusinessReviewSummary(old.locale,complete.answers)||
         old.delivery_format!=='async'){
        // A pre-upgrade, unconsented "Confirm" must not bypass the three
        // client-authored facts, and must be recoverable instead of stuck.
        await db.query('update '+TABLE+
          " set stage='review_understanding',delivery_format=null,consent_at=null,"+
          "intake_answers_ciphertext=null,last_update_id=$3,updated_at=now()"+
          ' where business_hash=$1 and user_hash=$2',
          [k.business,k.user,event.updateId])
        return response(event,old.locale,old.service_key,'review_intro',
          {offerId:old.offer_id,titleLocale:old.locale})
      }
    }
    // The customer explicitly approved both this service and this format.
    // This is consent to a single reply, not marketing, Cabinet or payment.
    await db.query('update '+TABLE+
      " set stage='committing',consent_at=now(),last_update_id=$3,updated_at=now()"+
      ' where business_hash=$1 and user_hash=$2',
      [k.business,k.user,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,peer:k.peer,service:old.service_key,locale:old.locale,format:old.delivery_format,
      offerId:old.offer_id||null,sourcePath:old.source_path||null,dialogueStage:'confirm',
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='confirm'&&old.stage==='committing'&&old.consent_at){
    if(old.service_key==='personal_review'){
      const complete=reviewedAnswers(old,config)
      if(!complete||!aliBusinessReviewSummary(old.locale,complete.answers)||
         old.delivery_format!=='async'){
        await db.query(update,[k.business,k.user,event.updateId])
        return {handled:true}
      }
    }
    await db.query(update,[k.business,k.user,event.updateId])
    return {handled:true,commit:{operationId:old.operation_id,connectionId:event.connectionId,
      chatId:event.chatId,peer:k.peer,service:old.service_key,locale:old.locale,format:old.delivery_format,
      offerId:old.offer_id||null,sourcePath:old.source_path||null,dialogueStage:'confirm',
      business:k.business,user:k.user,lock:k.lock},event}
  }
  if(action?.kind==='confirm'&&old.stage==='submitted'&&old.reference_code){
    await db.query(update,[k.business,k.user,event.updateId])
    return response(event,old.locale,old.service_key,'submitted',
      {referenceCode:old.reference_code,offerId:old.offer_id,sourcePath:old.source_path,
       dialogueStage:'submitted'})
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
  const state=(await db.query('select operation_id,practitioner_id,service_key,offer_id,source_path,locale,delivery_format,contact_id,telegram_peer_hash,intake_answers_ciphertext '+
    'from '+TABLE+" where operation_id=$1 and business_hash=$2 and user_hash=$3 "+
    "and stage='committing' and consent_at is not null and consent_at>now()-interval '15 minutes'",
    [intent.operationId,intent.business,intent.user])).rows[0]
  if(!state||state.practitioner_id!==PRACTITIONER_ID||
     state.service_key!==intent.service||state.locale!==intent.locale||
     state.delivery_format!==intent.format||state.telegram_peer_hash!==intent.peer)
    throw new AppError('BUSINESS_CONFIRMATION_REQUIRED',409)
  const title=telegramBusinessServiceTitle(intent.service,intent.locale,state.offer_id)
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
  if(intent.service==='personal_review'){
    const progress=reviewedAnswers({operation_id:intent.operationId,
      intake_answers_ciphertext:state.intake_answers_ciphertext},config)
    const summary=progress&&aliBusinessReviewSummary(intent.locale,progress.answers)
    if(!summary)throw new AppError('PERSONAL_REVIEW_INCOMPLETE',409)
    message='Customer-approved non-clinical review request (customer words only). '+
      'No diagnosis, media receipt, appointment or payment is inferred.\n\n'+summary
  }
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
    [id,PRACTITIONER_ID,title,state.source_path||'/'+intent.locale+'/services',intent.locale,ref,
      seal(message,ctx('public_lead.message'),config),
      seal(contact,ctx('public_lead.contact'),config),'telegram',
      intent.operationId,digest,offeringId,proof])).rows[0]
  if(!inserted)throw new AppError('REQUEST_FAILED',503)
  // Stable, verified peer hash deduplicates CRM contacts even if a Business
  // connection is replaced. The entire enquiry/contact/link is atomic.
  const ownerId=practitioner.owner_id
  const emailHash=operationHash({scope:'crm-tg-business-peer',owner:ownerId,peer:intent.peer},config)
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
      enquiry:{referenceCode:ref,serviceTitle:title,sourcePath:state.source_path||'/'+intent.locale+'/services'},
      channel:'telegram',replyConsent:'tg_business_single_enquiry_v1'}
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
 // Valid signed private Business updates may continue an existing service
 // session in any language. stage() returns unhandled when no session exists.
 // The connected user's ID/rights must be checked at the provider before any
 // session lookup or write. No credential, chat text or IDs are logged.
 try{
   await assertHolisticBusinessConnection({connectionId:event.connectionId,
     to:event.chatId},env)
 }catch(error){return {handled:true,failure:telegramBusinessReplyFailure(error),
   serviceKey:event.request?.service||null,offerId:event.request?.offerId||null,
   sourcePath:event.request?.sourcePath||null,dialogueStage:event.request?'not_started':null}}
 const k=keys(event,config)
 const result=await stage(event,config,k)
 if(!result.commit)return result
 try{
   const saved=await saveConfirmedEnquiry(config,result.commit)
   // Both records are committed atomically before acknowledging the client.
   return response(event,result.commit.locale,result.commit.service,'submitted',
     {referenceCode:saved.referenceCode,offerId:result.commit.offerId,
       sourcePath:result.commit.sourcePath,dialogueStage:'submitted'})
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
