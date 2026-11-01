import 'server-only'
import {transaction,consumeRate} from '../app/database.js'
import {telegramClientBotMode} from '../app/client-telegram-policy.js'
import {registerClientTelegramWebhook,verifyClientBot,ownerAiMenuReady} from '../app/client-telegram-transport.js'
import {resolvedOwnerTelegramEnv} from './telegram-owner-pairing.js'
import {ownerBotCredentials,sendOwnerDocument} from './telegram-hub.mjs'
import {inspectCouncilFive,runOwnerCouncilFive,formatOwnerCouncilFive,COUNCIL_FOUR,COUNCIL_CHAIR} from './owner-ai-five.mjs'
import {PRACTITIONER_ID} from '../../data/app-services.js'
import {askCouncilTelegram,inspectMistralStudioKey,inspectOpenRouterFreeAccess,GEMINI_MODEL,GEMINI_FREE_FALLBACK_MODEL,MISTRAL_DIRECT_MODEL,MISTRAL_STUDIO_ALIAS} from './council-free-models.mjs'
import {inspectGeminiModelAccess} from './council-provider-readiness.mjs'
import {resolvedOwnerAiEnvironment} from './owner-ai-provider-settings.js'
import {parseOwnerAiUpdate,ownerAiMenu,ownerAiPrompt,ownerAiResponseItems,ownerAiEnsembleStatus,OWNER_AI_MODEL_IDS,OWNER_AI_COUNCIL_IDS} from './owner-ai-telegram.mjs'

const FETCH_TIMEOUT_MS=11000
const BOT_API='https://api.telegram.org/bot'
const STATUS=new Set(['accepted','limited','error'])
async function callTelegram(method,data,env,fetcher){
  const credentials=ownerBotCredentials(env)
  if(!credentials)throw Error('OWNER_TELEGRAM_UNPAIRED')
  const response=await fetcher(BOT_API+encodeURIComponent(credentials.token)+'/'+method,{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(data),cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })
  if(!response.ok)throw Error('TELEGRAM_API_REJECTED')
  const payload=await response.json().catch(()=>null)
  if(payload?.ok!==true)throw Error('TELEGRAM_API_REJECTED')
  if(method==='sendMessage'&&
    (!Number.isSafeInteger(payload.result?.message_id)||
     String(payload.result?.chat?.id)!==String(credentials.chat)))
    throw Error('TELEGRAM_DESTINATION_UNVERIFIED')
  return payload.result
}
async function sendOwner(message,env,fetcher){
  const credentials=ownerBotCredentials(env)
  if(!credentials)throw Error('OWNER_TELEGRAM_UNPAIRED')
  return callTelegram('sendMessage',{
    chat_id:credentials.chat,disable_web_page_preview:true,
    text:message.text, ...(message.reply_markup?{reply_markup:message.reply_markup}:{})
  },env,fetcher)
}
async function claimUpdate(config,event){
  return transaction(config,null,async db=>{
    const result=await db.query(
      'insert into app_private.telegram_owner_ai_updates '+
      '(update_id,practitioner_id,action,model_mode,status) '+
      "values($1,$2,$3,$4,'claimed') on conflict(update_id) do nothing returning update_id",
      [event.updateId,PRACTITIONER_ID,event.action,event.mode||null]
    )
    return result.rowCount===1
  },{server:true})
}
async function settleUpdate(config,updateId,status,models={}){
  if(!STATUS.has(status))throw Error('INVALID_OWNER_AI_STATE')
  return transaction(config,null,async db=>{
    await db.query(
      'update app_private.telegram_owner_ai_updates set status=$2, '+
      'model_status=$3::jsonb,settled_at=now() '+
      'where update_id=$1 and practitioner_id=$4 and status=\'claimed\'',
      [updateId,status,JSON.stringify(models),PRACTITIONER_ID]
    )
  },{server:true})
}
// Private metadata only: store no questions, texts, chat IDs or model
// answers. A GET catalog is not evidence of a successful model completion.
async function recentOwnerModelOutcomes(config){
  const rows=await transaction(config,null,async db=>(await db.query(
    'select model_status from app_private.telegram_owner_ai_updates '+
    "where practitioner_id=$1 and action in ('question','verify') "+
    "and status='accepted' and settled_at>now()-interval '36 hours' "+
    'order by settled_at desc limit 60',[PRACTITIONER_ID]
  )).rows,{server:true})
  const last={}
  for(const row of rows){
    for(const key of OWNER_AI_MODEL_IDS){
      if(!Object.hasOwn(last,key)&&row.model_status?.[key])
        last[key]=row.model_status[key]
    }
  }
  return last
}
async function currentOwnerAiReadiness(config,env,fetcher,{includeMistral=false}={}){
  const ai=await resolvedOwnerAiEnvironment(config,env)
  const [recent,gemini,studio,router,five]=await Promise.all([
    recentOwnerModelOutcomes(config),
    ai.HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED==='true'&&ai.HH_COUNCIL_GEMINI_API_KEY
      ?inspectGeminiModelAccess(ai,fetcher)
      :Promise.resolve({modelReady:false,reason:'FREE_TIER_OR_KEY_NOT_CONFIGURED'}),
    includeMistral&&ai.HH_COUNCIL_MISTRAL_FREE_MODE_CONFIRMED==='true'&&ai.HH_COUNCIL_MISTRAL_API_KEY
      ?inspectMistralStudioKey(ai.HH_COUNCIL_MISTRAL_API_KEY,fetcher)
      :Promise.resolve({status:'not_configured'}),
    inspectOpenRouterFreeAccess(ai,fetcher),
    inspectCouncilFive(ai,fetcher)
  ])
  const possibilities={
    gemini:{candidate:gemini.modelReady===true,model:gemini.model||GEMINI_MODEL,
      reason:gemini.reason||'MODEL_NOT_READY'},
    free:{candidate:router.status==='ready',model:router.model||null,
      reason:router.reason||'MODEL_NOT_READY'},
    free2:{candidate:router.status==='ready'&&Boolean(router.secondModel),
      model:router.secondModel||null,reason:router.reason||'NO_SECOND_FREE_MODEL'},
    mistral:{candidate:studio.status==='ready'||Boolean(router.freeMistralModel),
      model:studio.status==='ready'?studio.model:router.freeMistralModel||null,
      reason:studio.status==='rate_limited'?'STUDIO_HTTP_429':
        studio.status==='access_denied'?'STUDIO_ACCESS_DENIED':
        studio.status==='ready'?'ready':studio.status||'NOT_CONFIGURED'}
  }
  return {...Object.fromEntries(OWNER_AI_MODEL_IDS.map(id=>{
    const v=possibilities[id],proof=recent[id]
    const proofMatches=id==='gemini'
      ?[GEMINI_MODEL,GEMINI_FREE_FALLBACK_MODEL].includes(proof?.model)
      :id==='mistral'&&v.model===MISTRAL_STUDIO_ALIAS
        ?[MISTRAL_STUDIO_ALIAS,MISTRAL_DIRECT_MODEL].includes(proof?.model)
        :proof?.model===v.model
    return [id,{
      ...v,ready:v.candidate&&proof?.status==='ok'&&proofMatches,
      ...(proof?.status?{lastResponseStatus:proof.status}:{}),
      // Explicitly indicate NOT VERIFIED instead of celebrating a GET.
      reason:v.candidate&&proof?.status!=='ok'
        ?proof?.reason||'NO_RECENT_REAL_RESPONSE':v.reason
    }]
  })),five}
}
const safeOutcomes=reviews=>Object.fromEntries(
  Object.entries(reviews||{}).map(([name,value])=>[
    name,{status:String(value?.status||'unavailable').slice(0,24),
      model:String(value?.model||'').slice(0,100),
      reason:String(value?.reason||'').slice(0,95)}
  ])
)
const verifiedRows=reviews=>OWNER_AI_MODEL_IDS.filter(id=>
  reviews?.[id]?.status==='ok')
const verifyQuestion='Техническая проверка бесплатного API владельца. Одним предложением предложи конкретный способ проверить корректность кнопки записи на бесплатную диагностику Holistic House. Не выполняй действия и не используй данные клиентов.'
// Called ONLY by the existing signed client/shared-bot webhook, not a public AI endpoint.
// Client /start pairing and /stop pass through unchanged.
export async function receiveOwnerAiTelegramWebhook(config,update,{
  env=process.env,fetcher=fetch,now=Date.now()
}={}){
  if(env.VERCEL_ENV==='preview'||env.HH_OWNER_AI_TG_ENABLED!=='true'||
     telegramClientBotMode(env)!=='shared_practice')return {handled:false}
  const event=parseOwnerAiUpdate(update,now)
  if(!event)return {handled:false}
  const effective=await resolvedOwnerTelegramEnv(config,env)
  const credentials=ownerBotCredentials(effective)
  // A Telegram username alone never authorizes access. Compare BOTH numeric
  // sender and private chat against the already verified encrypted owner pair.
  if(!credentials||event.chatId!==credentials.chat||event.userId!==credentials.chat)
    return {handled:false}
  const claimed=await claimUpdate(config,event)
  if(!claimed)return {handled:true,duplicate:true}
  let disposition='error',outcomes={}
  try{
    if(event.callbackId){
      await callTelegram('answerCallbackQuery',{callback_query_id:event.callbackId},effective,fetcher)
        .catch(()=>{})
    }
    // First owner /ai repairs/registers commands and callback delivery without
    // another login or user click. Never touch unrelated bot webhooks.
    if(event.action==='menu'&&!event.callbackId){
      let ready=false
      try{
        await verifyClientBot(env,{requireWebhook:true})
        ready=await ownerAiMenuReady(config,env)
      }catch{/* Existing bot/webhook may need safe owner-only registration. */}
      if(!ready){
        const registered=await registerClientTelegramWebhook(env,{config})
        if(registered.ownerAiCommandsReady!==true)
          throw Error('OWNER_AI_MENU_NOT_REGISTERED')
      }
    }
    if(event.action==='menu'||event.action==='status'){
      const readiness=await currentOwnerAiReadiness(config,effective,fetcher)
      await sendOwner(ownerAiMenu(readiness),effective,fetcher)
    }
    if(event.action==='prompt'&&event.mode==='all'){
      // No previous "verified" model receipts are required for the first owner question.
      // Availability and exact zero-cost eligibility are checked at execution time.
      await sendOwner(ownerAiPrompt('all'),effective,fetcher)
    }
    if(event.action==='prompt'&&event.mode!=='all'){
      const readiness=await currentOwnerAiReadiness(config,effective,fetcher,{
        includeMistral:event.mode==='mistral'||event.mode==='both'
      })
      const wanted=event.mode==='all'?OWNER_AI_COUNCIL_IDS.filter(id=>
        readiness[id]?.candidate):
        event.mode==='duo'?['gemini','free']:
        event.mode==='both'?['gemini','mistral']:[event.mode]
      const enough=event.mode==='all'?wanted.length>=2:
        wanted.every(name=>readiness[name]?.ready)
      if(enough)await sendOwner(ownerAiPrompt(event.mode),effective,fetcher)
      else if(event.mode==='all'){
        const issues=OWNER_AI_COUNCIL_IDS.filter(id=>!readiness[id]?.candidate)
          .map(id=>id+': '+String(readiness[id]?.reason||'недоступен').slice(0,64))
        await sendOwner({text:[
          '⚠️ Общий ответ сейчас недоступен: нужны минимум два бесплатных ИИ.',
          'Причины подключения: '+issues.join('; '),
          'Это техническое ограничение, вопрос пока не отправлен моделям.'
        ].join('\n'),reply_markup:{inline_keyboard:[[
          {text:'🔄 Проверить подключение',callback_data:'hh-ai:status'}
        ]]}},effective,fetcher)
      }else await sendOwner(ownerAiMenu(readiness),effective,fetcher)
    }
    if(event.action==='verify'){
      // A conscious owner click, at most twice daily. Test ONLY previously
      // opted-in Free models using a fixed, nonpersonal prompt.
      await consumeRate(config,{scope:'hh-owner-ai-verify-day',owner:PRACTITIONER_ID},2,86400)
      const availability=await currentOwnerAiReadiness(config,effective,fetcher)
      const allowed=OWNER_AI_COUNCIL_IDS.filter(id=>availability[id]?.candidate)
      if(!allowed.length){
        await sendOwner({text:'Нет доступных бесплатных API для реального теста. Проверьте ключи и тариф Free в кабинете.'},effective,fetcher)
      }else{
        const aiEnv=await resolvedOwnerAiEnvironment(config,effective)
        const checked=await askCouncilTelegram(verifyQuestion,'all',aiEnv,fetcher,{allowed})
        outcomes=safeOutcomes(checked)
        const ok=verifiedRows(checked),bad=allowed.filter(id=>!ok.includes(id))
        await sendOwner({text:[
          '🧪 Реальный тест API (без данных клиентов):',
          ...allowed.map(id=>(ok.includes(id)?'✅ ':'❌ ')+id+
            ' · '+String(checked[id]?.model||'нет модели').slice(0,58)+
            (ok.includes(id)?'':' — '+String(checked[id]?.reason||'нет ответа').slice(0,65))),
          '',
          'Подтверждены ответы: '+ok.length+'/'+allowed.length+'.',
          'Вернитесь в /ai: выбирать можно будет только реально ответившие модели.',
          ...(bad.length?['Не ответили: '+bad.join(', ')]:[])
        ].join('\n'),reply_markup:{inline_keyboard:[[
          {text:'🤖 Показать рабочие ИИ',callback_data:'hh-ai:menu'}
        ]]}},effective,fetcher)
      }
    }
    if(event.action==='too_long')await sendOwner({
      text:'Вопрос слишком длинный. Напишите до 2000 символов или сократите его.'
    },effective,fetcher)
    if(event.action==='sensitive')await sendOwner({
      text:'Похоже, в вопросе есть личные контакты или секретный ключ. Удалите их и отправьте обезличенный рабочий вопрос.'
    },effective,fetcher)
    if(event.action==='question'){
      // A retry with the same update_id cannot reach any model twice.
      await consumeRate(config,{scope:'hh-owner-ai-telegram',owner:PRACTITIONER_ID},10,3600)
      const aiEnv=await resolvedOwnerAiEnvironment(config,effective)
      let reviews
      if(event.mode==='all'){
        await consumeRate(config,{scope:'hh-owner-ai-all-day',owner:PRACTITIONER_ID},4,86400)
        // Five exact, distinct, currently $0 model IDs. No fallback to paid
        // endpoints or to a duplicate model masquerading as a second opinion.
        const result=await runOwnerCouncilFive(event.question,aiEnv,fetcher)
        outcomes=Object.fromEntries(COUNCIL_FOUR.map(r=>[r.slot,{
          status:result.reviews?.[r.slot]?.status||'unavailable',
          model:r.id,reason:result.reviews?.[r.slot]?.reason||''
        }]))
        outcomes.chair={status:result.synthesis?.status||'unavailable',
          // Record the ACTUAL fifth provider, never mislabel Argon as Gemma.
          model:result.synthesis?.model||COUNCIL_CHAIR.id,
          reason:result.synthesis?.reason||''}
        if(result.status==='unavailable'){
          await sendOwner({text:[
            '⚠️ Совет ИИ 4+1 сейчас недоступен. Ни одного платного запроса не выполнялось.',
            'Причина: '+String(result.check?.reason||'Нужны минимум два аналитика и пятая модель').slice(0,90),
            result.check?.missing?.length?'Нет бесплатного доступа: '+result.check.missing.join(', '):'',
            'Попробуйте позднее или посмотрите /status. Токены и данные клиентов не присылайте.'
          ].filter(Boolean).join('\n'),reply_markup:{inline_keyboard:[[
            {text:'🧠 Другой вопрос',callback_data:'hh-ai:all'}
          ]]}},effective,fetcher)
        }else{
          const rendered=formatOwnerCouncilFive(event.question,result)
          // First deliver one actual synthesis (or truthful partial status) in chat;
          // only the source document contains all reviewer texts.
          await sendOwner({text:rendered.short,reply_markup:{inline_keyboard:[[
            {text:'🧠 Задать следующий вопрос',callback_data:'hh-ai:all'}
          ]]}},effective,fetcher)
          try{
            await sendOwnerDocument({mode:'report',
              title:'AI Council 4+1 · '+(rendered.complete?'full':'partial'),
              markdown:rendered.markdown,
              sources:rendered.sources
            },effective,fetcher)
            outcomes.file={status:'accepted',model:'owner Telegram document'}
          }catch{
            // Telegram may have accepted the upload before a timeout. No retry.
            outcomes.file={status:'error',reason:'DELIVERY_UNVERIFIED'}
            await sendOwner({text:'⚠️ Краткий ответ выше отправлен. Доставка полного Markdown-файла не подтверждена; автоматического повтора нет.'},effective,fetcher).catch(()=>{})
          }
        }
      }else{
        reviews=await askCouncilTelegram(event.question,event.mode,aiEnv,fetcher)
        outcomes=safeOutcomes(reviews)
        const responses=ownerAiResponseItems(reviews,event.mode)
        for(let i=0;i<responses.length;i++){
          await sendOwner({
            ...responses[i],
            ...(i===responses.length-1?{reply_markup:{
              inline_keyboard:[[
                {text:'🔄 Задать ещё вопрос',callback_data:'hh-ai:menu'}
              ]]
            }}:{})
          },effective,fetcher)
        }
      }
    }
    disposition='accepted'
  }catch(error){
    disposition=error?.code==='RATE_LIMITED'?'limited':'error'
    // A network timeout can occur AFTER Telegram accepted a message.
    // Do not auto-retry a claimed update or tell Telegram to replay it.
    if(disposition==='limited')await sendOwner({
      text:'Сегодня достигнут лимит: 10 вопросов в час. Попробуйте позднее.'
    },effective,fetcher).catch(()=>{})
    else await sendOwner({
      text:'Не удалось подключить меню AI Console или получить ответ. Проверьте доступность Telegram и повторите /ai. Чужой webhook не перезаписывается; изменений на сайте не было.'
    },effective,fetcher).catch(()=>{})
  }
  await settleUpdate(config,event.updateId,disposition,outcomes).catch(()=>{})
  return {handled:true,providerAccepted:disposition==='accepted'}
}
