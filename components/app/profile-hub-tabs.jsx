import Link from 'next/link'
import InstantCabinetLink from './instant-cabinet-link'
import { Activity, BookOpen, ClipboardList, FileClock, FileText, House, LockKeyhole, ListChecks, Route, Settings2 } from 'lucide-react'
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
// Announced packages are informative until server-authoritative billing verifies prices.
// Never treat a selected UI card as a paid subscription or confirmed checkout.
const NEW_PACKAGES = [
  { key: 'free', amount: 0 },
  { key: 'practice', amount: 5 },
  { key: 'master', amount: 20 },
  { key: 'pro', amount: 40 },
]
const SETTINGS_HUB_COPY = {
  en: { menu: 'Profile sections', pageTitle: 'My profile', account: 'Account & privacy', messenger: 'Messengers', plans: 'Plans',
    detail: 'Profile details', contacts: 'Telegram & WhatsApp', change: 'Edit', manage: 'Manage',
    membership: 'Monthly packages', note: 'New package prices. Checkout and access start only after payment-provider confirmation.',
    name: 'Name', timeZone: 'Time zone', language: 'Language', expand: 'Open settings',
    top: { create: 'Create', view: 'View', results: 'Results', settings: 'Settings' } },
  ru: { menu: 'Разделы профиля', pageTitle: 'Мой профиль', account: 'Аккаунт и приватность', messenger: 'Мессенджеры', plans: 'Тарифы',
    detail: 'Параметры профиля', contacts: 'Telegram и WhatsApp', change: 'Изменить', manage: 'Управлять',
    membership: 'Тарифы в месяц', note: 'Новые цены. Оплата и доступ подтверждаются только платёжным провайдером.',
    name: 'Имя', timeZone: 'Часовой пояс', language: 'Язык', expand: 'Открыть настройки',
    top: { create: 'Создать', view: 'Просмотр', results: 'Результаты', settings: 'Настройки' } },
  es: { menu: 'Secciones del perfil', pageTitle: 'Mi perfil', account: 'Cuenta y privacidad', messenger: 'Mensajería', plans: 'Planes',
    detail: 'Datos del perfil', contacts: 'Telegram y WhatsApp', change: 'Editar', manage: 'Gestionar',
    membership: 'Planes mensuales', note: 'Nuevos precios. El pago y el acceso requieren confirmación del proveedor.',
    name: 'Nombre', timeZone: 'Zona horaria', language: 'Idioma', expand: 'Abrir ajustes',
    top: { create: 'Crear', view: 'Ver', results: 'Resultados', settings: 'Ajustes' } },
}
const VIDEO = '/videos/holistic-house/film-collection-v3/sun-autumn-hills.mp4'
const POSTER = '/videos/holistic-house/film-collection-v3/sun-autumn-hills.jpg'

export function ProfileHubTabs({ locale = 'en', active = 'today', resultCount = null, account = null, publicEntry = false }) {
  const selected = COPY[locale] ? locale : 'en'
  const t = STUDIO_COPY[selected]
  // Existing protected Cabinet uses EN fallback for ES; do not introduce a new account.
  const accountLocale = selected === 'es' ? 'en' : selected
  const root = '/' + accountLocale + '/app'
  const privatePaths = {
    today: root + '/portrait?space=today',
    tests: root + '/tests',
    state: root + '/monitoring',
    path: root + '/portrait?space=path',
    courses: root + '/course?view=courses',
    reports: root + '/portrait?space=reports',
  }
  // Guest Profile never initiates account reads just by visiting or changing tabs.
  const paths = publicEntry ? { ...privatePaths,
    today: root + '/portrait',
    tests: '#profile-free-tests',
    state: '/' + selected + '/client?startTests=state',
    path: '/' + selected + '/personality-profiles',
    courses: '/' + selected + '/academy',
  } : privatePaths
  const current = active === 'view' ? 'today' : active === 'results' ? 'reports' : active
  const settingsMode = current === 'settings'
  const s = SETTINGS_HUB_COPY[selected]
  return <section className={styles.hub} data-profile-hub-tabs data-profile-active={current}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>{t.label}</p><h2>{settingsMode ? s.pageTitle : t.title}</h2></div>
      {!settingsMode && <InstantCabinetLink href={root + '/settings'} prefetch={false} className={styles.settings}>
        <Settings2 size={17} aria-hidden="true" />{t.settings}
      </InstantCabinetLink>}
    </header>
    <nav className={settingsMode ? styles.settingsTabs : styles.tabs} aria-label={settingsMode ? s.menu : COPY[selected].navigation}>
      {settingsMode ? [
        { id: 'create', href: '/' + selected + '/personality-profiles' },
        { id: 'view', href: paths.today },
        { id: 'results', href: paths.reports },
        { id: 'settings', href: root + '/settings' },
      ].map(item => <InstantCabinetLink key={item.id} href={item.href} prefetch={false}
        aria-current={item.id === 'settings' ? 'page' : undefined} className={item.id === 'settings' ? styles.current : styles.tab}>
        {s.top[item.id]}
      </InstantCabinetLink>) : TABS.map(({ id, icon: Icon }) => <InstantCabinetLink key={id} href={paths[id]} prefetch={false}
        data-profile-tab={id} aria-current={current === id ? 'page' : undefined}
        className={current === id ? styles.current : styles.tab}>
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" /><span>{t.tabs[id]}</span>
        {id === 'tests' && Number.isInteger(resultCount) && resultCount > 0 &&
          <span className={styles.resultBadge} aria-label={resultCount + ' ' + COPY[selected].count}>{resultCount}</span>}
      </InstantCabinetLink>)}
    </nav>
    {(current === 'today' || settingsMode) && <>
      <div className={styles.hero} data-profile-video-hero>
        <h1 className={styles.srOnly}>{t.hero}</h1>
        <div className={styles.videoFrame}>
          <video controls playsInline preload="none" poster={POSTER} aria-label={t.video}>
            <source src={VIDEO} type="video/mp4" />
            <track kind="captions" src="/videos/holistic-house/profile-scenic.en.vtt" srcLang="en" label="English" />
          </video>
        </div>
        {settingsMode ? <nav className={styles.settingsQuickActions} data-profile-settings-actions aria-label={s.menu}>
          <a href="#hh-settings-account">{s.detail}</a>
          <a href="#hh-settings-messengers">{s.messenger}</a>
          <a href="#hh-settings-plans">{s.plans}</a>
        </nav> : <nav className={styles.quickActions} data-profile-quick-actions aria-label={t.label}>
          <InstantCabinetLink href={paths.path} prefetch={false} className={styles.primaryQuickAction}><Route size={19} aria-hidden="true" />{t.route}</InstantCabinetLink>
          <InstantCabinetLink href={paths.tests} prefetch={false}><ClipboardList size={19} aria-hidden="true" />{t.actions[0]}</InstantCabinetLink>
          <InstantCabinetLink href={paths.state} prefetch={false}><Activity size={19} aria-hidden="true" />{t.actions[1]}</InstantCabinetLink>
          <InstantCabinetLink href={paths.courses} prefetch={false}><BookOpen size={19} aria-hidden="true" />{t.actions[2]}</InstantCabinetLink>
        </nav>}
        <p className={styles.srOnly}>{t.privacy}</p>
      </div>
    </>}
    {settingsMode && <section className={styles.settingsOverview} data-profile-settings-overview aria-label={s.account}>
      <div className={styles.settingsIdentity} id="hh-settings-overview-account">
        <div className={styles.settingsCardHeading}>
          <h3>{s.account}</h3>
          <a href="#hh-settings-account">{s.change}</a>
        </div>
        <div className={styles.accountDetails}>
          <span><small>{s.name}</small><strong>{account?.displayName || '—'}</strong></span>
          <span><small>{s.timeZone}</small><strong>{account?.timezone || '—'}</strong></span>
          <span><small>{s.language}</small><strong>{selected.toUpperCase()}</strong></span>
        </div>
      </div>
      <div className={styles.connectionOverview}>
        <h3>{s.contacts}</h3>
        <a href="#hh-settings-messengers">Telegram <span>{s.manage}</span></a>
        <a href="#hh-settings-messengers">WhatsApp <span>{s.manage}</span></a>
      </div>
      <div className={styles.packagesOverview} id="hh-settings-overview-plans">
        <div className={styles.settingsCardHeading}><h3>{s.membership}</h3><a href="#hh-settings-plans">{s.expand}</a></div>
        <div className={styles.packagesGrid}>{NEW_PACKAGES.map(item =>
          <a key={item.key} href="#hh-settings-plans" className={styles.packageCard} data-package={item.key}>
            <strong>{item.key.charAt(0).toUpperCase() + item.key.slice(1)}</strong>
            <span>€{item.amount} <small>/ {selected === 'ru' ? 'мес' : selected === 'es' ? 'mes' : 'mo'}</small></span>
          </a>)}</div>
        <p className={styles.packageFinePrint}>{s.note}</p>
      </div>
    </section>}
    {current !== 'today' && current !== 'create' && !settingsMode && !publicEntry && <div className={styles.sectionIntro}>
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
