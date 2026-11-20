import Link from 'next/link'
import { SiteNavigation } from '@/components/site-navigation'
import InstantCabinetLink from './instant-cabinet-link'
import { ProfileModeSwitch } from '../master-mode-switch'
import { Activity, BookOpen, CalendarDays, ClipboardList, FileClock, FileText, House, LockKeyhole, ListChecks, Route, UserRound, Settings2, ChevronDown } from 'lucide-react'
import { assessmentHistoryTitle } from '@/lib/assessments/personal-guidance'
import { ArrowRight, Heart, Infinity as InfinityIcon, Leaf, Mountain, Sparkles } from 'lucide-react'
import { buildPsychPortrait } from '@/lib/assessments/psych-portrait'
import { isProfessionalProfileTest } from '@/lib/profile/profile-assessment-view'
import { coverageForFocus } from '@/lib/assessments/test-explorer'
import { TestExplorerVisual } from './test-explorer-visual'
import styles from './profile-hub-tabs.module.css'
import { ProfileSpaceDashboard } from './profile-space-dashboard'
import ProfileSettingsLanding from './profile-settings-landing'

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

const REPORTS_PORTRAIT_COPY = {
  en: {
    title: 'Your personal portrait',
    intro: 'Saved tests, charts and your personal portrait.',
    sectorsLabel: 'Four life areas',
    sectors: ['Body & energy', 'Work & goals', 'Relationships', 'Growth & meaning'],
    saved: 'saved', measured: 'measured scales', empty: 'Not measured yet',
    detail: 'Explore my portrait', next: 'Take a new test',
    caption: 'Colored rays represent only verified professional test scales.',
  },
  ru: {
    title: 'Ваш личный портрет',
    intro: 'Сохранённые тесты, графики и ваш личный портрет.',
    sectorsLabel: 'Четыре сферы жизни',
    sectors: ['Тело и энергия', 'Дело и цели', 'Отношения', 'Развитие и смысл'],
    saved: 'сохранено', measured: 'измеренных шкал', empty: 'Пока не измерено',
    detail: 'Открыть мой портрет', next: 'Пройти новый тест',
    caption: 'Цветные лучи отражают только проверенные результаты профессиональных тестов.',
  },
  es: {
    title: 'Tu retrato personal',
    intro: 'Pruebas guardadas, gráficos y tu retrato personal.',
    sectorsLabel: 'Cuatro áreas de vida',
    sectors: ['Cuerpo y energía', 'Trabajo y metas', 'Relaciones', 'Crecimiento y sentido'],
    saved: 'guardados', measured: 'escalas medidas', empty: 'Sin medir',
    detail: 'Ver mi retrato', next: 'Hacer otro test',
    caption: 'Los rayos coloreados reflejan únicamente pruebas profesionales verificadas.',
  },
}
const REPORTS_SECTOR_ICONS = [Leaf, Mountain, Heart, InfinityIcon]

const TABS = [
  { id: 'today', icon: House }, { id: 'state', icon: Activity },
  { id: 'path', icon: Route }, { id: 'courses', icon: BookOpen },
  { id: 'reports', icon: FileText }, { id: 'sessions', icon: CalendarDays },
]
const STUDIO_COPY = {
  en: {
    title: 'My Space', label: 'MY SPACE · PERSONAL GROWTH', settings: 'Settings',
    tabs: { today: 'Today', tests: 'Tests', state: 'My State', path: 'My Path', courses: 'Courses', reports: 'Reports', sessions: 'Sessions' },
    hero: 'Your path of growth',
    intro: 'Discover yourself, notice changes and choose a meaningful next step — at your own pace.',
    video: 'Scenic introduction to My Space', film: 'Nature film · no narration', route: 'My route',
    actions: ['Take a test', 'Check my state', 'Continue learning'],
    privacy: 'Saved results stay in your protected account.',
    details: { tests: 'Your assessments and chosen tests.', state: 'State check-ins and real saved measurements.', path: 'Verified milestones, goals and personalised learning.', courses: 'Continue your real courses and practices.', reports: 'Saved test attempts and private practitioner reports.', sessions: 'Consultations explicitly saved to your private account.' },
  },
  ru: {
    title: 'Моё пространство', label: 'МОЁ ПРОСТРАНСТВО · ЛИЧНОСТНЫЙ РОСТ', settings: 'Настройки',
    tabs: { today: 'Сегодня', tests: 'Тесты', state: 'Состояние', path: 'Мой путь', courses: 'Курсы', reports: 'Отчёты', sessions: 'Сессии' },
    hero: 'Мой путь развития',
    intro: 'Узнавайте себя, замечайте изменения и выбирайте следующий шаг в своём темпе.',
    video: 'Природное вступление в Моё пространство', film: 'Видео о природе · без озвучивания', route: 'Мой маршрут',
    actions: ['Пройти тест', 'Оценить состояние', 'Продолжить курс'],
    privacy: 'Сохранённые результаты остаются в защищённом кабинете.',
    details: { tests: 'Ваши тесты и выбранные опросники.', state: 'Самонаблюдение и реальные сохранённые замеры.', path: 'Подтверждённые шаги, цели и программа развития.', courses: 'Ваши настоящие курсы и практики.', reports: 'Сохранённые попытки и приватные отчёты специалиста.', sessions: 'Консультации, сохранённые вами в личном кабинете.' },
  },
  es: {
    title: 'Mi espacio', label: 'MI ESPACIO · CRECIMIENTO PERSONAL', settings: 'Ajustes',
    tabs: { today: 'Hoy', tests: 'Tests', state: 'Estado', path: 'Mi ruta', courses: 'Cursos', reports: 'Informes', sessions: 'Sesiones' },
    hero: 'Mi camino de crecimiento',
    intro: 'Conócete, observa tus cambios y elige tu próximo paso a tu ritmo.',
    video: 'Introducción visual de naturaleza a Mi espacio', film: 'Vídeo de naturaleza · sin narración', route: 'Mi ruta',
    actions: ['Hacer un test', 'Ver mi estado', 'Seguir aprendiendo'],
    privacy: 'Tus resultados permanecen en tu cuenta privada.',
    details: { tests: 'Tus pruebas y cuestionarios.', state: 'Registro personal y mediciones reales.', path: 'Etapas verificadas, metas y desarrollo.', courses: 'Tus cursos y prácticas.', reports: 'Intentos guardados e informes privados.', sessions: 'Consultas guardadas en tu cuenta privada.' },
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
    sessions: root + '/portrait?space=sessions',
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
  const stateBrand = current === 'today' || current === 'state'
  const s = SETTINGS_HUB_COPY[selected]
  // Switch real locale routes while retaining the current profile section.
  // Language navigation works for visitors; only account actions require sign-in.
  const languageHref = language => {
    // Public entry must remain public; the protected Profile keeps its current section.
    if (publicEntry) return language === 'en' ? '/' : '/' + language
    const targetRoot = '/' + language + '/app'
    if (settingsMode) return targetRoot + '/settings'
    if (current === 'tests') return targetRoot + '/tests'
    if (current === 'state') return targetRoot + '/monitoring'
    if (current === 'path') return targetRoot + '/portrait?space=path'
    if (current === 'courses') return targetRoot + '/course?view=courses'
    if (current === 'reports') return targetRoot + '/portrait?space=reports'
    if (current === 'sessions') return targetRoot + '/portrait?space=sessions'
    return targetRoot + '/portrait'
  }
  return <section className={styles.hub} data-profile-hub-tabs data-profile-active={current}>
    <header className={styles.heading}>
      <div className={styles.headingTitle}>
        {(stateBrand || settingsMode) && <span className={styles.brandMark} aria-hidden="true" />}
        <h2 aria-label={(stateBrand || settingsMode) ? 'Holistic House' : t.title}>
          <span className={styles.titleFull}>{(stateBrand || settingsMode) ? 'Holistic House' : t.title}</span>
          <span className={styles.titleCompact}>{(stateBrand || settingsMode) ? 'Holistic House' : 'My Space'}</span>
        </h2>
      </div>
      <div className={styles.profileHeadingActions}>
        <details className={styles.languageSwitch} data-profile-language-switch>
          <summary aria-label={selected === 'ru' ? 'Выбрать язык сайта' : 'Choose site language'}>
            {selected.toUpperCase()}<ChevronDown size={13} aria-hidden="true" />
          </summary>
          <div className={styles.languageOptions}>
            {(publicEntry ? ['ru', 'en', 'es'] : ['ru', 'en']).map(language =>
              <Link key={language} href={languageHref(language)} prefetch={false}
                lang={language} hrefLang={language} aria-current={selected === language ? 'page' : undefined}
                data-profile-language={language}>{language.toUpperCase()}</Link>)}
          </div>
        </details>
        {!settingsMode && current !== 'today' && current !== 'state' && <ProfileModeSwitch locale={selected} active="live" />}
        <div className={styles.headingNav} data-profile-chrome-navigation>
          <SiteNavigation locale={selected} compact />
        </div>
      </div>
    </header>
    {current === 'state' && <nav className="hh-psi-profile-mode" aria-label={selected === 'ru' ? 'Жизнь или работа' : 'Life or work'}>
      <Link href={root + '/monitoring'} prefetch={false} aria-current="page" data-profile-state-life><Heart size={22} aria-hidden="true" />{selected === 'ru' ? 'Моё состояние' : selected === 'es' ? 'Mi estado' : 'My State'}</Link>
      <Link href={'/' + selected + '/practice'} prefetch={false} data-profile-state-work><UserRound size={22} aria-hidden="true" />{selected === 'ru' ? 'Моя работа' : selected === 'es' ? 'Mi trabajo' : 'My Work'}</Link>
    </nav>}
    {current !== 'today' && current !== 'state' && !settingsMode && <nav className={settingsMode ? styles.settingsTabs : styles.tabs} aria-label={settingsMode ? s.menu : COPY[selected].navigation}>
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
    </nav>}
    {current !== 'today' && current !== 'state' && !settingsMode && <div className={styles.myPageSubnav} data-profile-my-page-placement="below-tabs">
      <Link href={'/' + selected + '/my-page'} prefetch={false} className={styles.myPageLink} data-profile-my-page>
        <UserRound size={15} aria-hidden="true" />
        {selected==='ru'?'Моя страница':selected==='es'?'Mi página':'My Page'}
      </Link>
      <Link href={root + '/settings'} prefetch={false} className={styles.myPageLink} data-profile-settings-link>
        <Settings2 size={15} aria-hidden="true" />
        {selected==='ru'?'Настройки':selected==='es'?'Ajustes':'Settings'}
      </Link>
    </div>}
    {current === 'today' && <ProfileSpaceDashboard locale={selected} root={root} resultCount={resultCount} />}
    {settingsMode && <ProfileSettingsLanding locale={selected} root={root} plans={NEW_PACKAGES} />}
    {current !== 'today' && current !== 'state' && current !== 'create' && current !== 'reports' && !settingsMode && !publicEntry && <div className={styles.sectionIntro}>
      <h1>{t.tabs[current] || t.title}</h1><p>{t.details[current] || t.privacy}</p>
    </div>}
    {current === 'create' && <p className={styles.hint}>{COPY[selected].creationHint}</p>}
  </section>
}

export function ProfileResultsArchive({ locale = 'en', results = [] }) {
  const selected = COPY[locale] ? locale : 'en'
  const t = COPY[selected]
  const p = REPORTS_PORTRAIT_COPY[selected]
  const accountLocale = selected === 'es' ? 'en' : selected
  // Retain every owner-scoped saved attempt, including retakes and check-ins.
  const ordered = (Array.isArray(results) ? results : [])
    .filter(item => item && typeof item.id === 'string' && item.id.length > 0)
    .sort((a, b) => (Date.parse(b.measurementAt || '') || 0) - (Date.parse(a.measurementAt || '') || 0))
  const recent = ordered.slice(0, 5)
  // Only eligible, scored professional measurements can color portrait rays.
  // A missing score never becomes an invented average, health grade or percentage.
  const portrait = buildPsychPortrait(ordered.filter(isProfessionalProfileTest))
  const measuredCount = Number.isFinite(portrait?.measuredCount) ? portrait.measuredCount : 0
  const root = '/' + accountLocale + '/app'
  return <section className={styles.archive} data-profile-results-archive data-saved-result-count={ordered.length}>
    <header className={styles.archiveHeading}>
      <div>
        <h2><ClipboardList size={24} strokeWidth={1.8} aria-hidden="true" />{t.archiveTitle}</h2>
        <p>{p.intro}</p>
      </div>
      <strong className={styles.total} aria-label={ordered.length + ' ' + t.count}>
        <span>{ordered.length}</span><small>{p.saved}</small>
      </strong>
    </header>

    <article className={styles.reportPortrait} data-reports-portrait-hero data-measured-axis-count={measuredCount}>
      <div className={styles.reportPortraitScene} aria-label={p.sectorsLabel}>
        <div className={styles.reportPortraitArt} data-profile-head>
          <TestExplorerVisual compact locale={selected} portrait={portrait} coverage={coverageForFocus([])} />
        </div>
        <div className={styles.reportPortraitSectors}>
          {p.sectors.map((area, index) => {
            const Icon = REPORTS_SECTOR_ICONS[index]
            return <span key={area} className={styles.reportSectorChip} data-report-sector={index}>
              <Icon aria-hidden="true" size={23} strokeWidth={1.8} />
              <strong>{area}</strong>
            </span>
          })}
        </div>
      </div>
      <div className={styles.reportPortraitFooter}>
        <h3>{p.title}</h3>
        <Link href={root + '/portfolio'} prefetch={false} className={styles.reportPortraitLink}>
          <Sparkles size={20} aria-hidden="true" />{p.detail}<ArrowRight size={20} aria-hidden="true" />
        </Link>
        <p className={styles.reportPortraitCaption}>
          {measuredCount ? measuredCount + ' ' + p.measured + ' · ' : p.empty + ' · '}{p.caption}
        </p>
      </div>
    </article>

    {recent.length ? <div className={styles.recent}>
      <div className={styles.reportRecentHeading}>
        <h3>{t.recent}</h3>
        <Link href={root + '/history'} prefetch={false}>{t.history}<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ul>{recent.slice(0, 3).map(item => {
        const when = Date.parse(item.measurementAt || '')
        const date = Number.isFinite(when) ? new Intl.DateTimeFormat(
          selected === 'ru' ? 'ru-RU' : selected === 'es' ? 'es-ES' : 'en-CA',
          { dateStyle: 'medium' }).format(new Date(when)) : ''
        return <li key={item.id}>
          <Link href={root + '/results/' + encodeURIComponent(item.id)} prefetch={false}>
            <span className={styles.reportResultIcon}><ClipboardList size={19} aria-hidden="true" /></span>
            <span className={styles.reportResultTitle}>{assessmentHistoryTitle(item, accountLocale) || item.definitionKey || t.archiveTitle}</span>
            {date && <time dateTime={item.measurementAt}>{date}</time>}
            <ArrowRight size={18} className={styles.reportResultArrow} aria-hidden="true" />
          </Link>
        </li>
      })}</ul>
    </div> : <p className={styles.empty}>{t.empty}</p>}

    <div className={styles.actions}>
      <Link href={root + '/tests?explore=1&filters=topics'} className={styles.reportStartTest} prefetch={false}>
        <ClipboardList size={19} aria-hidden="true" />{p.next}
      </Link>
      <Link href={root + '/tests?filter=completed'} className={styles.reportMyTests} prefetch={false}>
        <ListChecks size={19} aria-hidden="true" />{t.choose}
      </Link>
    </div>
    <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.private}</p>
  </section>
}
