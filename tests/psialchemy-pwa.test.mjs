import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { canonicalPublicOrigin } from '../data/site-metadata.js'
import { classifyPwaRequest } from '../lib/pwa/cache-policy.js'

test('accepts only a bare HTTPS canonical host', () => {
  assert.equal(canonicalPublicOrigin('https://psialchemy.example.test').toString(), 'https://psialchemy.example.test/')
  assert.equal(canonicalPublicOrigin('http://unsafe.example.test').hostname, 'codex-public-book-library.vercel.app')
  assert.equal(canonicalPublicOrigin('https://psialchemy.example.test/path').hostname, 'codex-public-book-library.vercel.app')
})

test('keeps every private or administrative request network-only', () => {
  for (const pathname of [
    '/ru/prescriptions/private-token',
    '/en/prescriptions/private-token?x=1',
    '/ru%2Fprescriptions%2Fprivate-token',
    '/api/prescriptions/private-token/pdf',
    '/api/prescription-access',
    '/api/prescription-access/logout',
    '/api/admin/prescriptions/record/access',
    '/admin/prescriptions/record',
  ]) assert.equal(classifyPwaRequest(`https://example.test${pathname}`), 'network-only', pathname)

  assert.equal(classifyPwaRequest('https://example.test/ru/homeopathy/remedies/arsenicum-album'), 'public-route')
  assert.equal(classifyPwaRequest('https://example.test/media/remedies/arnica/message1.jpg'), 'public-asset')
})

test('ships an installable PsiAlchemy manifest and a worker that rejects private caching', () => {
  assert.equal(existsSync('app/manifest.ts'), true)
  assert.equal(existsSync('public/sw.js'), true)
  const manifest = readFileSync('app/manifest.ts', 'utf8')
  const worker = readFileSync('public/sw.js', 'utf8')
  assert.match(manifest, /PsiAlchemy/)
  assert.match(manifest, /standalone/)
  assert.match(worker, /network-only/)
  assert.match(worker, /CACHE_PUBLIC_REMEDY/)
  const middleware = readFileSync('middleware.ts', 'utf8')
  assert.match(middleware, /private, no-store, max-age=0/)
  assert.match(middleware, /prescriptions/)
})
