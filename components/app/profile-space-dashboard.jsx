'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BarChart3, BookOpen, Brain, CalendarDays,
  Heart, Leaf, Settings2, Sparkles, Target, UserRound,
} from 'lucide-react'
import styles from './profile-space-dashboard.module.css'
import { ProfileSpaceFocus } from './profile-space-focus'
import ProfileGoalConsole from './profile-goal-console'

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

export function ProfileSpaceDashboard({ locale = 'en', root = '/en/app', resultCount = null, accountId = null }) {
  const selected = Object.hasOwn(TEXT, locale) ? locale : 'en'
  const t = TEXT[selected]
  const [section, setSection] = useState('goals')
  const diary = { en: ['GOAL DIARY', 'Goal Diary', 'Set, develop and achieve your goals — all in one place.', 'Tests', 'Support'], ru: ['ДНЕВНИК ЦЕЛЕЙ', 'Дневник целей', 'Постановка, развитие и достижение ваших целей — в одном месте.', 'Тесты', 'Поддержка'], es: ['DIARIO DE METAS', 'Diario de metas', 'Define, desarrolla y alcanza tus metas en un solo lugar.', 'Tests', 'Apoyo'] }[selected]
  const tabs = [
    { id: 'goals', title: t.goalsTab, icon: Target },
    { id: 'tests', title: diary[3], icon: BarChart3 },
    { id: 'support', title: diary[4], icon: Heart },
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

  return <div className={styles.dashboard} data-profile-space-dashboard data-profile-space-section={section}>
    <nav className={styles.profileTabs} aria-label={diary[1]} data-goal-profile-tabs data-profile-mode-switch>
      {tabs.map(({ id, title, icon: Icon }) => <button key={id} type="button"
        className={section === id ? styles.profileTabActive : styles.profileTab}
        onClick={() => setSection(id)} aria-pressed={section === id} data-goal-profile-tab={id}>
        <Icon size={23} aria-hidden="true"/><strong>{title}</strong>
      </button>)}
    </nav>
    {section === 'goals' && <section className={styles.scenic} aria-label={diary[1]} data-profile-space-scenic>
      <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" />{diary[0]}</p>
      <h1 className={styles.title}>{diary[1]}</h1>
      <p className={styles.intro}>{diary[2]}</p>
      <ProfileSpaceFocus locale={selected} root={root} accountId={accountId} />
    </section>}
    {section === 'goals' && <ProfileGoalConsole locale={selected} root={root} accountId={accountId} />}
    {section === 'tests' && <section className={styles.discovery} data-goal-stage-zero>
      <h2>{t.discovery}</h2><p>{t.discoveryHint}</p>
      <div className={styles.diagnosticGrid}>{diagnostics.map(({ id, title, detail, icon: Icon, href }) =>
        <Link key={id} className={styles.diagnosticCard} href={href} prefetch={false} data-goal-diagnostic={id}>
          <Icon size={28} aria-hidden="true"/><span><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={19} aria-hidden="true"/>
        </Link>)}</div>
      <Link href={'/' + selected + '/my-page'} className={styles.profileInsight} prefetch={false}>
        <UserRound size={23} aria-hidden="true" />{t.insights}<ArrowRight size={19} aria-hidden="true" />
      </Link>
      <Link href={root + '/portrait?space=reports'} className={styles.profileInsight} prefetch={false}>
        <Brain size={23} aria-hidden="true" />{t.reports}<ArrowRight size={19} aria-hidden="true" />
      </Link>
    </section>}
    {section === 'support' && <>
    <h1 className={styles.secondaryTitle}>{t.support}</h1>
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
    </>}
  </div>
}
