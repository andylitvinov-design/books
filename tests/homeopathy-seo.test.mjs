import assert from 'node:assert/strict'
import test from 'node:test'

import { getRobotsPolicy, getSitemapEntries } from '../data/seo.js'

test('sitemap includes all localized Homeopathy indexes and all 208 paired remedy routes', () => {
  const sitemap = getSitemapEntries('https://example.test')
  const urls = sitemap.map(({ url }) => url)
  const remedyUrls = urls.filter((url) => url.includes('/homeopathy/remedies/'))

  const publicTests = urls.filter(url => /\/(en|ru|es)\/tests$/.test(url))
  assert.deepEqual(publicTests.sort(), ['https://example.test/en/tests', 'https://example.test/es/tests', 'https://example.test/ru/tests'])
  assert.equal(sitemap.length - publicTests.length, 286, 'All original public entries remain alongside the three editorial test landings')
  assert.equal(sitemap.length, 289)
  assert.ok(!urls.some(url => /\/client(?:\/|$)|\/app(?:\/|$)/.test(url)), 'Interactive/private routes remain excluded')
  assert.equal(new Set(urls).size, urls.length)
  assert.equal(urls.some(url => /\/books\/[^/]+$/.test(url) && !/\/(en|ru|es)\/books\//.test(url)), false)
  assert.equal(urls.filter(url => url === 'https://example.test/ru').length, 1)
  assert.equal(urls.includes('https://example.test/books'), true)
  assert.equal(remedyUrls.length, 208)
  assert.equal(urls.includes('https://example.test/ru/homeopathy'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy'), true)
  assert.equal(urls.includes('https://example.test/ru/homeopathy/remedies'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy/remedies'), true)
  assert.equal(urls.includes('https://example.test/ru/services'), true)
  assert.equal(urls.includes('https://example.test/en/services'), true)
  assert.equal(urls.includes('https://example.test/ru/homeopathy/remedies/natrum-muriaticum'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy/remedies/natrum-muriaticum'), true)
  assert.equal(urls.includes('https://example.test/ru/homeopathy/remedies/aurum-metallicum'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy/remedies/carcinosinum'), true)
  assert.deepEqual(sitemap.find(({ url }) => url.endsWith('/ru/homeopathy/remedies/natrum-muriaticum')).alternates.languages, {
    ru: 'https://example.test/ru/homeopathy/remedies/natrum-muriaticum',
    en: 'https://example.test/en/homeopathy/remedies/natrum-muriaticum',
  })
})

test('robots advertises the generated sitemap', () => {
  const robots = getRobotsPolicy('https://example.test')
  assert.equal(robots.rules.userAgent, '*')
  assert.equal(robots.rules.allow, '/')
  assert.equal(robots.sitemap, 'https://example.test/sitemap.xml')
  assert.ok(robots.rules.disallow.includes('/admin'))
  assert.ok(robots.rules.disallow.includes('/en/client'))
})
