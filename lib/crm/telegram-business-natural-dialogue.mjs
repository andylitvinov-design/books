// Narrow, provider-free Business clarification; no private history or new storage.
import {telegramBusinessWelcomeTopic} from './telegram-business-welcome-menu.mjs';
const copy={
  "en": {
    "interest": "It sounds like those videos made you curious about what people were experiencing. What would you most like to understand about them?",
    "location": "Thanks for sharing where you're based. We can explore online options, too.",
    "free": "Of course. You can start with a free situation review or a free introductory Reiki course, without committing to a paid session. Which would you prefer?",
    "handoff": "I may be missing some context. You can leave your question here for the practitioner; I can't confirm a reply time."
  },
  "ru": {
    "interest": "Похоже, видео пробудили ваше любопытство к тому, что переживают эти люди. Что именно вам хотелось бы понять?",
    "location": "Спасибо, что рассказали, откуда вы. Можем рассмотреть и онлайн-варианты.",
    "free": "Конечно. Можно начать с бесплатного разбора ситуации или бесплатного вводного курса Рейки, без обязательства записываться на платную сессию. Что вам ближе?",
    "handoff": "Возможно, я не до конца понял ваш вопрос. Можно оставить его здесь для специалиста; срок ответа пока не подтверждён."
  },
  "es": {
    "interest": "Parece que esos vídeos despertaron tu curiosidad por lo que experimentaban las personas. ¿Qué te gustaría comprender mejor?",
    "location": "Gracias por contarme de dónde eres. También podemos explorar opciones en línea.",
    "free": "Por supuesto. Puedes empezar con una revisión de situación o un curso introductorio de Reiki gratuitos, sin compromiso de pagar una sesión. ¿Cuál prefieres?",
    "handoff": "Quizá me falte algo de contexto. Puedes dejar tu pregunta aquí para el profesional; no puedo confirmar un plazo de respuesta."
  }
};
function normalizeBusinessReply(value){
 return String(value??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
}
export function businessSecretaryNaturalClarification(message,locale='en',options={}){
 if(typeof message!=='string'||options.mediaKind||options.longText||message.length>800)return null
 const l=Object.hasOwn(copy,locale)?locale:'en'
 const raw=message.normalize('NFKC').trim()
 const text=normalizeBusinessReply(raw)
 let reason
 if(/^(?:free|free please|free option|free options|only free|бесплатно|бесплатный|бесплатные|только бесплатно|бесплатный вариант|gratis|gratuito|gratuita|solo gratis|sólo gratis)$/iu.test(text))reason='free'
 else if(/^(?:(?:i\s*(?:am|['’]m)|am|im)\s+from\s+|я\s+из\s+|soy\s+de\s+)/iu.test(raw)&&!/[?？\r\n]/u.test(raw))reason='location'
 else if(/(?:videos?|vídeos?|ролик|видео)/iu.test(raw)&&/(?:curious|curiosity|intrigued|любопыт|интересно|заинтерес|curiosidad|curios[oa])/iu.test(raw))reason='interest'
 if(!reason)return null
 const buttons=reason==='free'?telegramBusinessWelcomeTopic(l,'free').buttons.filter((_,i)=>i===0||i===2):[]
 return {handled:true,kind:'clarify',text:copy[l][reason],buttons,modelUsed:false,clarificationReason:'natural_'+reason}
}
export async function guardBusinessSecretaryReply(planned,reserve){
 if(typeof planned?.reply!=='string'||!planned.reply.trim()||typeof reserve!=='function')return null
 // Urgent safety messages must never be throttled merely for similarity.
 if(planned.kind==='safety')return planned
 const l=Object.hasOwn(copy,planned.locale)?planned.locale:'en'
 const consume=async (scope,key)=>{
   try{await reserve(scope,key);return true}
   catch(error){if(error?.code==='RATE_LIMITED')return false;throw error}
 }
 const textKey=normalizeBusinessReply(planned.reply)
 const reason=planned.kind==='clarify'&&typeof planned.clarificationReason==='string'?planned.clarificationReason:null
 if(await consume('text',textKey)&&(!reason||await consume('clarification',reason)))return planned
 // No second generic question, no repeated menu, no invented handoff.
 if(!await consume('handoff','once'))return null
 return {...planned,reply:copy[l].handoff,buttons:[],kind:'clarify',clarificationReason:'repeat_handoff'}
}
