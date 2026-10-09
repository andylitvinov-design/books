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

test('public navigation shares six destinations and never exposes administration', async () => {
  const { getSiteNavigation, primaryNavigationIds } = await import('../lib/site-navigation-model.js')
  assert.deepEqual(primaryNavigationIds, ['home', 'library', 'services', 'academy', 'about', 'cabinet'])
  for (const locale of ['en', 'ru', 'es']) {
    const items = getSiteNavigation(locale)
    assert.equal(items.length, 6)
    assert.equal(items.find(item => item.id === 'library').href, `/${locale}/library`)
    assert.equal(items.find(item => item.id === 'cabinet').href, `/${locale}/${locale === 'es' ? 'client' : 'app'}`)
    assert.equal(items.find(item => item.id === 'academy').href, `/${locale}/academy`)
    assert.equal(items.find(item => item.id === 'academy').external, false)
    assert.ok(items.every(item => item.label && !item.href.startsWith('/admin')))
  }
  for (const path of ['components/site-navigation.tsx', 'components/mobile-bottom-navigation.tsx']) {
    const source = await readFile(path, 'utf8')
    assert.match(source, /getSiteNavigation/)
    assert.match(source, /prefetch=\{false\}/)
  }
})

test('the umbrella homepage can render Russian and English chrome and copy', async () => {
  const [home, page] = await Promise.all([
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('app/page.tsx', 'utf8'),
  ])

  assert.match(home, /восстановление · практика · поддержка/)
  assert.match(home, /healing · practice · guidance/)
  assert.match(home, /Исследуйте Holistic House/)
  assert.match(home, /Explore Holistic House/)
  assert.match(home, /Открыть Academy и Library/)
  assert.match(home, /Open the Academy and Library/)
  assert.match(page, /uiLocale/)
  assert.match(page, /cookieStore\.get\(uiLocaleCookie\)\?\.value === "ru" \? "ru" : "en"/)
  assert.match(page, /Holistic House — inner development, practice and personal work/)
})

test('mobile navigation keeps six usable shared destinations and reserves space for forms', async () => {
  const [mobile, styles] = await Promise.all([
    readFile('components/mobile-bottom-navigation.tsx', 'utf8'),
    readFile('app/ia-v2.css', 'utf8'),
  ])

  assert.match(mobile, /getSiteNavigation/)
  assert.match(mobile, /CircleUserRound/)
  assert.match(mobile, /ia222-bottom-height/)
  assert.match(mobile, /data-nav-item/)
  assert.match(styles, /repeat\(6,minmax\(0,1fr\)\)/)
  assert.doesNotMatch(styles, /repeat\(3,minmax\(0,1fr\)\)/)
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
  assert.match(adminHeader, /useState\('en'\)/)
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
  const [about, entryPage, landing, entryForm, consultationForm] = await Promise.all([
    readFile('app/[locale]/about/page.tsx', 'utf8'),
    readFile('app/[locale]/client/page.tsx', 'utf8'),
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/client-cabinet-entry.tsx', 'utf8'),
    readFile('components/personal-consultation-form.tsx', 'utf8'),
  ])

  assert.match(about, /PersonalConsultationForm/)
  assert.match(about, /about-client-cabinet-login/)
  assert.match(about, /typedLocale \+ "\/client"/)
  assert.match(entryPage, /CabinetLanding/)
  assert.match(entryPage, /robots: \{ index: false, follow: false \}/)
  assert.match(landing, /Enter personal cabinet with Google/)
  assert.match(landing, /cabinet-signin-hero/)
  assert.match(landing, /Your Mind–Body Monitor/)
  assert.match(landing, /MINI_IPIP_20_EN_V1/)
  assert.match(landing, /CURRENT_STATE_RU_V2/)
  assert.match(landing, /cabinet-legacy-entry/)
  assert.match(landing, /ClientCabinetEntry/)
  assert.doesNotMatch(landing, /localStorage/)
  assert.match(entryForm, /privateLink/)
  assert.match(entryForm, /selectorPattern/)
  assert.match(entryForm, /secretPattern/)
  assert.match(consultationForm, /wa\.me\/14376066502/)
  assert.match(consultationForm, /Continue in WhatsApp/)
  assert.match(consultationForm, /t\.me\/AndyTherapist/)
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
    readFile('app/books/[bookId]/page.tsx', 'utf8'),
  ])

  assert.match(cta, /data-consultation-cta/)
  assert.match(cta, /wa\.me\/14376066502/)
  assert.match(cta, /t\.me\/AndyTherapist/)
  assert.match(cta, /data-contact-channel="whatsapp"/)
  assert.match(cta, /data-contact-channel="telegram"/)
  assert.match(cta, /Ask about working together/)
  assert.match(cta, /Interested in training or the next level/)
  assert.match(cta, /data-conversion-kind=\{mode\}/)
  assert.match(styles, /\.public-consultation-cta__actions/)
  for (const source of [home, homeopathy, services, spanishServices, library, academy, academyRecord, remedies, remedyPage, bookReader]) {
    assert.match(source, /PublicConsultationCta/)
  }
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
