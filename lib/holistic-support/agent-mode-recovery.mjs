/**
 * First-party, editorial continuity for Ali while account or optional AI
 * services are unavailable. This does not execute protected actions, access
 * private records, infer diagnoses or use an external inference provider.
 */
export function shouldRetryNativeAgentMode({mode,status,errorCode}={}){
  return (mode==="device"||mode==="owned")&&status===503&&errorCode==="AGENT_DISABLED";
}

/** One allowed downgrade: remove optional inference and personal selectors. */
export function nativeAgentFallbackPayload(body){
  if(!body||typeof body!=="object"||!["device","owned"].includes(body.mode))return null;
  const next={...body,mode:"rules",ownedInferenceConsent:false,
    usePrivateProfile:false,usePrivateHistory:false,useAgentMemory:false,chosenAxes:[]};
  delete next.nativeSession;
  return next;
}
const normalized=(value)=>typeof value==="string"
  ?value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu," ").trim():"";
export function aliNeedsVerifiedAction(message){
  return /(?:запис|заказ|оформ|оплат|плат[её]ж|купить|брониров|подтвердите запись|book|reserv|payment|pay for|place an order|checkout|purchase|comprar|reservar|reserva|pagar|pedido|contratar)/iu.test(normalized(message));
}
const wording={
  ru:{
    talk:"Конечно, поговорим. Что вам сейчас хочется обсудить?",
    greeting:"Здравствуйте! Можем продолжить разговор. Что у вас на уме?",
    open:"Давайте разберёмся вместе, без спешки. Что для вас сейчас важнее всего?",
    continue:"Мы можем продолжить с того места, где остановились. Что хочется уточнить или обсудить дальше?",
    feeling:"Если сейчас непросто, можем поговорить в удобном для вас темпе. Что беспокоит вас больше всего?",
    agree:"Хорошо. Хотите подробнее рассказать о ситуации или сначала найти небольшой следующий шаг?",
    thanks:"Пожалуйста. Если захотите продолжить разговор, просто напишите.",
    bye:"Хорошо, остановимся здесь. Если захотите вернуться к разговору, напишите.",
    price:"Я помогу уточнить условия, но не хочу угадывать цену без проверки каталога. О какой услуге вы спрашиваете?",
    action:"Я могу помочь разобраться с запросом, но сейчас не могу подтвердить запись, заказ или оплату. Что именно вы хотите оформить?",
    pending:"Я вижу ваш выбор, но пока не могу подтвердить его на сервере. Ничего не оформлено этим ответом. Можем пока обсудить следующий шаг?",
    access:"Можем продолжить разговор здесь. Для личных данных нужен защищённый вход; сейчас я их не просматривал и не изменял. Что хотите обсудить?",
  },
  en:{
    talk:"Of course, we can talk. What's on your mind?",
    greeting:"Hello! We can keep talking. What's on your mind?",
    open:"We can work through this at your pace. What matters most to you right now?",
    continue:"We can pick up where we left off. What would you like to explore next?",
    feeling:"If things feel difficult, we can talk at your pace. What feels most important to share?",
    agree:"All right. Would you rather talk more about the situation or find one small next step?",
    thanks:"You're welcome. You can continue whenever you'd like.",
    bye:"All right, we'll stop here. You can return to the conversation whenever you like.",
    price:"I can help clarify the options, but I won't guess at a price without checking the catalogue. Which service are you asking about?",
    action:"I can help clarify your request, but I can't confirm a booking, order or payment right now. What would you like to arrange?",
    pending:"I see your choice, but I can't confirm it with the server right now. Nothing was booked or ordered by this reply. Shall we discuss the next step?",
    access:"We can still talk here. Your personal records require secure sign-in; I haven't read or changed them. What would you like to discuss?",
  },
  es:{
    talk:"Por supuesto, podemos hablar. ¿Qué te gustaría conversar?",
    greeting:"¡Hola! Podemos seguir hablando. ¿Qué tienes en mente?",
    open:"Podemos verlo con calma, a tu ritmo. ¿Qué es lo más importante para ti ahora?",
    continue:"Podemos retomar la conversación. ¿Qué te gustaría explorar ahora?",
    feeling:"Si estás pasando por un momento difícil, podemos hablar a tu ritmo. ¿Qué te gustaría compartir primero?",
    agree:"De acuerdo. ¿Prefieres contarme más sobre la situación o buscar un pequeño siguiente paso?",
    thanks:"De nada. Puedes continuar cuando quieras.",
    bye:"De acuerdo, lo dejamos aquí. Puedes volver a conversar cuando quieras.",
    price:"Puedo ayudarte a aclarar las opciones, pero no voy a inventar un precio sin consultar el catálogo. ¿De qué servicio hablas?",
    action:"Puedo ayudarte a aclarar la solicitud, pero ahora no puedo confirmar una cita, pedido o pago. ¿Qué te gustaría gestionar?",
    pending:"Entiendo tu elección, pero ahora no puedo confirmarla en el servidor. Esta respuesta no ha realizado ninguna reserva ni pedido. ¿Hablamos del siguiente paso?",
    access:"Podemos seguir hablando aquí. Tus datos personales requieren acceso seguro; no los he consultado ni modificado. ¿Qué te gustaría comentar?",
  }
};
/** @param {{message?:string,locale?:string,history?:Array<{role:string,text:string}>,actionPending?:boolean,requiresSignIn?:boolean}} [options] */
export function aliGentleContinuity({message="",locale="en",history=[],actionPending=false,requiresSignIn=false}={}){
  const lang=Object.hasOwn(wording,locale)?locale:"en";
  const c=wording[lang],text=normalized(message);
  if(actionPending)return c.pending;
  const privateQuestion=/(?:мой\s+(?:кабинет|заказ|отч[её]т|профиль)|мо[иё] (?:тесты|данные)|личн\w*\s+данн|my\s+(?:report|account|profile|order)|personal\s+(?:data|record)|mi\s+(?:cuenta|perfil|pedido|informe)|mis\s+datos)/iu.test(text);
  if(requiresSignIn&&privateQuestion)return c.access;
  if(aliNeedsVerifiedAction(text))return c.action;
  if(/(?:сколько\s+сто|стоимост|цен[аыуе]|тариф|price|how much|cost|precio|cu[aá]nto cuesta|tarifa)/iu.test(text))return c.price;
  if(/(?:поговор|побесед|общаться|давай пообщаемся|let.s talk|want to talk|can we chat|just chat|hablar|conversar|charlar)/iu.test(text))return c.talk;
  if(/^(?:привет|приветик|здравствуй(?:те)?|добрый (?:день|вечер)|доброе утро|hello|hi|hey|hola|buenas)(?:[.!?\s]*)$/iu.test(text))return c.greeting;
  if(/^(?:спасибо|благодарю|thanks|thank you|gracias)(?:[.!?\s]*)$/iu.test(text))return c.thanks;
  if(/^(?:пока|до свидания|bye|goodbye|adios|adi[oó]s|hasta luego)(?:[.!?\s]*)$/iu.test(text))return c.bye;
  if(/(?:мне (?:грустно|тревожно|страшно|тяжело|одиноко|плохо)|я (?:переживаю|боюсь|расстроен)|i feel (?:sad|anxious|alone|upset)|i'm (?:sad|worried|upset)|me siento (?:triste|solo|ansioso|ansiosa)|estoy (?:triste|preocupado|preocupada))/iu.test(text))return c.feeling;
  if(/^(?:да|нет|ага|угу|ок|окей|хорошо|понятно|yes|no|okay|ok|sure|si|sí|vale|claro)[.!?\s]*$/iu.test(text))return c.agree;
  if(Array.isArray(history)&&history.some(turn=>turn?.role==="assistant"&&typeof turn.text==="string"&&turn.text.trim()))return c.continue;
  return c.open;
}
