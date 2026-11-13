// One-tap request for a real @holistichouse chat; user must still press Send.
// No user symptoms, account data, diagnostics or private text in the URL.
export const HOLISTIC_TELEGRAM_ACCOUNT = 'holistichouse';
const TITLES=Object.freeze({
 ru:{homeopathy:'Психогомеопатия',coaching:'Коучинг / Терапия',reiki:'Сеанс Рейки',constellations:'Расстановки',business:'Бизнес-коучинг'},
 en:{homeopathy:'Psycho-homeopathy',coaching:'Coaching / Therapy',reiki:'Reiki session',constellations:'Constellations',business:'Business coaching'},
 es:{homeopathy:'Psico-homeopatía',coaching:'Coaching / Terapia',reiki:'Sesión de Reiki',constellations:'Constelaciones',business:'Coaching de negocios'},
});
export function telegramServiceRequestDraft(id,locale){
 const name=TITLES[locale]?.[id];if(!name)return null;
 const prefix=locale==='ru'?'Здравствуйте! Меня интересует услуга':
   locale==='es'?'¡Hola! Me interesa el servicio':'Hello! I am interested in';
 return prefix+' «'+name+'».\n\n[HH-REQ:'+id+':'+locale+']';
}
export function telegramServiceRequestUrl(id,locale){
 const msg=telegramServiceRequestDraft(id,locale);
 return msg?'https://t.me/'+HOLISTIC_TELEGRAM_ACCOUNT+'?text='+encodeURIComponent(msg):null;
}
export function parseTelegramServiceDraft(text){
 if(typeof text!=='string'||text.length>800)return null;
 const last=text.trim().split(/\r?\n/).at(-1);
 const m=/^\[HH-REQ:(homeopathy|coaching|reiki|constellations|business):(ru|en|es)\]$/.exec(last||'');
 return m&&TITLES[m[2]]?.[m[1]]?{service:m[1],locale:m[2],name:TITLES[m[2]][m[1]]}:null;
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
 const request=parseTelegramServiceDraft(m.text);
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
   request:parseTelegramServiceDraft(m.text)};
}
export function telegramBusinessClientChoice(value){
 if(typeof value!=='string'||value.length>80)return null;
 const s=value.trim().toLowerCase().normalize('NFKC');
 if(['онлайн','online','en línea','en linea','virtual','video'].includes(s))
   return {kind:'format',value:'online'};
 if(['очно','лично','in person','presencial','en persona'].includes(s))
   return {kind:'format',value:'inperson'};
 if(['заочно','без встречи','письменно','written','asynchronous','async',
      'por escrito','sin reunión','sin reunion'].includes(s))
   return {kind:'format',value:'async'};
 if(['подтвердить','подтверждаю','confirm','confirmar','confirmo'].includes(s))
   return {kind:'confirm'};
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
   format=null,referenceCode=null}={}){
 const name=TITLES[locale]?.[service];
 if(!name)return null;
 const formats=FORMAT_NAMES[locale];
 if(type==='format'){
   if(locale==='ru')return 'Готов принять ваш запрос: «'+name+
     '». Как вам удобнее: Онлайн / Очно / Заочно? Ответьте одним словом.';
   if(locale==='es')return 'Tu consulta: «'+name+
     '». ¿Qué formato prefieres? En línea / Presencial / Por escrito.';
   return 'Your request: «'+name+'». Which format suits you? Online / In person / Written.';
 }
 if(type==='confirm'&&format&&formats[format]){
   if(locale==='ru')return 'Услуга: «'+name+'». Формат: '+formats[format]+
     '. Напишите «Подтвердить», чтобы отправить заявку специалисту, или «Отмена». Запись и оплата пока не подтверждены.';
   if(locale==='es')return 'Servicio: «'+name+'». Formato: '+formats[format]+
     '. Escribe «Confirmar» para enviar tu solicitud, o «Cancelar». Aún no es una reserva ni un pago.';
   return 'Service: «'+name+'». Format: '+formats[format]+
     '. Write «Confirm» to submit your enquiry or «Cancel». This is not a confirmed booking or payment.';
 }
 if(type==='submitted'&&/^HH-[0-9A-F]{12}$/.test(String(referenceCode||''))){
   if(locale==='ru')return 'Заявка '+referenceCode+' принята! Специалист сможет ответить вам прямо здесь. Это не подтверждённая запись и не оплата.';
   if(locale==='es')return 'Solicitud '+referenceCode+' recibida. El profesional puede responderte aquí. No es una reserva ni un pago confirmado.';
   return 'Enquiry '+referenceCode+' received. The practitioner can reply here. No booking or payment is confirmed.';
 }
 if(type==='cancelled')return locale==='ru'?'Заявка отменена.':locale==='es'?'Solicitud cancelada.':'Request cancelled.';
 if(type==='stopped')return locale==='ru'?'Связь остановлена. Новых сообщений от помощника не будет.':
   locale==='es'?'Contacto detenido. No recibirás más respuestas automáticas.':
   'Contact stopped. No further automated replies.';
 if(type==='unavailable')return locale==='ru'?'Не удалось зарегистрировать заявку. Напишите «Подтвердить» ещё раз или дождитесь ответа специалиста.':
   locale==='es'?'No se pudo registrar la solicitud. Prueba «Confirmar» de nuevo o espera respuesta del profesional.':
   'Enquiry was not saved. Please try «Confirm» again or wait for the practitioner.';
 return null;
}

export function telegramBusinessServiceTitle(service,locale){return TITLES[locale]?.[service]||null;}
