import Link from 'next/link'
import { Activity, ArrowRight, BookOpen, CalendarDays, FileText, Route, Settings2, UserRound } from 'lucide-react'
import { ProfileModeSwitch } from '../master-mode-switch'
import styles from './profile-life-dashboard.module.css'

const COPY = {
  en: {
    label: 'MY PERSONAL SPACE', title: 'My Space',
    description: 'Your wellbeing, progress and personal growth — all in one place.',
    path: 'My Path', pathText: 'Continue your journey and next steps.',
    navigation: 'My personal tools',
    state: ['My State', 'Tests, wellbeing and dynamics'],
    courses: ['My Courses', 'Learning and progress'],
    reports: ['My Reports', 'Analyses and guidance'],
    sessions: ['My Sessions', 'Saved consultations'],
    page: ['My Page', 'Personal information'],
    settings: ['Settings', 'Account and preferences'],
  },
  ru: {
    label: 'ЛИЧНОЕ ПРОСТРАНСТВО', title: 'Моё пространство',
    description: 'Ваше состояние, результаты и личностный рост — в одном месте.',
    path: 'Мой путь', pathText: 'Продолжить развитие и следующие шаги.',
    navigation: 'Личные инструменты',
    state: ['Моё состояние', 'Тесты и динамика'],
    courses: ['Мои курсы', 'Обучение и прогресс'],
    reports: ['Мои отчёты', 'Анализы и рекомендации'],
    sessions: ['Мои сессии', 'Сохранённые консультации'],
    page: ['Моя страница', 'Личные данные'],
    settings: ['Настройки', 'Аккаунт и предпочтения'],
  },
  es: {
    label: 'MI ESPACIO PERSONAL', title: 'Mi espacio',
    description: 'Bienestar, progreso y desarrollo personal en un solo lugar.',
    path: 'Mi camino', pathText: 'Continúa tu camino y próximos pasos.',
    navigation: 'Mis herramientas personales',
    state: ['Mi estado', 'Tests y evolución'],
    courses: ['Mis cursos', 'Aprendizaje y progreso'],
    reports: ['Mis informes', 'Análisis y orientación'],
    sessions: ['Mis sesiones', 'Consultas guardadas'],
    page: ['Mi página', 'Información personal'],
    settings: ['Ajustes', 'Cuenta y preferencias'],
  },
}
const CARDS = [
  { id: 'state', icon: Activity },
  { id: 'courses', icon: BookOpen },
  { id: 'reports', icon: FileText },
  { id: 'sessions', icon: CalendarDays },
]

export function ProfileLifeDashboard({ locale = 'en', root, paths, resultCount = null }) {
  const language = Object.hasOwn(COPY, locale) ? locale : 'en'
  const t = COPY[language]
  return <div className={styles.dashboard} data-profile-life-dashboard>
    <div className={styles.modes}><ProfileModeSwitch locale={language} active="live" wide /></div>
    <section className={styles.hero} aria-labelledby="hh-profile-life-title">
      <p className={styles.eyebrow}>✧ {t.label}</p>
      <h1 id="hh-profile-life-title">{t.title}</h1>
      <p className={styles.description}>{t.description}</p>
      <Link href={paths.path} prefetch={false} className={styles.path} data-profile-primary-path>
        <Route size={27} aria-hidden="true" />
        <span><strong>{t.path}</strong><small>{t.pathText}</small></span>
        <ArrowRight size={22} aria-hidden="true" />
      </Link>
    </section>
    <nav className={styles.grid} aria-label={t.navigation}>
      {CARDS.map(({ id, icon: Icon }) => <Link href={paths[id]} key={id} prefetch={false}
        data-profile-card={id} className={styles.card}>
        <span className={styles.photo} data-photo={id} aria-hidden="true" />
        <span className={styles.cardCopy}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          <strong>{t[id][0]}</strong>
          <small>{t[id][1]}</small>
          {id === 'state' && Number.isInteger(resultCount) && resultCount > 0 &&
            <em className={styles.count} aria-label={resultCount + ' completed assessments'}>{resultCount}</em>}
          <ArrowRight className={styles.arrow} size={18} aria-hidden="true" />
        </span>
      </Link>)}
    </nav>
    <nav className={styles.accountActions} aria-label={t.navigation}>
      <Link href={'/' + language + '/my-page'} prefetch={false} data-profile-my-page>
        <UserRound size={22} aria-hidden="true" />
        <span><strong>{t.page[0]}</strong><small>{t.page[1]}</small></span>
      </Link>
      <Link href={root + '/settings'} prefetch={false} data-profile-settings-link>
        <Settings2 size={22} aria-hidden="true" />
        <span><strong>{t.settings[0]}</strong><small>{t.settings[1]}</small></span>
      </Link>
    </nav>
  </div>
}
