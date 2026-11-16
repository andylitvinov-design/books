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

test('public navigation exposes three real directions without administration', async () => {
  const { getCompactNavigation, getSiteNavigation, primaryNavigationIds } = await import('../lib/site-navigation-model.js')
  assert.deepEqual(primaryNavigationIds, ['home', 'energy', 'love', 'business', 'library', 'events', 'courses', 'pro', 'temple', 'cabinet'])
  for (const locale of ['en', 'ru', 'es']) {
    const items = getSiteNavigation(locale)
    assert.equal(items.length, 10)
    assert.equal(items.find(item => item.id === 'temple').href, `/${locale}/holistic-support`)
    assert.equal(items.find(item=>item.id==='love').href, '/'+locale+'/explore/love')
    assert.equal(items.find(item=>item.id==='energy').href, '/'+locale+'/explore/energy')
    assert.equal(items.find(item => item.id === 'library').href, `/${locale}/library`)
    assert.equal(items.find(item => item.id === 'events').href, `/${locale}/events`)
    assert.equal(items.find(item => item.id === 'business').href, `/${locale}/explore/business`)
    assert.equal(items.find(item => item.id === 'cabinet').href, `/${locale}/client`)
    assert.equal(items.find(item => item.id === 'courses').href, `/${locale}/academy`)
    assert.equal(items.find(item => item.id === 'courses').label, { en: 'Courses', ru: 'Курсы', es: 'Cursos' }[locale])
    assert.ok(!items.some(item => item.id === 'about'))
    assert.ok(items.every(item => item.label && !item.href.startsWith('/admin')))
    assert.ok(!getCompactNavigation(locale).some(item => item.id === 'business'))
  }
  for (const path of ['components/site-navigation.tsx', 'components/mobile-bottom-navigation.tsx']) {
    const source = await readFile(path, 'utf8')
    assert.match(source, /getCompactNavigation/)
    assert.match(source, /prefetch=\{false\}/)
  }
})

test('Courses menu opens the full Academy; enrolled My Courses remains in the personal area', async () => {
  const [nav, oldRoute, academy, ownedCourses] = await Promise.all([
    readFile('components/site-navigation.tsx', 'utf8'),
    readFile('app/[locale]/courses/page.tsx', 'utf8'),
    readFile('app/[locale]/academy/[[...slug]]/page.tsx', 'utf8'),
    readFile('components/academy-my-courses.tsx', 'utf8'),
  ])
  assert.match(nav, /'library', 'events'/)
  assert.match(nav, /getCompactNavigation\(activeLocale\)/)
  assert.doesNotMatch(nav, /\{ id: 'academy', label: text\.academy/)
  assert.match(oldRoute, /permanentRedirect\(`\/\$\{locale\}\/academy`\)/)
  assert.match(academy, /if \(!slug\?\.length\) \{[\s\S]*?return <AcademyHub locale=\{locale\} view=\{view\} \/>/)
  assert.match(ownedCourses, /title: 'My courses'/)
  assert.match(ownedCourses, /title: 'Мои курсы'/)
})

test('the umbrella homepage preserves RU/EN/ES locale routes with a dialogue-first chrome',async()=>{
 const [home,dialog,page,ru,metadata,es]=await Promise.all([
  readFile('components/holistic-house-home.tsx','utf8'),
  readFile('components/home-dialog-first.tsx','utf8'),
  readFile('app/page.tsx','utf8'),
  readFile('app/[locale]/page.tsx','utf8'),
  readFile('lib/home-seo.ts','utf8'),
  readFile('app/es/page.tsx','utf8')]);
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(es,/<HomeDialogFirst locale="es"\/>/);
 for(const label of ['Для себя','Для бизнеса','For myself','For business','Para mí','Para negocios'])assert.ok(dialog.includes(label),label);
 assert.match(page,/locale="en"/);
 assert.match(page,/requested === "ru" \|\| requested === "es"/);
 assert.match(ru,/locale="ru"/);
 assert.match(metadata,/languages: \{ en: "\/", ru: "\/ru", es: "\/es", "x-default": "\/" \}/);
});

test('mobile navigation keeps seven usable shared destinations and reserves space for forms', async () => {
  const [mobile, styles] = await Promise.all([
    readFile('components/mobile-bottom-navigation.tsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])

  assert.match(mobile, /getCompactNavigation/)
  const icons = await readFile('components/compact-navigation-icons.ts', 'utf8')
  assert.match(mobile, /compactNavigationIcons/)
  assert.match(icons, /profile: UserRound/)
  assert.match(icons, /pro: GraduationCap/)
  assert.match(icons, /temple: Landmark/)
  assert.match(icons, /analysis: Sparkles/)
  assert.match(icons, /courses: BookOpen/)
  assert.match(mobile, /ia222-bottom-height/)
  assert.match(mobile, /data-nav-item/)
  assert.match(styles, /repeat\(7,minmax\(0,1fr\)\)/)
  const bottomRules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selector]) => /\.ia222-bottom-navigation(?![\w-])/.test(selector))
    .map(([, , declarations]) => declarations).join('\n')
  assert.match(bottomRules, /grid-template-columns:\s*repeat\(7,\s*minmax\(0,1fr\)\)/)
  assert.doesNotMatch(bottomRules, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,1fr\)\)/)
  assert.match(styles, /white-space: normal; overflow-wrap: normal/)
  assert.match(styles, /--ia222-bottom-height,76px/)
  assert.match(styles, /safe-area-inset-bottom/)
  assert.match(styles, /scroll-margin-bottom/)

  const homeStyles = await readFile('app/holistic-house-home.css', 'utf8')
  assert.match(homeStyles, /grid-template-columns: repeat\(7, minmax\(0,1fr\)\)/)
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
  // The former /admin entry deliberately routes authenticated users to the
  // single private practice cockpit; no duplicate old dashboard is rendered.
  assert.match(dashboard, /redirect\('\/'\+locale\+'\/app\/practice'\)/)
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
  assert.match(home, /<HomeDialogFirst locale=\{locale\}\/>/)
  assert.doesNotMatch(home, /<HomepageContactCta/)
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

test('dialog-first Home has one My Space header, real search and seven dock destinations',async()=>{
 const [home,dialog,spanish,profile,nav,dock]=await Promise.all([
  readFile('components/holistic-house-home.tsx','utf8'),
  readFile('components/home-dialog-first.tsx','utf8'),
  readFile('app/es/page.tsx','utf8'),
  readFile('components/app/profile-hub-tabs.jsx','utf8'),
  readFile('components/site-navigation.tsx','utf8'),
  readFile('lib/unified-mobile-dock.mjs','utf8')]);
 assert.match(home,/<HomeDialogFirst locale=\{locale\}\/>/);
 assert.match(spanish,/<HomeDialogFirst locale="es"\/>/);
 assert.match(dialog,/<h1 className=\{css.title\}>My Space<\/h1>/);
 assert.match(dialog,/<SiteSearch locale=\{locale\} pathname=\{target\}\/>/);
 assert.match(dialog,/data-home-menu/);
 assert.match(dialog,/data-home-purpose-switch/);
 assert.doesNotMatch(home,/ProfileHubTabs|house-header--services/);
 assert.match(profile,/<SiteNavigation locale=\{selected\} compact \/>/);
 assert.match(nav,/<details className="site-main-menu"/);
 assert.match(dock,/UNIFIED_DOCK_IDS=Object\.freeze\(\["mytube","video","coach","ai","services","practice","profile"\]\)/);
});

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
