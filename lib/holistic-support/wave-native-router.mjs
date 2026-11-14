/**
 * Wave Native 1.0. Reviewed first-party responses BEFORE external inference.
 * This module only writes conversation text: no network, storage, actions,
 * diagnosis, pricing, bookings, private profile access or consent changes.
 */
import {understandConversationTurn} from './conversation-intelligence.mjs';
import {reasonAboutConversationTurn} from './reasoning-mind.mjs';
import {planEmotionalReaction} from './emotional-reaction.mjs';
import {progressConversationTurn} from './dialogue-progression.mjs';

export const WAVE_NATIVE_ROUTER_VERSION='wave-native-first-v1';
const locales=new Set(['ru','en','es']);
const blocked=/(?:суицид|самоубийств|не хочу жить|убить себя|умереть|не могу дышать|боль в груди|насили|лекарств|диагноз|психоз|депресс|суицид|suicid|kill myself|want to die|cannot breathe|chest pain|violence|diagnos|prescription|psychosis|depression|quiero morir|dolor en el pecho|no puedo respirar|violencia|diagnostico|depresion)/iu;
const action=/(?:создай|сгенерируй|оплати|спиши|оформи|запиши меня|отправь|скачай|загрузи|сохрани|удали|купи|переведи деньги|запусти|построй план|назначь|сделай заказ|create|generate|render|purchase|refund|pay|book|schedule|upload|download|delete|send|save|start (?:a |the )?(?:course|session)|compra|paga|reserva|borra|envia|descarga|genera|sube)/iu;
const explicit={
  identity:/^(?:кто ты|ты кто|как тебя зовут|кто такой wave|who are you|what is your name|are you wave|quien eres|como te llamas|eres wave)$/iu,
  abilities:/^(?:что ты умеешь|чем ты можешь помочь|что умеет wave|what can you do|how can you help|que puedes hacer|en que puedes ayudar)$/iu,
  qwen:/^(?:(?:а|о|что такое|кто такой|расскажи о|what is|tell me about|que es|hablame de)\s+)?(?:qwen|квен|квэн)$/iu,
  openrouter:/^(?:(?:а|о|что такое|расскажи о|what is|tell me about|que es|hablame de)\s+)?openrouter$/iu,
  courses:/^(?:где (?:найти|посмотреть) курсы|где ваши курсы|where (?:are|can i find) (?:the |your )?courses|donde (?:estan|puedo ver) (?:los )?cursos)$/iu,
  services:/^(?:где (?:найти|посмотреть) услуги|какие есть услуги|where (?:are|can i find) (?:the |your )?services|donde (?:estan|puedo ver) (?:los )?servicios)$/iu,
};
const copy={
 ru:{
  identity:'Я Wave — цифровой помощник Holistic House. Я не человек. Простые вопросы могу обрабатывать сам, без внешней языковой модели.',
  abilities:'Я Wave. Могу поддержать разговор, уточнить ваш запрос и подсказать, где найти курсы, услуги и проверенные материалы Holistic House. Заказы и консультации требуют отдельного подтверждения.',
  qwen:'Я Wave. Qwen — отдельная языковая модель, которую можно использовать для разработки и экспериментов; мой обычный облачный диалог не зависит от домашнего компьютера.',
  openrouter:'OpenRouter — внешний провайдер языковых моделей. Для простого разговора он не нужен: сначала отвечает собственный движок Wave. Сложный вопрос может потребовать внешней модели.',
  courses:'Курсы и практики Holistic House доступны в разделе Academy. Какую тему вы хотели бы изучить?',
  services:'Опубликованные услуги и специалисты собраны в разделе Services. Могу помочь уточнить, какой вариант вам нужен.',
  repeated:'Я на связи 🌿 Можем продолжить с того места, где остановились.',
 },
 en:{
  identity:'I’m Wave, the Holistic House digital assistant, not a person. I can handle simple questions without an external language model.',
  abilities:'I’m Wave. I can chat, clarify a question, and help locate Holistic House courses, services and reviewed materials. Orders and appointments need separate confirmation.',
  qwen:'I’m Wave. Qwen is a separate language model that may be used for development and experiments. My everyday cloud conversations do not depend on a home computer.',
  openrouter:'OpenRouter is an external language-model provider. Simple conversations use Wave’s own logic first. A difficult question may need an external model.',
  courses:'Holistic House courses and practices are in Academy. What would you like to learn about?',
  services:'Published services and practitioners are listed under Services. I can help clarify what you are looking for.',
  repeated:'I’m here 🌿 We can continue where we left off.',
 },
 es:{
  identity:'Soy Wave, el asistente digital de Holistic House, no una persona. Respondo preguntas sencillas sin un modelo lingüístico externo.',
  abilities:'Soy Wave. Puedo conversar, aclarar preguntas y orientar hacia cursos, servicios y materiales revisados de Holistic House. Los pedidos y las citas requieren confirmación aparte.',
  qwen:'Soy Wave. Qwen es un modelo lingüístico distinto que puede usarse para desarrollo y pruebas. Mis conversaciones habituales en la nube no dependen de un ordenador personal.',
  openrouter:'OpenRouter es un proveedor externo de modelos lingüísticos. Wave responde primero a preguntas sencillas con lógica propia. Una pregunta compleja puede necesitar otro modelo.',
  courses:'Los cursos y las prácticas de Holistic House están en Academy. ¿Qué te gustaría aprender?',
  services:'Los servicios y profesionales publicados están en Services. Puedo ayudarte a precisar qué buscas.',
  repeated:'Aquí estoy 🌿 Podemos continuar donde lo dejamos.',
 },
};
const social=new Set(['greeting','chat_invitation','small_talk','thanks','goodbye','no_advice','rejection','uncertainty','disclosure','feedback','correction','follow_up']);
const norm=x=>String(x||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/ё/gu,'е').replace(/^[¿¡]+/gu,'').replace(/[¿¡!?.,:;]+$/gu,'').replace(/\s+/gu,' ').trim();
const result=(reply,intent,confidence)=>({reply,intent,confidence,source:WAVE_NATIVE_ROUTER_VERSION,modelUsed:false,externalCalled:false});

/** Only a confirmed narrow intent receives a final native answer; otherwise null. */
export function waveNativeTurn({message='',locale='ru',history=[]}={}){
 const lang=locales.has(locale)?locale:'en';
 const raw=typeof message==='string'?message.trim():'';
 if(raw.length<2||raw.length>280||raw.startsWith('/')||/https?:\/\/|<[^>]*>|[\r\n]/u.test(raw)||blocked.test(raw)||action.test(raw))return null;
 const normalized=norm(raw);
 const prior=Array.isArray(history)?history.slice(-6).filter(x=>x&&['assistant','user'].includes(x.role)&&typeof x.text==='string'&&x.text.length<1000):[];
 for(const [intent,regex] of Object.entries(explicit)){
   if(regex.test(normalized))return result(copy[lang][intent],'faq.'+intent,'high');
 }
 // Never misread a greeting with a request as a standalone greeting.
 if(/^(?:привет|здравствуй|здравствуйте|добрый день|hello|hi|hey|hola|buenas)[\s,!—.:;-]+(?:.+)$/iu.test(raw) &&
    /(?:подскажи|помоги|хочу|надо|мне нужно|как|что|почему|сколько|where|what|how|why|can you|i need|i want|necesito|quiero)/iu.test(raw))return null;
 const understanding=understandConversationTurn({message:raw,locale:lang,history:prior});
 if(!social.has(understanding.act))return null;
 const reasoning=reasonAboutConversationTurn({message:raw,locale:lang,history:prior});
 if(reasoning.confidence==='low'||reasoning.confidenceScore<.65)return null;
 if(understanding.act==='follow_up'&&!reasoning.contextTopic)return null;
 const emotion=planEmotionalReaction({message:raw,locale:lang,history:prior,safety:{status:'clear'}});
 const progress=progressConversationTurn({message:raw,locale:lang,history:prior});
 const text=['disclosure','uncertainty'].includes(understanding.act)&&emotion?.reply
   ?emotion.reply:understanding.replyFallback||progress?.reply||null;
 if(typeof text!=='string'||!text.trim()||text.length>700||/https?:\/\/|<[^>]*>/u.test(text)||(text.match(/[?？]/g)||[]).length>1)return null;
 const previous=[...prior].reverse().find(x=>x.role==='assistant')?.text?.trim();
 const reply=previous===text.trim()?copy[lang].repeated:text.trim();
 return result(reply,'conversation.'+understanding.act,reasoning.confidence);
}
