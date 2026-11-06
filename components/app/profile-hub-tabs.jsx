import Link from 'next/link'
import { BookOpen, ClipboardList, FileClock, ListChecks, LockKeyhole, Settings2, Sparkles, UserRound } from 'lucide-react'
import { assessmentHistoryTitle } from '@/lib/assessments/personal-guidance'
import styles from './profile-hub-tabs.module.css'

const COPY = {
  ru: {
    eyebrow: 'ЛИЧНОЕ ПРОСТРАНСТВО', title: 'Мой профиль',
    intro: 'Один профиль: создание, сохранённые тесты, личные отчёты и настройки.',
    navigation: 'Разделы личного профиля',
    tabs: { create: 'Создать', view: 'Просмотр', results: 'Результаты', settings: 'Настройки' },
    count: 'прохождений', creationHint: 'Выберите направление и подходящие тесты. Профиль пополняется только реальными сохранёнными результатами.',
    archiveTitle: 'Результаты моих тестов', archiveIntro: 'Все сохранённые прохождения привязаны к вашему защищённому аккаунту, включая повторные тесты.',
    recent: 'Последние прохождения', empty: 'Пока нет сохранённых результатов. Начните с подбора тестов.',
    all: 'Все результаты и графики', history: 'Полная история', choose: 'Мои тесты',
    private: 'Только для вас. Результаты не передаются практику, CRM или мессенджерам при открытии профиля.',
  },
  en: {
    eyebrow: 'MY PERSONAL SPACE', title: 'My profile',
    intro: 'One profile for creation, saved tests, personal reports and settings.',
    navigation: 'Personal profile sections',
    tabs: { create: 'Create', view: 'View', results: 'Results', settings: 'Settings' },
    count: 'test attempts', creationHint: 'Choose an area and suitable tests. Your profile grows only from real saved results.',
    archiveTitle: 'My test results', archiveIntro: 'All saved attempts belong to your protected account, including retakes.',
    recent: 'Recent attempts', empty: 'No saved results yet. Start by choosing tests.',
    all: 'All results & charts', history: 'Full history', choose: 'My tests',
    private: 'Private to you. Opening your profile never sends results to a practitioner, CRM or messenger.',
  },
  es: {
    eyebrow: 'MI ESPACIO PERSONAL', title: 'Mi perfil',
    intro: 'Un perfil para crear, ver pruebas guardadas, informes personales y ajustes.',
    navigation: 'Secciones del perfil personal',
    tabs: { create: 'Crear', view: 'Ver', results: 'Resultados', settings: 'Ajustes' },
    count: 'pruebas realizadas', creationHint: 'Elige un área y pruebas adecuadas. El perfil crece solo con resultados reales guardados.',
    archiveTitle: 'Mis resultados', archiveIntro: 'Todos los resultados guardados pertenecen a tu cuenta protegida, incluidas las repeticiones.',
    recent: 'Pruebas recientes', empty: 'Todavía no hay resultados guardados. Empieza eligiendo pruebas.',
    all: 'Resultados y gráficos', history: 'Historial completo', choose: 'Mis pruebas',
    private: 'Solo para ti. Abrir tu perfil no envía resultados a profesionales, CRM ni mensajería.',
  },
}
const TABS = [
  { id: 'create', icon: Sparkles },
  { id: 'view', icon: UserRound },
  { id: 'results', icon: ClipboardList },
  { id: 'settings', icon: Settings2 },
]

export function ProfileHubTabs({ locale = 'en', active = 'view', resultCount = null }) {
  const selected = COPY[locale] ? locale : 'en'
  const t = COPY[selected]
  // The protected Cabinet has an EN fallback for ES; the public builder is fully ES-localized.
  const accountLocale = selected === 'es' ? 'en' : selected
  const paths = {
    create: '/' + selected + '/personality-profiles',
    view: '/' + accountLocale + '/app/portrait',
    results: '/' + accountLocale + '/app/portfolio',
    settings: '/' + accountLocale + '/app/settings',
  }
  return <section className={styles.hub} data-profile-hub-tabs data-profile-active={active}>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>{t.eyebrow}</p><h2>{t.title}</h2><p>{t.intro}</p></div>
      {Number.isInteger(resultCount) && <span className={styles.count}><ListChecks size={16} aria-hidden="true" />{resultCount} {t.count}</span>}
    </div>
    <nav className={styles.tabs} aria-label={t.navigation}>
      {TABS.map(({ id, icon: Icon }) => <Link key={id} href={paths[id]} prefetch={false}
        data-profile-tab={id} aria-current={active === id ? 'page' : undefined}
        className={active === id ? styles.current : styles.tab}>
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{t.tabs[id]}</span>
      </Link>)}
    </nav>
    {active === 'create' && <p className={styles.hint}>{t.creationHint}</p>}
  </section>
}

export function ProfileResultsArchive({ locale = 'en', results = [] }) {
  const selected = COPY[locale] ? locale : 'en'
  const t = COPY[selected]
  const accountLocale = selected === 'es' ? 'en' : selected
  // Bootstrap 'portrait' is a verified owner-scoped query of ALL assessment_results.
  // Do not group away retakes, persist a second profile, or request other users' data.
  const ordered = (Array.isArray(results) ? results : [])
    .filter(item => item && typeof item.id === 'string' && item.id.length > 0)
    .sort((a, b) => (Date.parse(b.measurementAt || '') || 0) - (Date.parse(a.measurementAt || '') || 0))
  const recent = ordered.slice(0, 5)
  const root = '/' + accountLocale + '/app'
  return <section className={styles.archive} data-profile-results-archive data-saved-result-count={ordered.length}>
    <div className={styles.archiveHeading}>
      <div><h2><ClipboardList size={20} aria-hidden="true" />{t.archiveTitle}</h2><p>{t.archiveIntro}</p></div>
      <strong className={styles.total}>{ordered.length}</strong>
    </div>
    {recent.length ? <div className={styles.recent}>
      <p className={styles.recentLabel}>{t.recent}</p>
      <ul>{recent.map(item => {
        const when = Date.parse(item.measurementAt || '')
        const date = Number.isFinite(when) ? new Intl.DateTimeFormat(
          selected === 'ru' ? 'ru-RU' : selected === 'es' ? 'es-ES' : 'en-CA',
          { dateStyle: 'medium' }).format(new Date(when)) : ''
        return <li key={item.id}>
          <Link href={root + '/results/' + encodeURIComponent(item.id)} prefetch={false}>
            <span>{assessmentHistoryTitle(item, accountLocale) || item.definitionKey || t.archiveTitle}</span>
            {date && <time dateTime={item.measurementAt}>{date}</time>}
          </Link>
        </li>
      })}</ul>
    </div> : <p className={styles.empty}>{t.empty}</p>}
    <div className={styles.actions}>
      <Link href={root + '/portfolio'} prefetch={false}><BookOpen size={17} aria-hidden="true" />{t.all}</Link>
      <Link href={root + '/history'} prefetch={false}><FileClock size={17} aria-hidden="true" />{t.history}</Link>
      <Link href={root + '/tests?filter=completed'} prefetch={false}><ListChecks size={17} aria-hidden="true" />{t.choose}</Link>
    </div>
    <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true" />{t.private}</p>
  </section>
}
