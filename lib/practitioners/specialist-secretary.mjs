/**
 * Public specialist FAQ and booking-intake assistant for Ali.
 * Only published server-side specialist facts are evidence. No AI reply is
 * presented as the practitioner, no appointment is created, and no sensitive
 * question or booking preference is persisted or sent to a third party.
 */
import { ASSIST_OFFER_CATALOG } from '../assist/service-match.mjs'

const LOCALES = new Set(['ru', 'en', 'es'])
const clean = (value, max=240) => typeof value === 'string' ? value.trim().slice(0,max) : ''
const say = (locale, ru, en, es) => ({ru,en,es})[locale] || en
const norm = text => clean(text,1500).toLocaleLowerCase().normalize('NFKC').replaceAll('ё','е')
const ALIASES = [
  ['reiki', /рейки|reiki|energ[eí]t|энергетич/iu],
  ['homeopathy', /гомеопат|homeopath|homeopat/iu],
  ['constellation', /расстанов|constellat|constelaci/iu],
  ['business', /бизнес|карьер|business|negocio|empresa/iu],
  ['therapy', /психотерап|психолог|образ[а-я]*|гипноз|therapy|psychotherap|imagery|hipnosis|imaginaci[oó]n|terapia/iu],
]
const PRICE = /цен[ауые]|стоимост|прайс|сколько стоит|сколько за|\b(?:price|pricing|cost|fee|rate|how much|precio|cu[aá]nto|cuesta|tarifa)\b|\beur\b|€|доллар/iu
const BOOK = /запис|запись|брон|при[её]м|сесси[юя]|хочу встрет|\b(?:book|appointment|schedule|reservation|reserve|booking|cita|reservar|agendar|inscribirme)\b/iu
const TIMES = /свободн|слот|расписан|когда можно|сегодня|завтра|на неделе|\b(?:available|availability|opening|slots?|today|tomorrow|this week|disponib|horario|ma[nñ]ana)\b/iu
const FORMAT = /формат|онлайн|очно|лично|по видео|видео[зс]|\b(?:online|in.person|in person|face.to.face|format|video call|presencial|videollamada|modalidad)\b/iu
const METHODS = /метод|подход|направлен|работае[тш]|чем занима|как проход|с чем помога|\b(?:method|approach|speciali[sz]|technique|how (?:do|does|it)|work with|process|m[eé]todo|enfoque|t[eé]cnica|c[oó]mo funciona)\b/iu
const CREDENTIALS = /образован|диплом|сертифик|квалификац|опыт|сколько лет|учил|\b(?:education|qualification|credential|experience|degree|license|certif|training|experiencia|t[ií]tulo|formaci[oó]n)\b/iu
const LOCATION = /где|адрес|город|страна|торонто|\b(?:where|location|address|city|country|ubicaci[oó]n|direcci[oó]n|ciudad)\b/iu
const LANGUAGE = /язык|по.русски|по.английски|\b(?:languages?|russian|english|spanish|idioma|habla|espa[nñ]ol)\b/iu
const VIDEO = /видео|ролик|посмотреть|запис[ьи]|\b(?:video|recording|watch|v[ií]deo|grabaci[oó]n)\b/iu
const RESULTS = /гарант|результат|поможет ли|вылеч|эффективн|\b(?:guarantee|results?|cure|effective|outcome|garant[ií]a|resultado|curar)\b/iu
const STOP = /^(?:стоп|хватит|не хочу|отмена|stop|cancel|no thanks|no quiero|cancelar)[.! ]*$/iu
const URGENT = /боль в груди|не могу дышать|суицид|хочу умереть|chest pain|cannot breathe|suicid|want to die|dolor en el pecho|no puedo respirar/iu
const MINUTE = /(?:\b30\b|полчаса|полчасика|half.hour|media hora)/iu
const HOUR = /(?:\b60\b|\b1\s*(?:час|hour|hora)\b|один час|one hour|una hora)/iu

const serviceClass = value => ALIASES.find(([,regex]) => regex.test(norm(value)))?.[0] || null
const ownerPublicPrices = ASSIST_OFFER_CATALOG.therapy.priceOptions.map(({minutes,eur}) => ({minutes,price:eur,currency:'EUR'}))

/** Never allow a browser-supplied practitioner biography or price. */
export function publicSpecialistFacts({slug,locale='en',practitioner=null}={}) {
  const l = LOCALES.has(locale) ? locale : 'en'
  const isOwner = slug === 'andy-litvinov'
  if (!isOwner && (!practitioner || practitioner.slug !== slug)) return null
  const p = practitioner?.profile || {}
  const owner = {
    ru: {name:'Андрей Литвинов',role:'Психотерапия и работа с образами',bio:'Юнгианская психотерапия, направленная работа с образами, телесный подход и системные расстановки.'},
    en: {name:'Andrey Litvinov',role:'Psychotherapy & guided imagery',bio:'Jung-oriented psychotherapy, guided affective imagery, body-oriented support and systemic constellations.'},
    es: {name:'Andrey Litvinov',role:'Psicoterapia e imaginación guiada',bio:'Psicoterapia de enfoque junguiano, imaginación guiada, trabajo corporal y constelaciones sistémicas.'},
  }[l]
  const services = (Array.isArray(practitioner?.services) ? practitioner.services : [])
    .filter(row=>row?.active===true && row.status==='published')
    .slice(0,24).map(row=>({
      slug:clean(row.slug,80),title:clean(row.copy?.title,160),
      description:clean(row.copy?.shortDescription||row.copy?.description,500),
      deliveryFormat:clean(row.deliveryFormat,32),
      durationMinutes:Number.isInteger(row.durationMinutes)?row.durationMinutes:null,
      pricingMode:['free','fixed','from','contact'].includes(row.pricingMode)?row.pricingMode:'contact',
      confirmedPrice:Number.isFinite(row.confirmedPrice)?row.confirmedPrice:null,
      currency:/^[A-Z]{3}$/.test(row.currency||'')?row.currency:'',
      priceOptions:Array.isArray(row.priceOptions)?row.priceOptions.filter(option=>
        Number.isInteger(option.duration)&&Number.isFinite(option.price)&&option.price>=0)
        .slice(0,4).map(option=>({minutes:option.duration,price:option.price,currency:row.currency})):[],
    })).filter(row=>row.slug&&row.title)
  return {
    slug, locale:l, isOwner, name:clean(p.displayName||p.name|| (isOwner?owner.name:''),120),
    role:clean(p.professionalTitle||(isOwner?owner.role:''),160),
    bio:clean(p.fullBio||p.shortBio||(isOwner?owner.bio:''),1300),
    methods:(Array.isArray(p.methods)?p.methods:[]).filter(x=>typeof x==='string').slice(0,12).map(x=>clean(x,100)),
    languages:(Array.isArray(p.languages)?p.languages:[]).filter(x=>typeof x==='string').slice(0,8).map(x=>clean(x,20)),
    formats:(Array.isArray(p.formats)?p.formats:[]).filter(x=>['online','in_person'].includes(x)),
    city:clean(p.city,100),country:clean(p.country,100),
    yearsExperience:Number.isSafeInteger(p.yearsExperience)&&p.yearsExperience>=0?p.yearsExperience:null,
    credentials:(Array.isArray(practitioner?.credentials)?practitioner.credentials:[])
      .filter(c=>c.public===true&&c.verificationStatus==='verified'&&(!c.expiresOn||c.expiresOn>=new Date().toISOString().slice(0,10)))
      .slice(0,6).map(c=>clean(c.title,150)).filter(Boolean),
    services,
    ownerPersonalPrices:isOwner?ownerPublicPrices:[],
  }
}
function amount(locale,price,currency){
  if(!Number.isFinite(price)||!/^[A-Z]{3}$/.test(currency))return null
  try{return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:price%1===0?0:2}).format(price)}catch{return null}
}
function pricingFor(service,locale){
  if(!service)return null
  if(service.pricingMode==='free')return say(locale,'Бесплатно','Free','Gratis')
  const options=service.priceOptions.filter(item=>/^[A-Z]{3}$/.test(item.currency||''))
  if(options.length)return options.map(x=>x.minutes+' '+say(locale,'мин','min','min')+' — '+amount(locale,x.price,x.currency)).join('; ')
  if(['fixed','from'].includes(service.pricingMode)&&service.confirmedPrice!==null){
    const formatted=amount(locale,service.confirmedPrice,service.currency)
    if(formatted)return (service.pricingMode==='from'?say(locale,'от ','from ','desde '):'')+formatted+
      (service.durationMinutes?' / '+service.durationMinutes+' '+say(locale,'мин','min','min'):'')
  }
  return null
}
function highlightedService(text,facts,history=[]){
  const all=[text,...(Array.isArray(history)?history.slice(-5).reverse().filter(x=>x?.role==='user').map(x=>x.text):[])]
  for(const statement of all){
    const raw=norm(statement)
    if(!raw||STOP.test(raw)||/другая тема|new topic|cambiar de tema/iu.test(raw))break
    const matches = facts.services.filter(service=>{
      const title=norm(service.title)
      return title.length>=4 && (raw.includes(title)||title.split(/\W+/u).filter(w=>w.length>=5).some(w=>raw.includes(w)))
    })
    if(matches.length===1)return {kind:serviceClass(matches[0].title),service:matches[0]}
    const recognized=serviceClass(raw)
    if(recognized){
      const scoped=facts.services.filter(s=>serviceClass(s.title+' '+s.description)===recognized)
      return {kind:recognized,service:scoped.length===1?scoped[0]:null}
    }
  }
  return {kind:null,service:null}
}
function personalPrice(facts,locale,minutes=null){
  const prices=facts.ownerPersonalPrices.filter(x=>minutes===null||x.minutes===minutes)
  if(!prices.length)return null
  return prices.map(x=>x.minutes+' '+say(locale,'мин','min','min')+' — '+amount(locale,x.price,x.currency)).join('; ')
}
const result = (reply,intent,actions=['booking']) => ({reply,intent,actions,source:'public-specialist-facts',bookingConfirmed:false})

/** User history is untrusted and used for short-turn continuity ONLY. */
export function answerSpecialistQuestion({message='',history=[],facts}={}) {
  if(!facts || !LOCALES.has(facts.locale) || typeof message!=='string'||!message.trim()||message.length>1200)return null
  const l=facts.locale, q=norm(message), name=facts.name
  const context=highlightedService(message,facts,history)
  const priorBooking=(Array.isArray(history)?history.slice(-5):[]).some(t=>t?.role==='user'&&BOOK.test(norm(t.text)))
  const bookingContinuation=priorBooking&&q.length<=90&&
    (FORMAT.test(q)||MINUTE.test(q)||HOUR.test(q)||/(?:^|\s)(?:да|yes|si|sí)(?:[.!?]|$)/iu.test(q))
  if(URGENT.test(q))return result(say(l,
    'Если есть непосредственная опасность для жизни или здоровья, обратитесь в местные экстренные службы. Переписка с Ali не заменяет неотложную помощь.',
    'For an immediate health or safety emergency, contact local emergency services. Ali is not emergency care.',
    'Si hay una emergencia médica o de seguridad, contacta con los servicios locales de emergencia. Ali no sustituye la atención urgente.'),'safety',[])
  if(STOP.test(q))return result(say(l,'Хорошо, остановимся. Если появятся вопросы о специалисте или записи, я рядом.',
    'Of course. I will stop here. You can ask about the specialist or booking whenever you like.',
    'De acuerdo, paramos aquí. Puedes volver a preguntar por el profesional o la reserva cuando quieras.'),'stop',[])
  if(PRICE.test(q)||((MINUTE.test(q)||HOUR.test(q))&&context.kind)){
    const period=MINUTE.test(q)?30:HOUR.test(q)?60:null
    if(context.service){
      const price=pricingFor(context.service,l)
      if(price)return result(say(l,`Для «${context.service.title}» опубликована стоимость: ${price}. Время и окончательные условия специалист подтвердит при обращении.`,
        `The published price for “${context.service.title}” is ${price}. The specialist confirms the appointment and final terms.`,
        `El precio publicado de «${context.service.title}» es ${price}. El profesional confirma la cita y las condiciones.`),'price')
      return result(say(l,`Для «${context.service.title}» подтверждённой цены нет. Могу помочь отправить запрос специалисту — он уточнит стоимость и формат.`,
        `There is no verified public price for “${context.service.title}”. I can help you ask the specialist about the rate and format.`,
        `No hay un precio público confirmado para «${context.service.title}». Puedo ayudarte a consultar la tarifa y modalidad.`),'price_unknown')
    }
    if(context.kind==='reiki'||context.kind==='homeopathy')return result(say(l,
      'Для этого направления не буду подставлять цену психотерапии. Стоимость нужно проверить в опубликованной услуге или уточнить у специалиста.',
      'I won’t substitute the psychotherapy price for this service. Please check its published listing or ask the specialist.',
      'No aplicaré la tarifa de psicoterapia a este servicio. Consulta su ficha o pregunta al profesional.'),'price_unknown')
    const personal=facts.isOwner&&(context.kind===null||['therapy','constellation','business'].includes(context.kind))
      ?personalPrice(facts,l,period):null
    if(personal)return result(say(l,`Для личных консультаций ${name} опубликованы тарифы: ${personal}. Другие методы могут стоить иначе; точное время и условия подтверждаются при записи.`,
      `Published personal consultation rates for ${name}: ${personal}. Other services may differ; timing and terms require confirmation.`,
      `Tarifas publicadas de consultas personales de ${name}: ${personal}. Otros servicios pueden variar; el horario se confirma.`),'price')
    const offers=facts.services.map(s=>({title:s.title,price:pricingFor(s,l)})).filter(x=>x.price).slice(0,3)
    if(offers.length)return result(say(l,'Опубликованные тарифы: ','Published rates: ','Tarifas publicadas: ')+offers.map(x=>x.title+': '+x.price).join('; ')+'. '+say(l,'Какую услугу вы рассматриваете?','Which service are you considering?','¿Qué servicio te interesa?'),'price')
    return result(say(l,'Точного опубликованного тарифа по вашему запросу не нашёл. Назовите услугу или отправьте вопрос специалисту.',
      'I couldn’t verify a price for this question. Tell me which service you mean, or ask the specialist.',
      'No encuentro una tarifa confirmada. Dime qué servicio te interesa o pregunta al profesional.'),'price_unknown')
  }
  if(BOOK.test(q)||TIMES.test(q)||bookingContinuation){
    const turns=[...(Array.isArray(history)?history:[]).filter(t=>t?.role==='user').map(t=>norm(t.text)),q].slice(-6).join(' ')
    const format=/(?:онлайн|по видеосвязи|online|videollamada)/iu.test(turns)?'online':
      /(?:очно|в кабинете|in.person|presencial)/iu.test(turns)?'in_person':null
    const period=MINUTE.test(turns)?30:HOUR.test(turns)?60:null
    if(TIMES.test(q))return result(say(l,'Я не вижу календарь специалиста и не могу подтвердить свободный слот. Укажите удобные день и время в заявке; специалист подтвердит возможность.',
      'I cannot see the specialist’s live calendar or confirm a free slot. Include your preferred date and time in a request; the specialist will confirm.',
      'No tengo acceso a la agenda en tiempo real ni puedo confirmar una hora libre. Indica tus preferencias en la solicitud; el profesional confirmará.'),'availability_unknown')
    if(!format)return result(say(l,'Помогу подготовить заявку на консультацию. Вам удобнее онлайн или очно? Запись пока не оформлена.',
      'I can help you prepare a consultation request. Would you prefer online or in person? Nothing has been booked yet.',
      'Puedo ayudarte a preparar la solicitud. ¿Prefieres online o presencial? Todavía no hay reserva.'),'booking_format')
    if(facts.isOwner&&!period)return result(say(l,'Какую продолжительность предпочитаете: 30 или 60 минут? Запись и стоимость подтверждает специалист.',
      'Would you prefer 30 or 60 minutes? The specialist will confirm availability and the final fee.',
      '¿Prefieres 30 o 60 minutos? El profesional confirmará disponibilidad y tarifa.'),'booking_duration')
    return result(say(l,'Отлично. Теперь укажите желаемые день и время в форме по кнопке «Записаться» ниже либо отправьте запрос специалисту через мессенджер. Это запрос, а не подтверждённая запись.',
      'Great. Use the booking button below to send your preferred date and time, or contact the specialist via messenger. This is a request, not a confirmed appointment.',
      'Perfecto. Usa el botón de reserva de abajo para indicar día y hora, o escribe al profesional. Es una solicitud, no una cita confirmada.'),'booking_handoff')
  }
  if(CREDENTIALS.test(q)){
    const parts=[]
    if(facts.yearsExperience!==null)parts.push(say(l,'Указанный опыт: ','Published experience: ','Experiencia publicada: ')+facts.yearsExperience+say(l,' лет.',' years.',' años.'))
    if(facts.credentials.length)parts.push(say(l,'Подтверждённые публичные квалификации: ','Verified public credentials: ','Credenciales públicas verificadas: ')+facts.credentials.join(', ')+'.')
    if(parts.length)return result(parts.join(' '),'credentials')
    return result(say(l,'В опубликованном профиле нет проверенных сведений о дипломах и стаже. Могу помочь запросить их у специалиста.',
      'No verified qualifications or experience figures are listed in the public profile. I can help you ask the specialist.',
      'No aparecen títulos ni años de experiencia verificados en el perfil público. Puedo ayudarte a preguntar.'),'credentials_unknown')
  }
  if(METHODS.test(q)){
    const source=[facts.bio,...facts.methods].filter(Boolean).join(' · ')
    return result(source?say(l,`В профиле ${name} указано: ${source}. Можно посмотреть видео знакомства выше.`,
      `${name}’s published profile says: ${source}. You can also watch the introduction video above.`,
      `El perfil publicado de ${name} dice: ${source}. También puedes ver el vídeo de presentación.`):
      say(l,'Подробное описание подхода ещё не опубликовано. Можно спросить специалиста напрямую.',
        'The approach is not described in the public profile yet. You can ask the specialist directly.',
        'El enfoque aún no está descrito públicamente. Puedes preguntar al profesional.'),'methods')
  }
  if(FORMAT.test(q))return result(facts.formats.length?
    say(l,'В профиле опубликованы форматы: ','Published formats: ','Modalidades publicadas: ')+facts.formats.map(f=>f==='online'?say(l,'онлайн','online','online'):say(l,'очно','in person','presencial')).join(', ')+'.':
    say(l,'Формат конкретной консультации лучше уточнить перед записью; онлайн или очная встреча не гарантированы.',
      'Please confirm the format with the specialist before booking; online or in-person availability is not guaranteed.',
      'Confirma la modalidad con el profesional antes de reservar; no se garantiza disponibilidad.'),'format')
  if(LOCATION.test(q))return result(facts.city||facts.country?
    say(l,'В публичном профиле указано местоположение: ','Published profile location: ','Ubicación del perfil público: ')+[facts.city,facts.country].filter(Boolean).join(', ')+'.':
    say(l,'Точный адрес не опубликован. Специалист уточнит место и формат встречи при согласовании.',
      'No exact address is published. The specialist can confirm the place and format when arranging a session.',
      'No hay dirección pública exacta. El profesional puede confirmar el lugar al concertar la sesión.'),'location')
  if(LANGUAGE.test(q))return result(facts.languages.length?
    say(l,'В профиле указаны языки: ','Published languages: ','Idiomas publicados: ')+facts.languages.join(', ')+'.':
    say(l,'Язык консультации нужно уточнить у специалиста перед записью.',
      'Please confirm the consultation language with the specialist before booking.',
      'Confirma el idioma de la consulta con el profesional antes de reservar.'),'languages')
  if(VIDEO.test(q))return result(say(l,'Выше есть опубликованные видеоматериалы специалиста. Они записаны заранее и не являются живым видеозвонком.',
    'You can watch the specialist’s published videos above. They are recordings, not a live video call.',
    'Puedes ver arriba los vídeos publicados. Son grabaciones, no una videollamada en directo.'),'video',[])
  if(RESULTS.test(q))return result(say(l,'Результат индивидуальной работы нельзя гарантировать. Уместно обсудить цель, подход, ограничения и ожидаемый формат со специалистом до встречи. Ali не ставит диагнозы.',
    'Individual outcomes cannot be guaranteed. Ask about goals, methods, limitations and the format before a session. Ali does not diagnose.',
    'No se pueden garantizar resultados. Conviene preguntar sobre objetivos, métodos, límites y modalidad. Ali no diagnostica.'),'limitations')
  if(/привет|здравств|добрый|\b(?:hi|hello|hey|hola|buenas)\b/iu.test(q))return result(say(l,`Здравствуйте! Я Ali, ИИ-секретарь ${name}. Могу рассказать об услугах и опубликованных ценах, помочь с вопросами и подготовить заявку. Что вас интересует?`,
    `Hello! I’m Ali, ${name}’s AI secretary. I can explain the services, verified prices and booking steps. What would you like to know?`,
    `¡Hola! Soy Ali, secretario virtual de ${name}. Puedo explicar servicios, tarifas verificadas y cómo solicitar una cita. ¿Qué te interesa?`),'greeting')
  return result(say(l,`Я Ali, ИИ-секретарь ${name}. По этому вопросу в опубликованных сведениях нет надёжного ответа, поэтому не буду додумывать. Могу помочь уточнить его у специалиста, либо рассказать о методах, стоимости и записи.`,
    `I’m Ali, ${name}’s AI secretary. I don’t have a verified answer in the published information and won’t invent one. I can help you ask the specialist or explain services, prices and booking.`,
    `Soy Ali, secretario virtual de ${name}. No encuentro una respuesta verificada en la información publicada y no voy a inventarla. Puedo ayudarte a preguntar al profesional o explicar servicios y reservas.`),'unverified')
}
