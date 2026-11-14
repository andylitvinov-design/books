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
    limited:'Wave на связи 🌿 Сейчас я не могу надёжно дать развёрнутый ответ на этот вопрос. Можете уточнить, какая его часть для вас важнее?',
    qwen:'Я Wave — помощник Holistic House. Qwen — отдельная языковая модель, которую можно использовать для разработки. Мой облачный диалог не зависит от домашнего компьютера. Сейчас доступен упрощённый ответ.',
    identity:'Я Wave — цифровой помощник Holistic House. Могу поддержать разговор и помочь сформулировать вопрос. Сейчас доступен упрощённый режим.',
    repeated:'Я здесь, но расширенный ответ пока недоступен. Не хочу выдумывать факты. Можете немного иначе сформулировать вопрос?'
  },
  en:{
    general:"I'm Wave 🌿 I'm replying in a limited mode right now. I can listen and help clarify your thoughts. What matters most to you?",
    limited:"Wave is here 🌿 I can't reliably give a detailed answer to that question just now. Which part matters most to you?",
    qwen:"I'm Wave, the Holistic House assistant. Qwen is a separate model for optional development work, not my identity. My everyday cloud chat doesn't depend on a home computer. I'm in limited mode right now.",
    identity:"I'm Wave, Holistic House's digital assistant. I can chat and help clarify a question. I'm in a limited mode right now.",
    repeated:"I'm still here, but a fuller answer isn't available. I don't want to invent facts. Could you rephrase your question?"
  },
  es:{
    general:'Soy Wave 🌿 Ahora respondo en modo limitado. Puedo escucharte y ayudarte a aclarar una idea. ¿Qué es lo más importante para ti?',
    limited:'Wave está aquí 🌿 Ahora no puedo dar una respuesta detallada y fiable. ¿Qué parte de tu pregunta te importa más?',
    qwen:'Soy Wave, el asistente de Holistic House. Qwen es otro modelo que puede utilizarse para desarrollo; mi chat en la nube no depende de un ordenador personal. Ahora respondo en modo limitado.',
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
