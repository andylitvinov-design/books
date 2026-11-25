import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { canonicalPublicOrigin } from '../data/site-metadata.js'
import { classifyPwaRequest } from '../lib/pwa/cache-policy.js'

test('accepts only a bare HTTPS canonical host', () => {
  assert.equal(canonicalPublicOrigin('https://psialchemy.example.test').toString(), 'https://psialchemy.example.test/')
  assert.equal(canonicalPublicOrigin('http://unsafe.example.test').hostname, 'holistichouse.vercel.app')
  assert.equal(canonicalPublicOrigin('https://psialchemy.example.test/path').hostname, 'holistichouse.vercel.app')
})

test('keeps every private or administrative request network-only', () => {
  for (const pathname of [
    '/ru/prescriptions/private-token',
    '/en/prescriptions/private-token?x=1',
    '/ru%2Fprescriptions%2Fprivate-token',
    '/api/prescriptions/private-token/pdf',
    '/api/prescription-access',
    '/api/prescription-access/logout',
    '/en/report/10000000-0000-4000-8000-000000000001',
    '/ru/report/10000000-0000-4000-8000-000000000001',
    '/api/app/report-viewer/abcdefghijklmnopqrstuv',
    '/api/app/save-intents/10000000-0000-4000-8000-000000000001',
    '/admin/api/prescriptions/record/access',
    '/admin/prescriptions/record',
  ]) assert.equal(classifyPwaRequest(`https://example.test${pathname}`), 'network-only', pathname)

  assert.equal(classifyPwaRequest('https://example.test/ru/homeopathy/remedies/arsenicum-album'), 'public-route')
  assert.equal(classifyPwaRequest('https://example.test/media/remedies/arnica/message1.jpg'), 'public-asset')
})

test('ships an installable PsiAlchemy manifest and a worker that rejects private caching', () => {
  // The legacy PsiAlchemy manifest URL stays valid for existing installs,
  // but must not be auto-injected into the main Holistic House site.
  assert.equal(existsSync('app/manifest.ts'), false)
  assert.equal(existsSync('public/manifest.webmanifest'), true)
  assert.equal(existsSync('public/sw.js'), true)
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
  const library = readFileSync('app/[locale]/homeopathy/layout.tsx', 'utf8')
  const worker = readFileSync('public/sw.js', 'utf8')
  assert.equal(manifest.name, 'PsiAlchemy')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/ru/homeopathy')
  assert.match(library, /manifest: "\/manifest.webmanifest"/)
  assert.match(worker, /network-only/)
  assert.match(worker, /CACHE_PUBLIC_REMEDY/)
  const middleware = readFileSync('middleware.ts', 'utf8')
  assert.match(middleware, /private, no-store, max-age=0/)
  assert.match(middleware, /prescriptions/)
})
