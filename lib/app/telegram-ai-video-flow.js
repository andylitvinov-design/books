/**
 * Consent-bound AI video proposal/confirmation and subjective check-in.
 * Invoked from the signed Telegram CRM message worker, not a public route.
 * Does not send media or contact Telegram from inside a database transaction.
 */
import 'server-only'
import {randomUUID} from 'node:crypto'
import {currentAiVideoAccount,aiVideoClientHash,verifyAiVideoBoundAccount} from './telegram-ai-account-boundary.js'
import {beginVideoEffect,advanceVideoEffect,videoEffectIntro} from '../crm/telegram-video-effect.mjs'
import {validTelegramVideoAudioMeta,videoAudioDurationTier} from '../crm/telegram-ai-audio.mjs'

const CHATS='app_private.ai_telegram_threads'
const JOBS='app_private.ai_work_jobs'
// Keep the original shared encryption context in the caller.
export async function handleAiVideoFlow({config,db,thread,data,env,enqueue,unseal,save}){
 const state=unseal(thread)||{}
 const chatId=String(state.chatId||'')
 const typed=data.kind==='message'&&!data.fromVoice
 const text=String(data.text||'').trim()
 const locale=thread.locale==='ru'?'ru':thread.locale==='es'?'es':'en'
 const disabled=()=>({answer:locale==='ru'?
  'Для личного видео сначала привяжите этот Telegram в кабинете Holistic House и отдельно разрешите автоматическую доставку видео.':
  locale==='es'?'Vincula este Telegram a tu cuenta Holistic House y activa expresamente la entrega privada de vídeos.':
  'Link this exact Telegram chat to your Holistic House account and explicitly allow automatic private video delivery.',
  videoBound:false});
 const current=async()=>chatId?currentAiVideoAccount(db,config,chatId,env):null
 const bound=async()=>chatId?verifyAiVideoBoundAccount(db,config,thread,chatId,env):false
 if(typed&&state.effect){
  const advance=advanceVideoEffect(state.effect,text)
  if(advance.handled){
   if(!(await bound()))return disabled()
   state.effect=advance.state
   await save(thread,state)
   return {answer:advance.text,videoBound:true,
     keyboard:advance.scoreButtons?'scores':null}
  }
 }
 if(typed&&/^\/(?:cancel|hhvideo_cancel)$/i.test(text)&&state.pendingPlan){
  state.pendingPlan=null
  await save(thread,state)
  return {answer:locale==='ru'?'Сценарий отменён. Видео не запускалось.':
   locale==='es'?'Escenario cancelado. No se creó ningún vídeo.':
   'Plan cancelled. No video was started.',videoBound:true}
 }
 // The signed forward contains metadata only; no Telegram getFile is called
 // until the owner explicitly approves rights, private processing and delivery.
 if(data.kind==='video_audio'){
  const account=await current(),media=data.audio
  if(!account||!chatId||!validTelegramVideoAudioMeta(media)||
     thread.account_id&&thread.account_id!==account)return disabled()
  const pending=state.pendingPlan?.expiresAt>Date.now()?state.pendingPlan:null
  if(pending){
   state.pendingPlan={...pending,audio:media,expiresAt:Date.now()+15*60*1000}
  }else{
   state.awaitingVideoAudio={media,expiresAt:Date.now()+15*60*1000}
   await db.query(`update ${CHATS} set awaiting_video_goal=true where id=$1`,[thread.id])
  }
  await db.query(`update ${CHATS} set account_id=$2,video_chat_hash=$3,
    updated_at=now() where id=$1 and stopped_at is null`,
    [thread.id,account,aiVideoClientHash(chatId,config)])
  await save(thread,state)
  const permission=locale==='ru'?
   'Запись пока не загружена. Для монтажа подтвердите, что у вас есть разрешение использовать эту запись и голос. После подтверждения файл будет разово скачан из Telegram, смонтирован без внешней расшифровки, удалён из временных файлов; готовый MP4 сохранится в вашем приватном кабинете и отправится в привязанный Telegram.':
   locale==='es'?
   'El audio aún no se ha descargado. Confirma que puedes usar la voz y la grabación. Solo al confirmar se descargará desde Telegram, se montará sin transcripción externa y se borrará el original temporal; el MP4 se guardará en tu biblioteca privada y se enviará al chat verificado.':
   'Audio has not been downloaded. Confirm you have permission to use the recording and voice. Only then we download it from Telegram, assemble without external transcription, delete the temporary original, save the MP4 privately and send to your linked chat.'
  const audioSeconds=videoAudioDurationTier(media.seconds)
  return {answer:(pending?
   (locale==='ru'?'Аудио добавлено к сценарию. Видео '+audioSeconds+' сек. ':locale==='es'?'Audio adjunto al plan. Vídeo de '+audioSeconds+' s. ':'Audio added to your plan. '+audioSeconds+'s video. '):
   (locale==='ru'?'Аудио получено. Укажите тему командой /hhvideo <тема>. ':locale==='es'?'Audio recibido. Escribe /hhvideo <tema>. ':'Audio received. Send /hhvideo <topic>. '))+
   permission+' '+(pending?'/hhvideo_confirm':''),
   videoBound:true}
 }
 if(typed&&/^\/(?:confirm|hhvideo_confirm)$/i.test(text)){
  const plan=state.pendingPlan,account=await current()
  if(!plan||!account||account!==thread.account_id||!(await bound())||
    plan.v!==1||!Number.isSafeInteger(plan.expiresAt)||Date.now()>=plan.expiresAt||
    (plan.audio&&!validTelegramVideoAudioMeta(plan.audio)))
   return disabled()
  const one=(await db.query(`select count(*)::int n from ${JOBS}
    where thread_id=$1 and lane='video' and created_at>now()-interval '24 hours'`,
    [thread.id])).rows[0]?.n||0
  const global=(await db.query(`select count(*)::int n from ${JOBS}
    where lane='video' and created_at>now()-interval '24 hours'`)).rows[0]?.n||0
  if(Number(one)>=2||Number(global)>=10)return {answer:locale==='ru'?
    'Лимит видео исчерпан. Попробуйте позже.':
    locale==='es'?'Se alcanzó el límite de vídeos. Vuelve más tarde.':
    'Video quota reached. Please try later.'}
  const videoJobId=await enqueue({threadId:thread.id,lane:'video',
    source:'approved-video:'+data.inboundJobId,
    payload:{planVersion:plan.audio?2:1,planId:plan.id,sceneIds:plan.sceneIds,goal:plan.goal,
      locale,durationSeconds:plan.audio?videoAudioDurationTier(plan.audio.seconds):20,
      ...(plan.audio?{audio:plan.audio}:{}),accountId:account,clientChatHash:thread.video_chat_hash,
      triggerJobId:data.inboundJobId}})
  state.pendingPlan=null
  state.effect=beginVideoEffect(videoJobId,locale)
  await save(thread,state)
  const progress=locale==='ru'?'Ваше видео генерируется. ●○○○ — принято в очередь.':
    locale==='es'?'Tu vídeo se está generando. ●○○○ — en cola.':
    'Your video is being generated. ●○○○ — queued.'
  await enqueue({threadId:thread.id,lane:'delivery',source:'video-progress:'+data.inboundJobId,
    payload:{type:'text',text:progress,videoBound:true,progressSeed:true,videoJobId}})
  return {answer:videoEffectIntro(locale,state.effect),keyboard:'scores',
    videoBound:true,videoJobId}
 }
 if(data.kind!=='video')return null
 if(data.fromVoice)return {answer:locale==='ru'?'Подтвердите запрос текстом.':
  locale==='es'?'Confirma tu solicitud por escrito.':
  'Please confirm your video request by typing.',videoBound:false}
 const account=await current()
 if(!account||!chatId||thread.account_id&&thread.account_id!==account)return disabled()
 const goal=String(data.goal||'')
 try{
  const {planTelegramAiVideo}=await import('./telegram-ai-video-render.js')
  const plan=planTelegramAiVideo(goal)
  const pendingAudio=state.awaitingVideoAudio?.expiresAt>Date.now()&&
    validTelegramVideoAudioMeta(state.awaitingVideoAudio.media)?
      state.awaitingVideoAudio.media:null
  state.pendingPlan={v:1,id:randomUUID(),goal:goal.slice(0,600),
    sceneIds:plan.sceneIds,expiresAt:Date.now()+15*60*1000,
    ...(pendingAudio?{audio:pendingAudio}:{})}
  state.awaitingVideoAudio=null
  // Once the actual plan exists, switch the temporary awaiting flag OFF.
  // Late forwarded media is then bound to the encrypted pending plan.
  await db.query(`update ${CHATS} set account_id=$2,video_chat_hash=$3,
    awaiting_video_goal=false,updated_at=now() where id=$1 and stopped_at is null`,
    [thread.id,account,aiVideoClientHash(chatId,config)])
  await save(thread,state)
  const names=plan.sceneIds.join(', ')
  const soundtrack=state.pendingPlan.audio
  const suffix=locale==='ru'?
    ' Перешлите аудиозапись до 60 секунд, если хотите сохранить исходный голос. Команда /hhvideo_confirm означает, что вы вправе использовать запись, согласны на однократную загрузку её из Telegram, временный монтаж, приватное хранение MP4 и отправку в свой проверенный Telegram. Без аудио создаётся беззвучный ролик на 20 секунд. Видеокадры подбираются по указанной теме, а не по распознаванию записи.':
    locale==='es'?
    ' Envía un audio de hasta 60 segundos si quieres conservar la voz original. /hhvideo_confirm confirma derechos, descarga única del audio, montaje temporal, almacenamiento privado del MP4 y entrega al chat verificado. Sin audio se crea un vídeo sin sonido de 20 segundos. Las escenas siguen tu tema, no una transcripción.':
    ' Forward up to 60 seconds of audio to keep the original voice. /hhvideo_confirm affirms your rights and permits one-time Telegram audio download, temporary editing, private MP4 storage and delivery to your verified chat. Without audio the film is silent and 20 seconds long. Footage matches the typed topic, not a speech transcript.'
  const alreadyAudio=soundtrack?(
    locale==='ru'?' Аудио '+soundtrack.seconds+' сек уже прикреплено.':
    locale==='es'?' Audio de '+soundtrack.seconds+' s adjuntado.':
      ' '+soundtrack.seconds+'s audio attached.') : ''
  const proposedSeconds=soundtrack?videoAudioDurationTier(soundtrack.seconds):20
  const answer=locale==='ru'?'Предлагаю 4 реальные лицензированные сцены: '+names+
    '. Вертикальное видео 9:16, '+proposedSeconds+' секунд. Чтобы начать, напишите /hhvideo_confirm. Отмена: /hhvideo_cancel.':
    locale==='es'?'Propongo 4 escenas reales autorizadas: '+names+
    '. Vídeo 9:16 de '+proposedSeconds+' segundos. Confirma: /hhvideo_confirm. Cancelar: /hhvideo_cancel.':
    'Four approved filmed scenes: '+names+
    '. A '+proposedSeconds+'-second 9:16 video. To start, type /hhvideo_confirm. Cancel: /hhvideo_cancel.'
  return {answer:answer+alreadyAudio+suffix,videoBound:true}
 }catch{
  return {answer:locale==='ru'?'Не удалось подобрать реальные видеосцены.':
   locale==='es'?'No encontré suficientes vídeos autorizados.':
   'Not enough approved footage is available for this plan.'}
 }
}
