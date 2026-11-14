/**
 * Wave's first-party, offline-safe reply path for a consented Telegram conversation.
 * No provider calls, database writes, identifying logs or invented product actions.
 * A local fallback is explicitly less capable than full language-model generation.
 */
import {understandConversationTurn} from '../holistic-support/conversation-intelligence.mjs';
import {planEmotionalReaction} from '../holistic-support/emotional-reaction.mjs';
import {progressConversationTurn} from '../holistic-support/dialogue-progression.mjs';
import {v3Locale,v3ChatPreConsentSafetyReply} from './telegram-ai-diagnostic-v3.mjs';

export const WAVE_LOCAL_REPLY_VERSION='wave-telegram-local-v1';
const copy={
  ru:{
    general:'Я Wave 🌿 Сейчас отвечаю в упрощённом режиме: могу выслушать и помочь уточнить мысль. Что сейчас для вас важнее всего?',
    invitation:'Конечно, можем поболтать! Я Wave 🌿 О чём хочется поговорить?',
    limited:'Wave на связи 🌿 Сейчас я не могу надёжно дать развёрнутый ответ на этот вопрос. Можете уточнить, какая его часть для вас важнее?',
    qwen:'Я Wave — помощник Holistic House. Qwen — одна из языковых моделей, которую Wave может использовать внутри, но это не имя ассистента. Сейчас я отвечаю в упрощённом режиме. Что именно хотелось бы узнать?',
    identity:'Я Wave — цифровой помощник Holistic House. Могу поддержать разговор и помочь сформулировать вопрос. Сейчас доступен упрощённый режим.',
    repeated:'Я здесь, но расширенный ответ пока недоступен. Не хочу выдумывать факты. Можете немного иначе сформулировать вопрос?'
  },
  en:{
    general:"I'm Wave 🌿 I'm replying in a limited mode right now. I can listen and help clarify your thoughts. What matters most to you?",
    invitation:"Of course, let's chat! I'm Wave 🌿 What's on your mind?",
    limited:"Wave is here 🌿 I can't reliably give a detailed answer to that question just now. Which part matters most to you?",
    qwen:"I'm Wave, the Holistic House assistant. Qwen is one of the underlying language models I may use, not my name. I'm in a limited reply mode right now. What would you like to know?",
    identity:"I'm Wave, Holistic House's digital assistant. I can chat and help clarify a question. I'm in a limited mode right now.",
    repeated:"I'm still here, but a fuller answer isn't available. I don't want to invent facts. Could you rephrase your question?"
  },
  es:{
    general:'Soy Wave 🌿 Ahora respondo en modo limitado. Puedo escucharte y ayudarte a aclarar una idea. ¿Qué es lo más importante para ti?',
    invitation:'¡Claro, podemos conversar! Soy Wave 🌿 ¿De qué te gustaría hablar?',
    limited:'Wave está aquí 🌿 Ahora no puedo dar una respuesta detallada y fiable. ¿Qué parte de tu pregunta te importa más?',
    qwen:'Soy Wave, el asistente de Holistic House. Qwen es uno de los modelos de lenguaje que puedo usar internamente, no mi nombre. Ahora respondo en modo limitado. ¿Qué te gustaría saber?',
    identity:'Soy Wave, el asistente digital de Holistic House. Podemos hablar y aclarar tus preguntas. Ahora estoy en modo limitado.',
    repeated:'Sigo aquí, pero no dispongo de una respuesta completa. Prefiero no inventar datos. ¿Puedes reformular la pregunta?'
  }
};

/** Consumes only the already consented, encrypted, bounded V3 turn context. */
export function waveTelegramLocalReply({locale='ru',turns=[]}={}){
  const lang=v3Locale(locale);
  const history=Array.isArray(turns)?turns.slice(-9):[];
  const last=history.at(-1);
  const message=last?.role==='user'&&typeof last.text==='string'?last.text.slice(0,1200).trim():'';
  if(!message)return copy[lang].general;
  const earlier=history.slice(0,-1);
  const urgent=v3ChatPreConsentSafetyReply(message,lang);
  if(urgent)return urgent;
  // The owner-approved offline reply remains an authored small-talk message.
  if(/^(?:(?:давай\s+)?(?:поговорим|поболтаем|пообщаемся)(?:\s+немного)?|хочу\s+(?:поговорить|поболтать)|let'?s\s+chat|can\s+we\s+(?:chat|talk)|i\s+want\s+to\s+chat|hablemos|podemos\s+hablar|quiero\s+charlar)[?!.\s]*$/iu.test(message))
    return copy[lang].invitation;
  if(/(?:qwen|квен|квэн|openrouter)/iu.test(message))return copy[lang].qwen;
  if(/^(?:кто ты|ты кто|как тебя зовут|who are you|what is your name|quién eres|como te llamas)[?!. ]*$/iu.test(message))
    return copy[lang].identity;
  const understanding=understandConversationTurn({message,locale:lang,history:earlier});
  const emotion=planEmotionalReaction({message,locale:lang,history:earlier,safety:{status:'clear'}});
  const next=progressConversationTurn({message,locale:lang,history:earlier});
  const response=['disclosure','uncertainty'].includes(understanding.act)&&emotion?.reply
    ?emotion.reply:(understanding.replyFallback||emotion?.reply||next?.reply);
  const reply=typeof response==='string'?response.trim():'';
  const chosen=reply&&reply.length<=700?reply:
    ['direct_request','question'].includes(understanding.act)?copy[lang].limited:copy[lang].general;
  const previous=[...earlier].reverse().find(t=>t.role==='assistant')?.text?.trim();
  return previous===chosen?copy[lang].repeated:chosen;
}
