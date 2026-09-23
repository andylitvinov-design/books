import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Remedies landing combines remedy search, free consultation and book covers in both locales', async () => {
  const [page, search, books, header] = await Promise.all([
    readFile('app/[locale]/homeopathy/page.tsx', 'utf8'),
    readFile('components/remedy-search-box.tsx', 'utf8'),
    readFile('components/book-showcase.tsx', 'utf8'),
    readFile('components/public-site-header.tsx', 'utf8'),
  ])
  assert.match(page, /heading: "Препараты"/)
  assert.match(page, /heading: "Remedies"/)
  assert.match(page, /RemedySearchBox/)
  assert.match(page, /BookShowcase/)
  assert.match(page, /Бесплатная консультация/)
  assert.match(page, /Free consultation/)
  assert.match(page, /t\.me\/AndyTherapist/)
  assert.match(page, /wa\.me\/14376066502/)
  assert.match(search, /Find a homeopathic remedy/)
  assert.match(books, /catalog-cover/)
  assert.match(header, /SiteNavigation/)
})

test('public navigation calls the section Remedies and exposes bilingual Services', async () => {
  const navigation = await readFile('components/site-navigation.tsx', 'utf8')
  assert.match(navigation, /Препараты/)
  assert.match(navigation, /Remedies/)
  assert.match(navigation, /Услуги/)
  assert.match(navigation, /Services/)
  assert.match(navigation, /\/services/)
})

test('Services page is bilingual and grounds Alchemy of the Soul in the published services book', async () => {
  const page = await readFile('app/[locale]/services/page.tsx', 'utf8')
  assert.match(page, /Алхимия души/)
  assert.match(page, /Alchemy of the Soul/)
  assert.match(page, /alchemy-services-workflow/)
  assert.match(page, /Бесплатная консультация/)
  assert.match(page, /Free consultation/)
  assert.match(page, /published project materials/)
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
  assert.match(index, /\/books\/\\\$\{book\.id\}#\\\$\{id\}/)
  assert.match(index, /book\.id === "alchemy-homeopathy-remedies"/)
  assert.match(page, /Другие статьи, где упоминается препарат/)
  assert.match(page, /Other articles mentioning this remedy/)
  assert.match(page, /getRemedyArticleLinks/)
})
