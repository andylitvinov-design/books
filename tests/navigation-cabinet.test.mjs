import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('locale counterpart paths preserve the current localized route', async () => {
  const { localePath, readUiLocale } = await import('../lib/ui-locale.js')

  assert.equal(localePath('/ru/homeopathy/remedies/aconitum', 'en'), '/en/homeopathy/remedies/aconitum')
  assert.equal(localePath('/en/client/personal-selector', 'ru'), '/ru/client/personal-selector')
  assert.equal(localePath('/ru/about', 'en'), '/en/about')
  assert.equal(localePath('/en/about', 'ru'), '/ru/about')
  assert.equal(localePath('/books', 'en'), '/books')
  assert.equal(readUiLocale(), 'en')
  assert.equal(readUiLocale('holistic_house_ui_locale=ru'), 'ru')
})

test('public navigation includes the relationship hub on EN/RU and never exposes administration', async () => {
  const { getSiteNavigation, primaryNavigationIds } = await import('../lib/site-navigation-model.js')
  assert.deepEqual(primaryNavigationIds, ['home', 'library', 'services', 'events', 'relationships', 'academy', 'courses', 'cabinet'])
  for (const locale of ['en', 'ru', 'es']) {
    const items = getSiteNavigation(locale)
    assert.equal(items.length, 8)
    assert.equal(items.find(item=>item.id==='relationships').href, '/'+locale+'/relationships')
    assert.equal(items.find(item => item.id === 'library').href, `/${locale}/library`)
    assert.equal(items.find(item => item.id === 'events').href, `/${locale}/events`)
    assert.equal(items.find(item => item.id === 'cabinet').href, `/${locale}/client`)
    assert.equal(items.find(item => item.id === 'academy').href, `/${locale}/academy`)
    assert.equal(items.find(item => item.id === 'academy').external, false)
    assert.equal(items.find(item => item.id === 'courses').href, `/${locale}/courses`)
    assert.ok(!items.some(item => item.id === 'about'))
    assert.ok(items.every(item => item.label && !item.href.startsWith('/admin')))
  }
  for (const path of ['components/site-navigation.tsx', 'components/mobile-bottom-navigation.tsx']) {
    const source = await readFile(path, 'utf8')
    assert.match(source, /getCompactNavigation/)
    assert.match(source, /prefetch=\{false\}/)
  }
})

test('the umbrella homepage can render Russian and English chrome and copy', async () => {
  const [home, page, russianPage, metadata] = await Promise.all([
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('app/page.tsx', 'utf8'),
    readFile('app/[locale]/page.tsx', 'utf8'),
    readFile('lib/home-seo.ts', 'utf8'),
  ])

  assert.match(home, /восстановление · практика · поддержка/)
  assert.match(home, /healing · practice · guidance/)
  assert.match(home, /Исследуйте самостоятельно/)
  assert.match(home, /Explore at your own pace/)
  assert.match(home, /Курсы и библиотека/)
  assert.match(home, /Courses & Library/)
  assert.match(page, /locale="en"/)
  assert.match(page, /requested === "ru" \|\| requested === "es"/)
  assert.match(page, /redirect\(`\/\$\{requested\}`\)/)
  assert.match(russianPage, /locale="ru"/)
  assert.match(russianPage, /locale !== "ru"\) notFound\(\)/)
  assert.match(metadata, /Personal Sessions in Toronto & Online \| Holistic House/)
  assert.match(metadata, /Личные консультации в Торонто и онлайн \| Holistic House/)
  assert.match(metadata, /languages: \{ en: "\/", ru: "\/ru", es: "\/es", "x-default": "\/" \}/)
})

test('mobile navigation keeps six usable shared destinations and reserves space for forms', async () => {
  const [mobile, styles] = await Promise.all([
    readFile('components/mobile-bottom-navigation.tsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])

  assert.match(mobile, /getCompactNavigation/)
  const icons = await readFile('components/compact-navigation-icons.ts', 'utf8')
  assert.match(mobile, /compactNavigationIcons/)
  assert.match(icons, /house: LayoutDashboard/)
  assert.match(icons, /tests: ClipboardList/)
  assert.match(icons, /business: BriefcaseBusiness/)
  assert.match(mobile, /ia222-bottom-height/)
  assert.match(mobile, /data-nav-item/)
  assert.match(styles, /repeat\(6,minmax\(0,1fr\)\)/)
  const bottomRules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => /\.ia222-bottom-navigation(?![\w-])/.test(selector))
    .map(([, , declarations]) => declarations).join('\n')
  assert.match(bottomRules, /grid-template-columns:\s*repeat\(6,\s*minmax\(0,1fr\)\)/)
  assert.doesNotMatch(bottomRules, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,1fr\)\)/)
  assert.match(styles, /white-space: nowrap/)
  assert.match(styles, /--ia222-bottom-height,76px/)
  assert.match(styles, /safe-area-inset-bottom/)
  assert.match(styles, /scroll-margin-bottom/)

  const homeStyles = await readFile('app/holistic-house-home.css', 'utf8')
  assert.match(homeStyles, /grid-template-columns: repeat\(6, minmax\(0,1fr\)\)/)
})

test('no-cookie public and practitioner entry points consistently prefer English', async () => {
  const [books, adminHeader, practitioner, consultation] = await Promise.all([
    readFile('app/books/page.tsx', 'utf8'),
    readFile('components/prescription-admin-header.jsx', 'utf8'),
    readFile('components/practitioner-cabinet.jsx', 'utf8'),
    readFile('components/consultation-form.jsx', 'utf8'),
  ])

  assert.match(books, /preference === "ru" \? "ru" : "en"/)
  assertAdminHeaderInitialLocale(adminHeader)
  assert.match(practitioner, /useState\('en'\)/)
  assert.match(consultation, /useState\('en'\)/)
})

test('the admin entry redirects guests and shows daily practitioner actions after authentication', async () => {
  const [dashboard, header, cabinet, loginAction] = await Promise.all([
    readFile('app/admin/page.js', 'utf8'),
    readFile('components/prescription-admin-header.jsx', 'utf8'),
    readFile('components/practitioner-cabinet.jsx', 'utf8'),
    readFile('app/admin/login/actions.js', 'utf8'),
  ])

  assert.match(dashboard, /requireAdminRequest/)
  assert.match(dashboard, /redirect\('\/admin\/login'\)/)
  assert.match(dashboard, /PractitionerCabinet/)
  assert.match(cabinet, /Practitioner Cabinet/)
  assert.match(cabinet, /Кабинет практика/)
  assert.match(cabinet, /\/admin\/consultations\/new/)
  assert.match(cabinet, /\/admin\/clients/)
  assert.match(cabinet, /\/admin\/clients\/legacy/)
  assert.match(header, /Holistic House/)
  assert.match(header, /Cabinet/)
  assert.match(header, /New consultation/)
  assert.match(header, /legacy: 'Legacy'/)
  assert.match(loginAction, /redirect\('\/admin'\)/)
})


test('direct protected admin pages redirect signed-out visitors to login instead of rendering a 404', async () => {
  const pages = [
    'app/admin/clients/page.js',
    'app/admin/clients/[id]/page.js',
    'app/admin/clients/legacy/page.js',
    'app/admin/consultations/new/page.js',
    'app/admin/consultations/[id]/page.js',
    'app/admin/consultations/[id]/edit/page.js',
    'app/admin/documents/[id]/page.js',
    'app/admin/payments/new/page.js',
    'app/admin/payments/[id]/page.js',
    'app/admin/prescriptions/new/page.js',
    'app/admin/prescriptions/[id]/page.js',
  ]
  for (const page of pages) {
    const source = await readFile(page, 'utf8')
    assert.match(source, /if \(!await requireAdminRequest\(\)\) redirect\('\/admin\/login'\)/, page)
  }
})


test('About exposes a consultation request form and a Google-first Cabinet with legacy compatibility', async () => {
  const [about, entryPage, landing, entryForm, consultationForm, chooser] = await Promise.all([
    readFile('app/[locale]/about/page.tsx', 'utf8'),
    readFile('app/[locale]/client/page.tsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/client-cabinet-entry.tsx', 'utf8'),
    readFile('components/personal-consultation-form.tsx', 'utf8'),
    readFile('components/consultation-choice-capture.tsx', 'utf8'),
  ])

  assert.match(about, /PersonalConsultationForm/)
  assert.match(about, /about-client-cabinet-login/)
  assert.match(about, /typedLocale \+ "\/client"/)
  assert.match(entryPage, /CabinetLanding/)
  assert.match(entryPage, /robots: \{ index: false, follow: false \}/)
  assert.match(landing, /Enter personal cabinet with Google/)
  assert.match(landing, /cabinet-signin-hero/)
  assert.match(landing, /Free wellbeing & resources monitoring/)
  assert.match(landing, /MINI_IPIP_20_EN_V1/)
  assert.match(landing, /CURRENT_STATE_RU_V2/)
  assert.match(landing, /cabinet-legacy-entry/)
  assert.match(landing, /ClientCabinetEntry/)
  assert.doesNotMatch(landing, /localStorage/)
  assert.match(entryForm, /privateLink/)
  assert.match(entryForm, /selectorPattern/)
  assert.match(entryForm, /secretPattern/)
  assert.match(consultationForm, /ConsultationChoiceCapture/)
  assert.match(consultationForm, /service \? "service" : "personal"/)
  assert.match(chooser, /whatsappEnquiryUrl/)
  assert.match(chooser, /Start free drawing assessment/)
  assert.match(chooser, /t\.me\/AndyTherapist/)
})

test('public pages share one localized soft CTA with direct WhatsApp and Telegram handoff', async () => {
  const [cta, styles, home, homeopathy, services, spanishServices, library, academy, academyRecord, remedies, remedyPage, bookReader] = await Promise.all([
    readFile('components/public-consultation-cta.tsx', 'utf8'),
    readFile('app/globals.css', 'utf8'),
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('app/[locale]/homeopathy/page.tsx', 'utf8'),
    readFile('app/[locale]/services/page.tsx', 'utf8'),
    readFile('app/es/services/page.tsx', 'utf8'),
    readFile('components/library-hub.tsx', 'utf8'),
    readFile('components/academy-hub.tsx', 'utf8'),
    readFile('components/academy-record-page.tsx', 'utf8'),
    readFile('app/[locale]/homeopathy/remedies/page.tsx', 'utf8'),
    readFile('components/remedy-page.tsx', 'utf8'),
    readFile('app/[locale]/books/[bookId]/page.tsx', 'utf8'),
  ])

  assert.match(cta, /data-consultation-cta/)
  assert.match(cta, /trainingEnquiryUrl/)
  assert.match(cta, /ContactChannelChooser/)
  assert.match(cta, /whatsappUrl=\{whatsappUrl\}/)
  assert.match(await readFile('components/contact-channel-chooser.tsx','utf8'), /data-contact-channel": "telegram"/)
  assert.match(cta, /Start with a free coaching form and handwritten drawing/)
  assert.match(cta, /Interested in training or the next level/)
  assert.match(cta, /data-conversion-kind=\{mode\}/)
  assert.match(styles, /\.public-consultation-cta__actions/)
  const homeContact = await readFile('components/homepage-contact-cta.tsx', 'utf8')
  const homeChoice = await readFile('components/consultation-choice-capture.tsx', 'utf8')
  assert.match(home, /<HomepageContactCta locale=\{locale\}/)
  assert.match(homeContact, /data-home-contact-capture/)
  assert.match(homeContact, /<HomepageFreeCapture locale=\{locale\}/)
  assert.doesNotMatch(homeContact, /variant="service"/)
  assert.match(await readFile('components/homepage-free-capture.tsx', 'utf8'), /data-home-free-capture="true"/)
  assert.match(homeChoice, /whatsappEnquiryUrl/)
  assert.match(homeChoice, /t\.me\/AndyTherapist/)
  for (const source of [homeopathy, services, spanishServices, library, academyRecord, remedies, remedyPage, bookReader]) {
    assert.match(source, /PublicConsultationCta/)
  }
  // The Academy now uses its dedicated course interest form rather than the
  // generic public consultation footer. Preserve that newer conversion path.
  assert.match(academy, /AcademyCourseCapture/)
})

// Preserve PR #76's compact menu and cabinet next-step checks under shared IA data.
test('compact language menu and cabinet next-step remain available after IA integration', async () => {
  const [navigation, cabinet, esAboutVerifier, esPublicVerifier] = await Promise.all([
    readFile('components/site-navigation.tsx', 'utf8'),
    readFile('components/client-cabinet.jsx', 'utf8'),
    readFile('scripts/verify-es-about.mjs', 'utf8'),
    readFile('scripts/verify-es-public-site.mjs', 'utf8'),
  ])
  assert.match(navigation, /site-language-menu-trigger/)
  assert.match(navigation, /<details/)
  assert.match(navigation, /className="site-language-switch"/)
  assert.match(cabinet, /client-cabinet-next-step/)
  assert.match(cabinet, /Next step/)
  assert.match(cabinet, /Следующий шаг/)
  assert.match(cabinet, /ClientAssessments records=\{assessments\}/)
  assert.doesNotMatch(cabinet, /localStorage/)
  assert.match(esAboutVerifier, /site-language-menu-trigger/)
  assert.match(esPublicVerifier, /site-language-menu-trigger/)
})

test('top site header puts Library next to language while My House retains cabinet access', async () => {
  const [nav, home, header, styles] = await Promise.all([
    readFile('components/site-navigation.tsx', 'utf8'),
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('components/public-site-header.tsx', 'utf8'),
    readFile('app/holistic-house-home.css', 'utf8'),
  ])

  assert.match(home, /<SiteNavigation locale=\{locale\}/)
  assert.match(header, /<SiteNavigation locale=\{locale\}/)
  assert.match(nav, /filter\(item => item\.id === 'services'\)/)
  assert.match(nav, /site-nav-free-entry/)
  assert.match(nav, /site-nav-about-entry/)
  assert.match(nav, /className="site-library-entry"/)
  assert.match(nav, /href=\{\`\/\$\{activeLocale\}\/library\`\}/)
  assert.match(nav, /data-nav-item="library"/)
  for (const localeCopy of ['Library', 'Библиотека', 'Biblioteca']) assert.ok(nav.includes(localeCopy))
  assert.match(styles, /\.house-header--services \.site-navigation > \.site-library-entry/)
  assert.match(styles, /\.house-header--services \.site-navigation > a \{ display: none; \}/)
  assert.match(styles, /\.house-header--services \.site-library-entry__compact/)
  assert.match(styles, /@media \(max-width: 374px\)/)
})

function assertAdminHeaderInitialLocale(source) {
  const defaultLocale = source.match(/export function PrescriptionAdminHeader\(\{[^}]*initialLocale = ('[^']+')/)
  const initializer = source.match(/const \[locale, setLocale\] = useState\(([^\n]+)\)/)
  assert.ok(defaultLocale, 'Header must retain its explicit initial-locale default')
  assert.ok(initializer, 'Header locale must have a single inspected initializer')
  const initial = new Function('provided', `const { initialLocale = ${defaultLocale[1]} } = provided; return (${initializer[1]});`)
  assert.equal(initial({}), 'en', 'No supplied preference defaults to English')
  assert.equal(initial({ initialLocale: 'ru' }), 'ru', 'Explicit Russian is retained')
  for (const initialLocale of ['en', 'es', '', null]) assert.equal(initial({ initialLocale }), 'en')
}

test('practitioner locale initializer rejects wrong default and ignored explicit preference', async () => {
  const source = await readFile('components/prescription-admin-header.jsx', 'utf8')
  for (const changed of [
    source.replace("initialLocale = 'en'", "initialLocale = 'ru'"),
    source.replace("useState(initialLocale === 'ru' ? 'ru' : 'en')", "useState('en')"),
    source.replace("useState(initialLocale === 'ru' ? 'ru' : 'en')", "useState('ru')"),
  ]) {
    assert.notEqual(changed, source)
    assert.throws(() => assertAdminHeaderInitialLocale(changed))
  }
})
