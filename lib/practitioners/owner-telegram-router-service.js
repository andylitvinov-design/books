import 'server-only';
import {randomUUID} from 'node:crypto';
import {transaction,consumeRate} from '../app/database.js';
import {seal,openSealed} from '../app/crypto.js';
import {telegramClientBotMode} from '../app/client-telegram-policy.js';
import {subscriberVoiceReady,transcribeSubscriberVoice} from '../app/subscriber-ai-voice.mjs';
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js';
import {ownerBotCredentials,sendOwnerDocument} from './telegram-hub.mjs';
import {resolvedOwnerAiEnvironment} from './owner-ai-provider-settings.js';
import {runOwnerCouncilFive,formatOwnerCouncilFive} from './owner-ai-five.mjs';
import {normalizeOwnerCouncilRussian,russianOwnerCouncilReport} from './owner-ai-telegram-ru.mjs';
import {createTask} from '../command-center/store.mjs';
import {sanitizeTask} from '../command-center/contracts.mjs';
import {PRACTITIONER_ID} from '../../data/app-services.js';
import {parseOwnerRouterUpdate,ownerRouterReceipt,ownerRouterTask,ROUTER_TTL_HOURS} from './owner-telegram-router.mjs';

// All writes require the existing verified owner pairing, private server DB
// role and the extra transaction-local RLS guard. No public router API exists.
const TABLE='app_private.telegram_owner_router_drafts';
const TELEGRAM='https://api.telegram.org/bot';
const CC_URL='https://holistichouse.vercel.app/admin/command-center';
const field={accountId:PRACTITIONER_ID,field:'owner_router.draft'};
async function routerTx(config,fn){
 return transaction(config,null,async db=>{
  await db.query("select set_config('hh.owner_router','1',true)");
  return fn(db);
 },{server:true});
}
async function botCall(credentials,method,payload,fetcher){
 const response=await fetcher(TELEGRAM+encodeURIComponent(credentials.token)+'/'+method,{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{'content-type':'application/json'},body:JSON.stringify(payload),
  signal:AbortSignal.timeout(11000)
 });
 if(!response.ok)throw Error('TELEGRAM_ROUTER_HTTP_'+response.status);
 const result=await response.json().catch(()=>null);
 if(result?.ok!==true)throw Error('TELEGRAM_ROUTER_NOT_ACCEPTED');
 if(method==='sendMessage'&&
    (!Number.isSafeInteger(result.result?.message_id)||
      String(result.result?.chat?.id)!==String(credentials.chat)))
   throw Error('TELEGRAM_ROUTER_OWNER_UNVERIFIED');
 return result.result;
}
async function sendOwner(credentials,message,fetcher){
 return botCall(credentials,'sendMessage',{
  chat_id:credentials.chat,disable_web_page_preview:true,
  text:message.text,...(message.reply_markup?{reply_markup:message.reply_markup}:{})
 },fetcher);
}
async function callbackAck(credentials,id,fetcher,text=''){
 await botCall(credentials,'answerCallbackQuery',{
  callback_query_id:id,...(text?{text,show_alert:false}:{})
 },fetcher).catch(()=>{});
}
async function createDraft(config,event){
 const id=randomUUID();
 const encrypted=seal(event.payload,{...field,recordId:id},config);
 return routerTx(config,async db=>{
  // No raw text retained when an untouched request has expired.
  await db.query("update "+TABLE+" set status='expired',payload_ciphertext=null,settled_at=now() "+
    "where practitioner_id=$1 and status='pending' and expires_at<=now()",[PRACTITIONER_ID]);
  const insert=await db.query(
   "insert into "+TABLE+"(id,practitioner_id,source_update_id,kind,payload_ciphertext,expires_at) "+
   "values($1,$2,$3,$4,$5,now()+($6*interval '1 hour')) "+
   "on conflict(source_update_id) do nothing returning id",
   [id,PRACTITIONER_ID,event.updateId,event.kind,encrypted,ROUTER_TTL_HOURS]);
  if(insert.rows.length)return {created:true,id};
  const found=(await db.query("select id,status from "+TABLE+
    " where practitioner_id=$1 and source_update_id=$2 limit 1",
    [PRACTITIONER_ID,event.updateId])).rows[0];
  return {created:false,id:found?.id||null,status:found?.status||'unknown'};
 });
}
async function activeMediaVoice(config,event){
 // Voice recorded during /combine or after a folder selection continues to
 // the existing private Materials handler, not to the task router.
 return routerTx(config,async db=>{
  const [batch,dest]=await Promise.all([
   db.query("select 1 from app_private.telegram_owner_audio_combine "+
    "where practitioner_id=$1 and status in ('collecting','building') "+
    "and expires_at>now() and started_update_id<$2 limit 1",
    [PRACTITIONER_ID,event.updateId]),
   db.query("select 1 from app_private.telegram_owner_audio_destination "+
    "where practitioner_id=$1 and pending_folder is not null "+
    "and pending_expires_at>now() and last_update_id<$2 limit 1",
    [PRACTITIONER_ID,event.updateId])
  ]);
  return Boolean(batch.rowCount||dest.rowCount);
 });
}
async function reserveDestination(config,event){
 return routerTx(config,async db=>{
  const row=(await db.query("select id,kind,payload_ciphertext,status,expires_at,chosen_target,task_id "+
    "from "+TABLE+" where id=$1 and practitioner_id=$2 for update",
    [event.draftId,PRACTITIONER_ID])).rows[0];
  if(!row)return {status:'missing'};
  if(row.status!=='pending')return {status:row.status,taskId:row.task_id||null};
  if(new Date(row.expires_at).getTime()<=Date.now()){
   await db.query("update "+TABLE+" set status='expired',payload_ciphertext=null,settled_at=now() where id=$1",[row.id]);
   return {status:'expired'};
  }
  if(!row.payload_ciphertext)return {status:'missing'};
  const payload=openSealed(row.payload_ciphertext,{...field,recordId:row.id},config);
  await db.query("update "+TABLE+" set status='processing',chosen_target=$2,claimed_update_id=$3 "+
    "where id=$1 and status='pending'",[row.id,event.target,event.updateId]);
  return {status:'accepted',kind:row.kind,payload};
 });
}
async function settled(config,event,{status,taskId=null,error=null}){
 return routerTx(config,async db=>{
  await db.query("update "+TABLE+" set status=$3,task_id=$4, "+
    "failure_code=$5,payload_ciphertext=null,settled_at=now() "+
    "where id=$1 and practitioner_id=$2 and status='processing' and chosen_target=$6",
    [event.draftId,PRACTITIONER_ID,status,taskId,error,event.target]);
 });
}
async function saveInCommander(config,event,text){
 const taskInput=ownerRouterTask(text);
 const safe=sanitizeTask(taskInput);
 if(!safe)throw Error('COMMANDER_TASK_INVALID');
 return routerTx(config,async db=>{
  // If the first attempt committed but Telegram's response was lost, a
  // repeated callback cannot create another task.
  const row=(await db.query("select status,chosen_target,task_id from "+TABLE+
    " where id=$1 and practitioner_id=$2 for update",
    [event.draftId,PRACTITIONER_ID])).rows[0];
  if(row?.status!=='processing'||row.chosen_target!=='commander')
   return {status:'not_pending',taskId:row?.task_id||null};
  const created=await createTask(db,safe,event.draftId);
  if(created.status!=='created'||!created.task?.id)throw Error('COMMANDER_TASK_NOT_SAVED');
  await db.query("update "+TABLE+" set status='sent',task_id=$2,payload_ciphertext=null,"+
    "settled_at=now() where id=$1",[event.draftId,created.task.id]);
  return {status:'created',task:created.task};
 });
}
async function recognizedText(event,credentials,env,fetcher){
 if(event.kind==='text')return String(event.payload?.text||'');
 if(event.kind!=='voice'||!subscriberVoiceReady(env))throw Error('VOICE_STT_FREE_NOT_READY');
 const note=event.payload?.note;
 if(!note||note.mime!=='audio/ogg')throw Error('VOICE_META_REJECTED');
 return transcribeSubscriberVoice(note,{
  token:credentials.token,key:env.HH_SUBSCRIBER_AI_STT_GEMINI_KEY,fetcher});
}
async function deliverCouncil(config,credentials,text,env,fetcher){
 await consumeRate(config,{scope:'hh-owner-ai-telegram',owner:PRACTITIONER_ID},10,3600);
 await consumeRate(config,{scope:'hh-owner-ai-all-day',owner:PRACTITIONER_ID},4,86400);
 await sendOwner(credentials,{text:'⏳ Вопрос передан Совету ИИ. Готовлю ответ на русском языке.'},fetcher)
   .catch(()=>{});
 const aiEnv=await resolvedOwnerAiEnvironment(config,env);
 const run=await normalizeOwnerCouncilRussian(
  await runOwnerCouncilFive(text,aiEnv,fetcher),fetcher);
 if(run.status==='unavailable'){
  await sendOwner(credentials,{text:'⚠️ Совет ИИ сейчас недоступен. Бесплатные модели не дали достаточных подтверждённых ответов. Проверьте /status; платные запросы не выполнялись.'},fetcher);
  return {status:'unavailable'};
 }
 const report=russianOwnerCouncilReport(formatOwnerCouncilFive(text,run),text);
 await sendOwner(credentials,{text:report.short},fetcher);
 let file='accepted';
 try{
  await sendOwnerDocument({mode:'report',title:'AI Council 4+1 · '+(report.complete?'full':'partial'),
   markdown:report.markdown,sources:report.sources},env,fetcher);
 }catch{
  file='unverified';
  await sendOwner(credentials,{text:'⚠️ Итог выше отправлен. Доставка полного файла не подтверждена.'},fetcher).catch(()=>{});
 }
 return {status:report.complete?'complete':'partial',file};
}
export async function receiveOwnerTelegramRouterWebhook(config,update,{
 env=process.env,fetcher=fetch,now=Date.now()
}={}){
 if(env.VERCEL_ENV==='preview'||env.HH_OWNER_AI_TG_ENABLED!=='true'||
    telegramClientBotMode(env)!=='shared_practice')return {handled:false};
 const event=parseOwnerRouterUpdate(update,now);
 if(!event)return {handled:false};
 const effective=await resolvedOwnerTelegramEnv(config,env);
 const credentials=ownerBotCredentials(effective);
 if(!credentials||event.chatId!==credentials.chat||event.userId!==credentials.chat)
   return {handled:false};
 if(event.kind==='voice'&&event.action==='intake'&&await activeMediaVoice(config,event))
   return {handled:false};
 if(event.action==='help'){
  await sendOwner(credentials,{text:'✍️ Напишите задачу или вопрос либо отправьте голосовое до 60 секунд. После получения выберите: Совет ИИ или Agent Commander. До выбора ничего не запускается.'},fetcher);
  return {handled:true};
 }
 if(['too_short','too_long','sensitive','voice_invalid'].includes(event.action)){
  const messages={
   too_short:'Напишите сообщение минимум из 6 символов.',
   too_long:'Сообщение слишком длинное. Максимум 2000 символов.',
   sensitive:'Удалите пароли, личные контакты и другие секреты. Отправьте обезличенную рабочую задачу.',
   voice_invalid:'Голосовая запись не поддерживается. Отправьте голосовое OGG/Opus до 60 секунд и 2 МБ.'
  };
  await sendOwner(credentials,{text:messages[event.action]},fetcher);
  return {handled:true};
 }
 if(event.action==='intake'){
  await consumeRate(config,{scope:'hh-owner-route-intake',owner:PRACTITIONER_ID},15,3600);
  const draft=await createDraft(config,event);
  if(draft.created)await sendOwner(credentials,ownerRouterReceipt(event.kind,draft.id),fetcher);
  return {handled:true,duplicate:!draft.created};
 }
 if(event.action!=='route')return {handled:false};
 const reserved=await reserveDestination(config,event);
 await callbackAck(credentials,event.callbackId,fetcher,reserved.status==='accepted'?'':
   reserved.status==='expired'?'Срок выбора истёк. Пришлите сообщение заново.':
   reserved.status==='sent'?'Уже отправлено. Повтора не будет.':
   reserved.status==='processing'?'Сообщение обрабатывается.':'Выбор больше недоступен.');
 if(reserved.status!=='accepted'){
  const state=reserved.status==='expired'?'Выбор устарел. Отправьте сообщение заново.':
    reserved.status==='sent'?'Уже отправлено. Повтор не создаёт задачу.':
    reserved.status==='processing'?'Сообщение уже обрабатывается.':
    'Этот выбор уже обработан или недоступен.';
  return {handled:true,duplicate:true,status:reserved.status};
 }
 try{
  if(reserved.kind==='voice')await sendOwner(credentials,{
   text:'🎙 Распознаю голосовую запись на русском языке…'},fetcher).catch(()=>{});
  const text=await recognizedText({...reserved,kind:reserved.kind},credentials,effective,fetcher);
  if(event.target==='commander'){
   const created=await saveInCommander(config,event,text);
   if(created.status!=='created'||!created.task?.id)throw Error('COMMANDER_TASK_NOT_CONFIRMED');
   await sendOwner(credentials,{text:'✅ Задача сохранена в Agent Commander.\nНазвание: '+
    created.task.title+'\nСтатус: '+(created.task.state==='blocked_no_runner'?
      'ожидает подключения исполнителя':'требует детализации')+
    '.\n\nЗадача ещё не выполнена и не отправлена агенту.',
    reply_markup:{inline_keyboard:[[{text:'📋 Открыть Agent Commander',url:CC_URL}]]}},fetcher);
  }else{
   await deliverCouncil(config,credentials,text,effective,fetcher);
   await settled(config,event,{status:'sent'});
  }
  return {handled:true,delivered:true,target:event.target};
 }catch(error){
  // A transient provider/Telegram error after dispatch may be ambiguous.
  // Never re-run inference or create a duplicate task by pressing again.
  const reason=String(error?.message||'ROUTER_DELIVERY_UNCONFIRMED');
  const code=/^[A-Z0-9_]{2,72}$/.test(reason)?reason:'ROUTER_DELIVERY_UNCONFIRMED';
  await settled(config,event,{status:'failed',error:code}).catch(()=>{});
  await sendOwner(credentials,{text:reserved.kind==='voice'&&code.startsWith('VOICE_')
   ?'⚠️ Распознавание голоса пока недоступно в подтверждённом бесплатном режиме. Пришлите задачу текстом.'
   :event.target==='commander'
   ?'⚠️ Не удалось подтвердить сохранение задачи. Проверьте список задач в Agent Commander, прежде чем отправлять повторно.'
   :'⚠️ Не удалось завершить ответ Совета ИИ. Отправьте новый вопрос после проверки доступности моделей.'},fetcher).catch(()=>{});
  return {handled:true,delivered:false};
 }
}
