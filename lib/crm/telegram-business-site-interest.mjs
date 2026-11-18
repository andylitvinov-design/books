// Exact published Spiritual Reading website-to-Telegram requests only.
// No implicit CRM lead, payment, booking, marketing or client transcript storage.
const TITLES=Object.freeze({spiritual:'Spiritual Reading',tao:'Taoist Reading',tarot:'Tarot Reading'});
const TEMPLATES=Object.freeze({
 en:title=>'Hello! I am interested in «'+title+'». Could you help me make a request?',
 ru:title=>'Здравствуйте! Меня интересует «'+title+'». Подскажите, как оформить запрос.',
 es:title=>'¡Hola! Me interesa «'+title+'». ¿Cómo puedo solicitarlo?',
});
const CONTENT=Object.freeze({
 en:{
  spiritual:'Hello! I’m Ali, the Holistic House assistant 🌿 We offer a free I Ching reflection, a personal Taoist reading enquiry, and a Tarot reading enquiry. Choose the option that interests you on the service page, or tell Andrey here. This message has not created a booking or CRM request.',
  tao:'Hello! I’m Ali, the Holistic House assistant 🌿 I see your interest in Taoist Reading. A practitioner must confirm the format, availability and price. You can review the request options below, and Andrey can reply here personally. No booking has been made.',
  tarot:'Hello! I’m Ali, the Holistic House assistant 🌿 I see your interest in Tarot Reading. Please review the symbolic reading options below. A practitioner must confirm availability, format and price. Andrey can also reply here. No booking has been made.',
  button:'Spiritual Reading options',
 },
 ru:{
  spiritual:'Здравствуйте! Я Али, помощник Holistic House 🌿 У нас есть бесплатная символическая подсказка И-Цзин, запрос на чтение Дао с мастером и чтение Таро. Выберите нужный вариант по ссылке или напишите Андрею здесь. Сообщение ещё не оформило заявку или запись.',
  tao:'Здравствуйте! Я Али, помощник Holistic House 🌿 Вижу интерес к Taoist Reading. Формат, доступность и цену подтвердит мастер. Варианты запроса есть по ссылке; Андрей также может ответить здесь лично. Запись ещё не оформлена.',
  tarot:'Здравствуйте! Я Али, помощник Holistic House 🌿 Вижу интерес к Tarot Reading. По ссылке есть варианты символического чтения. Доступность, формат и цену подтвердит мастер; Андрей также может ответить здесь. Запись ещё не оформлена.',
  button:'Варианты духовного чтения',
 },
 es:{
  spiritual:'¡Hola! Soy Ali, asistente de Holistic House 🌿 Ofrecemos una reflexión simbólica gratuita del I Ching y solicitudes de lecturas de Dao o Tarot. Elige una opción en la página o pregunta a Andrey aquí. Tu mensaje todavía no creó una solicitud ni una reserva.',
  tao:'¡Hola! Soy Ali, asistente de Holistic House 🌿 Veo tu interés en Taoist Reading. El profesional debe confirmar la disponibilidad, modalidad y precio. Revisa las opciones del enlace; Andrey también puede responder aquí. No hay reserva todavía.',
  tarot:'¡Hola! Soy Ali, asistente de Holistic House 🌿 Veo tu interés en Tarot Reading. Consulta las opciones de lectura simbólica. El profesional debe confirmar la disponibilidad, modalidad y precio; Andrey también puede responder aquí. No hay reserva todavía.',
  button:'Opciones de lectura espiritual',
 },
});
export function matchTelegramPublishedSpiritualInterestDraft(input){
 if(typeof input!=='string'||input.length>300)return null;
 const text=input.trim();
 for(const [locale,template] of Object.entries(TEMPLATES))
  for(const [service,title] of Object.entries(TITLES))
   if(text===template(title))return {kind:'spiritual_interest',locale,service};
 return null;
}
export function telegramPublishedSpiritualInterestAcknowledgement(interest){
 const locale=interest?.locale,service=interest?.service;
 if(!Object.hasOwn(CONTENT,locale)||!Object.hasOwn(TITLES,service))return null;
 const copy=CONTENT[locale];
 return {handled:true,kind:'spiritual_interest',text:copy[service],buttons:[{
  text:copy.button,url:'https://holistichouse.vercel.app/'+locale+'/services/spiritual-reading',
 }]};
}
