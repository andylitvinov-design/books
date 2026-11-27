'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ProfileProgramRequest from './profile-program-request'
import { BUSINESS_SYLLABUS, BUSINESS_REPORT_ROOT, businessSessionScreenshot } from '@/lib/app/business-daybook.mjs'
import {
  ArrowRight, BarChart3, BookOpen, Brain, CalendarDays,
  Heart, Leaf, Settings2, Sparkles, Target, UserRound, Compass, ChevronDown, BriefcaseBusiness, Film,
} from 'lucide-react'
import styles from './profile-space-dashboard.module.css'
import { ProfileSpaceFocus } from './profile-space-focus'
import ProfileGoalConsole from './profile-goal-console'
import { ClarityStartLink } from './clarity-program'
import { ReikiProfileCourseCard, reikiLandingPath } from '@/components/reiki-practitioner-entry'

const TEXT = {
  en: {
    label: 'MY SPACE', title: 'My Space',
    intro: 'Your wellbeing, progress and personal growth — all in one place.',
    life: 'My Life', work: 'My Work',
    path: 'Coaching Daybook', pathDetail: 'Intentions, notes & check-ins.',
    state: 'My Goals & Coaching Reports', stateDetail: 'Goals, actions & session reports',
    courses: 'My Courses', coursesDetail: 'My learning and progress',
    reports: 'My Psychic Health', reportsDetail: 'Tests & therapy plan',
    sessions: 'My Sessions', sessionsDetail: 'Saved consultations and history',
    page: 'My Page', pageDetail: 'My profile and info',
    settings: 'Settings', settingsDetail: 'Preferences and account',
    completed: 'saved test results',
    support: 'My Support', supportDetail: 'Practices, courses & sessions',
    testsTab: 'My Tests & Wishes', testsDetail: 'Balance, meaning & self-discovery',
    goalsTab: 'My Goals', goalsDetail: 'Direction & 8 coaching stages',
    discovery: 'Stage 0 · Self Discovery', discoveryHint: 'Explore your balance and wishes before choosing a goal.',
    lifeWheel: 'Life Balance Wheel', lifeWheelDetail: 'Life areas · now and desired',
    meanings: 'Meaning Wheel', meaningsDetail: 'Eight axes of meaning',
    situation: 'Situation Diagnostics', situationDetail: 'Discover wishes and resources',
    wuxing: 'Wu Xing Profile', wuxingDetail: 'Five-elements self-discovery',
    insights: 'My Profile & Insights',
  },
  ru: {
    label: 'МОЁ ПРОСТРАНСТВО', title: 'Моё пространство',
    intro: 'Самочувствие, развитие и личные результаты — всё в одном месте.',
    life: 'Моя жизнь', work: 'Моя работа',
    path: 'Дневник коучинга', pathDetail: 'Цели, заметки и ежедневные шаги.',
    state: 'Мои цели и отчёты коучинга', stateDetail: 'Цели, действия и итоги сессий',
    courses: 'Мои курсы', coursesDetail: 'Обучение и прогресс',
    reports: 'Моё психическое здоровье', reportsDetail: 'Тесты и план терапии',
    sessions: 'Мои сессии', sessionsDetail: 'Сохранённые консультации',
    page: 'Моя страница', pageDetail: 'Профиль и информация',
    settings: 'Настройки', settingsDetail: 'Личные параметры и аккаунт',
    completed: 'сохранённых тестов',
    support: 'Моя поддержка', supportDetail: 'Практики, курсы и сессии',
    testsTab: 'Мои тесты и желания', testsDetail: 'Баланс, смыслы, самопознание',
    goalsTab: 'Мои цели', goalsDetail: 'Направление и 8 этапов',
    discovery: 'Этап 0 · Познать себя', discoveryHint: 'Исследуйте свои желания и ресурсы до выбора цели.',
    lifeWheel: 'Колесо баланса', lifeWheelDetail: 'Сферы жизни · сейчас и желаемое',
    meanings: 'Колесо смыслов', meaningsDetail: 'Восемь смысловых осей',
    situation: 'Анализ ситуации', situationDetail: 'Желания, ресурсы, ограничения',
    wuxing: 'Диагностика У-Син', wuxingDetail: 'Пять элементов и качества',
    insights: 'Мой профиль и рекомендации',
  },
  es: {
    label: 'MI ESPACIO', title: 'Mi espacio',
    intro: 'Bienestar, progreso y crecimiento personal en un solo lugar.',
    life: 'Mi vida', work: 'Mi trabajo',
    path: 'Diario de coaching', pathDetail: 'Intenciones, notas y seguimiento.',
    state: 'Mis metas e informes de coaching', stateDetail: 'Metas, acciones y sesiones',
    courses: 'Mis cursos', coursesDetail: 'Aprendizaje y progreso',
    reports: 'Mi salud mental', reportsDetail: 'Tests y plan terapéutico',
    sessions: 'Mis sesiones', sessionsDetail: 'Consultas guardadas',
    page: 'Mi página', pageDetail: 'Perfil e información',
    settings: 'Ajustes', settingsDetail: 'Preferencias y cuenta',
    completed: 'tests guardados',
    support: 'Mi apoyo', supportDetail: 'Prácticas, cursos y sesiones',
    testsTab: 'Mis pruebas y deseos', testsDetail: 'Equilibrio, significado y deseos',
    goalsTab: 'Mis metas', goalsDetail: 'Dirección y 8 etapas',
    discovery: 'Etapa 0 · Autoconocimiento', discoveryHint: 'Explora tus deseos y recursos antes de elegir una meta.',
    lifeWheel: 'Rueda de equilibrio', lifeWheelDetail: 'Vida: situación actual y deseada',
    meanings: 'Rueda de significado', meaningsDetail: 'Ocho ejes personales',
    situation: 'Análisis de situación', situationDetail: 'Deseos y recursos',
    wuxing: 'Perfil Wu Xing', wuxingDetail: 'Cinco elementos y cualidades',
    insights: 'Mi perfil e ideas',
  },
}

const CLARITY = {
  en: {
    tab:'Clarity & Support', start:'START HERE', intro:'Find direction, restore your energy and create a clear next step.',
    clarity:'Start Free Program', question:'Where would you like to begin?', program:'3-Step Clarity Program', programHint:'A practical path to understanding, support and your next goal.', planButton:'Get My Plan Now',
    needs:[['I don’t know my goal','Clarify wishes and direction'],['Low energy & health','Check body, stress and vitality'],['Emotional support','Anxiety, overwhelm, relationships'],['Need clarity','Understand your situation and next step']],
    stages:[['Clarify Your Situation','Understand what’s happening now: needs, challenges and resources.'],['Support Your State & Energy','Restore balance, release tension and recharge your vitality.'],['Analyze & Choose Your Goal','Define a clear direction, set your goal and create a simple plan.']],
    practices:'Free guided practices', freeReiki:'Free Reiki practices & learning', allTests:'Explore tests', goal:'Create a new goal', plan:'My coaching plan', consultation:'Explore personal support', personal:'Get Personal Guidance', personalHint:'Get personal guidance and recommendations', account:'My library & account', notice:'Self-reflection and wellbeing tools are not medical diagnosis or treatment. For health concerns, seek qualified medical care.'
  },
  ru: {
    tab:'Ясность и поддержка', start:'НАЧНИТЕ ЗДЕСЬ', intro:'Проясните ситуацию, восстановите силы и найдите свой следующий шаг.',
    clarity:'Начать бесплатно', question:'С чего хотите начать?', program:'3 шага к ясности', programHint:'Путь к пониманию, поддержке и новой цели.', planButton:'Получить мой план',
    needs:[['Не знаю свою цель','Понять желания и направление'],['Энергия и здоровье','Тело, стресс и жизненные силы'],['Эмоциональная поддержка','Тревога, напряжение, отношения'],['Нужна ясность','Понять ситуацию и следующий шаг']],
    stages:[['Прояснение ситуации','Понять происходящее: потребности, трудности и ресурсы.'],['Поддержка состояния и энергии','Снизить напряжение и восстановить внутренние ресурсы.'],['Анализ и выбор цели развития','Определить направление, сформулировать цель и план.']],
    practices:'Бесплатные практики', freeReiki:'Бесплатное обучение и практики Рейки', allTests:'Все тесты', goal:'Создать новую цель', plan:'Мой план коучинга', consultation:'Подобрать личную поддержку', personal:'Персональная поддержка', personalHint:'Персональный анализ и рекомендации', account:'Мои материалы и аккаунт', notice:'Инструменты самопознания не заменяют медицинскую диагностику и лечение. При проблемах со здоровьем обратитесь к медицинскому специалисту.'
  },
  es: {
    tab:'Claridad y apoyo', start:'EMPIEZA AQUÍ', intro:'Comprende tu situación, recupera energía y elige tu siguiente paso.',
    clarity:'Empezar gratis', question:'¿Por dónde quieres empezar?', program:'3 pasos hacia la claridad', programHint:'Un camino hacia la comprensión, el apoyo y tu próxima meta.', planButton:'Obtener mi plan',
    needs:[['No conozco mi meta','Aclara tus deseos y rumbo'],['Energía y salud','Cuerpo, estrés y vitalidad'],['Apoyo emocional','Ansiedad, agobio y relaciones'],['Necesito claridad','Comprende tu situación y próximo paso']],
    stages:[['Aclara tu situación','Comprende tus necesidades, retos y recursos.'],['Apoya tu estado y energía','Recupera el equilibrio y reduce la tensión.'],['Analiza y elige tu meta','Define tu rumbo, tu meta y un plan sencillo.']],
    practices:'Prácticas guiadas gratuitas', freeReiki:'Prácticas y aprendizaje Reiki gratuitos', allTests:'Explorar tests', goal:'Crear una nueva meta', plan:'Mi plan de coaching', consultation:'Explorar apoyo personal', personal:'Solicitar orientación personal', personalHint:'Orientación y recomendaciones personales', account:'Mi biblioteca y cuenta', notice:'Estas herramientas de reflexión no sustituyen el diagnóstico ni el tratamiento médico. Para problemas de salud, consulta a un profesional sanitario.'
  }
}

const BUSINESS = {
  en:{
    label:'BUSINESS PROGRAM',title:'My Business',intro:'Find direction, build structure and grow your business with clarity and support.',
    start:'Start Program',details:'Request Details',question:'What do you need for your business?',program:'8-Session Business Program',hint:'A practical path from vision to execution.',next:'Discuss this session',tools:'Business insights & energy support',
    topics:[['Strategy & Direction','Clarify your vision and growth path'],['Structure & Team','Build an effective organization'],['Growth & Resources','Activate resources and opportunities'],['Execution & Results','Turn your plan into real progress']],
    sessions:BUSINESS_SYLLABUS.en,
  },
  ru:{
    label:'БИЗНЕС-ПРОГРАММА',title:'Мой бизнес',intro:'Найдите направление, выстройте структуру и развивайте бизнес с поддержкой.',
    start:'Начать программу',details:'Запросить детали',question:'Что нужно вашему бизнесу?',program:'8 сессий для бизнеса',hint:'Практический путь от стратегии к результатам.',next:'Обсудить эту сессию',tools:'Анализ и энергетическая поддержка бизнеса',
    topics:[['Стратегия и направление','Видение и путь роста'],['Структура и команда','Эффективная организация'],['Рост и ресурсы','Ресурсы и возможности'],['Реализация и результаты','От плана к результату']],
    sessions:BUSINESS_SYLLABUS.ru,
  },
  es:{
    label:'PROGRAMA EMPRESARIAL',title:'Mi negocio',intro:'Define tu rumbo, construye una estructura y haz crecer tu negocio con claridad y apoyo.',
    start:'Iniciar programa',details:'Solicitar detalles',question:'¿Qué necesita tu negocio?',program:'8 sesiones empresariales',hint:'Un camino práctico de la visión a la ejecución.',next:'Consultar sobre esta sesión',tools:'Análisis y apoyo energético empresarial',
    topics:[['Estrategia y rumbo','Aclara tu visión y crecimiento'],['Estructura y equipo','Crea una organización eficaz'],['Crecimiento y recursos','Activa recursos y oportunidades'],['Ejecución y resultados','Convierte tu plan en avances']],
    sessions:BUSINESS_SYLLABUS.es,
  },
}

const BUSINESS_PROGRAM_COPY={
  "en": {
    "report": "Business development report",
    "phases": [
      "I · Strategic design",
      "II · Practical transformation"
    ],
    "book": "Arrange a session",
    "request": "I would like details and to arrange the 8-session business coaching programme.",
    "preview": "Session overview",
    "previewLanguage": "",
    "note": "Please send your message in the messenger to request a session."
  },
  "ru": {
    "report": "Программа развития бизнеса · PDF",
    "phases": [
      "I · Стратегическое проектирование",
      "II · Практическая трансформация"
    ],
    "book": "Записаться на сессию",
    "request": "Хочу узнать подробности и записаться на программу бизнес-коучинга из 8 сессий.",
    "preview": "Описание сессии",
    "previewLanguage": "",
    "note": "Отправьте сообщение в мессенджере, чтобы запросить запись."
  },
  "es": {
    "report": "Programa de desarrollo empresarial · PDF",
    "phases": [
      "I · Diseño estratégico",
      "II · Transformación práctica"
    ],
    "book": "Reservar una sesión",
    "request": "Quiero conocer los detalles y solicitar una sesión del programa empresarial de 8 sesiones.",
    "preview": "Descripción de la sesión",
    "previewLanguage": "Vista del PDF en inglés",
    "note": "Envía el mensaje en la aplicación para solicitar una sesión."
  }
}
const businessTopicSessions=[0,1,3,7]

function BusinessReportDownloads({locale,position}) {
  return <section className={styles.businessReports} data-business-report-links={position} aria-label={BUSINESS_PROGRAM_COPY[locale].report}>
    <strong><BookOpen size={19} aria-hidden="true"/>{BUSINESS_PROGRAM_COPY[locale].report}</strong>
    <div><a href={BUSINESS_REPORT_ROOT+'/ru.pdf'} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" lang="ru">Русский · PDF</a><a href={BUSINESS_REPORT_ROOT+'/en.pdf'} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" lang="en">English · PDF</a></div>
  </section>
}

export function ProfileSpaceDashboard({ locale = 'en', root = '/en/app', resultCount = null, accountId = null, embeddedSection = null }) {
  const selected = Object.hasOwn(TEXT, locale) ? locale : 'en'
  const t = TEXT[selected]
  const videoHint = {en:'Create videos for yourself, loved ones and work.',ru:'Создавайте видео для себя, близких и работы.',es:'Crea vídeos para ti, tus seres queridos y el trabajo.'}[selected]
  const [localSection, setSection] = useState('clarity')
  const section = embeddedSection || localSection
  const [openedStage, setOpenedStage] = useState(null)
  const [selectedNeed, setSelectedNeed] = useState(null)
  const c = CLARITY[selected]
  const b = BUSINESS[selected]
  const [businessStage, setBusinessStage] = useState(null)
  const [businessContactOpen, setBusinessContactOpen] = useState(false)
  const bp = BUSINESS_PROGRAM_COPY[selected]
  const businessIcons = [Compass, BriefcaseBusiness, UserRound, BarChart3, Settings2, Target, Sparkles, CalendarDays]
  function requestBusinessSession() {
    setBusinessContactOpen(true)
    requestAnimationFrame(() => document.getElementById('business-contact-options')?.scrollIntoView({block:'center',behavior:'smooth'}))
  }
  function openBusinessStage(index) {
    setBusinessStage(index)
    if (index !== null) requestAnimationFrame(() => document.getElementById('business-session-'+index)?.scrollIntoView({block:'start',behavior:'smooth'}))
  }
  const navigation = {
    en: { label: 'My Space', clarity: 'Clarity', goal: 'My Goal', business: 'My Business', businessIntro: 'Find direction and support for your business.', businessSupport: 'Business consulting & support', businessTools: 'Business insights & energy support', businessHint: 'Choose For Business on the Support page.' },
    ru: { label: 'Моё пространство', clarity: 'Ясность', goal: 'Моя цель', business: 'Мой бизнес', businessIntro: 'Найдите направление и поддержку для своего бизнеса.', businessSupport: 'Бизнес-консалтинг и поддержка', businessTools: 'Анализ и энергетическая поддержка бизнеса', businessHint: 'Выберите «Для бизнеса» на странице поддержки.' },
    es: { label: 'Mi espacio', clarity: 'Claridad', goal: 'Mi meta', business: 'Mi negocio', businessIntro: 'Encuentra dirección y apoyo para tu negocio.', businessSupport: 'Consultoría y apoyo empresarial', businessTools: 'Análisis y apoyo energético empresarial', businessHint: 'Elige «Para mi negocio» en la página de apoyo.' },
  }[selected]
  const tabs = [
    { id: 'clarity', title: navigation.clarity, icon: Compass },
    { id: 'goals', title: navigation.goal, icon: Target },
    { id: 'business', title: navigation.business, icon: BriefcaseBusiness },
  ]
  const diagnostics = [
    { id: 'life', title: t.lifeWheel, detail: t.lifeWheelDetail, icon: BarChart3, href: '/' + selected + '/development-vectors' },
    { id: 'meaning', title: t.meanings, detail: t.meaningsDetail, icon: Leaf, href: '/' + selected + '/development-vectors' },
    { id: 'situation', title: t.situation, detail: t.situationDetail, icon: Target, href: root + '/tests' },
    { id: 'wuxing', title: t.wuxing, detail: t.wuxingDetail, icon: Sparkles, href: root + '/tests' },
  ]
  const cards = [
    { id: 'state', icon: Target, href: root + '/my-coaching-plan', title: t.state, detail: t.stateDetail },
    { id: 'courses', icon: BookOpen, href: accountId ? '/'+selected+'/my-page#my-courses' : root + '/course?view=courses', title: t.courses, detail: t.coursesDetail },
    { id: 'reports', icon: Brain, href: root + '/portrait?space=reports', title: t.reports, detail: t.reportsDetail },
    { id: 'sessions', icon: CalendarDays, href: root + '/portrait?space=sessions', title: t.sessions, detail: t.sessionsDetail },
  ]

  const support = '/' + selected + '/holistic-support/mobile'
  const personal = support + '?view=consultation'
  const profile = '/' + selected + '/my-page'
  const stages = [
    [diagnostics[0], diagnostics[2], diagnostics[3], {title:t.insights,href:profile}, {title:c.allTests,href:root+'/tests'}],
    [{title:c.practices,href:support+'?view=meditation'+(selectedNeed===1?'&topic=energy':selectedNeed===2?'&topic=love':'')}, {title:c.freeReiki,href:reikiLandingPath(selected)}, cards[1], cards[3], {title:c.consultation,href:personal}],
    [diagnostics[1], {title:c.goal,action:true}, {title:c.plan,href:root+'/my-coaching-plan'}],
  ]
  const stageIcons = [BarChart3,Leaf,Target]
  const needs = [Target,Leaf,Heart,Sparkles]
  function openStage(index, need = null) {
    setSelectedNeed(need)
    setOpenedStage(index)
    if (index !== null) requestAnimationFrame(()=>document.getElementById('clarity-stage-'+index)?.scrollIntoView({block:'nearest',behavior:'smooth'}))
  }

  // Signed-in course management lives only in My Page. Guest discovery remains available.
  if (accountId && !embeddedSection) return <Link href={profile+'#my-courses'} className={styles.profileInsight} prefetch={false} data-profile-my-page-courses-entry><BookOpen size={23} aria-hidden="true"/>{t.courses}<ArrowRight size={19} aria-hidden="true"/></Link>
  return <div className={styles.dashboard} data-profile-space-dashboard data-profile-space-section={section} data-my-page-embedded-program={embeddedSection || undefined}>
    {!embeddedSection && <nav className={styles.profileTabs} aria-label={navigation.label} data-goal-profile-tabs data-profile-mode-switch>
      {tabs.map(({ id, title, icon: Icon }) => <button key={id} type="button"
        className={section === id ? styles.profileTabActive : styles.profileTab}
        onClick={() => setSection(id)} aria-pressed={section === id} data-goal-profile-tab={id}>
        <Icon size={23} aria-hidden="true"/><strong>{title}</strong>
      </button>)}
    </nav>}
    {section === 'business' && <section className={styles.businessProgram} aria-label={b.title} data-profile-business>
      <header className={styles.businessHero}>
        <p className={styles.businessEyebrow}><BriefcaseBusiness size={19} aria-hidden="true"/>{b.label}</p>
        <h1>{b.title}</h1>
        <p className={styles.businessIntro}>{b.intro}</p>
        <ProfileProgramRequest locale={selected} program="business" open={businessContactOpen} onOpenChange={setBusinessContactOpen} request={bp.request} option={b.program}/>
      </header>
      <BusinessReportDownloads locale={selected} position="top"/>
      <h2 className={styles.businessHeading}>{b.question}</h2>
      <div className={styles.businessTopics}>{b.topics.map(([title,detail],index)=>
        <button key={index} type="button" className={styles.businessTopic} data-business-topic={index} aria-pressed={businessStage===businessTopicSessions[index]} onClick={()=>openBusinessStage(businessTopicSessions[index])}>
          <span className={styles.businessPhoto} data-business-photo={index} aria-hidden="true"/>
          <span className={styles.businessTopicCopy}><strong>{title}</strong><small>{detail}</small></span>
          <ArrowRight size={16} aria-hidden="true"/>
        </button>
      )}</div>
      <h2 className={styles.businessHeading}>{b.program}</h2>
      <p className={styles.businessHint}>{b.hint}</p>
      <div className={styles.businessSessions}>{b.sessions.map(([title,detail,practices],index)=>{
        const Icon=businessIcons[index], expanded=businessStage===index
        return <div key={index} className={styles.businessSessionGroup}>
          {(index===0||index===4)&&<h3 className={styles.businessPhase}>{bp.phases[index===0?0:1]}</h3>}
          <article className={styles.businessSession} data-business-session={index} id={'business-session-'+index}>
          <button type="button" className={styles.businessStep} aria-expanded={expanded} aria-controls={'business-content-'+index} onClick={()=>openBusinessStage(expanded?null:index)}>
            <span className={styles.businessNumber}>{index+1}</span><Icon size={23} aria-hidden="true"/>
            <span className={styles.businessStepCopy}><strong>{title}</strong><small>{detail}</small></span><ChevronDown size={19} aria-hidden="true"/>
          </button>
          <div className={styles.businessInstruction} id={'business-content-'+index} hidden={!expanded}>
            {expanded&&<div className={styles.businessSessionScreen} data-business-session-screen={index+1}>
              {bp.previewLanguage&&<p>{bp.previewLanguage}</p>}
              <Image src={businessSessionScreenshot(selected,index+1)} alt={bp.preview+' '+(index+1)+': '+title} width={780} height={1387} unoptimized loading="lazy"/>
              <div className={styles.businessScreenText}>{practices.map(([name,description])=><p key={name}><strong>{name}.</strong> {description}</p>)}</div>
              <button type="button" className={styles.businessSessionBook} onClick={requestBusinessSession}>{b.next}<ArrowRight size={18} aria-hidden="true"/></button>
            </div>}
          </div>
        </article></div>
      })}</div>
      <BusinessReportDownloads locale={selected} position="bottom"/>
      <Link href={'/' + selected + '/shamanica/business'} className={styles.profileInsight} prefetch={false}>
        <Compass size={23} aria-hidden="true"/>{b.tools}<ArrowRight size={19} aria-hidden="true"/>
      </Link>
    </section>}
    {section === 'goals' && <ProfileGoalConsole locale={selected} root={root} accountId={accountId}>
      <ProfileSpaceFocus locale={selected} root={root} accountId={accountId} />
    </ProfileGoalConsole>}
    {section === 'clarity' && <section className={styles.clarity} aria-label={c.tab} data-profile-clarity-support>
      <header className={styles.clarityHero}>
        <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true"/>{c.start}</p>
        <h1>{c.tab}</h1><p>{c.intro}</p>
        <ProfileProgramRequest locale={selected} program="clarity"/>
      </header>
      <h2 className={styles.clarityHeading}>{c.question}</h2>
      <div className={styles.clarityNeeds}>{c.needs.map(([title,detail],index)=>{
        const Icon=needs[index]
        return <button key={title} type="button" className={styles.clarityNeed} data-clarity-need={index}
          aria-pressed={selectedNeed===index} onClick={()=>openStage([2,1,1,0][index],index)}>
          <span className={styles.clarityNeedPhoto} data-need-photo={index} aria-hidden="true"/><span className={styles.clarityNeedCopy}><strong><Icon size={19} aria-hidden="true"/>{title}</strong><small>{detail}</small></span><ArrowRight size={17} aria-hidden="true"/>
        </button>
      })}</div>
      <h2 className={styles.clarityHeading}>{c.program}</h2><p className={styles.clarityProgramHint}>{c.programHint}</p>
      <div className={styles.clarityStages}>{c.stages.map(([title,detail],index)=>{
        const Icon=stageIcons[index]
        const expanded=openedStage===index
        return <article key={index} className={styles.clarityStage} data-clarity-stage={index} id={'clarity-stage-'+index}>
          <button className={styles.clarityStep} type="button" aria-expanded={expanded} aria-controls={'clarity-tools-'+index} onClick={()=>openStage(expanded?null:index)}>
            <span className={styles.clarityStagePhoto} data-stage-photo={index} aria-hidden="true"><b>{index+1}</b></span><span className={styles.clarityStageCopy}><strong><Icon size={22} aria-hidden="true"/>{title}</strong><small>{detail}</small></span><ArrowRight size={19} aria-hidden="true"/>
          </button>
          <div className={styles.clarityTools} id={'clarity-tools-'+index} hidden={!expanded}>
            {stages[index].map((tool)=>tool.action ?
              <Link key={tool.title} href={root+'/daybook?start=vector'} prefetch={false}>{tool.title}<ArrowRight size={17} aria-hidden="true"/></Link> :
              <Link key={tool.title} href={tool.href} prefetch={false} data-goal-diagnostic={tool.id}>{tool.title}<ArrowRight size={17} aria-hidden="true"/></Link>)}
          </div>
        </article>
      })}</div>
      <ClarityStartLink locale={selected} className={styles.clarityPersonal}>
        <span className={styles.clarityGuidancePhoto} aria-hidden="true"/><span><strong>{c.personal}</strong><small>{c.personalHint}</small></span><span className={styles.clarityPlanButton}>{c.planButton}<ArrowRight size={18} aria-hidden="true"/></span>
      </ClarityStartLink>
      {!embeddedSection && <ReikiProfileCourseCard locale={selected} />}
      <p className={styles.clarityNotice}>{c.notice}</p>
      {!embeddedSection && <details className={styles.clarityAccount}><summary>{c.account}<ChevronDown size={20} aria-hidden="true"/></summary>
      <Link href={profile} className={styles.profileInsight} prefetch={false}>
        <UserRound size={23} aria-hidden="true"/>{t.insights}<ArrowRight size={19} aria-hidden="true"/>
      </Link>
      <Link href={root+'/portrait?space=reports'} className={styles.profileInsight} prefetch={false}>
        <Brain size={23} aria-hidden="true"/>{t.reports}<ArrowRight size={19} aria-hidden="true"/>
      </Link>

    <div className={styles.cards} data-profile-space-cards>
      {cards.map(({ id, icon: Icon, href, title, detail }) =>
        <Link key={id} className={styles.card} href={href} prefetch={false}
          data-profile-space-card={id} aria-label={title + '. ' + detail}>
          <span className={styles.photo} data-profile-photo={id} aria-hidden="true" />
          <span className={styles.cardBody}>
            <span className={styles.cardIcon} aria-hidden="true"><Icon size={21}/></span>
            <strong>{title}</strong>
            {id === 'reports' && Number.isInteger(resultCount) && resultCount > 0
              && <span className={styles.count} aria-label={resultCount + ' ' + t.completed}>{resultCount}</span>}
            <small>{detail}</small>
          </span>
          <ArrowRight className={styles.cardArrow} size={18} aria-hidden="true"/>
        </Link>
      )}
    </div>
    <nav className={styles.account} aria-label={t.label}>
      <Link href={'/' + selected + '/my-page'} prefetch={false} data-profile-my-page>
        <UserRound size={23} aria-hidden="true"/>
        <span><strong>{t.page}</strong><small>{t.pageDetail}</small></span>
      </Link>
      <Link href={root + '/settings'} prefetch={false} data-profile-settings-link>
        <Settings2 size={23} aria-hidden="true"/>
        <span><strong>{t.settings}</strong><small>{t.settingsDetail}</small></span>
      </Link>
    </nav>
    <Link className={styles.profileInsight} href={'/' + selected + '/practice'} prefetch={false} data-profile-space-work><UserRound size={23} aria-hidden="true" />{t.work}<ArrowRight size={19} aria-hidden="true" /></Link>
      </details>}
    </section>}
    {section === 'business' && <Link href={root+'/daybook/business'} className={styles.profileInsight} prefetch={false} data-business-daybook-link>
      <BriefcaseBusiness size={23} aria-hidden="true"/>{{en:'Open Business Daybook',ru:'Открыть бизнес-дайбук',es:'Abrir diario empresarial'}[selected]}<ArrowRight size={19} aria-hidden="true"/>
    </Link>}
    {!embeddedSection && <Link href={'/' + selected + '/holistic-support/mandala'} prefetch={false} className={styles.myVideoCard} data-profile-my-video>
      <span className={styles.myVideoIcon}><Film size={25} strokeWidth={1.8} aria-hidden="true"/></span>
      <span className={styles.myVideoCopy}><strong>MyVideo</strong><small>{videoHint}</small></span>
      <ArrowRight size={20} aria-hidden="true"/>
    </Link>}
  </div>
}
