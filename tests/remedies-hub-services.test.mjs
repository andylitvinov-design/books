import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Remedies landing combines remedy search, free consultation and book covers in both locales', async () => {
  const [page, search, directory, books, header, cta] = await Promise.all([
    readFile('app/[locale]/homeopathy/page.tsx', 'utf8'),
    readFile('components/remedy-search-box.tsx', 'utf8'),
    readFile('components/remedy-directory.tsx', 'utf8'),
    readFile('components/book-showcase.tsx', 'utf8'),
    readFile('components/public-site-header.tsx', 'utf8'),
    readFile('components/public-consultation-cta.tsx', 'utf8'),
  ])
  assert.match(page, /heading: "Препараты"/)
  assert.match(page, /heading: "Remedies"/)
  assert.match(page, /RemedySearchBox/)
  assert.match(page, /BookShowcase/)
  assert.match(page, /Бесплатная консультация/)
  assert.match(page, /Free consultation/)
  assert.match(page, /PublicConsultationCta/)
  assert.match(cta, /t\.me\/AndyTherapist/)
  assert.match(cta, /wa\.me\/14376066502/)
  assert.match(search, /Find a homeopathic remedy/)
  assert.match(search, /Full description/)
  assert.match(directory, /Найти гомеопатический препарат/)
  assert.match(directory, /remedies-search-input/)
  assert.match(directory, /remedies-search-results/)
  assert.match(directory, /remedies-all-link/)
  assert.match(directory, /Полное описание/)
  assert.match(directory, /Краткое описание/)
  assert.doesNotMatch(directory, /remedy-search-box/)
  assert.match(books, /catalog-cover/)
  assert.match(header, /SiteNavigation/)
})

test('public navigation groups existing remedies inside Library and keeps bilingual Services', async () => {
  const navigation = await readFile('components/site-navigation.tsx', 'utf8')
  const { getSiteNavigation } = await import('../lib/site-navigation-model.js')
  assert.match(navigation, /getSiteNavigation/)
  for (const locale of ['en', 'ru', 'es']) {
    const items = getSiteNavigation(locale)
    assert.equal(items.find((item) => item.id === 'library').href, `/${locale}/library`)
    assert.equal(items.find((item) => item.id === 'services').href, `/${locale}/services`)
  }
})

test('Services page is bilingual and grounds Alchemy of the Soul in the published services book', async () => {
  const page = await readFile('app/[locale]/services/page.tsx', 'utf8')
  assert.match(page, /Алхимия души/)
  assert.match(page, /Alchemy of the Soul/)
  assert.match(page, /id: "psychohomeopathy"/)
  assert.match(page, /id: "imagery"/)
  assert.match(page, /id: "constellations"/)
  assert.match(page, /PageVideo slot="services-intro"/)
  assert.match(page, /id="free-situation-review-offer"/)
  assert.match(page, /free-wu-xing-diagnostic/)
  assert.match(page, /Бесплатная диагностика ситуации/)
  assert.match(page, /Start with a free situation/)
  assert.match(page, /app\/consultations\?service=/)
  assert.match(page, /\/masters/)
  assert.match(page, /не заменяет диагностику или лечение у врача/)
  assert.match(page, /does not replace medical diagnosis or treatment/)
})

test('remedy pages build related links from exact mentions in source articles', async () => {
  const [index, page, practicum] = await Promise.all([
    readFile('data/remedy-articles.ts', 'utf8'),
    readFile('components/remedy-page.tsx', 'utf8'),
    readFile('source-books/book-2-dao-books/dao_practicum_cases_remedies.html', 'utf8'),
  ])
  assert.match(practicum, /Aconitum/i)
  assert.match(index, /<article\\b/)
  assert.match(index, /containsTerm/)
  assert.match(index, /\/books\/\$\{book\.id\}#\$\{id\}/)
  assert.match(index, /book\.id === "alchemy-homeopathy-remedies"/)
  assert.match(page, /Другие статьи, где упоминается препарат/)
  assert.match(page, /Other articles mentioning this remedy/)
  assert.match(page, /getRemedyArticleLinks/)
})


test('mobile navigation uses the shared Library and Services routes', async () => {
  const navigation = await readFile('components/mobile-bottom-navigation.tsx', 'utf8')
  assert.match(navigation, /getSiteNavigation/)
  assert.match(navigation, /data-nav-item/)
  assert.match(navigation, /aria-current/)
})

test('English Remedies page localizes book card titles while preserving source-language book content', async () => {
  const [showcase, localization] = await Promise.all([
    readFile('components/book-showcase.tsx', 'utf8'),
    readFile('data/library-localization.ts', 'utf8'),
  ])
  assert.match(showcase, /localizedBookText/)
  assert.match(showcase, /Book content is preserved in its source language/)
  assert.match(localization, /Book 01\. Homeopathy: foundations and method/)
  assert.match(localization, /Maya mysteries/)
})


test('practitioner and service detail pages label zero-price offerings as free', async () => {
  const [profile, detail] = await Promise.all([
    readFile('app/[locale]/masters/[slug]/page.tsx', 'utf8'),
    readFile('app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx', 'utf8'),
  ])
  assert.match(profile, /confirmedPrice===0/)
  assert.match(profile, /Пройти бесплатно/)
  assert.match(profile, /Start free/)
  assert.match(detail, /confirmedPrice===0/)
  assert.match(detail, /Бесплатно/)
  assert.match(detail, /Free/)
})


test('all public remedy catalogs use the same boxed autocomplete surface and description type badges', async () => {
  const [directory, spanishDirectory, spanishData, prescription, consultation] = await Promise.all([
    readFile('components/remedy-directory.tsx', 'utf8'),
    readFile('components/spanish-remedy-directory.tsx', 'utf8'),
    readFile('data/remedies-es.js', 'utf8'),
    readFile('components/prescription-form.jsx', 'utf8'),
    readFile('components/consultation-form.jsx', 'utf8'),
  ])
  for (const source of [directory, spanishDirectory]) {
    assert.match(source, /remedies-search-input/)
    assert.match(source, /remedies-search-results/)
    assert.match(source, /remedies-all-link/)
    assert.match(source, /remedy-description-type/)
  }
  assert.match(spanishData, /descriptionType: entry\.descriptionType/)
  assert.match(prescription, /Полная карточка/)
  assert.match(consultation, /Full profile/)
  assert.match(consultation, /consultationRemedySuggestions/)
})
