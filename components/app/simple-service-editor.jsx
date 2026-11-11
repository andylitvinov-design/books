'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, ChevronDown, Clock3, Globe2, Image as ImageIcon, Leaf, MapPin, Send, Save } from 'lucide-react'
import PracticePhotoUpload from './practice-photo-upload'
import PracticeVideoField from './practice-video-field'
import { getServiceEditorIssue, servicePreviewPrice } from '@/lib/practitioners/service-editor-steps.mjs'
import { reikiOfferPricing } from '@/lib/practitioners/reiki-offer.mjs'
import styles from './simple-service-editor.module.css'

const AREAS = {
  emotional_psychological: ['Emotional wellbeing', 'Эмоциональное благополучие', 'Bienestar emocional'],
  body_somatic: ['Body & somatic', 'Тело и соматика', 'Cuerpo y somática'],
  relationships: ['Relationships', 'Отношения', 'Relaciones'],
  homeopathy_holistic: ['Holistic health', 'Холистическое здоровье', 'Salud holística'],
  energy_spiritual: ['Energy & spiritual', 'Энергетические практики', 'Energía y espiritualidad'],
  career_purpose: ['Career & purpose', 'Карьера и предназначение', 'Vocación y carrera'],
  business_money: ['Business & money', 'Бизнес и деньги', 'Negocios y dinero'],
  personal_development: ['Personal growth', 'Личностное развитие', 'Crecimiento personal'],
}
const GOALS = [
  ['confidence', 'Confidence', 'Уверенность', 'Confianza'],
  ['relationships', 'Relationships', 'Отношения', 'Relaciones'],
  ['relaxation', 'Relaxation', 'Расслабление', 'Relajación'],
  ['learning', 'Learning', 'Обучение', 'Aprendizaje'],
  ['clarity', 'Clarity', 'Ясность', 'Claridad'],
  ['purpose', 'Purpose', 'Предназначение', 'Propósito'],
  ['energy', 'Energy', 'Энергия', 'Energía'],
  ['self_awareness', 'Self-awareness', 'Самопознание', 'Autoconocimiento'],
]
const TEXT = {
  en: {
    newTitle: 'Add your service', editTitle: 'Edit your service', intro: 'Just the essentials. You can add details later.',
    title: 'Service name', titleExample: 'e.g. Personal Reiki session', short: 'What will the client receive?',
    shortExample: 'In 1–2 sentences, explain how the session works and who it helps.',
    language: 'Description language', topic: 'Topic', format: 'Format', online: 'Online',
    inPerson: 'In person', hybrid: 'Both', location: 'City / location', locationExample: 'e.g. Toronto',
    price: 'Price', free: 'Free', fixed: 'Set a price', from: 'Starting from', contact: 'On request',
    amount: 'Amount', duration: 'Duration (minutes)', durationExample: 'e.g. 60',
    more: 'More details (optional)', type: 'Service type', languages: 'Languages you offer',
    languagesExample: 'e.g. en, ru', methods: 'Methods (comma-separated)', benefits: 'What clients may gain (one per line)',
    goals: 'Client goals', faq: 'FAQ (one per line)', whatsapp: 'WhatsApp', telegram: 'Telegram',
    detailed: 'Long description', draft: 'Save draft', submit: 'Save & submit for review',
    update: 'Save changes & submit', pause: 'Pause service', review: 'Submitted services go live only after moderation.',
    inReview: 'Under review', helper: 'One language is enough to get started. Switch languages above to add translations.',
    offering: [['session','Personal session'],['intro','Intro meeting'],['assessment','Assessment / review'],
      ['group','Group session'],['workshop','Workshop'],['course','Course'],['package','Session package'],['event','Event']],
  },
  ru: {
    newTitle: 'Добавить услугу', editTitle: 'Изменить услугу', intro: 'Только главное. Остальное можно добавить позже.',
    title: 'Название услуги', titleExample: 'Например, личный сеанс Рейки', short: 'Что получит клиент?',
    shortExample: 'В 1–2 предложениях расскажите, как проходит услуга и кому она подходит.',
    language: 'Язык описания', topic: 'Направление', format: 'Формат', online: 'Онлайн',
    inPerson: 'Лично', hybrid: 'Оба', location: 'Город / место', locationExample: 'Например, Торонто',
    price: 'Стоимость', free: 'Бесплатно', fixed: 'Указать цену', from: 'Цена от', contact: 'По запросу',
    amount: 'Сумма', duration: 'Длительность (мин)', durationExample: 'Например, 60',
    more: 'Больше деталей (необязательно)', type: 'Тип услуги', languages: 'Языки проведения',
    languagesExample: 'Например, ru, en', methods: 'Методы (через запятую)', benefits: 'Возможные результаты (по строкам)',
    goals: 'Цели клиента', faq: 'Вопросы и ответы (по строкам)', whatsapp: 'WhatsApp', telegram: 'Telegram',
    detailed: 'Подробное описание', draft: 'Сохранить черновик', submit: 'Сохранить и отправить на проверку',
    update: 'Сохранить и отправить изменения', pause: 'Приостановить услугу', review: 'Публикация — только после модерации.',
    inReview: 'На проверке', helper: 'Для начала достаточно одного языка. Переключайте язык выше, чтобы добавить перевод.',
    offering: [['session','Личная сессия'],['intro','Вводная встреча'],['assessment','Диагностика / обзор'],
      ['group','Групповая сессия'],['workshop','Мастер-класс'],['course','Курс'],['package','Пакет сессий'],['event','Мероприятие']],
  },
  es: {
    newTitle: 'Añadir servicio', editTitle: 'Editar servicio', intro: 'Solo lo esencial. Puedes completar los detalles después.',
    title: 'Nombre del servicio', titleExample: 'Por ejemplo, sesión personal de Reiki', short: '¿Qué recibirá el cliente?',
    shortExample: 'Explica en 1–2 frases cómo funciona el servicio y para quién es.',
    language: 'Idioma del texto', topic: 'Área', format: 'Formato', online: 'En línea',
    inPerson: 'Presencial', hybrid: 'Ambos', location: 'Ciudad / lugar', locationExample: 'Por ejemplo, Toronto',
    price: 'Precio', free: 'Gratis', fixed: 'Precio fijo', from: 'Desde', contact: 'A consultar',
    amount: 'Importe', duration: 'Duración (min)', durationExample: 'Por ejemplo, 60',
    more: 'Más detalles (opcional)', type: 'Tipo de servicio', languages: 'Idiomas disponibles',
    languagesExample: 'Por ejemplo, es, en', methods: 'Métodos (separados por comas)', benefits: 'Posibles beneficios (uno por línea)',
    goals: 'Objetivos del cliente', faq: 'Preguntas frecuentes (una por línea)', whatsapp: 'WhatsApp', telegram: 'Telegram',
    detailed: 'Descripción completa', draft: 'Guardar borrador', submit: 'Guardar y enviar a revisión',
    update: 'Guardar cambios y enviar', pause: 'Pausar servicio', review: 'Los servicios se publican tras la revisión.',
    inReview: 'En revisión', helper: 'Basta con un idioma para empezar. Cambia el idioma arriba para añadir traducciones.',
    offering: [['session','Sesión personal'],['intro','Reunión inicial'],['assessment','Evaluación'],
      ['group','Sesión grupal'],['workshop','Taller'],['course','Curso'],['package','Paquete de sesiones'],['event','Evento']],
  },
}
// Presentation-only copy; service ownership, prices and publication rules stay on the server.
Object.assign(TEXT.en,{
 stageIntro:'1 · Presentation',stageOffer:'2 · Format & price',stageDetails:'3 · Details',
 stages:'Service editor screens',present:'What the client will see',photo:'Cover photo',photoAdd:'Add / change photos',
 photoEmpty:'Your service photo',photoTip:'An actual uploaded photo is shown to customers after review.',
 badge:'DRAFT PREVIEW',previewCta:'Request this service',previewCtaNote:'The real request button appears only after moderation; this preview does not create a lead.',
 introTip:'Edit this card directly. Start with one clear service and its value for the client.',
 fieldTitle:'What is your service called?',fieldShort:'One brief promise / format description',
 offerHeading:'How does your service work?',offerTip:'Choose the format, place, duration and a confirmed price if relevant.',
 durationNote:'Optional · 5–1440 minutes',fromPreview:'Client-facing price preview',whatNext:'Next screen',
 previous:'Previous screen',next:'Continue',stepCount:'Screen',of:'of',detailsHeading:'Complete your offer',
 detailsTip:'Optional video, goals and extra information make the public page more useful.',
 addLanguages:'Languages and professional details',photoOpen:'Edit photos',photoClose:'Hide photo tools',
 newService:'New service',draftUnsaved:'Unsaved edits',draftSaved:'Save to keep your changes',needBasics:'Add a name and a short description in at least one language.',
 needPrice:'Provide a valid amount and currency, or choose “On request”.',needDuration:'Duration must be 5–1440 minutes.',
 needSpanish:'Complete the Spanish title and description, or clear the Spanish title.',
 needLocation:'Add a location for an in-person or hybrid service.',needLanguages:'Enter at least one language you offer.',
 needContact:'Check the WhatsApp number or Telegram username.',submitHint:'The site reviews your service before it becomes public.',
 publicOnly:'Use only promotional photos/videos you have permission to publish.',reviewTag:'Awaiting review',
 noPhoto:'Visual placeholder — no public image is created',statusLabel:'Current status',extraText:'Additional information',
 publicPhoto:'Selected service image',mediaPreview:'Video and extended details',
 createFirst:'Write your service name and its short introduction here. The card is a preview, not a published listing.'
})
Object.assign(TEXT.ru,{
 stageIntro:'1 · Представление',stageOffer:'2 · Формат и цена',stageDetails:'3 · Детали',
 stages:'Экраны редактора услуги',present:'Так услугу увидит клиент',photo:'Обложка услуги',photoAdd:'Добавить / изменить фото',
 photoEmpty:'Фотография вашей услуги',photoTip:'После модерации клиенты увидят именно загруженное вами фото.',
 badge:'ПРЕДПРОСМОТР',previewCta:'Оставить заявку',previewCtaNote:'Настоящая кнопка появится после проверки услуги. Предпросмотр не создаёт заявку.',
 introTip:'Редактируйте карточку прямо здесь. Достаточно коротко объяснить услугу и её пользу.',
 fieldTitle:'Как называется услуга?',fieldShort:'Коротко: что получит клиент?',
 offerHeading:'Как будет проходить услуга?',offerTip:'Выберите формат, место, продолжительность и подтверждённую цену.',
 durationNote:'Необязательно · 5–1440 минут',fromPreview:'Как цена выглядит для клиента',whatNext:'Следующий экран',
 previous:'Назад',next:'Продолжить',stepCount:'Экран',of:'из',detailsHeading:'Дополните предложение',
 detailsTip:'Видео, цели и дополнительные детали помогут представить услугу.',
 addLanguages:'Языки и профессиональные детали',photoOpen:'Редактировать фото',photoClose:'Скрыть редактор фото',
 newService:'Новая услуга',draftUnsaved:'Несохранённые изменения',draftSaved:'Сохраните изменения перед выходом',needBasics:'Укажите название и краткое описание хотя бы на одном языке.',
 needPrice:'Укажите корректную сумму и валюту либо выберите «По запросу».',needDuration:'Длительность должна быть от 5 до 1440 минут.',
 needSpanish:'Дополните название и описание на испанском или очистите название.',
 needLocation:'Для очной или смешанной услуги укажите место проведения.',needLanguages:'Укажите хотя бы один язык проведения.',
 needContact:'Проверьте номер WhatsApp или имя Telegram.',submitHint:'Услуга появится на сайте только после проверки.',
 publicOnly:'Только публичные фото и видео, на которые у вас есть права.',reviewTag:'Ожидает проверки',
 noPhoto:'Визуальный фон — не опубликованное фото',statusLabel:'Текущий статус',extraText:'Дополнительная информация',
 publicPhoto:'Выбранная фотография услуги',mediaPreview:'Видео и дополнительные детали',
 createFirst:'Здесь можно заполнить карточку услуги. Она пока видна только вам.'
})
Object.assign(TEXT.es,{
 stageIntro:'1 · Presentación',stageOffer:'2 · Formato y precio',stageDetails:'3 · Detalles',
 stages:'Pantallas del editor',present:'Así verá el servicio el cliente',photo:'Foto de portada',photoAdd:'Añadir / cambiar fotos',
 photoEmpty:'Foto de tu servicio',photoTip:'Tras la revisión, el cliente verá tu fotografía auténtica.',
 badge:'VISTA PREVIA',previewCta:'Solicitar este servicio',previewCtaNote:'El botón real se activa tras la revisión; esta vista previa no crea solicitudes.',
 introTip:'Edita directamente la tarjeta. Explica el servicio de forma sencilla.',
 fieldTitle:'¿Cómo se llama tu servicio?',fieldShort:'¿Qué recibirá el cliente?',
 offerHeading:'¿Cómo se ofrece tu servicio?',offerTip:'Elige formato, lugar, duración y precio confirmado.',
 durationNote:'Opcional · 5–1440 minutos',fromPreview:'Vista previa del precio',whatNext:'Siguiente pantalla',
 previous:'Anterior',next:'Continuar',stepCount:'Pantalla',of:'de',detailsHeading:'Completa tu oferta',
 detailsTip:'Vídeo, objetivos y detalles adicionales para el cliente.',
 addLanguages:'Idiomas y detalles profesionales',photoOpen:'Editar fotos',photoClose:'Ocultar herramientas de fotos',
 newService:'Servicio nuevo',draftUnsaved:'Cambios sin guardar',draftSaved:'Guarda antes de salir',needBasics:'Añade un nombre y una descripción breve en al menos un idioma.',
 needPrice:'Indica importe y moneda válidos o selecciona precio a consultar.',needDuration:'La duración debe ser de 5 a 1440 minutos.',
 needSpanish:'Completa título y descripción en español o elimina el título.',
 needLocation:'Indica el lugar para la modalidad presencial o híbrida.',needLanguages:'Indica al menos un idioma del servicio.',
 needContact:'Revisa el número de WhatsApp o usuario de Telegram.',submitHint:'El servicio se publica solo después de la revisión.',
 publicOnly:'Solo fotos y vídeos promocionales que tienes permiso para publicar.',reviewTag:'En revisión',
 noPhoto:'Imagen ilustrativa solo en el editor',statusLabel:'Estado actual',extraText:'Información adicional',
 publicPhoto:'Imagen seleccionada del servicio',mediaPreview:'Vídeo y detalles adicionales',
 createFirst:'Puedes editar esta tarjeta ahora. Todavía no está publicada.'
})

const REIKI_METHODS = ['Kundalini Reiki', 'Tantra Reiki', 'Runic Reiki', 'Reiki Yggdrasil']
const REIKI_KINDS = ['session', 'initiation', 'course']
const REIKI_DURATIONS = [10, 20, 30, 60]
const REIKI_REPORTS = ['brief', 'text', 'voice']
const REIKI_TIMINGS = ['day', 'days', 'chosen']
const REIKI_COPY = {
  en: {
    direction:'Service category',regular:'General service',reiki:'Reiki services',
    kind:'Choose Reiki offer',kinds:{session:'Reiki support',initiation:'Reiki initiation',course:'Reiki course'},
    timing:'Timing you can offer (subject to confirmation)',times:{day:'Within 24 hours',days:'Within 3 days',chosen:'At a chosen hour'},
    report:'Client report',reports:{brief:'Brief',text:'Personal written review',voice:'Personal voice review'},
    role:'Session provider',roles:{practitioner:'Reiki practitioner',master:'Reiki master'},
    practices:'Reiki practices (for sessions only)',currency:'Currency',variants:'Actual offers and prices',
    variant:'Offer',duration:'Duration',price:'Price',certificate:'With certificate',
    addVariant:'Add another price option',removeVariant:'Remove option',
    note:'Prices are set by you. A certificate can only be offered with an initiation or course. Timing is a request, not a guaranteed appointment; publication follows review.',
    needReiki:'Check Reiki type, duration, reports, distinct prices and certificate options. Add at least one complete price option to submit.',
    needReikiMethod:'Select at least one Reiki practice for a support session.',
  },
  ru: {
    direction:'Категория услуги',regular:'Обычная услуга',reiki:'Услуги Рейки',
    kind:'Какую услугу Рейки предлагаете?',kinds:{session:'Рейки-поддержка',initiation:'Рейки-инициация',course:'Рейки-курс'},
    timing:'Сроки выполнения (после подтверждения)',times:{day:'В течение суток',days:'В течение 3 дней',chosen:'В выбранный час'},
    report:'Формат отчёта',reports:{brief:'Краткий',text:'Личный разбор текстом',voice:'Личный разбор голосом'},
    role:'Кто проводит сессию',roles:{practitioner:'Рейки-практик',master:'Рейки-мастер'},
    practices:'Практики Рейки (только для сессии)',currency:'Валюта',variants:'Варианты и реальные цены',
    variant:'Вариант',duration:'Длительность',price:'Цена',certificate:'С сертификатом',
    addVariant:'Добавить вариант цены',removeVariant:'Удалить вариант',
    note:'Цены устанавливает мастер. Сертификат — только для инициации или курса. Срок не гарантирует запись, публикация после модерации.',
    needReiki:'Проверьте тип Рейки, длительность, отчёт, уникальные варианты цен и сертификата. Для отправки добавьте хотя бы один заполненный вариант.',
    needReikiMethod:'Выберите хотя бы одну практику Рейки для сессии поддержки.',
  },
  es: {
    direction:'Categoría del servicio',regular:'Servicio general',reiki:'Servicios Reiki',
    kind:'Tipo de servicio Reiki',kinds:{session:'Apoyo Reiki',initiation:'Iniciación Reiki',course:'Curso Reiki'},
    timing:'Plazos ofrecidos (pendientes de confirmación)',times:{day:'En 24 horas',days:'En 3 días',chosen:'Hora elegida'},
    report:'Informe para el cliente',reports:{brief:'Breve',text:'Análisis escrito personal',voice:'Análisis de voz personal'},
    role:'Profesional de la sesión',roles:{practitioner:'Practicante Reiki',master:'Maestro Reiki'},
    practices:'Prácticas Reiki (solo sesiones)',currency:'Moneda',variants:'Opciones y precios reales',
    variant:'Opción',duration:'Duración',price:'Precio',certificate:'Con certificado',
    addVariant:'Añadir otra opción de precio',removeVariant:'Quitar opción',
    note:'Cada profesional fija sus precios. Certificados solo para iniciaciones y cursos. El horario se confirma aparte; hay moderación.',
    needReiki:'Revisa tipo Reiki, duración, informes, precios únicos y certificados. Añade al menos una opción completa para publicar.',
    needReikiMethod:'Selecciona al menos una práctica Reiki para la sesión.',
  },
}
for(const code of ['en','ru','es'])Object.assign(TEXT[code],{
  needReiki:REIKI_COPY[code].needReiki,needReikiMethod:REIKI_COPY[code].needReikiMethod})

const BASE = {
  copy: { en: {title:'', shortDescription:'', description:''}, ru: {title:'', shortDescription:'', description:''}, es: {title:'', shortDescription:'', description:''} },
  areaKey:'personal_development', offeringType:'session', deliveryFormat:'online', locationLabel:'',
  pricingMode:'contact', confirmedPrice:'', currency:'CAD', durationMinutes:'', priceOptions:[], reikiOffer:null,
  imagePath:'', photos:[], videoPresentation:null, serviceIntroductions:[], goals:[], methods:[], benefits:[], faq:[], whatsapp:'', telegram:'', displayLocales:['en','ru'],
}

const commas = value => String(value||'').split(',').map(x=>x.trim()).filter(Boolean)
const lines = (value,max) => String(value||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,max)

// Public Pro passes only these non-sensitive category templates. Never seed
// fictional credentials, prices, client benefits or descriptive claims.
const PRO_STARTERS = {
  reiki: { areaKey:'energy_spiritual', offeringType:'session', deliveryFormat:'online', pricingMode:'contact', confirmedPrice:null, currency:'',
    reikiOffer:{kind:'session',currency:'EUR',timings:[],role:'practitioner',variants:[]} },
  session: { areaKey:'energy_spiritual', offeringType:'session', deliveryFormat:'online', pricingMode:'contact', confirmedPrice:null, currency:'' },
  intro: { areaKey:'energy_spiritual', offeringType:'intro', deliveryFormat:'online', pricingMode:'free', confirmedPrice:null, currency:'' },
  workshop: { areaKey:'energy_spiritual', offeringType:'workshop', deliveryFormat:'online', pricingMode:'contact', confirmedPrice:null, currency:'' },
  // Approved Pro choices: safe categorical defaults only, never fake titles,
  // health diagnoses, guarantees, prices, credentials or automatic publication.
  diagnostic: { areaKey:'personal_development', offeringType:'assessment', deliveryFormat:'online', pricingMode:'contact', confirmedPrice:null, currency:'' },
  energy: { areaKey:'energy_spiritual', offeringType:'session', deliveryFormat:'online', pricingMode:'contact', confirmedPrice:null, currency:'' },
  personal: { areaKey:'personal_development', offeringType:'session', deliveryFormat:'online', pricingMode:'contact', confirmedPrice:null, currency:'' },
}

function initialDraft(item,locale,starter='') {
  const raw = item?.draftCopy && Object.keys(item.draftCopy).length
    ? item.draftCopy
    : item ? {
        copy:item.localizedCopy||{}, areaKey:item.areaKey, offeringType:item.offeringType,
        deliveryFormat:item.deliveryFormat, locationLabel:item.locationLabel, languages:item.languages,
        pricingMode:item.pricingMode, confirmedPrice:item.confirmedPrice??'', currency:item.currency||'CAD',
        durationMinutes:item.durationMinutes??'', priceOptions:item.priceOptions||[], reikiOffer:item.reikiOffer||null, imagePath:item.imagePath||'', photos:item.photos||[], videoPresentation:item.videoPresentation||null, serviceIntroductions:item.serviceIntroductions?.length?item.serviceIntroductions:undefined, goals:item.goals||[],
        methods:item.methods||[], benefits:item.benefits||[], faq:item.faq||[],
        displayLocales:item.displayLocales||['en','ru'], whatsapp:item.whatsapp||'', telegram:item.telegram||'',
      } : {}
  const serviceIntroductions=Array.isArray(raw.serviceIntroductions)
    ? raw.serviceIntroductions
    : raw.videoPresentation?[{language:(raw.languages||[]).find(code=>['en','ru','es'].includes(code))||locale,
        type:'video',media:raw.videoPresentation}]:[]
  return {
    ...BASE, languages:[locale==='ru'?'ru':locale==='es'?'es':'en'],
    ...(!item && Object.hasOwn(PRO_STARTERS,starter) ? PRO_STARTERS[starter] : {}), ...raw,
    // Re-home legacy video inside the new language-based field, avoiding duplicate playback.
    videoPresentation:null,serviceIntroductions,
    copy:Object.fromEntries(['en','ru','es'].map(lang=>[lang,{...BASE.copy[lang],...(raw.copy?.[lang]||{})}])),
  }
}

export default function SimpleServiceEditor({item,starter='',locale='en',busy=false,onSave,onSaveAndSubmit,onPause,onDirtyChange,onMediaBusyChange}){
  const lang=TEXT[locale]?locale:'en', c=TEXT[lang]
  const [videoBusy,setVideoBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false)
  const [draft,setDraft]=useState(()=>initialDraft(item,lang,starter))
  const [stage,setStage]=useState(0)
  const [photoToolsOpen,setPhotoToolsOpen]=useState(false)
  const [touched,setTouched]=useState(false)
  const [formIssue,setFormIssue]=useState('')
  const [activeLanguage,setActiveLanguage]=useState(()=>{
    const original=initialDraft(item,lang,starter).copy
    return original[lang]?.title?lang:(['en','ru','es'].find(code=>original[code]?.title)||lang)
  })
  const [methodsText,setMethodsText]=useState(()=>(initialDraft(item,lang,starter).methods||[]).join(', '))
  const [languagesText,setLanguagesText]=useState(()=>(initialDraft(item,lang,starter).languages||[]).join(', '))
  const [benefitsText,setBenefitsText]=useState(()=>(initialDraft(item,lang,starter).benefits||[]).join('\n'))
  const [faqText,setFaqText]=useState(()=>(initialDraft(item,lang,starter).faq||[]).join('\n'))
  const mark=()=>{setTouched(true);setFormIssue('');onDirtyChange?.(true)}
  const set=(key,value)=>{mark();setDraft(prev=>({...prev,[key]:value}))}
  const setCopy=(key,value)=>{
    mark()
    setDraft(prev=>({...prev,copy:{...prev.copy,[activeLanguage]:{...prev.copy[activeLanguage],[key]:value}}}))
  }
  const changeGoal=(key,checked)=>{
    mark()
    setDraft(prev=>({...prev,goals:checked?[...new Set([...(prev.goals||[]),key])]:(prev.goals||[]).filter(goal=>goal!==key)}))
  }
  const reikiCopy=REIKI_COPY[lang]
  const isReiki=Boolean(draft.reikiOffer)
  const reiki=draft.reikiOffer
  const paid=['fixed','from'].includes(draft.pricingMode)
  const locked=busy||videoBusy||photoBusy
  const chooseReiki=enabled=>{
    mark()
    setDraft(prev=>({...prev,areaKey:enabled?'energy_spiritual':prev.areaKey,
      offeringType:'session',deliveryFormat:enabled?'online':prev.deliveryFormat,
      priceOptions:[],pricingMode:'contact',confirmedPrice:null,currency:'',
      reikiOffer:enabled?{kind:'session',currency:'EUR',timings:[],role:'practitioner',variants:[]}:null}))
  }
  const chooseReikiKind=kind=>{
    mark()
    if(kind!=='session')setMethodsText('')
    setDraft(prev=>({...prev,areaKey:'energy_spiritual',offeringType:kind==='course'?'course':'session',
      reikiOffer:{...prev.reikiOffer,kind,role:kind==='session'?'practitioner':null,variants:[]}}))
  }
  const updateReiki=(patch)=>set('reikiOffer',{...reiki,...patch})
  const updateReikiVariant=(index,patch)=>updateReiki({variants:reiki.variants.map((variant,i)=>i===index?{...variant,...patch}:variant)})
  const reikiPrices=reiki?reikiOfferPricing({...reiki,variants:reiki.variants
    .filter(v=>v.price!==''&&v.price!=null).map(variant=>({...variant,price:Number(variant.price)}))}):null
  const makePayload=()=>({
    ...draft,languages:commas(languagesText),methods:isReiki&&reiki.kind!=='session'?[]:commas(methodsText),
    benefits:lines(benefitsText,5),faq:lines(faqText,6),
    areaKey:isReiki?'energy_spiritual':draft.areaKey,
    offeringType:isReiki?(reiki.kind==='course'?'course':'session'):draft.offeringType,
    pricingMode:isReiki?reikiPrices.pricingMode:draft.pricingMode,
    confirmedPrice:isReiki?reikiPrices.confirmedPrice:paid?(draft.confirmedPrice==null||draft.confirmedPrice===''?null:Number(draft.confirmedPrice)):null,
    currency:isReiki?reikiPrices.currency:paid?(draft.currency||'CAD'):'',
    durationMinutes:isReiki?null:draft.durationMinutes==null||draft.durationMinutes===''?null:Number(draft.durationMinutes),
    priceOptions:isReiki?[]:paid?(draft.priceOptions||[]).filter(option=>option.price!==''&&option.price!=null).map(option=>({duration:option.duration,price:Number(option.price)})):[],
    reikiOffer:isReiki?{...reiki,variants:reiki.variants.map(variant=>({...variant,
      price:variant.price===''?null:Number(variant.price)}))}:null,
    displayLocales:draft.copy.es.title?.trim()
      ? [...new Set([...(draft.displayLocales||['en','ru']),'es'])]
      : (draft.displayLocales||['en','ru']).filter(code=>code!=='es'),
  })
  const validate=(complete)=>{
    const issue=getServiceEditorIssue(makePayload(),{complete})
    if(issue){setStage(issue.step);setFormIssue(c[issue.code]);return false}
    setFormIssue('');return true
  }
  const saveDraft=()=>{
    if(locked||!validate(false))return
    onSave(item?.id||null,makePayload(),item?.revision)
  }
  const submit=event=>{
    event.preventDefault()
    if(locked)return
    if(stage<2){setStage(stage+1);setFormIssue('');return}
    if(!validate(true))return
    onSaveAndSubmit(item?.id||null,makePayload(),item?.revision)
  }
  const currentCopy=draft.copy[activeLanguage]||{}
  const title=currentCopy.title||''
  const short=currentCopy.shortDescription||''
  const photos=Array.isArray(draft.photos)?draft.photos:[]
  const photo=photos[0]||''
  const stageLabels=[c.stageIntro,c.stageOffer,c.stageDetails]
  const area=AREAS[draft.areaKey]||AREAS.personal_development
  const areaTitle=area[lang==='ru'?1:lang==='es'?2:0]
  const formatLabel=draft.deliveryFormat==='in_person'?c.inPerson:draft.deliveryFormat==='hybrid'?c.hybrid:c.online
  const priceSummary=servicePreviewPrice(draft,c)
  return <form noValidate className={styles.quickForm} onSubmit={submit} data-service-slide-editor data-service-stage={stage}>
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <span className={styles.eyebrow}>Holistic House · Practice</span>
        <h3>{item?c.editTitle:c.newTitle}</h3>
        <p>{c.intro}</p>
        {item?.status&&<small className={styles.realStatus}>{c.statusLabel}: {item.status}</small>}
      </div>
      <label className={styles.langSelect}>
        <span><Globe2 size={15} aria-hidden="true"/>{c.language}</span>
        <select aria-label={c.language} value={activeLanguage} onChange={event=>{setActiveLanguage(event.target.value);setFormIssue('')}} disabled={locked}>
          <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
        </select>
      </label>
    </div>
    {item?.reviewNote&&<p role="status" className={styles.reviewNote}>{item.reviewNote}</p>}
    <div className={styles.stageTabs} role="group" aria-label={c.stages} data-service-stage-nav>
      {stageLabels.map((label,index)=><button key={label} type="button" aria-label={label} aria-current={stage===index?'step':undefined}
        aria-pressed={stage===index} className={stage===index?styles.activeStage:''}
        onClick={()=>{if(!locked){setStage(index);setFormIssue('')}}} disabled={locked}>
        <span>{index+1}</span><strong>{label.slice(label.indexOf('·')+1).trim()}</strong>
      </button>)}
    </div>
    {stage===0&&<section className={styles.stagePanel} data-service-slide="presentation" aria-label={c.stageIntro}>
      <div className={styles.panelHead}><strong><Leaf size={16}/>{c.present}</strong><span>{c.badge}</span></div>
      <p className={styles.stageTip}>{c.introTip}</p>
      <div className={styles.serviceCanvas} data-service-visual-canvas>
        <div className={styles.photoCanvas}>
          {photo?<img src={photo} alt={title||c.publicPhoto} loading="lazy"/>:
            <div className={styles.emptyPhoto} role="img" aria-label={c.noPhoto}>
              <ImageIcon size={30} aria-hidden="true"/><small>{c.photoEmpty}</small>
            </div>}
          <button type="button" className={styles.photoButton} disabled={locked} onClick={()=>setPhotoToolsOpen(open=>!open)}
            aria-expanded={photoToolsOpen}><Camera size={17} aria-hidden="true"/>{photo?c.photoOpen:c.photoAdd}</button>
        </div>
        <div className={styles.contentCanvas}>
          <p className={styles.contentKicker}>HOLISTIC HOUSE · {areaTitle}</p>
          <label className={styles.visualTitle}>
            <span>{c.fieldTitle} *</span>
            <input type="text" maxLength={160} autoComplete="off" placeholder={c.titleExample} aria-required="true"
              value={title} onChange={event=>setCopy('title',event.target.value)} disabled={locked}/>
          </label>
          <label className={styles.visualSummary}>
            <span>{c.fieldShort} *</span>
            <textarea rows={3} maxLength={500} placeholder={c.shortExample} aria-required="true"
              value={short} onChange={event=>setCopy('shortDescription',event.target.value)} disabled={locked}/>
          </label>
          <div className={styles.previewMeta}><span>{formatLabel}</span><span>{priceSummary}</span></div>
          <div className={styles.previewCta}><span>{c.previewCta}<ArrowRight size={16} aria-hidden="true"/></span>
            <small>{c.previewCtaNote}</small></div>
        </div>
      </div>
      {photoToolsOpen&&<div className={styles.galleryPanel} data-service-photo-tools>
        <div className={styles.galleryHeader}><strong><Camera size={16}/>{c.photo}</strong>
          <button type="button" onClick={()=>setPhotoToolsOpen(false)} disabled={photoBusy}>{c.photoClose}</button>
        </div>
        <PracticePhotoUpload mode="service" value={photos} onChange={value=>set('photos',value)}
          locale={locale} disabled={busy||videoBusy} onBusyChange={value=>{setPhotoBusy(value);onMediaBusyChange?.(value)}}/>
        <p className={styles.stageTip}>{c.publicOnly}</p>
      </div>}
      {!photoToolsOpen&&<p className={styles.note}>{c.photoTip}</p>}
    </section>}
    {stage===1&&<section className={styles.stagePanel} data-service-slide="booking" aria-label={c.stageOffer}>
      <div className={styles.panelHead}><strong><Clock3 size={17}/>{c.offerHeading}</strong><span>02 / 03</span></div>
      <p className={styles.stageTip}>{c.offerTip}</p>
      <fieldset className={styles.reikiMode} data-reiki-service-editor>
        <legend>{reikiCopy.direction}</legend>
        <div className={styles.reikiKindButtons}>
          <button type="button" aria-pressed={!isReiki} disabled={locked} onClick={()=>chooseReiki(false)}>{reikiCopy.regular}</button>
          <button type="button" aria-pressed={isReiki} disabled={locked} onClick={()=>chooseReiki(true)}>{reikiCopy.reiki}</button>
        </div>
      </fieldset>
      {isReiki&&<div className={styles.reikiPanel} data-reiki-booking>
        <fieldset className={styles.reikiMode}>
          <legend>{reikiCopy.kind}</legend>
          <div className={styles.reikiKindButtons} data-reiki-kind>
            {REIKI_KINDS.map(kind=><button key={kind} type="button" value={kind}
              aria-pressed={reiki.kind===kind} disabled={locked}
              data-reiki-type={kind} onClick={()=>chooseReikiKind(kind)}>{reikiCopy.kinds[kind]}</button>)}
          </div>
        </fieldset>
        <div className={styles.reikiLine}>
          <label className={styles.field}><span>{c.format}</span>
            <select value={draft.deliveryFormat} disabled={locked} onChange={e=>set('deliveryFormat',e.target.value)}>
              <option value="online">{c.online}</option><option value="hybrid">{c.hybrid}</option>
            </select>
          </label>
          <label className={styles.field}><span>{reikiCopy.currency}</span>
            <select value={reiki.currency} disabled={locked} onChange={e=>updateReiki({currency:e.target.value})}>
              <option value="EUR">EUR €</option><option value="CAD">CAD $</option><option value="USD">USD $</option>
            </select>
          </label>
        </div>
        {draft.deliveryFormat==='hybrid'&&<label className={styles.field}><span>{c.location} *</span>
          <input value={draft.locationLabel||''} maxLength={200} disabled={locked} onChange={e=>set('locationLabel',e.target.value)} placeholder={c.locationExample}/>
        </label>}
        <fieldset className={styles.reikiMode} data-reiki-timing>
          <legend>{reikiCopy.timing}</legend>
          <div className={styles.reikiChecks}>
            {REIKI_TIMINGS.map(timing=><label key={timing}>
              <input type="checkbox" checked={reiki.timings.includes(timing)} disabled={locked}
                onChange={e=>updateReiki({timings:e.target.checked?[...reiki.timings,timing]:reiki.timings.filter(value=>value!==timing)})}/>
              <span>{reikiCopy.times[timing]}</span>
            </label>)}
          </div>
        </fieldset>
        {reiki.kind==='session'&&<>
          <fieldset className={styles.reikiMode} data-reiki-role>
            <legend>{reikiCopy.role}</legend>
            <div className={styles.reikiKindButtons}>
              {(['practitioner','master']).map(role=><button key={role} type="button"
                aria-pressed={reiki.role===role} disabled={locked}
                onClick={()=>updateReiki({role})}>{reikiCopy.roles[role]}</button>)}
            </div>
          </fieldset>
          <fieldset className={styles.reikiMode} data-reiki-practices>
            <legend>{reikiCopy.practices}</legend>
            <div className={styles.reikiChecks}>
              {REIKI_METHODS.map(practice=><label key={practice}>
                <input type="checkbox" disabled={locked} checked={commas(methodsText).includes(practice)}
                  onChange={e=>{mark();setMethodsText(current=>{
                    const methods=commas(current)
                    return (e.target.checked?[...new Set([...methods,practice])]:methods.filter(value=>value!==practice)).join(', ')
                  })}}/>
                <span>{practice}</span>
              </label>)}
            </div>
          </fieldset>
        </>}
        <fieldset className={styles.reikiMode} data-reiki-variants>
          <legend>{reikiCopy.variants}</legend>
          <div className={styles.reikiRows}>
            {reiki.variants.map((variant,index)=><div className={styles.reikiVariant} data-reiki-variant key={index}>
              <div className={styles.reikiVariantTop}>
                <strong>{reikiCopy.variant} {index+1}</strong>
                <button type="button" disabled={locked} onClick={()=>updateReiki({variants:reiki.variants.filter((_,i)=>i!==index)})}>
                  {reikiCopy.removeVariant}
                </button>
              </div>
              <div className={styles.reikiLine}>
                {reiki.kind==='session'&&<label className={styles.field}><span>{reikiCopy.duration}</span>
                  <select value={variant.duration??30} disabled={locked}
                    onChange={e=>updateReikiVariant(index,{duration:Number(e.target.value)})}>
                    {REIKI_DURATIONS.map(minutes=><option key={minutes} value={minutes}>{minutes} min</option>)}
                  </select>
                </label>}
                <label className={styles.field}><span>{reikiCopy.report}</span>
                  <select value={variant.report} disabled={locked}
                    onChange={e=>updateReikiVariant(index,{report:e.target.value})}>
                    {REIKI_REPORTS.map(report=><option key={report} value={report}>{reikiCopy.reports[report]}</option>)}
                  </select>
                </label>
                <label className={styles.field}><span>{reikiCopy.price} · {reiki.currency}</span>
                  <input type="number" step="0.01" min="0" max="100000" inputMode="decimal"
                    value={variant.price??''} disabled={locked} placeholder="0.00"
                    onChange={e=>updateReikiVariant(index,{price:e.target.value})}/>
                </label>
              </div>
              {reiki.kind!=='session'&&<label className={styles.reikiCertificate} data-reiki-certificate>
                <input type="checkbox" checked={variant.certificate} disabled={locked}
                  onChange={e=>updateReikiVariant(index,{certificate:e.target.checked})}/>
                <span>{reikiCopy.certificate}</span>
              </label>}
            </div>)}
          </div>
          <button type="button" className={styles.reikiAddVariant} disabled={locked||reiki.variants.length>=12}
            onClick={()=>updateReiki({variants:[...reiki.variants,{
              duration:reiki.kind==='session'?30:null,report:'brief',certificate:false,price:''}]})}>
            + {reikiCopy.addVariant}
          </button>
        </fieldset>
        <div className={styles.bookingPreview} aria-label={c.fromPreview}>
          <span>{c.fromPreview}</span><strong>{priceSummary}</strong>
        </div>
        <p className={styles.reikiDisclaimer}>{reikiCopy.note}</p>
      </div>}
      {!isReiki&&<div className={styles.bookingCard}>
        <fieldset className={styles.formatGroup}><legend>{c.format}</legend>
          <div className={styles.formatTiles} role="group" aria-label={c.format}>
            {([['online',c.online],['in_person',c.inPerson],['hybrid',c.hybrid]]).map(([key,label])=>
              <button type="button" key={key} aria-pressed={draft.deliveryFormat===key}
                onClick={()=>set('deliveryFormat',key)} disabled={locked}>{label}</button>)}
          </div>
        </fieldset>
        {draft.deliveryFormat!=='online'&&<label className={styles.field}>
          <span><MapPin size={15} aria-hidden="true"/>{c.location} *</span>
          <input maxLength={200} value={draft.locationLabel||''} placeholder={c.locationExample}
            aria-required="true" disabled={locked} onChange={event=>set('locationLabel',event.target.value)}/>
        </label>}
        <div className={styles.twoFields}>
          <label className={styles.field}><span>{c.topic}</span>
            <select value={draft.areaKey} disabled={locked} onChange={event=>set('areaKey',event.target.value)}>
              {Object.entries(AREAS).map(([key,names])=><option key={key} value={key}>{names[lang==='ru'?1:lang==='es'?2:0]}</option>)}
            </select>
          </label>
          <label className={styles.field}><span>{c.type}</span>
            <select value={draft.offeringType} disabled={locked} onChange={event=>set('offeringType',event.target.value)}>
              {c.offering.map(([key,label])=><option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.twoFields}>
          <label className={styles.field}><span>{c.price}</span>
            <select value={draft.pricingMode} disabled={locked} onChange={event=>set('pricingMode',event.target.value)}>
              <option value="free">{c.free}</option><option value="fixed">{c.fixed}</option>
              <option value="from">{c.from}</option><option value="contact">{c.contact}</option>
            </select>
          </label>
          <label className={styles.field}><span>{c.duration}</span>
            <input type="number" inputMode="numeric" min={5} max={1440} value={draft.durationMinutes??''}
              placeholder={c.durationExample} disabled={locked} onChange={event=>set('durationMinutes',event.target.value)}/>
          </label>
        </div>
        {paid&&<div className={styles.priceFields}>
          <label className={styles.field}><span>{c.amount} *</span>
            <input type="number" inputMode="decimal" min={0} max={100000} step="0.01" value={draft.confirmedPrice??''}
              placeholder="100" aria-required="true" disabled={locked} onChange={event=>set('confirmedPrice',event.target.value)}/>
          </label>
          <label className={styles.field}><span>{lang==='ru'?'Валюта':lang==='es'?'Moneda':'Currency'}</span>
            <select aria-label="Currency" value={draft.currency||'CAD'} disabled={locked} onChange={event=>set('currency',event.target.value)}>
              <option value="CAD">CAD</option><option value="EUR">EUR</option><option value="USD">USD</option>
            </select>
          </label>
        </div>}
        {paid&&draft.areaKey==='energy_spiritual'&&draft.deliveryFormat!=='in_person'&&
          <fieldset className={styles.formatGroup} style={{marginTop:14}}>
            <legend>{lang==='ru'?'Цены дистанционной поддержки (10 / 20 / 30 / 60 мин)':lang==='es'?'Precios por duración (10 / 20 / 30 / 60 min)':'Remote support prices by duration (10 / 20 / 30 / 60 min)'}</legend>
            <p className={styles.note}>{lang==='ru'?'Заполните только длительности, которые вы действительно предлагаете. Цены появятся после модерации.':lang==='es'?'Añade solo las duraciones que ofreces. Requiere aprobación.':'Fill only the durations you actually offer. Prices require approval.'}</p>
            <div className={styles.twoFields} style={{width:'100%'}}>
              {[10,20,30,60].map(duration=><label className={styles.field} key={duration}>
                <span>{duration} min · {draft.currency||'CAD'}</span>
                <input type="number" min="0.01" max="100000" step="0.01" inputMode="decimal"
                  value={(draft.priceOptions||[]).find(option=>option.duration===duration)?.price??''}
                  disabled={locked} placeholder="—"
                  onChange={event=>{
                    const price=event.target.value
                    set('priceOptions',[
                      ...(draft.priceOptions||[]).filter(option=>option.duration!==duration),
                      ...(price!==''?[{duration,price}]:[]),
                    ])
                  }}/>
              </label>)}
            </div>
          </fieldset>}
        <div className={styles.bookingPreview} aria-label={c.fromPreview}>
          <span>{c.fromPreview}</span><strong>{priceSummary}</strong>
          {draft.durationMinutes&&<small>{draft.durationMinutes} {c.duration}</small>}
        </div>
      </div>}
    </section>}
    {stage===2&&<section className={styles.stagePanel} data-service-slide="details" aria-label={c.stageDetails}>
      <div className={styles.panelHead}><strong><Leaf size={17}/>{c.detailsHeading}</strong><span>03 / 03</span></div>
      <p className={styles.stageTip}>{c.detailsTip}</p>
      <div className={styles.mediaCard}>
        <PracticeVideoField locale={locale} introductions={draft.serviceIntroductions||[]}
          onIntroductionsChange={value=>set('serviceIntroductions',value)}
          onBusyChange={value=>{setVideoBusy(value);onMediaBusyChange?.(value)}}/>
      </div>
      <details className={styles.advanced} data-service-advanced-details>
        <summary><span>{c.addLanguages}</span><ChevronDown size={18} aria-hidden="true"/></summary>
        <div className={styles.advancedContent}>
          <p className={styles.help}>{c.helper}</p>
          <label className={styles.field}><span>{c.languages}</span>
            <input value={languagesText} disabled={locked} placeholder={c.languagesExample}
              onChange={event=>{mark();setLanguagesText(event.target.value)}}/>
          </label>
          <label className={styles.field}><span>{c.detailed}</span>
            <textarea rows={3} maxLength={4000} value={draft.copy[activeLanguage]?.description||''} disabled={locked}
              onChange={event=>setCopy('description',event.target.value)}/>
          </label>
          <fieldset className={styles.goalField}><legend>{c.goals}</legend>
            <div className={styles.goalChips}>
              {GOALS.map(([key,en,ru,es])=><label key={key} className={styles.goal}>
                <input type="checkbox" checked={(draft.goals||[]).includes(key)} disabled={locked}
                  onChange={event=>changeGoal(key,event.target.checked)}/>
                <span>{lang==='ru'?ru:lang==='es'?es:en}</span>
              </label>)}
            </div>
          </fieldset>
          {!isReiki&&<label className={styles.field}><span>{c.methods}</span>
            <input value={methodsText} disabled={locked} onChange={event=>{mark();setMethodsText(event.target.value)}}/>
          </label>}
          <label className={styles.field}><span>{c.benefits}</span>
            <textarea rows={3} value={benefitsText} disabled={locked}
              onChange={event=>{mark();setBenefitsText(event.target.value)}}/>
          </label>
          <label className={styles.field}><span>{c.faq}</span>
            <textarea rows={3} value={faqText} disabled={locked} onChange={event=>{mark();setFaqText(event.target.value)}}/>
          </label>
          <div className={styles.twoFields}>
            <label className={styles.field}><span>{c.whatsapp}</span>
              <input type="tel" inputMode="tel" placeholder="+14161234567" maxLength={18} value={draft.whatsapp||''}
                disabled={locked} onChange={event=>set('whatsapp',event.target.value)}/>
            </label>
            <label className={styles.field}><span>{c.telegram}</span>
              <input placeholder="@username" maxLength={33} value={draft.telegram||''}
                disabled={locked} onChange={event=>set('telegram',event.target.value)}/>
            </label>
          </div>
        </div>
      </details>
    </section>}
    {formIssue&&<p role="alert" className={styles.formIssue}>{formIssue}</p>}
    <div className={styles.footerControls} data-service-editor-footer>
    <div className={styles.stepNavigation} data-service-step-controls>
      <button type="button" onClick={()=>setStage(n=>Math.max(0,n-1))} disabled={locked||stage===0}><ArrowLeft size={17}/><span className={styles.previousLabel}>{c.previous}</span></button>
      <span>{c.stepCount} {stage+1} {c.of} 3</span>
      {stage<2?<button type="button" onClick={()=>{setStage(n=>Math.min(2,n+1));setFormIssue('')}} disabled={locked}>
        {c.next}<ArrowRight size={17}/></button>:<span className={styles.readyNote}>{c.submitHint}</span>}
    </div>
    <div className={styles.actions} data-service-save-actions>
      <button className={styles.draft} type="button" disabled={locked} onClick={saveDraft}>
        <Save size={16} aria-hidden="true"/>{c.draft}
      </button>
      {stage===2&&<button className={styles.submit} type="submit" disabled={locked}>
        <Send size={17} aria-hidden="true"/>{item?c.update:c.submit}
      </button>}
      {item&&['published','submitted','changes_requested'].includes(item.status)&&stage===2&&
        <button className={styles.pause} type="button" disabled={locked} onClick={()=>onPause(item)}>{c.pause}</button>}
    </div>
    </div>
    <p className={styles.fine}>{touched?c.draftUnsaved+' · ':''}{c.review}</p>
  </form>
}
