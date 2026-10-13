import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPrescriptionPdf, buildPaymentPdf } from '../lib/prescriptions/pdf.js'
import { extractReportProgress } from '../lib/documents/report-progress.js'

const origin = 'https://example.test'
const base = {
  dateIssued: '2026-10-13',
  patientName: 'Synthetic Example',
  recommendationType: 'homeopathy',
  items: [{ displayName: 'Synthetic remedy', itemType: 'homeopathy' }],
}
const source = pdf => pdf.toString('latin1')
const countPages = pdf => (source(pdf).match(/\/Type \/Page \/Parent/g) ?? []).length

test('adaptive A4 core uses original signature inline, not a nearly empty second page', () => {
  const pdf = buildPrescriptionPdf(base, 'en', origin)
  assert.equal(countPages(pdf), 1, 'short client recommendation should fit on one A4')
  const txt = source(pdf)
  assert.match(txt, /q 120 0 0 47 83 /)
  assert.equal((txt.match(/\/Signature Do Q/g) ?? []).length, 1)
  assert.match(txt, /Synthetic Example/)
  assert.doesNotMatch(txt, /PRIVATE|internalNotes|undefined/)
})

test('real note lengths control pagination and all author text survives', () => {
  const long = buildPrescriptionPdf({
    ...base,
    patientName: 'Synthetic Long Client',
    analysis: 'Before the session: 3/10\nAfter the session: 6/10\nTarget: 7.3/10',
    additionalNotes: Array.from({length:90}, (_,i) => 'USER-NOTE-' + i + ': synthetic text visible to the client').join('\n'),
  }, 'en', origin)
  assert.ok(countPages(long) > countPages(buildPrescriptionPdf(base, 'en', origin)))
  for (const marker of ['USER-NOTE-0', 'USER-NOTE-89']) assert.ok(source(long).includes(marker))
  assert.equal((source(long).match(/\/Signature Do Q/g) ?? []).length, 1)
  assert.match(source(long), /SELF-RATED PROGRESS/)
})

test('no synthetic /10 chart appears without two explicitly supplied observations', () => {
  for (const analysis of ['', 'Only a target: 7/10', 'Before the session: 4/10']) {
    const pdf = buildPrescriptionPdf({...base,analysis}, 'en', origin)
    assert.doesNotMatch(source(pdf), /SELF-RATED PROGRESS/)
    assert.equal(extractReportProgress(analysis), null)
  }
})

test('remedy cover thumbnails are sourced only from a selected approved library remedy', () => {
  const withLibrary = source(buildPrescriptionPdf({
    ...base, items: [{ remedySlug: 'colchicum-autumnale', displayName: 'Colchicum autumnale', itemType: 'homeopathy' }],
  }, 'en', origin))
  assert.match(withLibrary, /\/RemedyPhoto1 Do Q/, 'approved source appears on cover and in appendix')
  assert.match(withLibrary, /\(SELECTED REMEDY\)/)
  const withoutLibrary = source(buildPrescriptionPdf(base, 'en', origin))
  assert.doesNotMatch(withoutLibrary, /SELECTED REMEDY/)
})

test('invoices remain on their approved template, never using recommendation rings', () => {
  const invoice = source(buildPaymentPdf({
    patientName: 'Synthetic Payer', dateIssued: '2026-10-13',
    dateOfService: '2026-10-13', service: 'Synthetic session',
    currency: 'EUR', amount: 10000, paymentStatus: 'unpaid',
  }, 'en', origin))
  assert.match(invoice, /q 89 0 0 87\.71 68 690 cm \/Lighthouse Do Q/)
  assert.doesNotMatch(invoice, /SELF-RATED PROGRESS|SELECTED REMEDY/)
})

test('mobile report and print use adaptive layouts without static page counts', () => {
  const view = readFileSync('components/prescription-document.jsx','utf8')
  const styles = readFileSync('components/consultation-report.css','utf8')
  for (const marker of ['canonical-report-hero','canonical-progress-dial','canonical-remedy-card-photo']) {
    assert.ok(view.includes(marker), marker+' is rendered from client data')
    assert.ok(styles.includes(marker), marker+' has responsive styling')
  }
  assert.match(styles, /grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(styles, /@media print/)
  assert.match(styles, /break-inside:avoid/)
  assert.match(view, /<DocumentSignature date=\{document\.dateIssued\} locale=\{locale\} compact/)
})

test('realistic RU example keeps the practitioner signature with the core report', () => {
  const report = buildPrescriptionPdf({
    patientName: 'Synthetic Example Client',
    dateIssued: '2026-10-13',
    recommendationType: 'homeopathy',
    analysis: 'Было: к цели интерес 3/10 так как не было активного внимания.\nПосле сессии: к цели стало 6/10.\nПрием препаратов должен увеличить активность к цели до 7.3/10.',
    additionalNotes: 'Схема:\n- принимать препарат 2-3 раза в день по инструкции,\n- раз в день ставить препарат на свое фото и запускать намерение.\n\nМожно вести личный дневник наблюдений, отмечать уровень интереса по шкале в 10 баллов.\nДлительность: 10 дней.',
    items: [{remedySlug:'veratrum-album',displayName:'Veratrum Album',potency:'30',granules:'8',timesPerDay:'3',remedyPath:'/ru/homeopathy/remedies/veratrum-album'}],
  }, 'ru', origin)
  const full = source(report)
  // The detailed original appendix is a separate following page; it must never
  // steal the core report's signed closing and create an almost empty page.
  const pages = [...full.matchAll(/\/Type \/Page\b[^]*?\/Contents (\d+) 0 R/g)].map(match => {
    const matchHeader = full.match(new RegExp('\\n' + match[1] + ' 0 obj\\n<< /Length (\\d+) >>\\nstream\\n'))
    return full.slice(matchHeader.index + matchHeader[0].length,matchHeader.index + matchHeader[0].length + Number(matchHeader[1]))
  })
  const signaturePage = pages.findIndex(page => /\/Signature Do Q/.test(page))
  assert.equal(signaturePage, 0, 'compact realistic consultation keeps its approved signature on the first A4 page')
  assert.ok(pages.slice(1).some(page => /\/RemedyPhoto1 Do Q/.test(page)), 'full approved appendix follows')
})
