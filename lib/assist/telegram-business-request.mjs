import {telegramAiSecretaryQuestion} from './telegram-ai-secretary-intake.mjs';
import {telegramServiceOption} from './telegram-service-options.mjs';
// One-tap request for a real @holistichouse chat; user must still press Send.
// No user symptoms, account data, diagnostics or private text in the URL.
export const HOLISTIC_TELEGRAM_ACCOUNT = 'holistichouse';
const TITLES=Object.freeze({
 ru:{homeopathy:'Психогомеопатия',coaching:'Коучинг / Терапия',reiki:'Сеанс Рейки',constellations:'Расстановки',business:'Бизнес-коучинг',ai_secretary:'AI-секретарь для бизнеса'},
 en:{homeopathy:'Psycho-homeopathy',coaching:'Coaching / Therapy',reiki:'Reiki session',constellations:'Constellations',business:'Business coaching',ai_secretary:'AI secretary for business'},
 es:{homeopathy:'Psico-homeopatía',coaching:'Coaching / Terapia',reiki:'Sesión de Reiki',constellations:'Constelaciones',business:'Coaching de negocios',ai_secretary:'Asistente IA para negocios'},
});
// Published business-consulting page titles, not customer-submitted context.
// The public offer marker preserves the specific chosen page when a human
// Telegram Business assistant has been independently connected.
export const BUSINESS_STRATEGY_PAGE_TITLES=Object.freeze({
 en:'Business Strategy & Archetypal Coaching',
 ru:'Бизнес-консалтинг и архетипический коучинг',
 es:'Consultoría de negocios y coaching arquetípico',
});
export function telegramBusinessStrategyRequestUrl(locale){
 const title=BUSINESS_STRATEGY_PAGE_TITLES[locale];
 const canonical=TITLES[locale]?.business;
 const draft=telegramServiceRequestDraft('business',locale);
 if(!title||!canonical||!draft)return null;
 const text=draft.replace('«'+canonical+'»','«'+title+'»');
 return 'https://t.me/'+HOLISTIC_TELEGRAM_ACCOUNT+'?text='+encodeURIComponent(text);
}
export function telegramServiceRequestDraft(id,locale){
 const option=telegramServiceOption(id,locale);
 const name=option?.businessServiceKey?option.title:TITLES[locale]?.[id];if(!name)return null;
 const prefix=locale==='ru'?'Здравствуйте! Меня интересует услуга':
   locale==='es'?'¡Hola! Me interesa el servicio':'Hello! I am interested in';
 const greeting=option?.businessServiceKey
   ?(locale==='ru'?'Здравствуйте! Меня интересует':locale==='es'?'¡Hola! Me interesa':'Hello! I am interested in')
   :prefix;
 return greeting+' «'+name+'».\n\n[HH-REQ:'+id+':'+locale+']';
}
export function telegramServiceRequestUrl(id,locale){
 const msg=telegramServiceRequestDraft(id,locale);
 return msg?'https://t.me/'+HOLISTIC_TELEGRAM_ACCOUNT+'?text='+encodeURIComponent(msg):null;
}
export function parseTelegramServiceDraft(text){
 if(typeof text!=='string'||text.length>800)return null;
 const last=text.trim().split(/\r?\n/).at(-1);
 const m=/^\[HH-REQ:([a-z]+(?:_[a-z0-9-]+)*):(ru|en|es)\]$/.exec(last||'');
 if(!m)return null;
 const option=telegramServiceOption(m[1],m[2]);
 if(option?.businessServiceKey)return {service:option.businessServiceKey,locale:m[2],
   name:option.title,offerId:option.id,sourcePath:`/${m[2]}${option.sourcePath}`};
 return TITLES[m[2]]?.[m[1]]?{service:m[1],locale:m[2],name:TITLES[m[2]][m[1]]}:null;
}
// A site CTA for the published business-consulting landing has a longer
// visitor-facing title than the canonical CRM service label. Recognize only
// the exact, customer-sent first-party draft in a verified private Business
// update. No anonymous links, arbitrary questions, identity or pricing are
// treated as a confirmed order.
const BUSINESS_CONSULTING_SITE_DRAFTS=Object.freeze({
 en:'Hello! I am interested in «Business Strategy & Archetypal Coaching». Could you help me make a request?',
 ru:'Здравствуйте! Меня интересует «Бизнес-консалтинг и архетипический коучинг». Подскажите, как оформить запрос.',
 es:'¡Hola! Me interesa «Consultoría de negocios y coaching arquetípico». ¿Cómo puedo solicitarlo?',
});
export function parseTelegramPublicServiceRequest(text){
 if(typeof text!=='string'||text.length>350)return null;
 for(const [locale,draft] of Object.entries(BUSINESS_CONSULTING_SITE_DRAFTS)){
  if(text.trim()===draft)return {service:'business',locale,name:TITLES[locale].business};
 }
 const trimmed=text.trim()
 const matches=[]
 for(const locale of ['en','ru','es'])for(const id of ['personal_express_review','personal_extended_review']){
  const option=telegramServiceOption(id,locale);
  if(!option)continue
  const draft=locale==='en'
   ?`Hello! I am interested in «${option.title}». Could you help me make a request?`
   :locale==='ru'
    ?`Здравствуйте! Меня интересует «${option.title}». Подскажите, как оформить запрос.`
    :`¡Hola! Me interesa «${option.title}». ¿Cómo puedo solicitarlo?`;
  const interested=locale==='en'?/\b(?:interested in|would like|want to (?:order|request)|order)\b/i.test(trimmed)
    :locale==='ru'?/(?:интересует|хочу (?:заказать|запросить)|закажу)/iu.test(trimmed)
      :/(?:me interesa|quiero (?:solicitar|pedir)|deseo solicitar)/iu.test(trimmed)
  if(trimmed===draft||(interested&&trimmed.toLocaleLowerCase().includes(option.title.toLocaleLowerCase())))
   matches.push({service:option.businessServiceKey,locale,name:option.title,
    offerId:option.id,sourcePath:`/${locale}${option.sourcePath}`});
 }
 return matches.length===1?matches[0]:null;
}
export function telegramBusinessRequestFromUpdate(update,now=Date.now()){
 const m=update?.business_message;
 if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||!m||
    m.chat?.type!=='private'||!Number.isSafeInteger(m.chat.id)||m.chat.id<1||
    !Number.isSafeInteger(m.from?.id)||m.from.id!==m.chat.id||
    m.from.is_bot!==false||m.sender_business_bot!=null||
    !Number.isSafeInteger(m.message_id)||m.message_id<1||
    !Number.isSafeInteger(m.date))return null;
 const age=now-m.date*1000;
 if(age < -300000||age >= 23*60*60*1000)return null;
 const connectionId=m.business_connection_id;
 if(typeof connectionId!=='string'||connectionId.length<4||connectionId.length>256||
    /[\s\u0000-\u001f]/.test(connectionId))return null;
 const request=parseTelegramServiceDraft(m.text)||parseTelegramPublicServiceRequest(m.text);
 return request?{...request,connectionId,chatId:String(m.chat.id),
    messageId:m.message_id,updateId:update.update_id}:null;
}
export function isHolisticBusinessConnection(connection,expectedId,ownerId=''){
 if(!connection||connection.id!==expectedId||connection.is_enabled!==true||
    connection.rights?.can_reply!==true||connection.user?.is_bot!==false||
    !Number.isSafeInteger(connection.user?.id)||
    String(connection.user?.username||'').toLowerCase()!==HOLISTIC_TELEGRAM_ACCOUNT)
   return false;
 return !ownerId||String(connection.user.id)===String(ownerId);
}
export function telegramBusinessRequestReply(request){
 const title=TITLES[request?.locale]?.[request?.service];if(!title)return null;
 if(request.locale==='ru')return 'Здравствуйте! Я готов принять ваш запрос: «'+title+
    '». Какой формат вам удобен: онлайн, очно или заочно? Специалист сможет продолжить переписку здесь. Это ещё не подтверждённая запись или оплата.';
 if(request.locale==='es')return '¡Hola! He recibido tu interés en «'+title+
    '». ¿Prefieres online, presencial o por escrito? El profesional puede continuar aquí. Aún no es una reserva ni un pago confirmado.';
 return 'Hello! I am ready to help with «'+title+
    '». Do you prefer online, in person or written support? The practitioner can continue here. This is not a confirmed booking or payment.';
}


// Signed Telegram Business updates from the human @holistichouse account.
// Unlike a fresh service draft, subsequent messages have no [HH-REQ] code.
// Never accept the owner's own/outgoing, bot-authored, edited, group, stale,
// non-private or forwarded messages as customer confirmation.
export function telegramBusinessMessageFromUpdate(update,now=Date.now()){
 const m=update?.business_message;
 if(!Number.isSafeInteger(update?.update_id)||update.update_id<0||!m||
   m.chat?.type!=='private'||!Number.isSafeInteger(m.chat?.id)||m.chat.id<1||
   !Number.isSafeInteger(m.from?.id)||m.from.id!==m.chat.id||
   m.from.is_bot!==false||m.sender_business_bot!=null||
   m.forward_origin!=null||m.is_automatic_forward===true||
   !Number.isSafeInteger(m.message_id)||m.message_id<1||
   !Number.isSafeInteger(m.date))return null;
 const age=now-m.date*1000;
 if(age < -300000||age>=23*60*60*1000)return null;
 const connectionId=m.business_connection_id;
 if(typeof connectionId!=='string'||connectionId.length<4||connectionId.length>256||
   /[\s\u0000-\u001f]/.test(connectionId)||
   typeof m.text!=='string'||m.text.length>800)return null;
 return {connectionId,chatId:String(m.chat.id),messageId:m.message_id,
   updateId:update.update_id,text:m.text,
   request:parseTelegramServiceDraft(m.text)||parseTelegramPublicServiceRequest(m.text)};
}
// Interest in a selected review is not final CRM consent or permission
// to ask personal questions. The customer must separately type Confirm.
const REVIEW_YES=new Set(['да','да хочу','да пожалуйста','хочу','хочу заказать',
 'хочу оформить','хочу оформить заявку','yes','yes please','sure','ok','okay',
 'i want to book','i want to order','i want to request it','sí','si','sí por favor',
 'si por favor','quiero','quiero solicitarlo','quiero continuar']);
const REVIEW_NO=new Set(['нет','нет спасибо','не хочу','не интересно','не сейчас',
 'no','no thanks','not interested','not now','no gracias','ahora no','no quiero']);
export function telegramPersonalReviewReplyIntent(value){
 if(typeof value!=='string'||value.length>800)return 'clarify';
 const text=value.trim().normalize('NFKC').toLowerCase()
  .replace(/[.!?¿¡]+$/u,'').replace(/,+/gu,' ').replace(/\s+/gu,' ').trim();
 if(/услуг[уи]?\s+я?\s*ж?\s*(?:заказал[аи]?|выбрал[аи]?|отправил[аи]?)/iu.test(text)||
    /\b(?:already ordered|i (?:already )?(?:ordered|requested|chose))\b/iu.test(text)||
    /(?:ya|he)\s+(?:pedí|solicité|elegí)/iu.test(text))return 'already_selected';
 if(REVIEW_NO.has(text))return 'decline';
 if(REVIEW_YES.has(text))return 'proceed';
 return 'clarify';
}

export function telegramBusinessClientChoice(value){
 if(typeof value!=='string'||value.length>80)return null;
 const s=value.trim().toLowerCase().normalize('NFKC')
   .replace(/[.!?]+$/u,'').replace(/\s+/gu,' ');
 // Accept only explicit short, anchored format preferences; they never
 // constitute consent to submit. Confirm must be typed separately.
 const clean=s.replace(/^(?:мне удобнее|хочу|давайте|лучше|предпочитаю|можно|я бы выбрал|i prefer|i'd prefer|i would like|let's do|prefiero|quiero|mejor)\s+/u,'');
 if(['онлайн','видео','по видеосвязи','online','en línea','en linea','virtual','video','zoom','videollamada'].includes(clean))
   return {kind:'format',value:'online'};
 if(['очно','лично','вживую','in person','in-person','presencial','en persona'].includes(clean))
   return {kind:'format',value:'inperson'};
 if(['заочно','без встречи','письменно','written','asynchronous','async',
      'por escrito','sin reunión','sin reunion'].includes(clean))
   return {kind:'format',value:'async'};
 if(['подтвердить','подтверждаю','confirm','confirmar','confirmo'].includes(s))
   return {kind:'confirm'};
 if(['отправить запрос','передать запрос','send request','submit enquiry','submit request',
     'enviar solicitud','enviar la solicitud'].includes(s))return {kind:'submit'};
 if(['отмена','отменить','cancel','cancelar'].includes(s))
   return {kind:'cancel'};
 if(['/stop','stop','стоп','parar','detener','/unsubscribe'].includes(s))
   return {kind:'stop'};
 return null;
}
const FORMAT_NAMES=Object.freeze({
 ru:{online:'онлайн',inperson:'очно',async:'заочно'},
 en:{online:'online',inperson:'in person',async:'written'},
 es:{online:'en línea',inperson:'presencial',async:'por escrito'},
});
export function telegramBusinessConversationReply(type,{locale='en',service='reiki',
   format=null,referenceCode=null,questionIndex=null,offerId=null,titleLocale=locale}={}){
 const name=service==='personal_review'
  ?telegramServiceOption(offerId,titleLocale)?.title:TITLES[locale]?.[service];
 if(!name)return null;
 const formats=FORMAT_NAMES[locale];
 if(type==='ai_question'&&service==='ai_secretary'){
  const question=telegramAiSecretaryQuestion(locale,questionIndex);
  if(!question)return null;
  if(questionIndex!==0)return question;
  const intro=locale==='ru'
    ?'Здравствуйте! Я Ali, автоматический помощник Holistic House. Задам пять коротких вопросов про AI-секретаря для вашего бизнеса. Ответы сохраняются защищённо для специалиста; внешняя AI-модель их сейчас не получает. Не присылайте пароли и личные документы. Остановить: /stop.'
    :locale==='es'
      ?'Hola, soy Ali, el asistente automático de Holistic House. Haré cinco preguntas. Las respuestas quedan protegidas para el especialista, sin enviarlas a una IA externa. No compartas contraseñas ni documentos. Parar: /stop.'
      :'Hello! I am Ali, the Holistic House automated assistant. I will ask five short questions. Answers are saved securely for the specialist, without sending them to an external AI model. Do not share passwords or private documents. Stop: /stop.';
  return intro+'\n\n'+question;
 }
 if(type==='format'){
   if(locale==='ru')return 'Вижу, вас заинтересовала услуга «'+name+'» 🌿 Спасибо! Подскажите, как вам удобнее: онлайн, лично или письменно?';
   if(locale==='es')return 'Veo que te interesa «'+name+'» 🌿 ¡Gracias! ¿Te viene mejor en línea, presencial o por escrito?';
   return 'I see you’re interested in «'+name+'» 🌿 Thanks! Would online, in person or written support suit you best?';
 }
  if(type==='review_intro'&&service==='personal_review'){
  const free=telegramServiceOption(offerId,titleLocale)?.price?.kind==='free';
  if(locale==='ru')return 'Здравствуйте! Я Ali. Вижу ваш интерес к «'+name+'». '+
    (free?'Это бесплатный письменный разбор.':'Стоимость и условия специалист уточнит отдельно.')+
    ' Передать ваш запрос специалисту?';
  if(locale==='es')return 'Hola, soy Ali. Veo tu interés en «'+name+'». '+
    (free?'Es una revisión escrita gratuita.':'El profesional confirmará el precio y las condiciones.')+
    ' ¿Quieres que le envíe tu solicitud?';
  return 'Hello! I’m Ali. I see your interest in «'+name+'». '+
    (free?'This is a free written review.':'The practitioner will confirm the price and details.')+
    ' Shall I forward your request?';
 }
 if(type==='review_context'&&service==='personal_review'){
  if(locale==='ru')return 'Да, вижу ваш запрос на «'+name+'». Он ещё не передан специалисту. Передать его?';
  if(locale==='es')return 'Sí, veo tu solicitud de «'+name+'». Aún no se ha enviado al profesional. ¿Quieres que la envíe?';
  return 'Yes, I can see your request for «'+name+'». It has not been sent to the practitioner yet. Shall I send it?';
 }
 if(['review_outcome','review_action'].includes(type)&&service==='personal_review'){
  if(locale==='ru')return 'Чтобы передать запрос на «'+name+'», напишите «Отправить запрос». Перед отправкой я покажу подтверждение. Личные подробности пока не нужны.';
  if(locale==='es')return 'Para enviar la solicitud de «'+name+'», responde «Enviar solicitud». Primero te mostraré una confirmación. No hacen falta datos personales todavía.';
  return 'To forward your «'+name+'» enquiry, reply “Send request”. I’ll show a confirmation first. No personal details are needed yet.';
 }
 if(type==='confirm'&&service==='personal_review'&&format==='async'){
  const free=telegramServiceOption(offerId,titleLocale)?.price?.kind==='free';
  if(locale==='ru')return 'Подготовлен запрос на «'+name+'» — '+
    (free?'бесплатный письменный разбор.':'дистанционный разбор, стоимость согласуется отдельно.')+
    ' Отправить специалисту? Ответьте «Подтвердить» или «Отмена». Это ещё не запись и не оплата.';
  if(locale==='es')return 'Solicitud preparada para «'+name+'» — '+
    (free?'revisión escrita gratuita.':'revisión a distancia, precio por confirmar.')+
    ' ¿Enviar al profesional? Responde «Confirmar» o «Cancelar». Aún no hay reserva ni pago.';
  return 'Ready to request «'+name+'» — '+
    (free?'free written review.':'remote review; price to be confirmed.')+
    ' Send to the practitioner? Reply “Confirm” or “Cancel”. Nothing is booked or paid.';
 }
if(type==='confirm'&&format&&formats[format]){
   if(locale==='ru')return 'Отлично! «'+name+'», формат — '+formats[format]+'. Передать ваш запрос специалисту? Ответьте «Подтвердить» или «Отмена». Время и стоимость согласуем отдельно; запись и оплата пока не подтверждены.';
   if(locale==='es')return 'Perfecto: «'+name+'», formato '+formats[format]+'. ¿Envío la solicitud al profesional? Responde «Confirmar» o «Cancelar». La fecha y el precio se acordarán después; aún no hay reserva ni pago.';
   return 'Great — «'+name+'», '+formats[format]+'. Shall I send your enquiry to the practitioner? Reply «Confirm» or «Cancel». We’ll agree the time and price separately; nothing is booked or paid yet.';
 }
 if(type==='submitted'&&/^HH-[0-9A-F]{12}$/.test(String(referenceCode||''))){
   if(locale==='ru')return 'Спасибо 🌿 Ваш запрос по «'+name+'» зарегистрирован, номер '+referenceCode+'. Специалист сможет ответить здесь, чтобы согласовать детали. Это ещё не подтверждённая запись или оплата.';
   if(locale==='es')return 'Gracias 🌿 Tu solicitud sobre «'+name+'» se registró con número '+referenceCode+'. El profesional puede responderte aquí para acordar los detalles. Aún no hay reserva ni pago.';
   return 'Thank you 🌿 Your enquiry about «'+name+'» is recorded as '+referenceCode+'. The practitioner can reply here to arrange the details. This is not a confirmed booking or payment.';
 }
 if(type==='cancelled')return locale==='ru'?'Хорошо, заявку пока не отправляю. Вы сможете вернуться к услуге позже.':locale==='es'?'De acuerdo, no enviaré la solicitud. Puedes volver a elegir el servicio después.':'Of course — I won’t submit the request. You can choose the service again later.';
 if(type==='stopped')return locale==='ru'?'Остановил автоматические сообщения. Если заявка уже была отправлена, уточнить её отмену можно со специалистом.':locale==='es'?'Detuve los mensajes automáticos. Si ya enviaste la solicitud, habla con el profesional para cancelarla.':'Automatic replies are stopped. If you already submitted an enquiry, ask the practitioner directly about cancellation.';
 if(type==='unavailable')return locale==='ru'?'Пока не могу подтвердить сохранение заявки. Можно повторить «Подтвердить» — повтор не создаст второй заказ. Или дождитесь ответа специалиста.':locale==='es'?'No puedo confirmar aún el registro. Puedes repetir «Confirmar» sin crear otra solicitud, o esperar la respuesta del profesional.':'I can’t confirm the saving result yet. You can repeat «Confirm» without creating a second request, or wait for the practitioner.';
 return null;
}
export function telegramBusinessServiceTitle(service,locale,offerId=null){
 return service==='personal_review'
  ?telegramServiceOption(offerId,locale)?.title||null:TITLES[locale]?.[service]||null;
}
export function detectTelegramMessageLocale(text,fallback='en'){
 if(typeof text!=='string')return ['ru','en','es'].includes(fallback)?fallback:'en';
 if(/[\u0400-\u04ff]/u.test(text))return 'ru';
 if(/[¿¡ñáéíóúü]/iu.test(text)||/\b(?:hola|gracias|quiero|necesito|ya|servicio|situación|situacion|revisión|revision|ordené|ordene)\b/iu.test(text))return 'es';
 return 'en';
}
