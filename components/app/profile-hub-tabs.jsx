import Link from 'next/link'
import { Activity, ArrowRight, BookOpen, ClipboardList, FileClock, FileText, House, ListChecks, LockKeyhole, Route, Settings2 } from 'lucide-react'
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
  { id: 'today', icon: House }, { id: 'tests', icon: ClipboardList },
  { id: 'state', icon: Activity }, { id: 'path', icon: Route },
  { id: 'courses', icon: BookOpen }, { id: 'reports', icon: FileText },
]
const STUDIO_COPY = {
  en: {
    title: 'My Space', label: 'MY SPACE · PERSONAL GROWTH', settings: 'Settings',
    tabs: { today: 'Today', tests: 'Tests', state: 'State', path: 'My Path', courses: 'Courses', reports: 'Reports' },
    hero: 'Your path of growth',
    intro: 'Discover yourself, notice changes and choose a meaningful next step — at your own pace.',
    video: 'Scenic introduction to My Space', film: 'Nature film · no narration', route: 'My route',
    actions: ['Take a test', 'Check my state', 'Continue learning'],
    privacy: 'Saved results stay in your protected account.',
    details: { tests: 'Your assessments and chosen tests.', state: 'State check-ins and real saved measurements.', path: 'Verified milestones, goals and personalised learning.', courses: 'Continue your real courses and practices.', reports: 'Saved test attempts and private practitioner reports.' },
  },
  ru: {
    title: 'Моё пространство', label: 'МОЁ ПРОСТРАНСТВО · ЛИЧНОСТНЫЙ РОСТ', settings: 'Настройки',
    tabs: { today: 'Сегодня', tests: 'Тесты', state: 'Замер', path: 'Мой путь', courses: 'Курсы', reports: 'Отчёты' },
    hero: 'Мой путь развития',
    intro: 'Узнавайте себя, замечайте изменения и выбирайте следующий шаг в своём темпе.',
    video: 'Природное вступление в Моё пространство', film: 'Видео о природе · без озвучивания', route: 'Мой маршрут',
    actions: ['Пройти тест', 'Оценить состояние', 'Продолжить курс'],
    privacy: 'Сохранённые результаты остаются в защищённом кабинете.',
    details: { tests: 'Ваши тесты и выбранные опросники.', state: 'Самонаблюдение и реальные сохранённые замеры.', path: 'Подтверждённые шаги, цели и программа развития.', courses: 'Ваши настоящие курсы и практики.', reports: 'Сохранённые попытки и приватные отчёты специалиста.' },
  },
  es: {
    title: 'Mi espacio', label: 'MI ESPACIO · CRECIMIENTO PERSONAL', settings: 'Ajustes',
    tabs: { today: 'Hoy', tests: 'Tests', state: 'Estado', path: 'Mi ruta', courses: 'Cursos', reports: 'Informes' },
    hero: 'Mi camino de crecimiento',
    intro: 'Conócete, observa tus cambios y elige tu próximo paso a tu ritmo.',
    video: 'Introducción visual de naturaleza a Mi espacio', film: 'Vídeo de naturaleza · sin narración', route: 'Mi ruta',
    actions: ['Hacer un test', 'Ver mi estado', 'Seguir aprendiendo'],
    privacy: 'Tus resultados permanecen en tu cuenta privada.',
    details: { tests: 'Tus pruebas y cuestionarios.', state: 'Registro personal y mediciones reales.', path: 'Etapas verificadas, metas y desarrollo.', courses: 'Tus cursos y prácticas.', reports: 'Intentos guardados e informes privados.' },
  },
}
const VIDEO = '/videos/holistic-house/film-collection-v3/sun-autumn-hills.mp4'
const POSTER = '/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg'

export function ProfileHubTabs({ locale = 'en', active = 'today', resultCount = null }) {
  const selected = COPY[locale] ? locale : 'en'
  const t = STUDIO_COPY[selected]
  // Existing protected Cabinet uses EN fallback for ES; do not introduce a new account.
  const accountLocale = selected === 'es' ? 'en' : selected
  const root = '/' + accountLocale + '/app'
  const paths = {
    today: root + '/portrait',
    tests: root + '/tests',
    state: root + '/monitoring',
    path: root + '/portrait?space=path',
    courses: root + '/course?view=courses',
    reports: root + '/portrait?space=reports',
  }
  const current = active === 'view' ? 'today' : active === 'results' ? 'reports' : active
  return <section className={styles.hub} data-profile-hub-tabs data-profile-active={current}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>{t.label}</p><h2>{t.title}</h2></div>
      <Link href={root + '/settings'} prefetch={false} className={styles.settings}>
        <Settings2 size={17} aria-hidden="true" />{t.settings}
      </Link>
    </header>
    <nav className={styles.tabs} aria-label={COPY[selected].navigation}>
      {TABS.map(({ id, icon: Icon }) => <Link key={id} href={paths[id]} prefetch={false}
        data-profile-tab={id} aria-current={current === id ? 'page' : undefined}
        className={current === id ? styles.current : styles.tab}>
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{t.tabs[id]}</span>
      </Link>)}
    </nav>
    {current === 'today' && <>
      <div className={styles.hero} data-profile-video-hero>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t.label}</p>
          <h1>{t.hero}</h1>
          <p>{t.intro}</p>
        </div>
        <div className={styles.videoFrame}>
          <video controls playsInline preload="none" poster={POSTER} aria-label={t.video}>
            <source src={VIDEO} type="video/mp4" />
            <track kind="captions" src="/videos/holistic-house/profile-scenic.en.vtt" srcLang="en" label="English" />
          </video>
        </div>
        <div className={styles.heroFoot}>
          <small>{t.film}</small>
          <Link href={paths.path} prefetch={false}>{t.route}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>
      <div className={styles.quickActions} data-profile-quick-actions>
        <Link href={paths.tests} prefetch={false}><ClipboardList size={19} aria-hidden="true" />{t.actions[0]}</Link>
        <Link href={paths.state} prefetch={false}><Activity size={19} aria-hidden="true" />{t.actions[1]}</Link>
        <Link href={paths.courses} prefetch={false}><BookOpen size={19} aria-hidden="true" />{t.actions[2]}</Link>
      </div>
      <p className={styles.privacyNote}><LockKeyhole size={15} aria-hidden="true" />{t.privacy}</p>
      {Number.isInteger(resultCount) && <p className={styles.count}><ListChecks size={16} aria-hidden="true" />{resultCount} {COPY[selected].count}</p>}
    </>}
    {current !== 'today' && current !== 'create' && <div className={styles.sectionIntro}>
      <h1>{t.tabs[current] || t.title}</h1><p>{t.details[current] || t.privacy}</p>
    </div>}
    {current === 'create' && <p className={styles.hint}>{COPY[selected].creationHint}</p>}
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
