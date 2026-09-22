import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalPublicOrigin, metadataBaseFor } from '../data/site-metadata.js'
import { canonicalRedirectTarget } from '../lib/canonical-redirect.js'
import { getSitemapEntries } from '../data/seo.js'

const old = 'https://codex-public-book-library.vercel.app'
const next = 'https://holistichouse.vercel.app'

test('one versioned origin drives metadata and public sitemap without private documents', () => {
  assert.equal(metadataBaseFor().origin, next)
  assert.equal(canonicalPublicOrigin('https://user:password@example.com').origin, next)
  const entries = getSitemapEntries(metadataBaseFor())
  for (const entry of entries) {
    assert.equal(new URL(entry.url).origin, next)
    assert.doesNotMatch(entry.url, /prescriptions|admin|document-preview/)
    for (const url of Object.values(entry.alternates?.languages || {})) assert.equal(new URL(url).origin, next)
  }
})

test('approved release enables legacy public redirects', () => {
  assert.equal(canonicalRedirectTarget(`${old}/books`), `${next}/books`)
})

test('approved public redirect preserves path, query and reading fragment without loops', () => {
  const path = '/books/maya-calendar?lang=en#chapter-vii'
  assert.equal(canonicalRedirectTarget(old + path, 'GET', true), next + path)
  assert.equal(canonicalRedirectTarget(next + path, 'GET', true), undefined)
  assert.equal(canonicalRedirectTarget('https://preview.vercel.app/books', 'GET', true), undefined)
  assert.equal(canonicalRedirectTarget(old + path, 'POST', true), undefined)
})

test('private sessions, association files and PWA runtime retain their origin', () => {
  for (const path of ['/ru/prescriptions/example', '/en%2Fprescriptions%2Fexample', '/api/prescriptions/example/pdf', '/api/prescription-access', '/admin', '/admin/documents/example', '/document-preview/receipt', '/.well-known/assetlinks.json', '/.well-known/apple-app-site-association', '/sw.js', '/manifest.webmanifest', '/_next/static/a.js']) {
    assert.equal(canonicalRedirectTarget(old + path, 'GET', true), undefined, path)
  }
})
