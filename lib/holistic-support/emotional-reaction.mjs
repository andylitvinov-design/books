/**
 * Reaction Mind: explicit self-reported emotion gets the first conversational
 * acknowledgement. Pure, ephemeral, non-clinical, no provider or persistence.
 * The calling host MUST preserve its independent safety preflight.
 */
export const EMOTIONAL_REACTION_VERSION = 'hh-reaction-mind-v1';
const normalize = value => String(value ?? '').toLocaleLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/gu,'').replace(/ё/g,'е').replace(/[’']/gu,'')
  .replace(/\s+/gu,' ').trim();
const locales = ['ru','en','es'];
const danger = /(?:не хочу жить|хочу умереть|покончу с собой|суицид|самоубийств|боль в груди|не могу дышать|трудно дышать|меня бьют|физическое насилие|i want to die|kill myself|suicid|end my life|chest pain|cant breathe|cannot breathe|domestic violence|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar|violencia domestica)/u;
const direct = /(?:^|[\s,;.!?])(?:создай|сделай|сгенерируй|подбери|найди|покажи|скачай|запиши|закажи|create|generate|make me|find me|book|download|genera|crea|busca|descarga)(?:[\s,;.!?]|$)|(?:^|\s)(?:хочу|i want|quiero)\s+(?:видео|ролик|медитац|курс|тест|video|meditation|test|course|meditacion|prueba)/u;
const feelings = [
  {id:'sad',p:{ru:/^(?:(?:привет|здравствуйте)[!,\.\s]+)?(?:(?:сегодня|сейчас|в последнее время)\s+)?(?:мне (?:очень |так )?(?:грустно|печально|тоскливо)|я (?:очень |сильно )?(?:грущу|расстроен(?:а)?|чувствую грусть))/u,en:/^(?:(?:hi|hello)[!,\.\s]+)?(?:i (?:am |feel |have been )|im )(?:very |really |so )?(?:sad|upset|down|heartbroken)/u,es:/^(?:me siento|estoy) (?:muy )?(?:triste|decaid[oa]|apenad[oa])/u}},
  {id:'fear',p:{ru:/^(?:мне (?:очень )?страшно|я (?:очень )?боюсь|я испытываю страх)/u,en:/^(?:i (?:am |feel )|im )(?:very |really )?(?:scared|afraid|frightened|fearful)/u,es:/^(?:tengo (?:mucho )?miedo|me siento asustad[oa]|estoy asustad[oa])/u}},
  {id:'anger',p:{ru:/^(?:я (?:очень |сильно )?(?:злюсь|сердит(?:а)?|раздражен(?:а)?)|меня (?:очень )?(?:бесит|злит))/u,en:/^(?:i (?:am |feel )|im )(?:very |really |so )?(?:angry|furious|mad)/u,es:/^(?:estoy|me siento) (?:muy )?(?:enfadad[oa]|enojad[oa]|furios[oa])/u}},
  {id:'joy',p:{ru:/^(?:я (?:очень |так )?(?:рад(?:а)?|счастлив(?:а)?)|мне (?:очень )?(?:радостно|хорошо на душе)|я чувствую радость)/u,en:/^(?:i (?:am |feel )|im )(?:very |really |so )?(?:happy|joyful|excited|glad)|^i feel great/u,es:/^(?:estoy|me siento) (?:muy )?(?:feliz|content[oa]|alegre)/u}},
  {id:'distress',p:{ru:/^(?:мне плохо|мне тяжело|мне сейчас нелегко|я чувствую себя плохо)/u,en:/^(?:i (?:am |feel )|im )(?:(?:not okay)|(?:not ok)|(?:awful)|(?:terrible))|^im having a hard time/u,es:/^(?:me siento mal|no estoy bien|lo estoy pasando mal)/u}},
  {id:'relief',p:{ru:/^(?:мне стало (?:лучше|легче)|сейчас мне (?:лучше|легче))/u,en:/^(?:i feel (?:a bit |much )?better|im feeling (?:a bit |much )?better)/u,es:/^(?:me siento mejor|ahora estoy mejor)/u}}
];
const replies = {
  sad:{ru:'Похоже, вам сейчас грустно. Необязательно сразу искать решение. Хотите рассказать, что произошло?',en:"It sounds like you're feeling sad. We don't need to solve anything now. Would you like to tell me what happened?",es:'Parece que te sientes triste. No hace falta resolverlo todo ahora. ¿Quieres contarme qué pasó?'},
  fear:{ru:'Похоже, вам сейчас страшно. Можем поговорить без спешки. Что вас больше всего пугает?',en:'It sounds frightening right now. We can talk without rushing into advice. What feels most frightening?',es:'Parece que ahora sientes miedo. Podemos hablar sin apresurarnos a dar consejos. ¿Qué te asusta más?'},
  anger:{ru:'Похоже, вы злитесь. Могу выслушать без оценок и поспешных советов. Что произошло?',en:"It sounds like you're angry. I can listen without judging or rushing into advice. What happened?",es:'Parece que sientes enfado. Puedo escuchar sin juzgar ni apresurar consejos. ¿Qué pasó?'},
  joy:{ru:'Здорово, что у вас сейчас есть это чувство. Хотите поделиться, что вас порадовало?',en:"It's lovely that you're feeling this. Would you like to share what's brought you joy?",es:'Qué bonito que sientas esa alegría. ¿Quieres contarme qué te ha alegrado?'},
  distress:{ru:'Похоже, вам сейчас нелегко. Это больше про физическое самочувствие или про переживания?',en:"It sounds like things are hard right now. Is this about how your body feels or what you're going through emotionally?",es:'Parece que lo estás pasando mal. ¿Es más por cómo te sientes físicamente o por lo emocional?'},
  relief:{ru:'Рад, что вам сейчас немного легче. Хотите рассказать, что помогло?',en:"I'm glad things feel a little easier now. Would you like to share what helped?",es:'Me alegra que ahora te sientas algo mejor. ¿Quieres contarme qué te ayudó?'},
  listen:{ru:'Могу выслушать. Расскажите столько, сколько вам комфортно — без необходимости что-то решать.',en:"I'm here to listen. Share only what feels comfortable; there's no need to solve anything now.",es:'Puedo escucharte. Cuenta solo lo que te resulte cómodo, sin necesidad de resolver nada ahora.'},
  unsure:{ru:'Можно пока не знать, чего хочется. Хотите просто рассказать, как проходит ваш день?',en:"It's okay not to know what you need yet. Would you like to tell me a little about your day?",es:'No hace falta saber todavía qué necesitas. ¿Quieres contarme un poco cómo va tu día?'},
  support:{ru:'Можем разобраться постепенно, не спеша. С чего вам хотелось бы начать рассказ?',en:'We can explore this slowly, one piece at a time. Where would you like to begin?',es:'Podemos verlo poco a poco, sin prisa. ¿Por dónde te gustaría empezar?'}
};
const listen = {ru:/^(?:хочу выговориться|просто послушай|просто выслушай|выслушай меня|мне бы выговориться)/u,en:/^(?:i (?:just )?want to (?:vent|talk|be heard)|just listen|please listen|i need someone to listen)/u,es:/^(?:quiero desahogarme|solo escuchame|necesito que me escuches)/u};
const unsure = {ru:/^(?:не знаю|пока не знаю|не понимаю пока|не уверен(?:а)?)(?:[.!? ]|$)/u,en:/^(?:i (?:dont|do not) know|not sure|no idea|im not sure)(?:[.!? ]|$)/u,es:/^(?:no se|aun no se|no estoy segur[oa])(?:[.!? ]|$)/u};
const support = {ru:/^(?:помоги разобраться|мне нужна поддержка|нужна поддержка|давай разберемся)/u,en:/^(?:help me understand|i need support|can you help me figure it out)/u,es:/^(?:ayudame a entender|necesito apoyo|me ayudas a comprender)/u};
function ownFeeling(text){for(const row of feelings)for(const lang of locales)if(row.p[lang].test(text))return {id:row.id,locale:lang};return null;}
function lastFeeling(history){
  if(!Array.isArray(history))return null;
  const user=history.slice(-4).reverse().find(t=>t?.role==='user'&&typeof t.text==='string');
  if(!user||user.text.length>3000)return null;
  const text=normalize(user.text);
  return danger.test(text)||direct.test(text)?null:ownFeeling(text);
}
/** Side-effect-free reply; no automatic recommendation or clinical conclusion. */
export function planEmotionalReaction({message='',locale='en',history=[],safety={status:'unknown'}}={}){
  if(safety?.status!=='clear'||typeof message!=='string'||!message.trim()||message.length>3000)return null;
  const text=normalize(message);
  if(danger.test(text)||direct.test(text))return null;
  const current=ownFeeling(text);
  if(current)return {id:'emotion_'+current.id,locale:current.locale,reply:replies[current.id][current.locale],memorySaved:false,actionExecuted:false};
  for(const lang of locales)if(listen[lang].test(text))return {id:'emotion_listen',locale:lang,reply:replies.listen[lang],memorySaved:false,actionExecuted:false};
  const before=lastFeeling(history);
  if(!before)return null;
  for(const lang of locales){
    if(unsure[lang].test(text))return {id:'emotion_unsure',locale:lang,reply:replies.unsure[lang],memorySaved:false,actionExecuted:false};
    if(support[lang].test(text))return {id:'emotion_support',locale:lang,reply:replies.support[lang],memorySaved:false,actionExecuted:false};
  }
  if(/^(?:угу|ага|да|ok|okay|yes|si)$/.test(text)){
    const lang=locales.includes(locale)?locale:before.locale;
    return {id:'emotion_continue',locale:lang,reply:replies.support[lang],memorySaved:false,actionExecuted:false};
  }
  return null;
}
