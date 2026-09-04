import assert from 'node:assert/strict'
import test from 'node:test'

import { getRobotsPolicy, getSitemapEntries } from '../data/seo.js'

test('sitemap includes all localized Homeopathy indexes and all 76 paired remedy routes', () => {
  const sitemap = getSitemapEntries('https://example.test')
  const urls = sitemap.map(({ url }) => url)
  const remedyUrls = urls.filter((url) => url.includes('/homeopathy/remedies/'))

  assert.equal(sitemap.length, 104)
  assert.equal(remedyUrls.length, 76)
  assert.equal(urls.includes('https://example.test/ru/homeopathy'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy'), true)
  assert.equal(urls.includes('https://example.test/ru/homeopathy/remedies'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy/remedies'), true)
  assert.equal(urls.includes('https://example.test/ru/homeopathy/remedies/natrum-muriaticum'), true)
  assert.equal(urls.includes('https://example.test/en/homeopathy/remedies/natrum-muriaticum'), true)
  assert.deepEqual(sitemap.find(({ url }) => url.endsWith('/ru/homeopathy/remedies/natrum-muriaticum')).alternates.languages, {
    ru: 'https://example.test/ru/homeopathy/remedies/natrum-muriaticum',
    en: 'https://example.test/en/homeopathy/remedies/natrum-muriaticum',
  })
})

test('robots advertises the generated sitemap', () => {
  assert.deepEqual(getRobotsPolicy('https://example.test'), {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://example.test/sitemap.xml',
  })
})
