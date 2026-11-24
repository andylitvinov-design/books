// First-contact Business menu: fixed public information, no booking or consent.
const COPY={
 en:{hello:"Welcome to Holistic House! 🌿\nHi! I'm Ali, your personal assistant.\nWhat would you like to explore?",
  labels:["🎁 Free services & courses","✨ Reiki & energy practices","🌱 Personal support","📅 Events & workshops","👤 Talk to a specialist"],
  free:["You can start with these free options. Which would you like to explore?","Free situation review","Free self-checks","Free Reiki Practitioner Course"],
  reiki:["Would you like to learn Reiki or receive energy support? You can start with our free course or introduction.","Free Reiki Practitioner Course","Free Tantra Reiki introduction","Remote Reiki session"],
  support:["Would you like a free situation review, self-checks or information about personal support?","Free situation review","Free self-checks","Personal support"],
  events:["Are you interested in workshops, group practices or training? Which city or online format interests you?"],
  specialist:["Please write your question here for the specialist, or explore our practitioners. A response time is not yet confirmed.","Meet the practitioners"]},
 ru:{hello:"Добро пожаловать в Holistic House! 🌿\nЯ Ali, ваш персональный помощник.\nЧто вас интересует?",
  labels:["🎁 Бесплатные услуги и курсы","✨ Рейки и энергопрактики","🌱 Личная поддержка","📅 События и семинары","👤 Связаться со специалистом"],
  free:["Начать можно с этих бесплатных возможностей. Что вас интересует?","Бесплатный разбор ситуации","Бесплатные тесты","Бесплатный курс Рейки"],
  reiki:["Хотите изучать Рейки или получить энергетическую поддержку? Можно начать с бесплатного курса или введения.","Бесплатный курс Рейки","Бесплатное введение в Тантра Рейки","Дистанционный сеанс Рейки"],
  support:["Вас интересует бесплатный разбор, тесты или информация о личной поддержке?","Бесплатный разбор ситуации","Бесплатные тесты","Личная поддержка"],
  events:["Вас интересуют семинары, групповые практики или обучение? В каком городе или онлайн?"],
  specialist:["Напишите здесь ваш вопрос специалисту или познакомьтесь с нашими мастерами. Срок ответа пока не подтверждён.","Наши специалисты"]},
 es:{hello:"¡Bienvenido a Holistic House! 🌿\nSoy Ali, tu asistente personal.\n¿Qué te interesa explorar?",
  labels:["🎁 Servicios y cursos gratis","✨ Reiki y prácticas energéticas","🌱 Apoyo personal","📅 Eventos y talleres","👤 Hablar con un especialista"],
  free:["Puedes empezar con estas opciones gratuitas. ¿Cuál te interesa?","Revisión gratuita","Pruebas gratuitas","Curso gratuito de Reiki"],
  reiki:["¿Te interesa aprender Reiki o recibir apoyo energético? Puedes empezar con el curso o la introducción gratuitos.","Curso gratuito de Reiki","Introducción gratuita a Tantra Reiki","Sesión de Reiki a distancia"],
  support:["¿Prefieres una revisión gratuita, pruebas o información sobre apoyo personal?","Revisión gratuita","Pruebas gratuitas","Apoyo personal"],
  events:["¿Te interesan talleres, prácticas de grupo o formación? ¿En qué ciudad o en línea?"],
  specialist:["Escribe aquí tu pregunta para el especialista o conoce a nuestros profesionales. No hay un plazo de respuesta confirmado.","Nuestros profesionales"]},
};
const TOPICS=['free','reiki','support','events','specialist'];
const LINKS={
 free:['services/free-situation-review','tests','academy/principles-of-energywork'],
 reiki:['academy/principles-of-energywork','academy/reiki/tantra-reiki/free-initiation','services/remote-energy-support'],
 support:['services/free-situation-review','tests','services'],
 events:[],specialist:['masters'],
};
export function telegramBusinessWelcomeMenu(locale='en'){
 const l=Object.hasOwn(COPY,locale)?locale:'en';
 const copy=COPY[l];
 return {locale:l,text:copy.hello,buttons:TOPICS.map((topic,i)=>({text:copy.labels[i],callback_data:'hhbw1:'+l+':'+topic}))};
}
export function telegramBusinessWelcomeTopic(locale,topic){
 if(!Object.hasOwn(COPY,locale)||!TOPICS.includes(topic))return null;
 const [text,...labels]=COPY[locale][topic];
 return {text,buttons:LINKS[topic].map((path,i)=>({text:labels[i],url:'https://holistichouse.vercel.app/'+locale+'/'+path}))};
}
// Only signed updates from the original private Business recipient, containing
// the exact welcome card created by our own CRM bot. Never synthesize text events.
export function telegramBusinessWelcomeClick(update,botId,now=Date.now()){
 const q=update?.callback_query,m=q?.message;
 const data=/^hhbw1:(en|ru|es):(free|reiki|support|events|specialist)$/.exec(String(q?.data||''));
 if(!data||!botId||!Number.isSafeInteger(update?.update_id)||update.update_id<0||
    !/^[A-Za-z0-9_-]{4,128}$/.test(String(q?.id||''))||
    m?.chat?.type!=='private'||!Number.isSafeInteger(m.chat.id)||m.chat.id<1||
    q.from?.is_bot!==false||q.from.id!==m.chat.id||
    m.sender_business_bot?.is_bot!==true||String(m.sender_business_bot.id)!==String(botId)||
    m.forward_origin!=null||m.is_automatic_forward===true||
    !Number.isSafeInteger(m.message_id)||m.message_id<1||
    !Number.isSafeInteger(m.date)||now-m.date*1000 < -300000||now-m.date*1000>=23*60*60*1000||
    typeof m.business_connection_id!=='string'||m.business_connection_id.length<4||
    m.business_connection_id.length>256||/[\s\u0000-\u001f]/.test(m.business_connection_id)||
    m.text!==telegramBusinessWelcomeMenu(data[1]).text)return null;
 return {connectionId:m.business_connection_id,chatId:String(m.chat.id),messageId:m.message_id,
  updateId:update.update_id,callbackId:q.id,locale:data[1],topic:data[2],text:''};
}
