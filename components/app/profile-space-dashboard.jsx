import Link from 'next/link'
import {
  ArrowRight, BookOpen, Brain, BriefcaseBusiness, CalendarDays,
  Heart, Route, Settings2, Sparkles, Target, UserRound,
} from 'lucide-react'
import styles from './profile-space-dashboard.module.css'

const TEXT = {
  en: {
    label: 'MY SPACE', title: 'My Space',
    intro: 'Your wellbeing, progress and personal growth — all in one place.',
    life: 'My Life', work: 'My Work',
    path: 'My Path', pathDetail: 'Continue your journey and next steps.',
    state: 'My Goals & Coaching Reports', stateDetail: 'Goals, actions & session reports',
    courses: 'My Courses', coursesDetail: 'My learning and progress',
    reports: 'My Psychic Health', reportsDetail: 'Tests & therapy plan',
    sessions: 'My Sessions', sessionsDetail: 'Saved consultations and history',
    page: 'My Page', pageDetail: 'My profile and info',
    settings: 'Settings', settingsDetail: 'Preferences and account',
    completed: 'saved test results',
  },
  ru: {
    label: 'МОЁ ПРОСТРАНСТВО', title: 'Моё пространство',
    intro: 'Самочувствие, развитие и личные результаты — всё в одном месте.',
    life: 'Моя жизнь', work: 'Моя работа',
    path: 'Мой путь', pathDetail: 'Продолжить развитие и следующие шаги.',
    state: 'Мои цели и отчёты коучинга', stateDetail: 'Цели, действия и итоги сессий',
    courses: 'Мои курсы', coursesDetail: 'Обучение и прогресс',
    reports: 'Моё психическое здоровье', reportsDetail: 'Тесты и план терапии',
    sessions: 'Мои сессии', sessionsDetail: 'Сохранённые консультации',
    page: 'Моя страница', pageDetail: 'Профиль и информация',
    settings: 'Настройки', settingsDetail: 'Личные параметры и аккаунт',
    completed: 'сохранённых тестов',
  },
  es: {
    label: 'MI ESPACIO', title: 'Mi espacio',
    intro: 'Bienestar, progreso y crecimiento personal en un solo lugar.',
    life: 'Mi vida', work: 'Mi trabajo',
    path: 'Mi camino', pathDetail: 'Continúa tu recorrido y próximos pasos.',
    state: 'Mis metas e informes de coaching', stateDetail: 'Metas, acciones y sesiones',
    courses: 'Mis cursos', coursesDetail: 'Aprendizaje y progreso',
    reports: 'Mi salud mental', reportsDetail: 'Tests y plan terapéutico',
    sessions: 'Mis sesiones', sessionsDetail: 'Consultas guardadas',
    page: 'Mi página', pageDetail: 'Perfil e información',
    settings: 'Ajustes', settingsDetail: 'Preferencias y cuenta',
    completed: 'tests guardados',
  },
}

export function ProfileSpaceDashboard({ locale = 'en', root = '/en/app', resultCount = null }) {
  const selected = Object.hasOwn(TEXT, locale) ? locale : 'en'
  const t = TEXT[selected]
  const cards = [
    { id: 'state', icon: Target, href: root + '/my-coaching-plan', title: t.state, detail: t.stateDetail },
    { id: 'courses', icon: BookOpen, href: root + '/course?view=courses', title: t.courses, detail: t.coursesDetail },
    { id: 'reports', icon: Brain, href: root + '/portrait?space=reports', title: t.reports, detail: t.reportsDetail },
    { id: 'sessions', icon: CalendarDays, href: root + '/portrait?space=sessions', title: t.sessions, detail: t.sessionsDetail },
  ]

  return <div className={styles.dashboard} data-profile-space-dashboard>
    <nav className={styles.mode} aria-label={t.label}>
      <Link className={styles.life} href={root + '/portrait'} prefetch={false}
        aria-current="page" data-profile-space-life><Heart size={20} aria-hidden="true" />{t.life}</Link>
      <Link className={styles.work} href={'/' + selected + '/practice'} prefetch={false}
        data-profile-space-work><BriefcaseBusiness size={20} aria-hidden="true" />{t.work}</Link>
    </nav>
    <section className={styles.scenic} aria-label={t.title} data-profile-space-scenic>
      <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" />{t.label}</p>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>
      <Link className={styles.path} href={root + '/portrait?space=path'} prefetch={false}
        data-profile-space-path>
        <span className={styles.pathIcon} aria-hidden="true"><Route size={30}/></span>
        <span className={styles.pathText}><strong>{t.path}</strong><small>{t.pathDetail}</small></span>
        <ArrowRight className={styles.pathArrow} size={23} aria-hidden="true"/>
      </Link>
    </section>
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
  </div>
}
