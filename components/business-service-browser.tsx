'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, BookOpen, ChevronDown, Compass, Layers3, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { AcquisitionEventLink } from '@/components/acquisition-event-link'
import { businessConsultingCopy } from '@/data/business-consulting-copy'
import styles from './business-service-browser.module.css'

type Locale = 'en' | 'ru' | 'es'
type Topic = 'all' | 'clarity' | 'income' | 'growth' | 'project'
type Mode = 'all' | 'free' | 'session' | 'ongoing' | 'other'
type IntakeFormat = 'free' | 'express' | 'full' | 'mentoring'
type Offer = {
  id: string; name: string; description: string; price: string;
  topics: readonly Topic[]; mode: Exclude<Mode, 'all'>;
  format?: IntakeFormat; href?: string
}
const topics = ['all', 'clarity', 'income', 'growth', 'project'] as const
const modes = ['all', 'free', 'session', 'ongoing', 'other'] as const

const copy = {
  en: {
    filterTitle: 'Prefer to choose for yourself?', filterHint: 'Open filters — no quiz needed.',
    byTopic: 'What would you like help with?', byFormat: 'Service type',
    topics: {all:'All topics',clarity:'Clarity',income:'Income',growth:'Growth',project:'My project'},
    modes: {all:'Any format',free:'Free',session:'Personal session',ongoing:'Ongoing support',other:'Other methods'},
    reset: 'Clear filters', kicker: 'CHOOSE YOUR WAY TO START',
    title: 'Services you can explore', lead: 'Three starting options, with more personal methods available below.',
    more: 'Show the next 3 services', fewer: 'Show the first 3',
    empty: 'No services match these filters. Try another topic or format.',
    choose: 'Request this option', details: 'Explore this service',
    mentoringPrice: 'By arrangement', otherPrice: 'Details on the service page',
    systemName: 'Systemic Constellations',
    systemText: 'Explore roles and repeated dynamics through an optional symbolic mapping session.',
    imageryName: 'Guided Imagery Consultation',
    imageryText: 'Explore personal goals and internal resources with guided imagery.',
    disclaimer: 'Enquiries are not confirmed appointments or payments. Specialist and pricing details are agreed separately.',
  },
  ru: {
    filterTitle: 'Хотите выбрать самостоятельно?', filterHint: 'Откройте фильтры — квиз не обязателен.',
    byTopic: 'Какая тема вас интересует?', byFormat: 'Формат услуги',
    topics: {all:'Все темы',clarity:'Ясность',income:'Доход',growth:'Развитие',project:'Мой проект'},
    modes: {all:'Любой формат',free:'Бесплатно',session:'Личная сессия',ongoing:'Длительное сопровождение',other:'Другие методы'},
    reset: 'Сбросить фильтры', kicker: 'ВЫБЕРИТЕ СВОЙ ФОРМАТ',
    title: 'Услуги для вашего запроса', lead: 'Три варианта для начала и другие форматы ниже.',
    more: 'Показать ещё 3 услуги', fewer: 'Показать первые 3',
    empty: 'По выбранным фильтрам услуг нет. Измените тему или формат.',
    choose: 'Оставить заявку', details: 'Подробнее об услуге',
    mentoringPrice: 'По договорённости', otherPrice: 'Условия на странице услуги',
    systemName: 'Системные расстановки',
    systemText: 'Символический разбор ролей и повторяющихся ситуаций.',
    imageryName: 'Консультация с образной работой',
    imageryText: 'Исследование личных целей и ресурсов через работу с образами.',
    disclaimer: 'Заявка — не запись и не оплата. Детали, специалист и стоимость уточняются отдельно.',
  },
  es: {
    filterTitle: '¿Prefieres elegir directamente?', filterHint: 'Abre los filtros, sin completar el quiz.',
    byTopic: '¿En qué necesitas ayuda?', byFormat: 'Tipo de servicio',
    topics: {all:'Todos los temas',clarity:'Claridad',income:'Ingresos',growth:'Crecimiento',project:'Mi proyecto'},
    modes: {all:'Cualquier modalidad',free:'Gratis',session:'Sesión personal',ongoing:'Apoyo continuo',other:'Otros métodos'},
    reset: 'Borrar filtros', kicker: 'ELIGE CÓMO EMPEZAR',
    title: 'Servicios para explorar', lead: 'Tres opciones para empezar y otros enfoques disponibles.',
    more: 'Mostrar 3 servicios más', fewer: 'Mostrar los primeros 3',
    empty: 'No hay servicios para estos filtros. Prueba otra opción.',
    choose: 'Enviar solicitud', details: 'Conocer el servicio',
    mentoringPrice: 'Por acuerdo', otherPrice: 'Ver detalles del servicio',
    systemName: 'Constelaciones sistémicas',
    systemText: 'Explora roles y dinámicas recurrentes mediante una representación simbólica.',
    imageryName: 'Consulta con imágenes guiadas',
    imageryText: 'Explora metas personales y recursos interiores con imágenes guiadas.',
    disclaimer: 'La solicitud no confirma una cita ni un pago. Las condiciones se acuerdan por separado.',
  },
} as const

// First-screen service summaries are intentionally concise; detailed service copy stays in the source offers.
const compactOffers: Record<Locale, Record<string, { name: string; summary: string }>> = {
  en: {
    free: { name: 'Free Business Snapshot', summary: 'Your question and a simple sketch → a personal written reflection.' },
    express: { name: 'Strategy Clarity', summary: '30 minutes to clarify a decision and choose your next step.' },
    full: { name: 'Business Mapping & Goals', summary: '60 minutes to explore your goals and outline a practical plan.' },
  },
  ru: {
    free: { name: 'Бесплатный бизнес-разбор', summary: 'Вопрос и рисунок «Я — цель — препятствие» → письменный ответ.' },
    express: { name: 'Ясность стратегии', summary: '30 минут: разберём одно решение и следующий шаг.' },
    full: { name: 'Карта бизнеса и цели', summary: '60 минут: исследуем систему и наметим план действий.' },
  },
  es: {
    free: { name: 'Diagnóstico empresarial gratis', summary: 'Tu pregunta y un dibujo → reflexión personal por escrito.' },
    express: { name: 'Claridad estratégica', summary: '30 min para aclarar una decisión y elegir el próximo paso.' },
    full: { name: 'Mapa del negocio y metas', summary: '60 min para explorar tus metas y definir un plan práctico.' },
  },
}

// Reuse published first-party imagery, avoiding third-party requests, consent or image hosting changes.
const servicePhotos: Record<string, string> = {
  free: '/images/holistic-house/andy-about.png',
  express: '/images/holistic-house/books-library.webp',
  full: '/images/holistic-house/hero-olive-incense.webp',
  mentoring: '/images/holistic-house/andy-about.png',
  constellations: '/images/holistic-house/homepage-constellations.svg',
  imagery: '/images/holistic-house/homepage-guided-imagery.svg',
}
const mobileActionCopy = {
  en: { choose: 'Request', details: 'Details' },
  ru: { choose: 'Заявка', details: 'Детали' },
  es: { choose: 'Solicitar', details: 'Detalles' },
} as const

function businessOffers(locale: Locale): Offer[] {
  const t = copy[locale]
  const offers = businessConsultingCopy[locale].offers
  return [
    {id:'free',name:offers[0].name,description:offers[0].description,price:offers[0].price,
      format:'free',mode:'free',topics:['clarity','income','project']},
    {id:'express',name:offers[1].name,description:offers[1].description,price:offers[1].price,
      format:'express',mode:'session',topics:['clarity','income','project']},
    {id:'full',name:offers[2].name,description:offers[2].description,price:offers[2].price,
      format:'full',mode:'session',topics:['clarity','growth','project']},
    {id:'mentoring',name:businessConsultingCopy[locale].mentorTitle,
      description:businessConsultingCopy[locale].mentorText,price:t.mentoringPrice,
      format:'mentoring',mode:'ongoing',topics:['growth','project']},
    {id:'constellations',name:t.systemName,description:t.systemText,price:t.otherPrice,
      mode:'other',topics:['clarity','project'],href:'/'+locale+'/services/systemic-constellations'},
    {id:'imagery',name:t.imageryName,description:t.imageryText,price:t.otherPrice,
      mode:'other',topics:['clarity','growth'],href:'/'+locale+'/services/imagery-therapy'},
  ]
}

export function BusinessServiceBrowser({locale}: {locale: Locale}) {
  const t = copy[locale]
  const [topic,setTopic] = useState<Topic>('all')
  const [mode,setMode] = useState<Mode>('all')
  const [visibleCount,setVisibleCount] = useState(3)
  const [filterOpen,setFilterOpen] = useState(false)
  const catalog = businessOffers(locale)
  const filtered = catalog.filter(item =>
    (topic==='all'||item.topics.includes(topic)) &&
    (mode==='all'||item.mode===mode))
  const shown = filtered.slice(0,visibleCount)
  const remaining = Math.max(0,filtered.length-visibleCount)
  const resetCount = () => setVisibleCount(3)
  return <div className={styles.root} data-business-service-browser>
    <details className={styles.filters} data-business-service-filter open={filterOpen}
      onToggle={event=>setFilterOpen(event.currentTarget.open)}>
      <summary>
        <span className={styles.filterIcon}><SlidersHorizontal size={20} aria-hidden="true"/></span>
        <span><strong>{t.filterTitle}</strong><small>{t.filterHint}</small></span>
        <ChevronDown className={styles.chevron} size={20} aria-hidden="true"/>
      </summary>
      <div className={styles.filterBody}>
        <fieldset><legend>{t.byTopic}</legend><div className={styles.chips}>
          {topics.map(key=><button key={key} type="button" aria-pressed={topic===key}
            data-service-filter-topic={key} onClick={()=>{setTopic(key);resetCount()}}>{t.topics[key]}</button>)}
        </div></fieldset>
        <fieldset><legend>{t.byFormat}</legend><div className={styles.chips}>
          {modes.map(key=><button key={key} type="button" aria-pressed={mode===key}
            data-service-filter-format={key} onClick={()=>{setMode(key);resetCount()}}>{t.modes[key]}</button>)}
        </div></fieldset>
        <button type="button" className={styles.reset} onClick={()=>{setTopic('all');setMode('all');resetCount()}}>
          <RotateCcw size={14} aria-hidden="true"/>{t.reset}
        </button>
      </div>
    </details>

    <section className={styles.catalog} aria-labelledby="business-services-title" data-business-service-catalog>
      <p className={styles.kicker}>{t.kicker}</p>
      <h2 id="business-services-title">{t.title}</h2>
      <p className={styles.lead}>{t.lead}</p>
      <div className={styles.cards} aria-live="polite">
        {shown.map((item,index)=>{
          const compact = compactOffers[locale][item.id]
          return <article className={styles.card} key={item.id} data-business-service-card={item.id}>
            <div className={styles.cardMedia} data-business-service-photo={item.id} aria-hidden="true">
              <Image src={servicePhotos[item.id]} alt="" fill
                sizes="(max-width: 760px) 120px, (max-width: 1100px) 150px, 110px"
                loading="lazy" />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <span className={styles.num}>{String(index+1).padStart(2,'0')}</span>
                {item.format ? <Compass size={19} aria-hidden="true"/> : <BookOpen size={19} aria-hidden="true"/>}
              </div>
              <h3 aria-label={item.name}>
                {compact ? <>
                  <span className={styles.titleFull}>{item.name}</span>
                  <span className={styles.titleSmall} aria-hidden="true">{compact.name}</span>
                </> : item.name}
              </h3>
              <p className={styles.summary} aria-label={item.description}>{compact?.summary ?? item.description}</p>
              <div className={styles.cardFooter}>
                <strong className={styles.price}>{item.price}</strong>
                {item.format ?
                  <AcquisitionEventLink href="#business-direct-request" event="service_request_start"
                    prefetch={false} className={styles.action} attributes={{
                      'data-business-direct-option': item.format,
                      'data-business-service-request': item.id,
                    }}>
                    <span className={styles.actionText}>{t.choose}</span>
                    <span className={styles.actionShort} aria-hidden="true">{mobileActionCopy[locale].choose}</span>
                    <ArrowRight size={16} aria-hidden="true"/>
                  </AcquisitionEventLink>
                : <AcquisitionEventLink href={item.href || '/'+locale+'/services'} event="service_view"
                    prefetch={false} className={styles.action} attributes={{
                      'data-business-service-details': item.id,
                    }}>
                    <span className={styles.actionText}>{t.details}</span>
                    <span className={styles.actionShort} aria-hidden="true">{mobileActionCopy[locale].details}</span>
                    <ArrowRight size={16} aria-hidden="true"/>
                  </AcquisitionEventLink>}
              </div>
            </div>
          </article>
        })}
      </div>
      {!filtered.length && <p role="status" className={styles.empty}>{t.empty}</p>}
      {remaining>0 ? <button type="button" className={styles.showMore}
        data-business-show-more onClick={()=>setVisibleCount(count=>count+3)}>
        <Layers3 size={18} aria-hidden="true"/>{t.more}<span>+{Math.min(3,remaining)}</span>
      </button> : visibleCount>3 && filtered.length>3 ? <button type="button"
        className={styles.showMore} data-business-show-less onClick={resetCount}>{t.fewer}</button> : null}
      <p className={styles.disclaimer}>{t.disclaimer}</p>
    </section>
  </div>
}
