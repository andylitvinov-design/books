'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BarChart3, BookOpen, Brain, CalendarDays,
  Heart, Leaf, Settings2, Sparkles, Target, UserRound, Compass, ChevronDown, BriefcaseBusiness,
} from 'lucide-react'
import styles from './profile-space-dashboard.module.css'
import { ProfileSpaceFocus } from './profile-space-focus'
import ProfileGoalConsole from './profile-goal-console'
import { REIKI_FREE_COURSE_PATH } from '@/lib/academy/reiki-free-course'

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

export function ProfileSpaceDashboard({ locale = 'en', root = '/en/app', resultCount = null, accountId = null }) {
  const selected = Object.hasOwn(TEXT, locale) ? locale : 'en'
  const t = TEXT[selected]
  const [section, setSection] = useState('clarity')
  const [openedStage, setOpenedStage] = useState(null)
  const [selectedNeed, setSelectedNeed] = useState(null)
  const c = CLARITY[selected]
  const diary = { en: ['GOAL DIARY', 'Goal Diary', 'Set, develop and achieve your goals — all in one place.'], ru: ['ДНЕВНИК ЦЕЛЕЙ', 'Дневник целей', 'Постановка, развитие и достижение ваших целей — в одном месте.'], es: ['DIARIO DE METAS', 'Diario de metas', 'Define, desarrolla y alcanza tus metas en un solo lugar.'] }[selected]
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
    { id: 'courses', icon: BookOpen, href: root + '/course?view=courses', title: t.courses, detail: t.coursesDetail },
    { id: 'reports', icon: Brain, href: root + '/portrait?space=reports', title: t.reports, detail: t.reportsDetail },
    { id: 'sessions', icon: CalendarDays, href: root + '/portrait?space=sessions', title: t.sessions, detail: t.sessionsDetail },
  ]

  const support = '/' + selected + '/holistic-support/mobile'
  const personal = support + '?view=consultation'
  const profile = '/' + selected + '/my-page'
  const stages = [
    [diagnostics[0], diagnostics[2], diagnostics[3], {title:t.insights,href:profile}, {title:c.allTests,href:root+'/tests'}],
    [{title:c.practices,href:support+'?view=meditation'+(selectedNeed===1?'&topic=energy':selectedNeed===2?'&topic=love':'')}, {title:c.freeReiki,href:REIKI_FREE_COURSE_PATH.replace(/^\/en\//, '/'+selected+'/')}, cards[1], cards[3], {title:c.consultation,href:personal}],
    [diagnostics[1], {title:c.goal,action:true}, {title:c.plan,href:root+'/my-coaching-plan'}],
  ]
  const stageIcons = [BarChart3,Leaf,Target]
  const needs = [Target,Leaf,Heart,Sparkles]
  function openStage(index, need = null) {
    setSelectedNeed(need)
    setOpenedStage(index)
    if (index !== null) requestAnimationFrame(()=>document.getElementById('clarity-stage-'+index)?.scrollIntoView({block:'nearest',behavior:'smooth'}))
  }

  return <div className={styles.dashboard} data-profile-space-dashboard data-profile-space-section={section}>
    <nav className={styles.profileTabs} aria-label={navigation.label} data-goal-profile-tabs data-profile-mode-switch>
      {tabs.map(({ id, title, icon: Icon }) => <button key={id} type="button"
        className={section === id ? styles.profileTabActive : styles.profileTab}
        onClick={() => setSection(id)} aria-pressed={section === id} data-goal-profile-tab={id}>
        <Icon size={23} aria-hidden="true"/><strong>{title}</strong>
      </button>)}
    </nav>
    {section === 'business' && <section className={styles.business} aria-label={navigation.business} data-profile-business>
      <header className={styles.scenic}>
        <h1 className={styles.title}>{navigation.business}</h1>
        <p className={styles.intro}>{navigation.businessIntro}</p>
      </header>
      <Link href={'/' + selected + '/services'} className={styles.profileInsight} prefetch={false}>
        <BriefcaseBusiness size={23} aria-hidden="true"/>{navigation.businessSupport}<ArrowRight size={19} aria-hidden="true"/>
      </Link>
      <p className={styles.clarityNotice}>{navigation.businessHint}</p>
      <Link href={'/' + selected + '/shamanica/business'} className={styles.profileInsight} prefetch={false}>
        <Compass size={23} aria-hidden="true"/>{navigation.businessTools}<ArrowRight size={19} aria-hidden="true"/>
      </Link>
    </section>}
    {section === 'goals' && <section className={styles.scenic} aria-label={diary[1]} data-profile-space-scenic>
      <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" />{diary[0]}</p>
      <h1 className={styles.title}>{diary[1]}</h1>
      <p className={styles.intro}>{diary[2]}</p>
      <ProfileSpaceFocus locale={selected} root={root} accountId={accountId} />
    </section>}
    {section === 'goals' && <ProfileGoalConsole locale={selected} root={root} accountId={accountId} />}
    {section === 'clarity' && <section className={styles.clarity} aria-label={c.tab} data-profile-clarity-support>
      <header className={styles.clarityHero}>
        <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true"/>{c.start}</p>
        <h1>{c.tab}</h1><p>{c.intro}</p>
        <div className={styles.clarityHeroActions}>
          <button type="button" onClick={()=>openStage(0)}><Compass size={22} aria-hidden="true"/>{c.clarity}<ArrowRight size={21} aria-hidden="true"/></button>
        </div>
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
      <Link href={personal} className={styles.clarityPersonal} prefetch={false} data-clarity-personal>
        <span className={styles.clarityGuidancePhoto} aria-hidden="true"/><span><strong>{c.personal}</strong><small>{c.personalHint}</small></span><span className={styles.clarityPlanButton}>{c.planButton}<ArrowRight size={18} aria-hidden="true"/></span>
      </Link>
      <p className={styles.clarityNotice}>{c.notice}</p>
      <details className={styles.clarityAccount}><summary>{c.account}<ChevronDown size={20} aria-hidden="true"/></summary>
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
    <Link className={styles.profileInsight} href={'/' + selected + '/practice'} prefetch={false}><UserRound size={23} aria-hidden="true" />{t.work}<ArrowRight size={19} aria-hidden="true" /></Link>
      </details>
    </section>}
    {section === 'business' && <Link href={root+'/daybook/business'} className={styles.profileInsight} prefetch={false} data-business-daybook-link>
      <BriefcaseBusiness size={23} aria-hidden="true"/>{{en:'Open Business Daybook',ru:'Открыть бизнес-дайбук',es:'Abrir diario empresarial'}[selected]}<ArrowRight size={19} aria-hidden="true"/>
    </Link>}
  </div>
}
