import 'server-only'
import {transaction} from '../app/database.js'
import {seal,openSealed,operationHash} from '../app/crypto.js'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {businessHash} from './messenger-store.js'
import {channelTransportReady,telegramPilotReady,telegramBotBusinessId} from './messenger-policy.js'
import {parseTelegramHomeAction,parseTelegramHomeCallback,companionMessage,
  telegramMenuKeyboard,telegramCompanionRegistrationButtons,telegramCompanionConsentButtons,menuLocale,
  TELEGRAM_EXPLORE_ACTIONS,telegramExploreMenuButtons,telegramExploreDetailButtons,telegramExploreDetailText,telegramMenuFreeTextIntent,
  companionLocalDate,companionDailyDue,companionDatabaseDay,companionReplyBudgetAllows,
  telegramCompanionCheckinButtons,companionCheckinReply} from './telegram-companion-menu.mjs'
import {telegramCabinetLinkButtons} from './telegram-companion-menu.mjs'
import {ruleConversationReply} from '../holistic-support/rule-conversation.mjs'
import {v3CanStart,v3WantsGeneralChat} from './telegram-ai-diagnostic-v3.mjs'
import {companionReflectiveReply,companionImmediateDanger} from './companion-reflection.mjs'
import {resolveHomeGuideQuestion} from '../home-conversation.mjs'
import {sendTelegramCompanionMessage} from './messenger-provider.js'

const TABLE='app_private.crm_tg_companion_sessions'
const CHAT_FIELD='crm.tgcompanion'
const STATE_RE=/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhreview_(?:ru|en|es)$/i
const STOP=/^\/(?:stop|unsubscribe)(?:@[A-Za-z0-9_]{5,32})?$/i
const PENDING_MS=15*60*1000
const ALLOWED_REPLY=40
const verified=(env)=>env.HH_CRM_TG_COMPANION_ENABLED==='true'&&
  env.VERCEL_ENV==='production'&&channelTransportReady('telegram',env)
const onlyLocale=(event,previous,action)=>{
  if(action?.locale)return action.locale
  const raw=String(event?.rawText||'')
  if(/[а-яё]/iu.test(raw))return 'ru'
  if(previous?.locale)return previous.locale
  if(event?.language?.startsWith('ru'))return 'ru'
  if(event?.language?.startsWith('es'))return 'es'
  return 'en'
}
const clockToday=()=>companionLocalDate(new Date())
const context=(row)=>({accountId:row.owner_id,recordId:row.id,field:CHAT_FIELD})
async function sessionTx(config,fn,kind='inbox'){
 return transaction(config,null,async db=>{
  await db.query("select set_config('hh.crm_companion','1',true)")
  return fn(db)
 },kind==='inbox'?{inbox:true,practitionerId:PRACTITIONER_ID}:{server:true})
}
function chatKeys(config,user,env){
 const bot=telegramBotBusinessId(env)
 if(!/^\d{5,25}$/.test(String(bot))||!/^\d{1,25}$/.test(String(user)))return null
 const business=businessHash('telegram',bot,config)
 return {business, user:operationHash({scope:'crm-msg-user',provider:'telegram',accountDigest:business,userId:String(user)},config)}
}
function plainAction(event,env){
 if(event?.inlineAction?.startsWith('home:')){
  const action=event.inlineAction.slice(5)
  if(['ai_on','daily_on','home',...TELEGRAM_EXPLORE_ACTIONS].includes(action)||/^checkin_[1-5]$/.test(action))
   return {action,locale:menuLocale(event.inlineLocale)}
  return null
 }
 const raw=String(event?.rawText||'').trim()
 const cmd=parseTelegramHomeAction(raw,env.HH_CRM_MSG_TELEGRAM_USERNAME)
 if(cmd)return cmd
 return null
}
const answer=(locale,action,key)=>({handled:true,to:null,locale,
 text:companionMessage(locale,key||action),
 markup:action==='home'||action==='language'?telegramMenuKeyboard(locale):
 (action==='ai'||action==='daily')?telegramCompanionConsentButtons(action,locale):null})
function limitRow(row,today){
 const current=companionDatabaseDay(row?.reply_day)
 return current===today?Math.max(0,Number(row.reply_count)||0):0
}

/** A separate first-party mode INSIDE the existing signed CRM Telegram webhook.
 * No arbitrary model calls, no creation of CRM leads, and no raw chat text stored.
 * The diagnostic deep link always keeps its own /agree/privacy path.
 */
export async function processTelegramCompanion(event,config,env=process.env){
 if(!verified(env)||event?.type!=='incoming'||!
   /^tg:\d+$/.test(String(event.eventId||''))||
   !/^\d{1,25}$/.test(String(event.userId||''))||
   (event.rawText&&String(event.rawText).length>1200))return {handled:false}
 const raw=String(event.rawText||'').trim()
 const keys=chatKeys(config,event.userId,env)
 if(!keys)return {handled:false}
 const selected=plainAction(event,env)
 const stop=STOP.test(raw)||event.stop===true
 const diagnostic=STATE_RE.test(raw)
 // Free-text conversational turns use the shared Secretary/Coach router in V3.
 // Menu, direct chat, diagnostic deep links and callbacks stay independent.
 const greeting=/^(?:привет(?:ствую)?|здравствуй(?:те)?|ау|privet|hello|hi|hola)[!.,\s]*$/iu.test(raw)
 if(v3CanStart(env)&&!stop&&!diagnostic&&!event.inlineAction&&!event.photoFileId&&
    !raw.startsWith('/')&&v3WantsGeneralChat(raw)&&
    (!selected||(selected.action==='home'&&greeting))&&
    !/^[0-9]{1,2}$/.test(raw))return {handled:false}
 // Existing diagnostic callbacks/photos and non-companion commands are not AI text.
 if(!selected&&!stop&&!diagnostic&&
    (event.inlineAction||event.photoFileId||!raw||raw.startsWith('/')))return {handled:false}
 // Pilot is strictly limited to the verified owner test chat. Do not mint
 // extra audiences or loosen the existing CRM pilot's recipient policy.
 if(telegramPilotReady(env)&&String(event.userId)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID)
  return {handled:false}
 return sessionTx(config,async db=>{
  await db.query('select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended($1,0))',
    [keys.business+':companion:'+keys.user])
  const connected=(await db.query('select owner_id,account_id from app_private.crm_msg_resolve($1,$2)',
    ['telegram',keys.business])).rows[0]
  if(!connected)return {handled:false}
  let row=(await db.query(`select * from ${TABLE} where business_hash=$1 and user_hash=$2 for update`,
    [keys.business,keys.user])).rows[0]
  // An explicitly chosen direct practitioner conversation outranks a prior
  // AI/check-in state for ordinary text. Signed Telegram update IDs choose
  // the most recent mode. Commands and menu buttons remain deliberate.
  const explicitCompanion=Boolean(selected&&(
    event.inlineAction?.startsWith('home:')||raw.startsWith('/')||
    selected.action!=='home'))
  if(!explicitCompanion&&!stop&&!diagnostic&&!event.inlineAction&&!event.photoFileId){
   const direct=(await db.query(
     "select stage,last_update_id,flow_version,coalesce(to_jsonb(s)->>'chat_mode','diagnostic') as chat_mode "+
     "from app_private.crm_tg_diagnostic_sessions s where business_hash=$1 and user_hash=$2 limit 1",
     [keys.business,keys.user])).rows[0]
   if(Number(direct?.flow_version)===3&&direct.chat_mode==='diagnostic'&&direct.stage!=='stopped')
     return {handled:false}
   if(direct?.chat_mode==='direct'&&direct.stage!=='stopped'&&
     (!row||Number(direct.last_update_id)>=Number(row.last_update_id)))
     return {handled:false}
  }
  const menuQuestion=telegramMenuFreeTextIntent({selected,stop,diagnostic,mode:row?.mode,
    rawText:raw,inlineAction:event.inlineAction,photoFileId:event.photoFileId})
  if(!selected&&!stop&&!diagnostic&&(!row||row.mode!=='ai'&&row.mode!=='checkin')&&!menuQuestion)
   return {handled:false}
  const updateId=Number(event.eventId.slice(3))
  if(!Number.isSafeInteger(updateId))return {handled:true}
  if(row&&Number(row.last_update_id)>=updateId)return {handled:true,duplicate:true,callbackId:event.callbackId||null}
  if(!row&&(stop||diagnostic))return {handled:false}
  const firstMenu=!row
  if(!row){
   const created=(await db.query(`insert into ${TABLE}
     (business_hash,user_hash,owner_id,locale,last_update_id,reply_day,reply_count)
     values($1,$2,$3,$4,$5,$6,0) returning *`,
     [keys.business,keys.user,connected.owner_id,onlyLocale(event,null,selected),updateId,clockToday()])).rows[0]
   row=created
  }
  if(stop){
   await db.query(`update ${TABLE} set stopped_at=now(),mode='menu',ai_consent_at=null,
      daily_opt_in_at=null,daily_opt_out_at=now(),chat_ciphertext=null,
      pending_ai_at=null,pending_daily_at=null,last_update_id=$2,updated_at=now()
      where id=$1`,[row.id,updateId])
   return {handled:false}
  }
  if(row.stopped_at)return {handled:false}
  if(diagnostic){
   await db.query(`update ${TABLE} set mode='review',last_update_id=$2,updated_at=now() where id=$1`,[row.id,updateId])
   return {handled:false}
  }
  const language=onlyLocale(event,row,selected)
  const today=clockToday()
  const count=limitRow(row,today)
  if(!companionReplyBudgetAllows(selected?.action,count,ALLOWED_REPLY,row.mode))
   return {handled:true,limited:true,callbackId:event.callbackId||null}
  let action=selected?.action||null
  let text,markup=null,photo=false,mode=row.mode,aiConsent=row.ai_consent_at,
    dailyConsent=row.daily_opt_in_at,dailyOptOut=row.daily_opt_out_at,
    pendingAi=row.pending_ai_at,pendingDaily=row.pending_daily_at,
    chatCipher=row.chat_ciphertext
  if(!action){
   if(menuQuestion&&(resolveHomeGuideQuestion(raw,language).urgent||companionImmediateDanger(raw))){
    action='urgent';text=companionMessage(language,'urgent')
   }else if(menuQuestion&&!row.ai_consent_at){
    action='ai_prompt';pendingAi=new Date();text=companionMessage(language,'aiConsent')
    markup=telegramCompanionConsentButtons('ai',language)
   }else if((row.mode==='ai'||menuQuestion)&&row.ai_consent_at){
    action='ai_text';mode='ai'
    const safe=resolveHomeGuideQuestion(raw,language)
    text=(safe.urgent||companionImmediateDanger(raw))?companionMessage(language,'urgent'):
      (companionReflectiveReply(raw,language)||
       ruleConversationReply({message:raw,locale:language})?.reply||companionMessage(language,'aiOn'))
   }else if(row.mode==='checkin'&&/^(?:10|[0-9])$/.test(raw)){
    action='checkin_answer';text=companionMessage(language,'checkinAnswer');mode='menu'
   }else if(row.mode==='checkin'){
    action='checkin';text=companionMessage(language,'checkin')
   }else return {handled:false}
  }else if(action==='review'){
   await db.query(`update ${TABLE} set mode='review',last_update_id=$2,updated_at=now() where id=$1`,[row.id,updateId])
   return {handled:false,reviewRequested:true,reviewLocale:language}
  }else if(action.startsWith('lang_')){
   mode='menu';text=companionMessage(action.slice(5),'welcome')
   markup=action==='lang_es'?telegramMenuKeyboard('es'):telegramExploreMenuButtons(action.slice(5))
   photo=action!=='lang_es'
  }else if(action==='home'){
   mode='menu'
   // The very first plain Start gets a checklist and one continue button.
   // Existing callbacks, menus and independent consent journeys remain intact.
   const firstStart=firstMenu&&/^\/start(?:@[A-Za-z0-9_]{5,32})?$/i.test(raw)
   text=companionMessage(language,firstStart?'registrationWelcome':'welcome')
   markup=firstStart?telegramCompanionRegistrationButtons(language):
    (language==='es'?telegramMenuKeyboard('es'):telegramExploreMenuButtons(language))
   photo=!firstStart&&language!=='es'
  }else if(action==='cabinet'){
   mode='menu';text=language==='es'?companionMessage(language,'cabinet'):telegramExploreDetailText(language,'cabinet')
   markup=language==='es'?telegramCabinetLinkButtons(language):telegramExploreDetailButtons(language,'cabinet')
  }else if(TELEGRAM_EXPLORE_ACTIONS.includes(action)){
   mode='menu';text=telegramExploreDetailText(language,action)
   markup=telegramExploreDetailButtons(language,action)
  }else if(action==='ai'){
   if(aiConsent){mode='ai';text=companionMessage(language,'aiOn')}
   else{pendingAi=new Date();text=companionMessage(language,'aiConsent');markup=telegramCompanionConsentButtons('ai',language)}
  }else if(action==='ai_on'){
   const age=pendingAi?Date.now()-new Date(pendingAi).getTime():Infinity
   if(age<0||age>PENDING_MS){text=companionMessage(language,'aiPromptExpired')}
   else{aiConsent=new Date();pendingAi=null;mode='ai';text=companionMessage(language,'aiOn')}
  }else if(action==='ai_off'){
   mode='menu';aiConsent=null;pendingAi=null;text=companionMessage(language,'aiOff')
  }else if(action==='daily'){
   pendingDaily=new Date();text=companionMessage(language,'dailyConsent');markup=telegramCompanionConsentButtons('daily',language)
  }else if(action==='daily_on'){
   const age=pendingDaily?Date.now()-new Date(pendingDaily).getTime():Infinity
   if(age<0||age>PENDING_MS){text=companionMessage(language,'dailyPromptExpired')}
   else{
    dailyConsent=new Date();dailyOptOut=null;pendingDaily=null
    chatCipher=seal({chatId:String(event.userId)},context(row),config)
    text=companionMessage(language,'dailyOn')
   }
  }else if(action==='daily_off'){
   dailyConsent=null;dailyOptOut=new Date();pendingDaily=null;chatCipher=null
   text=companionMessage(language,'dailyOff')
  }else if(/^checkin_[1-5]$/.test(action)){
   if(row.mode==='checkin'){
    mode='menu';text=companionCheckinReply(language,Number(action.slice(-1)))
    markup=telegramMenuKeyboard(language)
   }else{text=companionMessage(language,'checkinExpired')}
  }else if(action==='checkin'){
   mode='checkin';text=companionMessage(language,'checkin');markup=telegramCompanionCheckinButtons(language)
  }else if(['meditation','video','materials','language'].includes(action)){
   text=companionMessage(language,action)
   if(action==='language')markup=telegramMenuKeyboard(language)
  }else return {handled:false}
  // No raw free-text or numeric check-in data is written; only state, locale,
  // consent timestamps and encrypted future delivery destination.
  await db.query(`update ${TABLE} set locale=$2,mode=$3,ai_consent_at=$4,
    daily_opt_in_at=$5,daily_opt_out_at=$6,chat_ciphertext=$7,
    pending_ai_at=$8,pending_daily_at=$9,last_update_id=$10,reply_day=$11,
    reply_count=$12,updated_at=now() where id=$1`,
    [row.id,action.startsWith('lang_')?action.slice(5):language,mode,aiConsent,
      dailyConsent,dailyOptOut,chatCipher,pendingAi,pendingDaily,updateId,today,Math.min(ALLOWED_REPLY,count+1)])
  return {handled:true,to:String(event.userId),text,locale:language,
    markup,photo,callbackId:event.callbackId||null,approvedPilotGuest:false,
    ...(action==='home'?{presentationFirstStart:firstMenu && /^\/start(?:@[A-Za-z0-9_]{5,32})?$/i.test(raw)}:{})}
 })
}

/** Existing 09:00 Toronto CRON_SECRET slot only.  One send/day per explicitly
 * opted-in private chat; a pending lease is not automatically replayed after
 * network/DB failure. STOP and /daily_off are serialized with the send lock.
 */
export async function deliverTelegramCompanionDaily(config,env=process.env,{limit=15,now=new Date()}={}){
 if(!verified(env)||env.HH_CRM_TG_COMPANION_DAILY_ENABLED!=='true'||!companionDailyDue(now))return {status:'disabled_or_not_due',count:0}
 const bot=telegramBotBusinessId(env)
 if(!/^\d{5,25}$/.test(String(bot)))return {status:'configuration_error',count:0}
 const business=businessHash('telegram',bot,config),today=companionLocalDate(now)
 const max=Math.min(5,Math.max(0,Number(limit)||0))
 const outcome={status:'processed',accepted:0,unknown:0,skipped:0}
 for(let i=0;i<max;i++){
  // Write a durable attempt BEFORE the provider call. If send status becomes
  // unknown or the function dies, a later invocation cannot duplicate it.
  const claimed=await sessionTx(config,async db=>{
   const row=(await db.query(`select * from ${TABLE} where business_hash=$1
      and stopped_at is null and daily_opt_in_at is not null
      and (daily_opt_out_at is null or daily_opt_in_at>daily_opt_out_at)
      and last_daily_day is distinct from $2::date
      order by updated_at,id for update skip locked limit 1`,[business,today])).rows[0]
   if(!row)return null
   await db.query(`update ${TABLE} set last_daily_day=$2,last_daily_status='unknown',updated_at=now()
      where id=$1`,[row.id,today])
   return row.id
  },'server')
  if(!claimed)break
  const status=await sessionTx(config,async db=>{
   const s=(await db.query(`select * from ${TABLE} where id=$1 for update`,[claimed])).rows[0]
   if(!s||s.stopped_at||!s.daily_opt_in_at||
      (s.daily_opt_out_at&&s.daily_opt_out_at>=s.daily_opt_in_at)||
      !s.chat_ciphertext||companionDatabaseDay(s.last_daily_day)!==today){
     return 'suppressed'
   }
   const chatId=String(openSealed(s.chat_ciphertext,context(s),config)?.chatId||'')
   if(!/^\d{1,25}$/.test(chatId))return 'suppressed'
   const message=companionMessage(s.locale,'dailyWelcome')
   // Row lock stays held through the capped network send; a simultaneous
   // explicit unsubscribe waits, then prevents subsequent daily deliveries.
   let state='unknown'
   try{
    const receipt=await sendTelegramCompanionMessage({to:chatId,text:message,
      markup:telegramMenuKeyboard(s.locale),daily:true},env)
    state=receipt.status==='accepted'?'accepted':'unknown'
   }catch{/* An uncertain network/provider outcome is not retried. */}
   await db.query(`update ${TABLE} set last_daily_status=$2,updated_at=now() where id=$1`,[s.id,state])
   return state
  },'server')
  if(status==='accepted')outcome.accepted++
  else if(status==='unknown')outcome.unknown++
  else outcome.skipped++
 }
 return outcome
}
