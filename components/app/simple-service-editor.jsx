'use client'

import { useState } from 'react'
import { ChevronDown, Globe2, Send, Save } from 'lucide-react'
import PracticePhotoUpload from './practice-photo-upload'
import PracticeVideoField from './practice-video-field'
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
const BASE = {
  copy: { en: {title:'', shortDescription:'', description:''}, ru: {title:'', shortDescription:'', description:''}, es: {title:'', shortDescription:'', description:''} },
  areaKey:'personal_development', offeringType:'session', deliveryFormat:'online', locationLabel:'',
  pricingMode:'contact', confirmedPrice:'', currency:'CAD', durationMinutes:'',
  imagePath:'', photos:[], videoPresentation:null, goals:[], methods:[], benefits:[], faq:[], whatsapp:'', telegram:'', displayLocales:['en','ru'],
}

const commas = value => String(value||'').split(',').map(x=>x.trim()).filter(Boolean)
const lines = (value,max) => String(value||'').split('\n').map(x=>x.trim()).filter(Boolean).slice(0,max)

function initialDraft(item,locale) {
  const raw = item?.draftCopy && Object.keys(item.draftCopy).length
    ? item.draftCopy
    : item ? {
        copy:item.localizedCopy||{}, areaKey:item.areaKey, offeringType:item.offeringType,
        deliveryFormat:item.deliveryFormat, locationLabel:item.locationLabel, languages:item.languages,
        pricingMode:item.pricingMode, confirmedPrice:item.confirmedPrice??'', currency:item.currency||'CAD',
        durationMinutes:item.durationMinutes??'', imagePath:item.imagePath||'', photos:item.photos||[], videoPresentation:item.videoPresentation||null, goals:item.goals||[],
        methods:item.methods||[], benefits:item.benefits||[], faq:item.faq||[],
        displayLocales:item.displayLocales||['en','ru'], whatsapp:item.whatsapp||'', telegram:item.telegram||'',
      } : {}
  return {
    ...BASE, languages:[locale==='ru'?'ru':locale==='es'?'es':'en'], ...raw,
    copy:Object.fromEntries(['en','ru','es'].map(lang=>[lang,{...BASE.copy[lang],...(raw.copy?.[lang]||{})}])),
  }
}

export default function SimpleServiceEditor({item,locale='en',busy=false,onSave,onSaveAndSubmit,onPause}) {
  const lang = TEXT[locale]?locale:'en', c = TEXT[lang]
  const [videoBusy,setVideoBusy]=useState(false)
  const [draft,setDraft] = useState(()=>initialDraft(item,lang))
  const [activeLanguage,setActiveLanguage] = useState(()=>{
    const original = initialDraft(item,lang).copy
    return original[lang]?.title ? lang : (['en','ru','es'].find(code=>original[code]?.title)||lang)
  })
  const [methodsText,setMethodsText] = useState(()=>(initialDraft(item,lang).methods||[]).join(', '))
  const [languagesText,setLanguagesText] = useState(()=>(initialDraft(item,lang).languages||[]).join(', '))
  const [benefitsText,setBenefitsText] = useState(()=>(initialDraft(item,lang).benefits||[]).join('\n'))
  const [faqText,setFaqText] = useState(()=>(initialDraft(item,lang).faq||[]).join('\n'))
  const set = (key,value) => setDraft(prev=>({...prev,[key]:value}))
  const setCopy = (key,value) => setDraft(prev=>({
    ...prev,copy:{...prev.copy,[activeLanguage]:{...prev.copy[activeLanguage],[key]:value}},
  }))
  const changeGoal = (key,checked) => setDraft(prev=>({
    ...prev,goals:checked ? [...new Set([...(prev.goals||[]),key])] : (prev.goals||[]).filter(goal=>goal!==key),
  }))
  const paid = ['fixed','from'].includes(draft.pricingMode)
  const makePayload = () => ({
    ...draft, languages:commas(languagesText), methods:commas(methodsText),
    benefits:lines(benefitsText,5), faq:lines(faqText,6),
    confirmedPrice:paid ? (draft.confirmedPrice==='' ? null : Number(draft.confirmedPrice)) : null,
    currency:paid ? (draft.currency||'CAD') : '',
    durationMinutes:draft.durationMinutes==='' ? null : Number(draft.durationMinutes),
    displayLocales:draft.copy.es.title?.trim()
      ? [...new Set([...(draft.displayLocales||['en','ru']),'es'])]
      : (draft.displayLocales||['en','ru']).filter(code=>code!=='es'),
  })
  const saveDraft = () => {if(!videoBusy)onSave(item?.id||null,makePayload(),item?.revision)}
  const submit = event => {
    event.preventDefault()
    if(!videoBusy)onSaveAndSubmit(item?.id||null,makePayload(),item?.revision)
  }
  const title = draft.copy[activeLanguage]?.title||''
  const short = draft.copy[activeLanguage]?.shortDescription||''
  return <form className={styles.quickForm} onSubmit={submit}>
    <div className={styles.header}>
      <div>
        <span className={styles.eyebrow}>Holistic House · Practice</span>
        <h3>{item?c.editTitle:c.newTitle}</h3>
        <p>{c.intro}</p>
      </div>
      <label className={styles.langSelect}>
        <span><Globe2 size={15} aria-hidden="true"/>{c.language}</span>
        <select aria-label={c.language} value={activeLanguage} onChange={event=>setActiveLanguage(event.target.value)}>
          <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
        </select>
      </label>
    </div>
    {item?.reviewNote&&<p role="status" className={styles.reviewNote}>{item.reviewNote}</p>}
    <div className={styles.primaryFields}>
      <label className={styles.field}>
        <span>{c.title} <b>*</b></span>
        <input required maxLength={160} placeholder={c.titleExample}
          autoComplete="off" value={title} onChange={event=>setCopy('title',event.target.value)}/>
      </label>
      <label className={styles.field}>
        <span>{c.short} <b>*</b></span>
        <textarea required rows={2} maxLength={500} placeholder={c.shortExample}
          value={short} onChange={event=>setCopy('shortDescription',event.target.value)}/>
      </label>
      <div className={styles.twoFields}>
        <label className={styles.field}>
          <span>{c.topic}</span>
          <select value={draft.areaKey} onChange={event=>set('areaKey',event.target.value)}>
            {Object.entries(AREAS).map(([key,names])=><option key={key} value={key}>{names[lang==='ru'?1:lang==='es'?2:0]}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>{c.format}</span>
          <select value={draft.deliveryFormat} onChange={event=>set('deliveryFormat',event.target.value)}>
            <option value="online">{c.online}</option>
            <option value="in_person">{c.inPerson}</option>
            <option value="hybrid">{c.hybrid}</option>
          </select>
        </label>
      </div>
      {draft.deliveryFormat!=='online'&&<label className={styles.field}>
        <span>{c.location} <b>*</b></span>
        <input required maxLength={200} value={draft.locationLabel||''} placeholder={c.locationExample}
          onChange={event=>set('locationLabel',event.target.value)}/>
      </label>}
      <div className={styles.twoFields}>
        <label className={styles.field}>
          <span>{c.price}</span>
          <select value={draft.pricingMode} onChange={event=>set('pricingMode',event.target.value)}>
            <option value="free">{c.free}</option><option value="fixed">{c.fixed}</option>
            <option value="from">{c.from}</option><option value="contact">{c.contact}</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>{c.duration}</span>
          <input type="number" inputMode="numeric" min={5} max={1440}
            value={draft.durationMinutes??''} placeholder={c.durationExample}
            onChange={event=>set('durationMinutes',event.target.value)}/>
        </label>
      </div>
      {paid&&<div className={styles.priceFields}>
        <label className={styles.field}>
          <span>{c.amount} <b>*</b></span>
          <input required type="number" min={0} max={100000} step="0.01" inputMode="decimal"
            value={draft.confirmedPrice??''} placeholder="100"
            onChange={event=>set('confirmedPrice',event.target.value)}/>
        </label>
        <label className={styles.field}>
          <span>Currency</span>
          <select aria-label="Currency" value={draft.currency||'CAD'} onChange={event=>set('currency',event.target.value)}>
            <option value="CAD">CAD</option><option value="EUR">EUR</option><option value="USD">USD</option>
          </select>
        </label>
      </div>}
    </div>
    <PracticeVideoField locale={locale} value={draft.videoPresentation} onChange={value=>set('videoPresentation',value)} onBusyChange={setVideoBusy}/>
    <details className={styles.advanced}>
      <summary><span>{c.more}</span><ChevronDown size={18} aria-hidden="true"/></summary>
      <div className={styles.advancedContent}>
        <p className={styles.help}>{c.helper}</p>
        <PracticePhotoUpload mode="service" value={draft.photos||[]} onChange={value=>set('photos',value)} locale={locale} disabled={busy}/>
        <label className={styles.field}><span>{c.type}</span>
          <select value={draft.offeringType} onChange={event=>set('offeringType',event.target.value)}>
            {c.offering.map(([key,label])=><option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>{c.languages}</span>
          <input value={languagesText} placeholder={c.languagesExample} onChange={event=>setLanguagesText(event.target.value)}/>
        </label>
        <label className={styles.field}><span>{c.detailed}</span>
          <textarea rows={3} maxLength={4000} value={draft.copy[activeLanguage]?.description||''}
            onChange={event=>setCopy('description',event.target.value)}/>
        </label>
        <fieldset className={styles.goalField}>
          <legend>{c.goals}</legend>
          <div className={styles.goalChips}>
            {GOALS.map(([key,en,ru,es])=><label key={key} className={styles.goal}>
              <input type="checkbox" checked={(draft.goals||[]).includes(key)}
                onChange={event=>changeGoal(key,event.target.checked)}/>
              <span>{lang==='ru'?ru:lang==='es'?es:en}</span>
            </label>)}
          </div>
        </fieldset>
        <label className={styles.field}><span>{c.methods}</span>
          <input value={methodsText} onChange={event=>setMethodsText(event.target.value)}/>
        </label>
        <label className={styles.field}><span>{c.benefits}</span>
          <textarea rows={2} value={benefitsText} onChange={event=>setBenefitsText(event.target.value)}/>
        </label>
        <label className={styles.field}><span>{c.faq}</span>
          <textarea rows={2} value={faqText} onChange={event=>setFaqText(event.target.value)}/>
        </label>
        <div className={styles.twoFields}>
          <label className={styles.field}><span>{c.whatsapp}</span>
            <input type="tel" inputMode="tel" placeholder="+14161234567" maxLength={18}
              value={draft.whatsapp||''} onChange={event=>set('whatsapp',event.target.value)}/>
          </label>
          <label className={styles.field}><span>{c.telegram}</span>
            <input placeholder="@username" maxLength={33} value={draft.telegram||''}
              onChange={event=>set('telegram',event.target.value)}/>
          </label>
        </div>
      </div>
    </details>
    <div className={styles.actions}>
      <button className={styles.submit} type="submit" disabled={busy||videoBusy}>
        <Send size={17} aria-hidden="true"/>{item?c.update:c.submit}
      </button>
      <button className={styles.draft} type="button" disabled={busy||videoBusy} onClick={saveDraft}>
        <Save size={16} aria-hidden="true"/>{c.draft}
      </button>
      {item&&['published','submitted','changes_requested'].includes(item.status)&&
        <button className={styles.pause} type="button" disabled={busy} onClick={()=>onPause(item)}>{c.pause}</button>}
    </div>
    <p className={styles.fine}>{c.review}</p>
  </form>
}
