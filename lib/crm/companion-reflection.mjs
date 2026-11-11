/**
 * Non-clinical, rules-only supportive replies for the first-party Telegram CRM bot.
 * No network, persistence, profile access, diagnosis or model usage.
 * Safety / emergency routing MUST happen before this helper.
 */
const MESSAGES={
 ru:{
  refusal:'Хорошо, без упражнений. Хочешь просто рассказать, что происходит, или разобраться в одной ситуации?',
  anxiety:'Похоже, сейчас много напряжения. Что в этой ситуации беспокоит тебя больше всего?',
  sadness:'Слышать о таком непросто. Хочешь рассказать, что сегодня было особенно тяжёлым?',
  anger:'Похоже, что-то сильно задело тебя. Что произошло перед этим чувством?',
  lonely:'Одиночество может быть тяжёлым. Что сейчас помогло бы почувствовать немного больше контакта?',
 },
 en:{
  refusal:'Okay, no exercises. Would you rather talk about what happened or explore one situation?',
  anxiety:'It sounds like a lot of tension right now. What feels hardest in this situation?',
  sadness:'That sounds difficult. Would you like to tell me what weighed on you most today?',
  anger:'Something seems to have really upset you. What happened just before that feeling?',
  lonely:'Feeling alone can be difficult. What kind of connection would feel helpful right now?',
 },
 es:{
  refusal:'De acuerdo, sin ejercicios. ¿Prefieres contarme qué pasó o explorar una situación?',
  anxiety:'Parece que hay mucha tensión ahora. ¿Qué es lo que más te preocupa en esta situación?',
  sadness:'Suena difícil. ¿Quieres contarme qué fue lo más pesado del día?',
  anger:'Parece que algo te afectó mucho. ¿Qué ocurrió justo antes de sentirte así?',
  lonely:'La soledad puede pesar. ¿Qué tipo de contacto te ayudaría un poco ahora?',
 },
};
const CUES={
 ru:[
  ['refusal',/(?:не хочу|не надо|не предлагай|без).{0,25}(?:упражнен|практик|медитац)/iu],
  ['lonely',/(?:одинок|одиночеств|никому не нужен|никому не нужна)/iu],
  ['anxiety',/(?:тревож|волнуюсь|боюсь|страшно|переживаю|паник)/iu],
  ['sadness',/(?:груст|печаль|подавлен|тяжело на душе|плохо на душе)/iu],
  ['anger',/(?:раздраж|злюсь|злость|сердит|бешенств)/iu],
 ],
 en:[
  ['refusal',/(?:do not want|don't want|no|stop).{0,25}(?:exercise|practice|meditation)/i],
  ['lonely',/(?:lonely|alone|no one cares|isolated)/i],
  ['anxiety',/(?:anxious|anxiety|scared|afraid|worried|panic|overwhelmed)/i],
  ['sadness',/(?:sad|downhearted|depressed|heartbroken)/i],
  ['anger',/(?:angry|furious|irritated|upset)/i],
 ],
 es:[
  ['refusal',/(?:no quiero|sin|no me propongas).{0,25}(?:ejercici|práctica|meditaci)/iu],
  ['lonely',/(?:solo|sola|soledad|nadie me quiere)/iu],
  ['anxiety',/(?:ansiedad|ansioso|ansiosa|miedo|preocupad|pánico|agobiad)/iu],
  ['sadness',/(?:triste|tristeza|deprimid|desanimad)/iu],
  ['anger',/(?:enojad|furios|irritad|rabia)/iu],
 ],
};
export function companionReflectiveReply(message,locale='en'){
 const lang=Object.hasOwn(CUES,locale)?locale:'en';
 const value=typeof message==='string'?message.trim():'';
 if(!value||value.length>1200)return null;
 for(const [kind,pattern] of CUES[lang]){
  if(pattern.test(value))return MESSAGES[lang][kind];
 }
 return null;
}

/** Conservative emergency cue: non-diagnostic and never a substitute for human review. */
export function companionImmediateDanger(message){
 const value=typeof message==='string'?message.trim():'';
 if(!value||value.length>1200)return false;
 return /(?:не хочу больше жить|хочу покончить с собой|покончу с собой|хочу убить себя|i want to kill myself|i do not want to live|i don't want to live|i will kill myself|quiero suicidarme|no quiero vivir|voy a matarme)/iu.test(value);
}
