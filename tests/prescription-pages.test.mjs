import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const clientPagePath = 'app/[locale]/prescriptions/[selector]/page.js'
const pdfRoutePath = 'app/api/prescriptions/[selector]/pdf/route.js'

test('neutral bootstrap removes the fragment before exchange and never persists it', async () => {
  const gate = await readFile('components/prescription-access-gate.jsx', 'utf8')

  assert.match(gate, /window\.history\.replaceState/)
  assert.match(gate, /window\.location\.hash/)
  assert.match(gate, /\/api\/prescription-access/)
  assert.match(gate, /cache: 'no-store'/)
  assert.doesNotMatch(gate, /localStorage|sessionStorage|indexedDB/)
  assert.ok(gate.indexOf('window.history.replaceState') < gate.indexOf("fetch('/api/prescription-access'"))
})

test('access exchange and logout use short HttpOnly same-site sessions', async () => {
  const [exchange, logout] = await Promise.all([
    readFile('app/api/prescription-access/route.js', 'utf8'),
    readFile('app/api/prescription-access/logout/route.js', 'utf8'),
  ])

  assert.match(exchange, /exchangePrescriptionAccess/)
  assert.match(exchange, /httpOnly: true/)
  assert.match(exchange, /sameSite: 'strict'/)
  assert.match(exchange, /secure: process\.env\.NODE_ENV === 'production'/)
  assert.doesNotMatch(exchange, /console\./)
  assert.match(logout, /deletePrescriptionRequestSession/)
  assert.match(logout, /cookieStore/)
})

test('client prescription route is dynamic, session-authorized, neutral, and noindex', async () => {
  const page = await readFile(clientPagePath, 'utf8')

  assert.match(page, /export const dynamic = 'force-dynamic'/)
  assert.match(page, /index: false/)
  assert.match(page, /follow: false/)
  assert.match(page, /authorizePrescriptionRequest/)
  assert.match(page, /getClientPrescription/)
  assert.match(page, /PrescriptionAccessGate/)
  assert.doesNotMatch(page, /findBySelector|findByPublicId/)
})

test('PDF route only renders the public projection with a safe attachment header', async () => {
  const route = await readFile(pdfRoutePath, 'utf8')

  assert.match(route, /getClientPrescription/)
  assert.match(route, /authorizePrescriptionRequest/)
  assert.match(route, /buildPrescriptionPdf/)
  assert.match(route, /application\/pdf/)
  assert.match(route, /filename="homeopathic-prescription\.pdf"/)
  assert.match(route, /Cache-Control': 'private, no-store, max-age=0'/)
  assert.match(route, /X-Robots-Tag': 'noindex, nofollow, noarchive'/)
  assert.match(route, /X-Content-Type-Options': 'nosniff'/)
  assert.doesNotMatch(route, /internalNotes/)
  assert.doesNotMatch(route, /publicId.*filename/)
  assert.doesNotMatch(route, /findBySelector|findByPublicId/)
})

test('locale, PDF, and logout actions carry only the non-secret selector', async () => {
  const [document, actions] = await Promise.all([
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/prescription-actions.jsx', 'utf8'),
  ])

  assert.match(document, /prescriptions\/\$\{selector\}/)
  assert.match(actions, /prescriptions\/\$\{selector\}\/pdf/)
  assert.match(actions, /prescription-access\/logout/)
  assert.doesNotMatch(`${document}\n${actions}`, /publicId|location\.hash|secret/)
})

test('private middleware applies no-store, no-referrer, clickjacking, and nonce CSP headers', async () => {
  const middleware = await readFile('middleware.ts', 'utf8')

  assert.match(middleware, /Content-Security-Policy/)
  assert.match(middleware, /script-src 'self' 'nonce-/)
  assert.match(middleware, /frame-ancestors 'none'/)
  assert.match(middleware, /Referrer-Policy/)
  assert.match(middleware, /no-referrer/)
  assert.match(middleware, /X-Content-Type-Options/)
  assert.match(middleware, /nosniff/)
  assert.match(middleware, /X-Frame-Options/)
  assert.match(middleware, /process\.env\.NODE_ENV === 'development'/)
  assert.match(middleware, /developmentEval/)
})

test('print stylesheet removes interactive controls and uses A4 sizing', async () => {
  const css = await readFile('app/globals.css', 'utf8')

  assert.match(css, /@media print/)
  assert.match(css, /@page\s*\{\s*size:\s*A4/)
  assert.match(css, /\.prescription-actions\s*\{\s*display:\s*none/)
  assert.match(css, /\.prescription-item\s*\{\s*break-inside:\s*avoid/)
})

test('keeps the configured adapter stable within a runtime context', async () => {
  const store = await readFile('lib/prescriptions/store.js', 'utf8')
  assert.match(store, /Symbol\.for\('psialchemy\.prescription-store\.v2'\)/)
  assert.match(store, /globalThis\[configuredStoreKey\]/)
})
