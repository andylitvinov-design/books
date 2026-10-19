import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionMobilePdf, buildPrescriptionPdf,
  fitPdfImageContain, readPdfJpegOrientation } from '../lib/prescriptions/pdf.js'

// Tiny synthetic JPEG header: the test does not use or expose any client photograph.
function jpegWithExifOrientation(orientation, little = true) {
  const result = Buffer.alloc(40)
  result.set([0xff, 0xd8, 0xff, 0xe1, 0, 34], 0)
  result.write('Exif\0\0', 6, 'latin1')
  result.write(little ? 'II' : 'MM', 12, 'ascii')
  const short = little ? 'writeUInt16LE' : 'writeUInt16BE'
  const long = little ? 'writeUInt32LE' : 'writeUInt32BE'
  result[short](42, 14)
  result[long](8, 16) // TIFF first IFD starts at offset 8
  result[short](1, 20) // one IFD entry
  result[short](0x0112, 22) // Orientation tag
  result[short](3, 24) // SHORT
  result[long](1, 26) // count=1
  result[short](orientation, 30) // value is inline
  result[long](0, 34)
  result.set([0xff, 0xd9], 38)
  return result
}

test('EXIF reader handles phone JPEG rotations in either byte order and fails safely', () => {
  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
    assert.equal(readPdfJpegOrientation(jpegWithExifOrientation(orientation)), orientation)
  }
  assert.equal(readPdfJpegOrientation(jpegWithExifOrientation(6, false)), 6)
  assert.equal(readPdfJpegOrientation(jpegWithExifOrientation(8, false)), 8)
  assert.equal(readPdfJpegOrientation(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), 1)
  assert.equal(readPdfJpegOrientation(Buffer.alloc(8)), 1)
})

test('photo placement uses contain for every EXIF orientation, never crops or distorts', () => {
  const box = { x: 18, y: 22, width: 164, height: 152 }
  for (let orientation = 1; orientation <= 8; orientation++) {
    const fit = fitPdfImageContain({ width: 1200, height: 800, orientation }, box)
    assert.ok(fit)
    const expectedRatio = orientation >= 5 ? 800 / 1200 : 1200 / 800
    assert.ok(Math.abs(fit.width / fit.height - expectedRatio) < 0.0002)
    assert.ok(fit.x >= box.x - 0.01 && fit.y >= box.y - 0.01)
    assert.ok(fit.x + fit.width <= box.x + box.width + 0.01)
    assert.ok(fit.y + fit.height <= box.y + box.height + 0.01)
    const [a, b, c, d, e, f] = fit.matrix
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]]
      .map(([u, v]) => [a * u + c * v + e, b * u + d * v + f])
    const xs = corners.map(point => point[0])
    const ys = corners.map(point => point[1])
    assert.ok(Math.abs(Math.min(...xs) - fit.x) < 0.01)
    assert.ok(Math.abs(Math.min(...ys) - fit.y) < 0.01)
    assert.ok(Math.abs(Math.max(...xs) - (fit.x + fit.width)) < 0.01)
    assert.ok(Math.abs(Math.max(...ys) - (fit.y + fit.height)) < 0.01)
  }
  assert.equal(fitPdfImageContain({ width: 0, height: 200 }, box), null)
  assert.equal(fitPdfImageContain({ width: 200, height: 200 }, { ...box, width: 0 }), null)
})

test('A4 and mobile reports use genuine catalogue JPEGs and a single branded lighthouse', () => {
  for (const locale of ['ru', 'en']) {
    const doc = {
      patientName: 'SYNTHETIC PHOTO REPORT',
      dateIssued: '2026-10-19',
      recommendationType: 'homeopathy',
      analysis: 'Synthetic educational summary, not a medical recommendation',
      internalNotes: 'SYNTHETIC PRIVATE DO NOT EXPORT',
      items: [{
        displayName: 'Veratrum Album',
        remedySlug: 'veratrum-album',
        remedyPath: '/' + locale + '/homeopathy/remedies/veratrum-album',
      }],
    }
    const desktop = buildPrescriptionPdf(doc, locale, 'https://example.invalid').toString('latin1')
    const mobile = buildPrescriptionMobilePdf(doc, locale, 'https://example.invalid').toString('latin1')
    assert.equal((desktop.match(/\/Lighthouse Do Q/g) ?? []).length, 1,
      'no second white-backed raster copy obscures the vector seascape')
    assert.equal((mobile.match(/\/Lighthouse Do Q/g) ?? []).length, 1)
    assert.match(desktop, /\/RemedyPhoto1 Do Q/, 'A4 retains the real photograph')
    assert.match(mobile, /\/MobileRemedy0 Do Q/, 'mobile retains the real photograph')
    assert.match(desktop, /0\.94 0\.91 0\.83 rg/, 'coastal sun is drawn as scalable vector art')
    assert.match(desktop, /\/Signature Do Q/, 'the authorized report signature remains')
    assert.doesNotMatch(desktop + mobile, /SYNTHETIC PRIVATE DO NOT EXPORT/)
  }
  const invoice = buildPaymentPdf({
    patientName: 'SYNTHETIC BILL', dateIssued: '2026-10-19',
    dateOfService: '2026-10-19', service: 'Synthetic service', currency: 'EUR',
    amount: 20000, paymentStatus: 'unpaid',
  }, 'en').toString('latin1')
  assert.equal((invoice.match(/\/Lighthouse Do Q/g) ?? []).length, 1)
  assert.doesNotMatch(invoice, /0\.94 0\.91 0\.83 rg/)
})
