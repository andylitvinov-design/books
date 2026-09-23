import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createPaymentDocument, getClientPaymentDocument } from '../lib/documents/payment.js'

async function loadHandler(file, dependencies, exports) {
  const source = (await readFile(new URL(file, import.meta.url), 'utf8'))
    .replace(/^import .* from .*\n/gm, '')
    .replace(/^export /gm, '')
  return new Function(...Object.keys(dependencies), `${source}\nreturn { ${exports.join(', ')} }`)(...Object.values(dependencies))
}

const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' }

test('cabinet PDF denies an unauthorized or cross-client document before it is read or rendered', async () => {
  const { GET } = await loadHandler('../app/api/client/[selector]/documents/[id]/pdf/route.js', {
    NextResponse: Response,
    authorizeCabinetRequest: async () => undefined,
    privateHeaders,
    getClientPrescription: () => assert.fail('document projection must not run'),
    getClientPaymentDocument: () => assert.fail('document projection must not run'),
    buildPrescriptionPdf: () => assert.fail('PDF renderer must not run'),
    buildPaymentPdf: () => assert.fail('PDF renderer must not run'),
    metadataBaseFor: () => assert.fail('metadata lookup must not run'),
  }, ['GET'])

  const response = await GET(new Request('https://preview.invalid/api/client/client-a/documents/client-b-document/pdf?locale=en'), { params: Promise.resolve({ selector: 'client-a', id: 'client-b-document' }) })
  assert.equal(response.status, 404)
  assert.match(response.headers.get('cache-control'), /private, no-store/)
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
})

test('cabinet PDF renders only the safe payment projection returned after exact client authorization', async () => {
  const record = { ...createPaymentDocument({ patientName: 'Synthetic Test Client', dateIssued: '2026-09-22', dateOfService: '2026-09-22', amount: '23.00', currency: 'CAD', service: 'Consultation', paymentStatus: 'received', status: 'active' }), clientId: 'client-a', internalNotes: 'never render this' }
  const { GET } = await loadHandler('../app/api/client/[selector]/documents/[id]/pdf/route.js', {
    NextResponse: Response,
    authorizeCabinetRequest: async () => ({ record }),
    privateHeaders,
    getClientPrescription: () => assert.fail('payment must not use recommendation renderer'),
    getClientPaymentDocument,
    buildPrescriptionPdf: () => assert.fail('payment must not use recommendation PDF'),
    buildPaymentPdf: (document) => {
      assert.equal(document.internalNotes, undefined)
      assert.equal(document.clientId, undefined)
      assert.equal(document.id, undefined)
      return Buffer.from('%PDF synthetic')
    },
    metadataBaseFor: () => ({ origin: 'https://preview.invalid' }),
  }, ['GET'])

  const response = await GET(new Request(`https://preview.invalid/api/client/client-a/documents/${record.id}/pdf?locale=ru`), { params: Promise.resolve({ selector: 'client-a', id: record.id }) })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.match(response.headers.get('content-disposition'), /private-document\.pdf/)
  assert.match(response.headers.get('cache-control'), /private, no-store/)
})


test('client cabinet distinguishes Bach recommendations from Homeopathy', async () => {
  const page = await readFile('app/[locale]/client/[selector]/page.js', 'utf8')
  assert.match(page, /recommendationType === 'bach'/)
  assert.match(page, /Bach Flower Essence Recommendation/)
  assert.match(page, /Рекомендация по эссенциям Баха/)
})


test('client cabinet distinguishes mixed recommendations', async () => {
  const page = await readFile('app/[locale]/client/[selector]/page.js', 'utf8')
  assert.match(page, /recommendationType === 'mixed'/)
  assert.match(page, /Integrated Recommendation/)
  assert.match(page, /Комплексная рекомендация/)
})
