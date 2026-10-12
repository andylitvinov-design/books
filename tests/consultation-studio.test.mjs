import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (file) => readFile(file, 'utf8')

test('consultation studio presents three bilingual steps without replacing the protected action', async () => {
  const form = await read('components/consultation-form.jsx')
  for (const snippet of [
    'consultation-studio-progress',
    'consultation-studio-card',
    'consultation-client-heading',
    'consultation-items-heading',
    'consultation-documents-heading',
    'ConsultationClientSelector',
    'ConsultationTextImport',
    'serializeConsultationRows(items)',
    'onPointerDown={(event) => {',
    'role="alert"',
  ]) assert.ok(form.includes(snippet), snippet)
  for (const phrase of ['Клиент и дата', 'Рекомендации', 'Документы и оплата', 'Client & date', 'Recommendations', 'Documents & payment']) {
    assert.ok(form.includes(phrase), phrase)
  }
  assert.match(form, /<form action=\{submit\}[^>]*onSubmit=/)
  assert.match(form, /disabled=\{pending\}/)
})

test('invoice required inputs stay visible outside collapsed payment settings', async () => {
  const form = await read('components/consultation-form.jsx')
  const grid = form.indexOf('<div className="consultation-payment-row consultation-studio-payment-grid">')
  const details = form.indexOf('<details className="consultation-details consultation-payment-settings">')
  assert.ok(grid > 0 && details > grid)
  assert.ok(form.indexOf('name="service" required', grid) < details)
  assert.ok(form.indexOf('name="amount" inputMode="decimal" required', grid) < details)
  for (const field of ['amount','currency','service','paymentStatus','paymentMethod','documentNumber','itemsJson']) {
    assert.equal((form.match(new RegExp('name="' + field + '"', 'g')) || []).length, 1, field)
  }
  const collapsedSettings = form.slice(details,form.indexOf('</details>',details))
  assert.doesNotMatch(collapsedSettings, /\brequired\b/)
  assert.match(form, /receiptHint/)
  assert.match(form, /invoiceHint/)
})

test('adding a remedy never supplies silent potency or dosing defaults', async () => {
  const form = await read('components/consultation-form.jsx')
  assert.match(form, /makeRow\(type = 'homeopathy'\)/)
  assert.match(form, /\.\.\.row, itemType: 'homeopathy', potency: '', granules: '', timesPerDay: ''/)
  assert.doesNotMatch(form, /potency: '30', granules: '5', timesPerDay: '3'/)
  assert.match(form, /<input aria-label=\{labels\.potency/)
  assert.match(form, /<input aria-label=\{labels\.granules/)
  assert.match(form, /<input aria-label=\{labels\.timesPerDay/)
})

test('optional auto-parse is accessible and preserves its recognition and warning feedback', async () => {
  const source = await read('components/consultation-text-import.jsx')
  assert.match(source, /return <details className="consultation-text-import">/)
  assert.match(source, /<summary>/)
  assert.match(source, /onClick=\{run\}/)
  assert.match(source, /preview\.warnings\.length/)
  assert.match(source, /role="status"/)
})

test('studio styles isolate existing legacy screens and adapt to mobile', async () => {
  const [css, newPage, editPage] = await Promise.all([
    read('components/consultation-studio.css'),
    read('app/admin/consultations/new/page.js'),
    read('app/admin/consultations/[id]/edit/page.js'),
  ])
  assert.match(css, /\.consultation-studio-shell/)
  assert.match(css, /\.consultation-studio\.prescription-admin-form/)
  assert.match(css, /@media \(max-width: 600px\)/)
  assert.match(css, /focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(newPage, /consultation-studio-shell/)
  assert.match(editPage, /consultation-studio-shell/)
})
