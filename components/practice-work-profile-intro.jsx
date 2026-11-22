'use client'

import {HolisticHouseBrand} from './holistic-house-brand'
import {useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {ArrowRight,BookOpen,BriefcaseBusiness,ChevronDown,ClipboardList,FileText,Heart,Leaf,Play,ScrollText,Users} from 'lucide-react'
import {SiteNavigation} from './site-navigation'
import {ProfilePresentationPlayer} from './app/profile-presentation-player'
import {profilePresentationForLocale} from '@/lib/profile-presentation.mjs'
import styles from './practice-work-profile-intro.module.css'

const POSTER='/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg'
const COPY={
  en:{life:'My Page',work:'Practitioner Profile',eyebrow:'MY SPACE · PROFESSIONAL',
    heading:'Practitioner Profile',lead:'Your practice, clients and creative work — all in one place.',
    services:'My Services',servicesHint:'Manage and publish your offerings',active:'active',
    requests:'Requests',requestsHint:'New enquiries and bookings',
    clients:'My Clients',clientsHint:'People and consultations',
    courses:'My Courses',coursesHint:'Teaching and progress',
    materials:'Materials',materialsHint:'Articles, video and audio',
    reports:'Client Reports',reportsHint:'Analyses and recommendations',
    new:'new',watch:'Watch presentation',hide:'Hide presentation',home:'Holistic House home'},
  ru:{life:'Моя страничка',work:'Профиль мастера',eyebrow:'МОЁ ПРОСТРАНСТВО · ПРАКТИКА',
    heading:'Профиль мастера',lead:'Практика, клиенты и творчество — в одном пространстве.',
    services:'Мои услуги',servicesHint:'Управлять предложениями',active:'активно',
    requests:'Заявки',requestsHint:'Новые обращения и записи',
    clients:'Мои клиенты',clientsHint:'Истории и консультации',
    courses:'Мои курсы',coursesHint:'Обучение и прогресс',
    materials:'Материалы',materialsHint:'Статьи, видео и аудио',
    reports:'Отчёты клиентов',reportsHint:'Анализ и рекомендации',
    new:'новых',watch:'Смотреть презентацию',hide:'Скрыть презентацию',home:'Главная Holistic House'},
  es:{life:'Mi página',work:'Perfil profesional',eyebrow:'MI ESPACIO · PROFESIONAL',
    heading:'Perfil profesional',lead:'Tu práctica, clientes y proyectos en un mismo lugar.',
    services:'Mis servicios',servicesHint:'Gestionar las ofertas',active:'activos',
    requests:'Solicitudes',requestsHint:'Consultas y reservas nuevas',
    clients:'Mis clientes',clientsHint:'Personas y consultas',
    courses:'Mis cursos',coursesHint:'Enseñanza y progreso',
    materials:'Materiales',materialsHint:'Artículos, vídeo y audio',
    reports:'Informes',reportsHint:'Análisis y recomendaciones',
    new:'nuevas',watch:'Ver presentación',hide:'Ocultar presentación',home:'Inicio Holistic House'}
}
const CARDS=[
  {key:'requests',label:'requests',hint:'requestsHint',Icon:ClipboardList,photo:'/images/holistic-house/assist-video-message.webp'},
  {key:'clients',label:'clients',hint:'clientsHint',Icon:Users,photo:'/images/holistic-house/support-mock-portrait.webp'},
  {key:'courseList',label:'courses',hint:'coursesHint',Icon:BookOpen,photo:'/images/holistic-house/books-library.webp'},
  {key:'materials',label:'materials',hint:'materialsHint',Icon:FileText,photo:'/images/holistic-house/assist-video-meditation.webp'}
]
export default function PracticeWorkProfileIntro({locale,onAction,activeCount,requestCount,children}){
  const language=['ru','es'].includes(locale)?locale:'en'
  const t=COPY[language]
  const lifeLocale=language==='es'?'en':language
  const hasServices=/^[0-9]+$/.test(String(activeCount))
  const hasRequests=/^[0-9]+$/.test(String(requestCount))&&Number(requestCount)>0
  return <section className={styles.hub} data-profile-hub-tabs data-profile-work-hub data-profile-active="today">
    <header className={styles.heading} data-practice-workspace-heading>
      <HolisticHouseBrand locale={language} section={language==='ru'?'МОЯ РАБОТА':language==='es'?'MI TRABAJO':'MY WORK'} workHomeMarker />
      <div className={styles.profileHeadingActions}>
        <details className={styles.languageSwitch} data-profile-language-switch>
          <summary aria-label={language==='ru'?'Выбрать язык':language==='es'?'Elegir idioma':'Choose language'}>
            {language.toUpperCase()} <ChevronDown size={15} aria-hidden="true"/>
          </summary>
          <div className={styles.languageOptions}>
            {['en','ru','es'].map(code=><Link key={code} href={'/'+code+'/practice'}
              prefetch={false} lang={code} hrefLang={code} aria-current={code===language?'page':undefined}>
              {code.toUpperCase()}</Link>)}
          </div>
        </details>
        <div className={styles.headingNav} data-profile-chrome-navigation>
          <SiteNavigation locale={language} compact />
        </div>
      </div>
    </header>

    <nav className={styles.modes} data-profile-mode-switch data-profile-mode-active="work"
      aria-label={language==='ru'?'Режим профиля':language==='es'?'Modo de perfil':'Profile mode'}>
      <Link href={'/'+lifeLocale+'/my-page'} prefetch={false} data-profile-mode="live"
        className={styles.mode}><Heart size={24} aria-hidden="true"/>{t.life}</Link>
      <Link href={'/'+language+'/practice'} prefetch={false} data-profile-mode="work"
        className={styles.mode+' '+styles.activeMode} aria-current="page">
        <BriefcaseBusiness size={24} aria-hidden="true"/>{t.work}
      </Link>
    </nav>

    <section className={styles.hero} data-work-profile-scenic-hero>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>✧ {t.eyebrow}</span>
        <h1>{t.heading}</h1>
        <p>{t.lead}</p>
      </div>
      <button type="button" className={styles.serviceAction} onClick={()=>onAction('services')}
        data-work-primary-action="services">
        <span className={styles.serviceIcon}><Leaf size={28} aria-hidden="true"/></span>
        <span className={styles.serviceText}>
          <strong>{t.services}</strong>
          <small>{t.servicesHint}</small>
        </span>
        {hasServices&&<span className={styles.activeCount} aria-label={activeCount+' '+t.active}>{activeCount} {t.active}</span>}
        <span className={styles.heroArrow}><ArrowRight size={24} aria-hidden="true"/></span>
      </button>
    </section>

    {children}
    <div className={styles.workGrid} data-work-primary-grid>
      {CARDS.map(({key,label,hint,Icon,photo})=><button type="button" key={key}
        className={styles.workCard} onClick={()=>onAction(key)} data-work-card={key}>
        <span className={styles.cardPhoto}>
          <Image src={photo} alt="" fill sizes="(max-width:640px) 90px, 150px" loading="lazy"/>
        </span>
        <span className={styles.cardBody}>
          <span className={styles.cardIcon}><Icon size={21} aria-hidden="true"/></span>
          <strong>{t[label]}</strong><small>{t[hint]}</small>
        </span>
        {key==='requests'&&hasRequests&&<span className={styles.requestCount}
          aria-label={requestCount+' '+t.new}>{requestCount}</span>}
        <span className={styles.cardArrow} aria-hidden="true"><ArrowRight size={18}/></span>
      </button>)}
    </div>

    <button type="button" onClick={()=>onAction('reports')} className={styles.reportAction}
      data-work-card="reports">
      <span className={styles.reportIcon}><ScrollText size={26} aria-hidden="true"/></span>
      <span><strong>{t.reports}</strong><small>{t.reportsHint}</small></span>
      <ArrowRight size={22} aria-hidden="true"/>
    </button>

  </section>
}

// The presentation remains available without mounting the media player on first paint.
export function PracticeWorkProfilePresentation({locale}){
  const language=['ru','es'].includes(locale)?locale:'en'
  const t=COPY[language]
  const [showVideo,setShowVideo]=useState(false)
  const presentation=showVideo?profilePresentationForLocale(language):null
  return <>
    <div className={styles.presentation} data-work-presentation-disclosure>
      <button type="button" onClick={()=>setShowVideo(value=>!value)}
        aria-expanded={showVideo} aria-controls="work-profile-presentation"
        className={styles.presentationButton}>
        <Play size={17} aria-hidden="true"/>{showVideo?t.hide:t.watch}
        <ChevronDown size={17} aria-hidden="true" className={showVideo?styles.upChevron:undefined}/>
      </button>
      {showVideo&&<div id="work-profile-presentation" className={styles.videoFrame} data-profile-video-hero>
        {presentation?<ProfilePresentationPlayer key={language} locale={language}
          presentation={presentation} poster={POSTER}/>:
          <video controls playsInline preload="none" poster={POSTER}>
            <source src="/videos/holistic-house/film-collection-v3/sun-autumn-hills.mp4" type="video/mp4"/>
            <track kind="captions" src="/videos/holistic-house/profile-scenic.en.vtt" srcLang="en" label="English"/>
          </video>}
      </div>}
    </div>
  </>
}
