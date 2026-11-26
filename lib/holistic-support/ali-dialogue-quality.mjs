/** Ali Learning Studio: deterministic, bounded, local response-quality check.
 * Not a semantic classifier; does not make safety, consent or action decisions.
 * Call only after host safety and role/stage authorization. No storage or network.
 */
export const ALI_DIALOGUE_QUALITY_VERSION="ali-question-quality-v1";
export const ALI_LEARNING_RULES=Object.freeze([
  {
    "id": "ALI-01",
    "title": "Do not ask the same question again",
    "description": "Compare recent assistant questions, including known generic variants; use grounded progression or acknowledge the limitation."
  },
  {
    "id": "ALI-02",
    "title": "Answer the actual request",
    "description": "A change of wording is not a new answer. Preserve verified facts and specific next actions."
  },
  {
    "id": "ALI-03",
    "title": "Respect role, safety and permissions",
    "description": "Do not rewrite safety handoffs, confirmations or protected workflow stages; never invent a booking or medical claim."
  },
  {
    "id": "ALI-04",
    "title": "Improve only through reviewed examples",
    "description": "Use synthetic examples, not automatic training on client messages. Keep changes versioned and reviewed."
  }
].map(Object.freeze));
const families={
 ru:[["priority",/^(?:что (?:для вас |для тебя )?(?:сейчас )?(?:важнее всего|самое важное|важнее)|что сейчас (?:для вас |для тебя )?важнее всего|на чем (?:вы |ты )?(?:хотели бы |хотел бы )?сосредоточиться)$/u],["topic",/^(?:о чем (?:вам |тебе )?(?:хочется|хотите|хочешь|хотели бы) (?:поговорить|рассказать)|что (?:вы |ты )?(?:хотите|хочешь|хотели бы) обсудить)$/u]],
 en:[["priority",/^(?:what (?:matters most|is most important)(?: to you| for you)?(?: right now| now| today)?|what (?:would you like to|do you want to) focus on)$/u],["topic",/^(?:what(?: s| is) on your mind|what (?:would you like to|do you want to) (?:talk about|discuss))$/u]],
 es:[["priority",/^(?:que (?:es lo mas importante|te importa mas)(?: para ti| ahora mismo| ahora)?|en que te gustaria centrarte)$/u],["topic",/^(?:de que (?:te gustaria|quieres) (?:hablar|conversar)|que (?:te gustaria|quieres) (?:comentar|discutir))$/u]],
};
const recovery={
  "ru": "Извините, я снова задал тот же вопрос. Пока не могу дать более содержательный ответ в этом режиме.",
  "en": "Sorry, I asked the same question again. I can't give a more useful answer in this mode right now.",
  "es": "Perdona, he repetido la misma pregunta. Por ahora no puedo ofrecer una respuesta más útil en este modo."
};
function normalizeQuestion(value){
 if(typeof value!=="string")return "";
 return value.slice(0,1200).normalize("NFC").toLowerCase().replace(/ё/gu,"е")
   .replace(/[áàä]/gu,"a").replace(/[éèë]/gu,"e").replace(/[íìï]/gu,"i")
   .replace(/[óòö]/gu,"o").replace(/[úùü]/gu,"u").replace(/[’']/gu," ")
   .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/gu," ")
   .replace(/^(?:пожалуйста|скажите пожалуйста|please|por favor)\s+/u,"")
   .replace(/\s+(?:пожалуйста|please|por favor)$/u,"");
}
function questions(value){
 if(typeof value!=="string")return [];
 return (value.slice(0,1200).match(/[^.!?？！。\n]+[?？]/gu)||[])
   .map(normalizeQuestion).filter(q=>q.split(" ").length>=3).slice(0,4);
}
function requestedRepeat(message){
 const t=normalizeQuestion(message);
 return /^(?:повтори(?:те)? (?:вопрос|последний вопрос|свой вопрос)|задай(?:те)? (?:тот же |этот )?вопрос еще раз|repeat (?:the |your |last )?question|ask (?:the |that |your )?question again|repite (?:la |tu |ultima )?pregunta|vuelve a hacer (?:la |esa )?pregunta)$/u.test(t);
}
function questionFamily(question,locale){
 const groups=families[locale]||[];
 return groups.find(([,pattern])=>pattern.test(question))?.[0]||null;
}
export function repeatedDialogueQuestion({reply="",history=[],message="",locale="en"}={}){
 if(requestedRepeat(message))return {repeated:false,reason:"explicit_repeat_requested"};
 const candidates=questions(reply);
 if(!candidates.length)return {repeated:false,reason:"no_question"};
 const recent=Array.isArray(history)?history.slice(-12):[];
 const previous=recent.filter(x=>x?.role==="assistant").flatMap(x=>questions(x.text??x.content));
 for(const candidate of candidates){
   if(previous.includes(candidate))return {repeated:true,reason:"same_question"};
   const family=questionFamily(candidate,locale);
   if(family&&previous.some(q=>questionFamily(q,locale)===family))return {repeated:true,reason:"generic_question_loop"};
 }
 return {repeated:false,reason:"new_question"};
}
export function repairRepeatedDialogueQuestion({reply="",history=[],message="",locale="en",alternative=""}={}){
 const result=repeatedDialogueQuestion({reply,history,message,locale});
 if(!result.repeated)return {reply,changed:false,reason:result.reason};
 if(typeof alternative==="string"&&alternative.trim()&&alternative.length<=700
   &&normalizeQuestion(alternative)!==normalizeQuestion(reply)
   &&!repeatedDialogueQuestion({reply:alternative,history,message,locale}).repeated)
   return {reply:alternative.trim(),changed:true,reason:"grounded_alternative"};
 return {reply:recovery[locale]||recovery.en,changed:true,reason:result.reason};
}
