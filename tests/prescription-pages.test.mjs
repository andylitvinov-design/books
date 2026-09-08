import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const clientPagePath = 'app/[locale]/prescriptions/[publicId]/page.js'
const pdfRoutePath = 'app/api/prescriptions/[publicId]/pdf/route.js'

test('client prescription route is dynamic, server-fetched, and noindex', async () => {
  const page = await readFile(clientPagePath, 'utf8')

  assert.match(page, /export const dynamic = 'force-dynamic'/)
  assert.match(page, /index: false/)
  assert.match(page, /follow: false/)
  assert.match(page, /getClientPrescription/)
  assert.match(page, /notFound\(\)/)
})

test('PDF route only renders the public projection with a safe attachment header', async () => {
  const route = await readFile(pdfRoutePath, 'utf8')

  assert.match(route, /getClientPrescription/)
  assert.match(route, /buildPrescriptionPdf/)
  assert.match(route, /application\/pdf/)
  assert.match(route, /filename="homeopathic-prescription\.pdf"/)
  assert.match(route, /Cache-Control': 'private, no-store'/)
  assert.match(route, /X-Robots-Tag': 'noindex, nofollow, noarchive'/)
  assert.match(route, /X-Content-Type-Options': 'nosniff'/)
  assert.doesNotMatch(route, /internalNotes/)
  assert.doesNotMatch(route, /publicId.*filename/)
})

test('print stylesheet removes interactive controls and uses A4 sizing', async () => {
  const css = await readFile('app/globals.css', 'utf8')

  assert.match(css, /@media print/)
  assert.match(css, /@page\s*\{\s*size:\s*A4/)
  assert.match(css, /\.prescription-actions\s*\{\s*display:\s*none/)
  assert.match(css, /\.prescription-item\s*\{\s*break-inside:\s*avoid/)
})
