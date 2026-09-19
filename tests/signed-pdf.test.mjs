import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { DOCUMENT_TEMPLATE } from '../lib/documents/template.js'
import { getDocumentSample } from '../lib/documents/samples.js'

const origin = 'https://example.test'
const payment = { patientName: 'Synthetic Client', dateIssued: '2026-09-18', dateOfService: '2026-09-17', amount: 12550, currency: 'CAD', service: 'Synthetic consultation', paymentStatus: 'received' }
const recommendation = { patientName: 'Synthetic Client', dateIssued: '2026-09-18', items: [{ displayName: 'Synthetic remedy', remedyPath: '/en/homeopathy/remedies/arsenicum-album', instructions: 'Practitioner-entered synthetic instructions.' }] }

test('ordinary two-remedy recommendation fits one signed page in both languages', () => {
  for (const locale of ['en', 'ru']) {
    const pdf = buildPrescriptionPdf(getDocumentSample('recommendation', locale), locale, origin)
    assert.equal(pageStreams(pdf).length, 1, `${locale} sample should remain one page`)
  }
})

function pageStreams(pdf) {
  const source = pdf.toString('latin1')
  return [...source.matchAll(/\/Type \/Page\b[^]*?\/Contents (\d+) 0 R/g)].map((match) => {
    const object = source.match(new RegExp(`\\n${match[1]} 0 obj\\n<< /Length (\\d+) >>\\nstream\\n`))
    const start = object.index + object[0].length
    return source.slice(start, start + Number(object[1]))
  })
}

for (const [name, build, input] of [['receipt', buildPaymentPdf, payment], ['invoice', buildPaymentPdf, { ...payment, paymentStatus: 'unpaid' }], ['recommendation', buildPrescriptionPdf, recommendation]]) {
  test(`${name} embeds exact approved signature channels with soft mask and deterministic bytes`, () => {
    const pdf = build(input, 'en', origin)
    assert.deepEqual(pdf, build(input, 'en', origin))
    const source = pdf.toString('latin1')
    assert.ok(/\/ColorSpace \/DeviceRGB[^]*?\/SMask \d+ 0 R/.test(source), 'signature RGB image must reference its alpha soft mask')
    assert.ok(/\/Width 1229 \/Height 484 \/ColorSpace \/DeviceGray/.test(source), 'alpha mask must retain approved image dimensions')
    for (const [file, channels] of [['signature-rgb.deflate', 3], ['signature-alpha.deflate', 1]]) {
      const asset = readFileSync(new URL(`../assets/documents/${file}`, import.meta.url))
      assert.ok(pdf.includes(asset), `${file} is embedded losslessly`)
      assert.equal(inflateSync(asset).length, DOCUMENT_TEMPLATE.signature.pixelsWide * DOCUMENT_TEMPLATE.signature.pixelsHigh * channels)
    }
    const streams = pageStreams(pdf)
    assert.equal(streams.length, 1)
    assert.equal((streams[0].match(/\/Signature Do/g) ?? []).length, 1)
  })
}

for (const [name, build, input, dateY, lineY] of [
  ['recommendation', buildPrescriptionPdf, { ...recommendation, generalInstructions: 'Synthetic guidance '.repeat(1000) }, 272, 142],
  ['receipt', buildPaymentPdf, { ...payment, service: 'Synthetic service '.repeat(600) }, 422, 297.83],
  ['invoice', buildPaymentPdf, { ...payment, paymentStatus: 'unpaid', service: 'Synthetic service '.repeat(600) }, 422, 297.83],
]) {
  test(`long ${name} keeps date, signature and contact details together on final page without overlap`, () => {
    const streams = pageStreams(build(input, 'en', origin))
    assert.ok(streams.length > 1)
    for (const stream of streams.slice(0, -1)) {
      assert.doesNotMatch(stream, /\/Signature Do/)
      assert.doesNotMatch(stream, /Tm \(Andrii Litvinov\)/)
    }
    const final = streams.at(-1)
    assert.equal((final.match(/\/Signature Do/g) ?? []).length, 1)
    assert.match(final, new RegExp(`68 ${dateY} Tm \\(Odesa, Ukraine, 2026-09-18`))
    const { width, height, offsetX, gap } = DOCUMENT_TEMPLATE.signature
    assert.ok(final.includes(`q ${width} 0 0 ${height} ${68 + offsetX} ${lineY + gap} cm /Signature Do Q`))
    assert.ok(dateY - (lineY + gap + height) > 30)
    const contentBeforeDate = final.slice(0, final.indexOf(`68 ${dateY} Tm`))
    const baselines = [...contentBeforeDate.matchAll(/1 0 0 1 \d+(?:\.\d+)? (\d+(?:\.\d+)?) Tm/g)].map(match => Number(match[1]))
    assert.ok(baselines.every(baseline => baseline > dateY + 10), 'prior content must end above date and signature')
    assert.match(final, /Tm \(Andrii Litvinov\)/)
    assert.match(final, /Tm \(\+380 93 478 88 27\)/)
  })
}
