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

test('public navigation exposes both UI languages and About without exposing administration', async () => {
  const [navigation, cabinet] = await Promise.all([
    readFile('components/site-navigation.tsx', 'utf8'),
    readFile('components/client-cabinet.jsx', 'utf8'),
  ])

  assert.match(navigation, /Главная/)
  assert.match(navigation, /Книга/)
  assert.match(navigation, /Препараты/)
  assert.match(navigation, /Услуги/)
  assert.match(navigation, /Обо мне/)
  assert.match(navigation, /Home/)
  assert.match(navigation, /Book/)
  assert.match(navigation, /Remedies/)
  assert.match(navigation, /Services/)
  assert.match(navigation, /About/)
  assert.match(navigation, /Client Cabinet/)
  assert.match(navigation, /Кабинет/)
  assert.match(navigation, /\/client/)
  assert.doesNotMatch(navigation, /href="\/admin"/)
  assert.match(navigation, /localePath/)
  assert.match(navigation, /document\.cookie/)
  assert.match(navigation, /site-language-menu-trigger/)
  assert.match(navigation, /<details/)
  assert.match(navigation, /className="site-language-switch"/)
  assert.match(cabinet, /client-cabinet-next-step/)
  assert.match(cabinet, /Next step/)
  assert.match(cabinet, /Следующий шаг/)
  assert.doesNotMatch(cabinet, /localStorage/)
})

test('the umbrella homepage can render Russian and English chrome and copy', async () => {
  const [home, page] = await Promise.all([
    readFile('components/holistic-house-home.tsx', 'utf8'),
    readFile('app/page.tsx', 'utf8'),
  ])

  assert.match(home, /восстановление · практика · поддержка/)
  assert.match(home, /healing · practice · guidance/)
  assert.match(home, /Авторская книга/)
  assert.match(home, /The Power of Life/)
  assert.match(page, /uiLocale/)
  assert.match(page, /cookieStore\.get\(uiLocaleCookie\)\?\.value === "ru" \? "ru" : "en"/)
  assert.match(page, /Holistic House — inner development, practice and personal work/)
})

test('mobile navigation keeps five usable destinations while reserving the account destination for Client Cabinet', async () => {
  const [mobile, styles] = await Promise.all([
    readFile('components/mobile-bottom-navigation.tsx', 'utf8'),
    readFile('app/holistic-house-home.css', 'utf8'),
  ])

  assert.match(mobile, /Кабинет/)
  assert.match(mobile, /Client Cabinet/)
  assert.match(mobile, /\/ru\/client/)
  assert.match(mobile, /\/en\/client/)
  assert.match(mobile, /document\.documentElement\.lang = locale/)
  assert.ok(mobile.includes('client\\/[^/]+'))
  assert.match(styles, /repeat\(5, minmax\(0,1fr\)\)/)
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


test('About exposes a consultation request form and a real Client Cabinet entry flow', async () => {
  const [about, entryPage, entryForm, consultationForm] = await Promise.all([
    readFile('app/[locale]/about/page.tsx', 'utf8'),
    readFile('app/[locale]/client/page.tsx', 'utf8'),
    readFile('components/client-cabinet-entry.tsx', 'utf8'),
    readFile('components/personal-consultation-form.tsx', 'utf8'),
  ])

  assert.match(about, /PersonalConsultationForm/)
  assert.match(about, /about-client-cabinet-login/)
  assert.match(about, /typedLocale \+ "\/client"/)
  assert.match(entryPage, /ClientCabinetEntry/)
  assert.match(entryPage, /robots: \{ index: false, follow: false \}/)
  assert.match(entryForm, /privateLink/)
  assert.match(entryForm, /selectorPattern/)
  assert.match(entryForm, /secretPattern/)
  assert.match(consultationForm, /wa\.me\/14376066502/)
  assert.match(consultationForm, /Request a personal consultation/)
})

test('public pages share one localized consultation CTA that leads to the existing request form', async () => {
  const [cta, styles, homeopathy, services, spanishServices] = await Promise.all([
    readFile('components/public-consultation-cta.tsx', 'utf8'),
    readFile('app/globals.css', 'utf8'),
    readFile('app/[locale]/homeopathy/page.tsx', 'utf8'),
    readFile('app/[locale]/services/page.tsx', 'utf8'),
    readFile('app/es/services/page.tsx', 'utf8'),
  ])

  assert.match(cta, /data-consultation-cta/)
  assert.match(cta, /\/about#personal-consultation-title/)
  assert.match(styles, /\.public-consultation-cta/)
  assert.match(homeopathy, /PublicConsultationCta/)
  assert.match(services, /PublicConsultationCta/)
  assert.match(spanishServices, /PublicConsultationCta/)
})
