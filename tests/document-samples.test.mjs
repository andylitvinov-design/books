import assert from 'node:assert/strict'
import test from 'node:test'
import { samplesEnabled, getDocumentSample } from '../lib/documents/samples.js'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { recommendationCopy } from '../lib/documents/recommendation.js'
test('synthetic review is disabled in production and never reads private records', () => {
  assert.equal(samplesEnabled({ NODE_ENV: 'production' }), false)
  assert.equal(samplesEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'production' }), false)
  assert.equal(samplesEnabled({ NODE_ENV: 'development', VERCEL_ENV: 'production' }), false)
  assert.equal(samplesEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }), true)
  assert.equal(getDocumentSample('unknown'), undefined)
  assert.equal(getDocumentSample('receipt').id, undefined)
  assert.match(getDocumentSample('receipt').patientName, /SYNTHETIC/)
  assert.equal(getDocumentSample('recommendation').amount, undefined)
})

test('recommendation sample has two canonical, synthetic-only remedies in both locales', () => {
  for (const locale of ['en', 'ru']) {
    const sample = getDocumentSample('recommendation', locale)
    assert.equal(sample.items.length, 2)
    assert.equal(new Set(sample.items.map(item => item.remedyPath)).size, 2)
    assert.ok(sample.items.every(item => item.remedyPath.startsWith(`/${locale}/homeopathy/remedies/`)))
    assert.ok(sample.items.every(item => item.instructions.includes('Synthetic')))
    assert.deepEqual(getDocumentSample('recommendation', locale), sample)
  }
})

test('all synthetic PDFs are byte deterministic for identical public input', () => {
  for (const kind of ['receipt', 'invoice', 'recommendation']) {
    for (const locale of ['en', 'ru']) {
      const render = kind === 'recommendation' ? buildPrescriptionPdf : buildPaymentPdf
      const sample = getDocumentSample(kind, locale)
      assert.deepEqual(render(sample, locale, 'https://example.test'), render(sample, locale, 'https://example.test'))
    }
  }
  const pdf = buildPrescriptionPdf(getDocumentSample('recommendation'), 'en', 'https://example.test').toString('latin1')
  assert.ok(pdf.includes(recommendationCopy('en').intro))
  assert.ok(pdf.includes('/en/homeopathy/remedies/aurum-metallicum'))
})
