// Customer-facing Telegram AI Companion policy. Pure, privacy-first and no model calls.
import {ruleConversationReply} from '../holistic-support/rule-conversation.mjs';
import {resolveHomeGuideQuestion} from '../home-conversation.mjs';
import {validSubscriberVoiceMeta} from './subscriber-ai-voice.mjs';
import {parseSubscriberQuizCallback} from './subscriber-quiz-policy.mjs';

export const SUBSCRIBER_AI_CONSENT_VERSION='hh-subscriber-ai-v1';
const LOCALES=new Set(['ru','en','es']);
const BOT_COMMAND=/^\/(?:ai(?:_off)?|ai_help|materials|tests|practice|video|master|voice(?:_off)?|tests_off)(?:@[A-Za-z0-9_]{5,32})?$/i;
const CALLBACK_ACTIONS=Object.freeze({
  'hhai:agree':'enable','hhai:decline':'decline','hhai:off':'disable',
  'hhai:materials':'materials','hhai:practice':'practice','hhai:video':'video',
  'hhai:tests':'tests','hhai:master':'master','hhai:chat':'hello','hhai:voice-agree':'voice-enable','hhai:voice-off':'voice-disable',
});
const COMMAND_ACTIONS=Object.freeze({
  '/ai':'open','/ai_off':'disable','/ai_help':'hello','/materials':'materials',
  '/tests':'tests','/practice':'practice','/video':'video','/master':'master',
  '/voice':'voice-open','/voice_off':'voice-disable','/tests_off':'quiz-off'
});
export const subscriberAiLocale=(raw)=>{
  const language=String(raw||'').toLowerCase().split('-')[0];
  return LOCALES.has(language)?language:'en';
};

// Do not intercept verification /start tokens, existing /stop/unsubscribe,
// private owner commands, arbitrary forwarded media or a different bot's buttons.
export function parseSubscriberAiUpdate(update,botUsername,now=Date.now()){
  if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||
     typeof botUsername!=='string'||!/^[A-Za-z][A-Za-z0-9_]{1,28}bot$/i.test(botUsername))return null;
  const callback=update.callback_query;
  const message=callback?.message||update.message;
  const chat=message?.chat,from=callback?.from||message?.from;
  if(chat?.type!=='private'||!Number.isSafeInteger(chat.id)||chat.id<=0||
     from?.is_bot===true||from?.id!==chat.id||
     !Number.isSafeInteger(message?.date)||
     message.date*1000>now+2*60*1000||
     (!callback&&now-message.date*1000>10*60*1000))return null;
  const shared={chatId:String(chat.id),updateId:update.update_id,
    locale:subscriberAiLocale(from?.language_code),callbackId:null};
  if(callback){
    if(typeof callback.id!=='string'||callback.id.length>128||
       message.from?.is_bot!==true||
       String(message.from?.username||'').toLowerCase()!==botUsername.toLowerCase())return null;
    const action=CALLBACK_ACTIONS[callback.data];
    if(action)return {...shared,action,callbackId:callback.id,text:''};
    const quiz=parseSubscriberQuizCallback(callback.data);
    return quiz?{...shared,action:'quiz',quiz,callbackId:callback.id,text:''}:null;
  }
  // Replying to a notification is reserved for the existing practitioner relay.
  // In AI mode customers can still type a new, unquoted message to the bot.
  if(message.reply_to_message||message.forward_origin||message.is_automatic_forward)return null;
  // Native Telegram voice is OGG/Opus. Reject forwarded media and unbounded
  // file metadata before any audio can enter the encrypted worker queue.
  if(message.voice){
    const voice={fileId:message.voice.file_id,bytes:message.voice.file_size,
      seconds:message.voice.duration,mime:message.voice.mime_type||'audio/ogg'};
    return validSubscriberVoiceMeta(voice)
      ? {...shared,action:'voice',text:'',voice} : null;
  }
  if(typeof message.text!=='string')return null;
  const text=message.text.trim();
  if(!text||text.length>1200||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))return null;
  const mention=text.match(/^\/[A-Za-z_]+@([A-Za-z0-9_]{5,32})(?:\s|$)/);
  if(mention&&mention[1].toLowerCase()!==botUsername.toLowerCase())return null;
  if(/^\/(?:stop|unsubscribe|start)(?:@\w+)?(?:\s|$)/i.test(text)){
    // /start hhai_locale is an explicit first-party AI entry; never claim other /start.
    const m=text.match(/^\/start(?:@[A-Za-z0-9_]{5,32})?\s+hhai_(ru|en|es)$/i);
    return m?{...shared,locale:subscriberAiLocale(m[1]),action:'open',text:''}:null;
  }
  const command=text.match(BOT_COMMAND);
  if(command){
    const verb=text.split('@')[0].toLowerCase();
    const action=COMMAND_ACTIONS[verb];
    return action?{...shared,action,text:''}:null;
  }
  // Explicit AI activation is required; the server ignores arbitrary text
  // when there is no live, versioned AI consent for this exact bot+chat.
  if(text.startsWith('/'))return null;
  return {...shared,action:'chat',text};
}

export const subscriberAiEnabled=(env=process.env)=>
  env.VERCEL_ENV==='production'&&env.HH_SUBSCRIBER_AI_ENABLED==='true'&&
  env.HH_SUBSCRIBER_AI_SEND_ENABLED==='true'&&env.HH_CLIENT_TG_LINK_ENABLED==='true';

const COPY={
 ru:{
  consent:'Это персональный помощник Holistic House с ответами по проверенным правилам. Он не читает ваши закрытые материалы и не является психотерапевтом. Текстовая переписка не передаётся внешним моделям. Голос обрабатывается отдельно только после вашего согласия. Включить AI? Подписка на материалы останется прежней. Политика: https://holistichouse.vercel.app/ru/privacy',
  ready:'AI-помощник включён. Напишите вопрос или выберите действие. Чтобы выключить только AI, отправьте /ai_off.',
  off:'AI-чат выключен. Подписка на материалы не меняется. Включить снова: /ai.',
  decline:'AI не включён. Ваши материалы и подписка остаются без изменений.',
  need:'Чтобы начать отдельный AI-диалог, отправьте /ai и выберите «Включить AI».',
  hello:'Я здесь! Напишите, что сейчас для вас актуально, или выберите действие.',
  materials:'Ваши материалы по подписке остаются в ранее полученных сообщениях. Я не открываю закрытые файлы без проверки прав. Общая библиотека: https://holistichouse.vercel.app/ru/books',
  practice:'Расскажите, как вы себя чувствуете и сколько минут готовы уделить практике. Общедоступные практики: https://holistichouse.vercel.app/ru/holistic-support/mobile',
  video:'Создать видео можно в Video Studio: https://holistichouse.vercel.app/ru/holistic-support/mandala . Telegram-генерация появится после отдельной проверки сценария, согласия и XP; заказ сейчас не создан.',
  tests:'Выберите бесплатный тест: https://holistichouse.vercel.app/ru/tests . Личные результаты не доступны мне без явной привязки кабинета.',
  master:'Для личной блиц-диагностики мастера: https://holistichouse.vercel.app/ru/services/free-situation-review . Запись автоматически не создана.',
  safety:'Если вам сейчас угрожает непосредственная опасность, обратитесь в местную экстренную службу или к человеку, которому доверяете.',
 },
 en:{
  consent:'Holistic House Companion gives reviewed rules-based guidance. It cannot read private materials or replace a therapist. Typed messages are not sent to external models. Voice needs separate permission. Enable AI? Your material subscription stays unchanged. Privacy: https://holistichouse.vercel.app/en/privacy',
  ready:'AI Companion is enabled. Ask a question or choose an action. To turn off AI only, send /ai_off.',
  off:'AI chat is off. Your materials subscription is unchanged. Restart with /ai.',
  decline:'AI remains off. Your materials and subscription are unchanged.',
  need:'To start a separate AI conversation, send /ai and choose Enable AI.',
  hello:'I am here! Tell me what matters to you or choose an action.',
  materials:'Your subscription materials remain in previously delivered messages. Private files require verified access. Public library: https://holistichouse.vercel.app/en/books',
  practice:'How do you feel, and how many minutes do you have? Open practices: https://holistichouse.vercel.app/en/holistic-support/mobile',
  video:'You can create a video in Video Studio: https://holistichouse.vercel.app/en/holistic-support/mandala . Telegram video ordering needs a separately approved plan, consent and XP. No order was placed.',
  tests:'Browse free tests: https://holistichouse.vercel.app/en/tests . I cannot read private scores without verified account linking.',
  master:'Request a practitioner situation review: https://holistichouse.vercel.app/en/services/free-situation-review . No booking has been made.',
  safety:'If you are in immediate danger, contact local emergency services or someone you trust.',
 },
 es:{
  consent:'El asistente Holistic House responde con reglas revisadas. No lee materiales privados ni sustituye a un terapeuta. No envía mensajes escritos a modelos externos. La voz necesita permiso aparte. ¿Activar IA? Tu suscripción no cambiará. Privacidad: https://holistichouse.vercel.app/es/privacy',
  ready:'Asistente activado. Escribe una pregunta o elige una opción. Para desactivar solo la IA, envía /ai_off.',
  off:'Chat de IA desactivado. Tu suscripción sigue igual. Reactivar: /ai.',
  decline:'La IA sigue desactivada. Tus materiales y suscripción permanecen iguales.',
  need:'Para conversar con IA, envía /ai y elige Activar IA.',
  hello:'¡Estoy aquí! Cuéntame qué necesitas o elige una opción.',
  materials:'Los materiales de tu suscripción están en mensajes anteriores. Los archivos privados requieren acceso verificado. Biblioteca pública: https://holistichouse.vercel.app/es/books',
  practice:'¿Cómo te sientes y cuántos minutos tienes? Prácticas públicas: https://holistichouse.vercel.app/es/holistic-support/mobile',
  video:'Puedes crear un vídeo aquí: https://holistichouse.vercel.app/es/holistic-support/mandala . Los pedidos por Telegram requieren confirmación, consentimiento y XP. No se creó ningún pedido.',
  tests:'Pruebas gratuitas: https://holistichouse.vercel.app/es/tests . No puedo leer resultados privados sin una cuenta vinculada.',
  master:'Solicita una revisión personal: https://holistichouse.vercel.app/es/services/free-situation-review . No se ha reservado una cita.',
  safety:'Si estás en peligro inmediato, contacta con emergencias o alguien de confianza.',
 }
};
const buttons=(rows)=>({inline_keyboard:rows.map(row=>row.map(([label,action])=>({text:label,callback_data:'hhai:'+action})))});
const BUTTONS={
 ru:buttons([[['🤖 Общаться','chat'],['📚 Материалы','materials']],[['🧘 Практика','practice'],['🎬 Видео','video']],[['📝 Тесты','tests'],['👤 Мастер','master']],[['Выключить AI','off']]]),
 en:buttons([[['🤖 Chat','chat'],['📚 Materials','materials']],[['🧘 Practice','practice'],['🎬 Video','video']],[['📝 Tests','tests'],['👤 Practitioner','master']],[['Turn off AI','off']]]),
 es:buttons([[['🤖 Chat','chat'],['📚 Materiales','materials']],[['🧘 Práctica','practice'],['🎬 Vídeo','video']],[['📝 Pruebas','tests'],['👤 Profesional','master']],[['Desactivar IA','off']]])
};
export function subscriberAiResponse(action,locale='en',text=''){
 const lang=subscriberAiLocale(locale),messages=COPY[lang];
 if(action==='open')return {text:messages.consent,keyboard:buttons([
  [[lang==='ru'?'Включить AI':lang==='es'?'Activar IA':'Enable AI','agree'],
   [lang==='ru'?'Не сейчас':lang==='es'?'Ahora no':'Not now','decline']]
 ])};
 if(action==='chat'){
  if(resolveHomeGuideQuestion(text,lang).urgent)return {text:messages.safety};
  const answer=ruleConversationReply({message:text,locale:lang});
  return {text:answer?.reply||messages.hello,keyboard:BUTTONS[lang]};
 }
 const messageKey=action==='enable'?'ready':action==='disable'?'off':action==='decline'?'decline':action;
 return {text:messages[messageKey]||messages.hello,
   ...(action==='enable'||action==='hello'?{keyboard:BUTTONS[lang]}:{})};
}
