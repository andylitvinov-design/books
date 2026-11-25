/** Deterministic, private Telegram AI intake. No unconfirmed external AI calls. */
import {interpretSupportUtterance} from '../holistic-support/guide-dialogue.mjs';
import {resolveHomeGuideQuestion,homeGuideOpening} from '../home-conversation.mjs';
export const AI_LANES=Object.freeze(['message','video','delivery']);
const hello=/^(?:\/ai|\/?start(?:\s+hhai_(?:ru|en|es))?|привет(?:ствую)?[!.?]*|ау[!.?]*|hello[!.?]*|hi[!.?]*|hola[!.?]*)$/iu;
const stop=/^(?:\/stop|\/unsubscribe|стоп|остановить|stop|parar)$/iu;
const agree=/^(?:\/hhvideo_agree|\/agree|согласен|согласна|согласие|i agree|agree|acepto)$/iu;
const video=/^(?:\/hhvideo(?:\s+|$)|\/video(?:\s+|$)|сделай\s+(?:мне\s+)?видео|создай\s+(?:мне\s+)?(?:видео|ролик)|хочу\s+(?:видео|ролик)|create\s+(?:a\s+)?video|make\s+(?:a\s+)?video|crear\s+(?:un\s+)?v[ií]deo)/iu;
const locales=new Set(['ru','en','es']);
export function aiLocale(value){return locales.has(value)?value:'en'}
export function telegramAiIntent(raw,awaitingGoal=false){
  if(typeof raw!=='string')return {kind:'unsupported'};
  const text=raw.trim().slice(0,1200);
  if(!text||text==='[Non-text message]')return {kind:'unsupported'};
  if(stop.test(text))return {kind:'stop'};
  if(agree.test(text))return {kind:'agree'};
  if(hello.test(text))return {kind:'hello'};
  if(/^\/start\s+hhreview_/iu.test(text))return {kind:'diagnostic'};
  if(video.test(text)){
    const goal=text.replace(video,'').replace(/^(?:\s*(?:про|о|about|sobre|:|-))\s*/iu,'').trim();
    return goal.length>=5?{kind:'video',goal:goal.slice(0,600)}:{kind:'video_prompt'};
  }
  // A pending video-goal prompt must never hijack explicit confirmation,
  // cancellation or feedback from an existing private video state.
  if(/^\/(?:hhvideo_confirm|hhvideo_cancel|watched|stop_checkin|skip_checkin)$/i.test(text))
    return {kind:'message',text};
  if(awaitingGoal&&text.length>=5&&!text.startsWith('/'))
    return {kind:'video',goal:text.slice(0,600)};
  return {kind:'message',text};
}
const COPY={
 ru:{hello:'Приветствую! Я помощник Holistic House. Могу помочь подобрать медитацию или создать короткое видео. Чтобы продолжить и сохранить нашу переписку, напишите «Согласен». Подробнее: holistichouse.vercel.app/ru/privacy. Для остановки: /stop.',ready:'Спасибо! Напишите, что вам сейчас актуально, или «Создай видео про ...».',videoConsent:'Для отдельного создания и доставки личного видео необходимо согласие на эту переписку. Напишите /hhvideo_agree, затем /hhvideo и тему. Личное видео будет доступно только после подтверждённой связки аккаунта и отдельного разрешения в кабинете. Остановить: /stop.',videoReady:'Согласие на диалог получено. Привяжите Telegram к своему кабинету и разрешите личное видео, затем напишите /hhvideo и тему.',needConsent:'Для переписки и создания видео сначала напишите «Согласен». Для остановки: /stop.',videoPrompt:'На какую тему создать видео? Напишите /hhvideo, затем пробел и желаемый образ или цель. Длина первого ролика — 20 секунд.',queued:'Ваш ролик принят в очередь. Я напишу здесь, когда готовый MP4 будет создан.',meditation:'Помогу подобрать медитацию. Напишите, какое состояние сейчас и какое хотели бы получить.',support:'Я могу помочь выбрать медитацию, тест или составить короткий видеоролик. Какая тема сейчас важнее?',safety:'При непосредственной опасности важно обратиться к местной экстренной службе или человеку, которому доверяете.',videoUnavailable:'Пока не получилось создать видео. Ваш запрос не потерян; попробуйте позже.'},
 en:{hello:'Welcome to Holistic House. I can help you find a meditation or create a short video. To continue and save our conversation, reply “I agree”. Privacy: holistichouse.vercel.app/en/privacy. Stop: /stop.',ready:'Thank you! Tell me what matters to you, or write “Create video about ...”.',videoConsent:'Video chat needs separate consent. Type /hhvideo_agree, then /hhvideo followed by your goal. Personal videos also require a verified account link and separate delivery permission in your cabinet. Stop: /stop.',videoReady:'Chat consent saved. Link this Telegram account and enable personal-video consent in your cabinet, then type /hhvideo followed by your goal.',needConsent:'Please reply “I agree” before we save messages or make your video. Stop: /stop.',videoPrompt:'What should your video be about? Type /hhvideo followed by your goal or imagery. The first version lasts 20 seconds.',queued:'Your video request is queued. I will send the finished MP4 here when it is ready.',meditation:'I can help find a meditation. What are you feeling now, and how would you like to feel?',support:'I can help you explore meditations, tests, or a short video. What matters most right now?',safety:'If you are in immediate danger, seek local emergency help or a trusted person.',videoUnavailable:'Video creation did not finish. Please try again later.'},
 es:{hello:'¡Hola! Soy el asistente de Holistic House. Puedo ayudarte con una meditación o crear un vídeo corto. Para continuar y guardar este diálogo, escribe «Acepto». Privacidad: holistichouse.vercel.app/es/privacy. Detener: /stop.',ready:'¡Gracias! Cuéntame qué necesitas o escribe «Crear vídeo sobre ...».',videoConsent:'Para conversar sobre vídeos se requiere consentimiento aparte. Escribe /hhvideo_agree y después /hhvideo con tu objetivo. El vídeo privado exige vincular tu cuenta y autorizar la entrega por separado. Detener: /stop.',videoReady:'Consentimiento del diálogo guardado. Vincula Telegram y permite los vídeos privados en tu cuenta; luego escribe /hhvideo con tu objetivo.',needConsent:'Para continuar, primero escribe «Acepto». Detener: /stop.',videoPrompt:'¿Sobre qué tema quieres el vídeo? Escribe /hhvideo seguido del objetivo o las imágenes. La primera versión dura 20 segundos.',queued:'Tu vídeo está en la cola. Te enviaré el MP4 cuando esté listo.',meditation:'Puedo ayudarte a encontrar una meditación. ¿Cómo te sientes y cómo te gustaría sentirte?',support:'Puedo ayudarte con meditaciones, tests o un vídeo corto. ¿Qué es lo más importante ahora?',safety:'Si hay peligro inmediato, busca ayuda de emergencias o de una persona de confianza.',videoUnavailable:'No se pudo terminar el vídeo. Inténtalo de nuevo más tarde.'}
};
export function aiCopy(locale,key){return COPY[aiLocale(locale)][key]||COPY.en.support}
export function replyForClient(text,locale){
 const detail=interpretSupportUtterance(text,aiLocale(locale));
 if(detail.kind==='safety')return aiCopy(locale,'safety');
 if(detail.format==='meditation'||detail.format==='healing')return aiCopy(locale,'meditation');
 const opening=homeGuideOpening(resolveHomeGuideQuestion(text,aiLocale(locale)))?.[aiLocale(locale)];
 return opening ? opening+' '+aiCopy(locale,'support') : aiCopy(locale,'support');
}
export function classifyTelegramUpdate(event){
 return event?.type==='incoming' && /^tg:\d+$/.test(String(event.eventId||'')) &&
 /^[1-9]\d{3,19}$/.test(String(event.userId||'')) &&
 typeof event.rawText==='string' && event.rawText.length<=1200 &&
 event.rawText!=='[Non-text message]' && !event.callbackId;
}