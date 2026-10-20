import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildPaymentPdf, buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const origin = 'https://example.test'
const example = {
  patientName: 'Synthetic Client',
  dateIssued: '2026-10-13',
  recommendationNumber: 'TEST-2026-10',
  recommendationType: 'homeopathy',
  analysis: 'SYNTHETIC-ANALYSIS-VISIBILITY',
  additionalNotes: 'SYNTHETIC-GUIDANCE-VISIBILITY',
  followUp: 'Practitioner-entered follow-up',
  items: [{
    displayName: 'Synthetic remedy',
    remedyPath: '/en/homeopathy/remedies/synthetic-remedy',
    itemType: 'homeopathy',
    potency: 'SYNTHETIC-POTENCY',
    purpose: 'SYNTHETIC-PURPOSE',
    notes: 'PRIVATE-PRACTITIONER-ONLY',
  }],
}

test('client PDF uses warm Holistic House styling without losing text, links or privacy', () => {
  for (const locale of ['en', 'ru']) {
    const source = buildPrescriptionPdf(example, locale, origin).toString('latin1')
    assert.match(source, /^%PDF-1\.7/)
    assert.match(source, /0\.39 0\.21 0\.30 rg/)
    assert.match(source, /0\.85 0\.91 0\.90 rg/, 'approved lighthouse now has a soft coastal hero without rectangular image fill')
    assert.match(source, /q 207 0 0 81\.5 83 /, 'wide ink signature rests on white report paper')
    for (const value of [
      'Synthetic Client', 'TEST-2026-10', 'SYNTHETIC-ANALYSIS-VISIBILITY',
      'SYNTHETIC-GUIDANCE-VISIBILITY',
    ]) assert.ok(source.includes(value), `Missing original report field: ${value}`)
    assert.match(source, /\/URI \(https:\/\/example\.test\/en\/homeopathy\/remedies\/synthetic-remedy\)/)
    assert.doesNotMatch(source, /PRIVATE-PRACTITIONER-ONLY/)
    assert.match(source, /\/MediaBox \[0 0 595\.28 841\.89\]/)
    assert.match(source, /\/ToUnicode/)
    // Russian labels cause the full line (including Latin field values) to be
    // encoded with the PDF's embedded Unicode font rather than literal text.
    if (locale === 'en') {
      assert.match(source, /PERSONAL REPORT/)
      assert.match(source, /SYNTHETIC-PURPOSE/)
    }
  }
})

test('long remedy headings and names wrap before PDF sections; invoice layout stays unchanged', () => {
  const source = buildPrescriptionPdf({
    ...example,
    patientName: 'Synthetic ' + 'VeryLongClientName'.repeat(13),
    items: [{...example.items[0], displayName: 'LONG REMEDY NAME ' + 'W'.repeat(260)}],
  }, 'en', origin).toString('latin1')
  assert.match(source, /\/Type \/Page\b/)
  assert.match(source, /LONG REMEDY NAME/)
  assert.match(source, /SYNTHETIC-GUIDANCE-VISIBILITY/)
  assert.match(source, /\/URI \(https:\/\/example\.test\/en\/homeopathy\/remedies\/synthetic-remedy\)/)

  const invoice = buildPaymentPdf({
    patientName: 'Synthetic Client', dateIssued: '2026-10-13',
    dateOfService: '2026-10-13', service: 'Synthetic appointment',
    amount: 15000, currency: 'CAD', paymentStatus: 'unpaid',
  }, 'en', origin).toString('latin1')
  assert.match(invoice, /0\.926 0\.970 0\.969 rg/)
  assert.match(invoice, /68 613 459\.28 44 re f/)
  assert.doesNotMatch(invoice, /PERSONAL REPORT/)
})

test('HTML and print report share the visible client layout and original remedy attachments', async () => {
  const [jsx, css] = await Promise.all([
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
  ])
  for (const selector of [
    'canonical-report-heading', 'canonical-client', 'canonical-remedy--unified',
    'canonical-remedy-fields', 'canonical-remedy-profile-action',
    'canonical-report-analysis', 'canonical-report-notes', 'canonical-follow-up',
  ]) {
    assert.ok(jsx.includes(selector), `Missing client structure: ${selector}`)
    assert.ok(css.includes(selector), `Missing client style: ${selector}`)
  }
  assert.match(jsx, /<RemedyContent[\s\S]+expandSupplementary/)
  assert.match(jsx, /<img src=\{remedy\.primary_image\}/)
  assert.match(jsx, /<DistanceHomeopathyGuide locale=\{locale\} embedded report \/>/)
  assert.match(css, /@media print/)
  assert.match(css, /@page \{ size: A4/)
  assert.match(css, /\.canonical-remedy-profile-photo \{ break-inside: avoid/)
})

test('remedy appendix is concise and the original PDF photo floats at top right', async () => {
  const report = {
    ...example,
    items: [{
      displayName: 'Colchicum autumnale',
      remedySlug: 'colchicum-autumnale',
      remedyPath: '/en/homeopathy/remedies/colchicum-autumnale',
      itemType: 'homeopathy',
    }],
  }
  const pdf = buildPrescriptionPdf(report, 'en', origin).toString('latin1')
  assert.match(pdf, /\(APPENDIX\)/)
  assert.doesNotMatch(pdf, /SELECTED REMEDY PROFILES|Original texts and photographs from the Holistic House library/)
  const photos = [...pdf.matchAll(/q (\d+) 0 0 (\d+) ([\d.]+) ([\d.]+) cm \/RemedyPhoto1 Do Q/g)]
  assert.ok(photos.length >= 2, 'The same approved image appears in the recommendation and the appendix')
  assert.ok(photos.some(photo => Number(photo[3]) > 350), 'Appendix photo must float at the upper right')
  assert.ok(photos.some(photo => Number(photo[3]) < 180), 'Cover thumbnail belongs beside the selected remedy')

  const [jsx, css] = await Promise.all([
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
  ])
  assert.doesNotMatch(jsx, /className="canonical-remedy-profiles"/, 'HTML no longer repeats an appendix')
  assert.doesNotMatch(jsx, /Описание выбранных препаратов|About your selected remedies/)
  assert.doesNotMatch(jsx, /Авторские описания и фотографии из библиотеки Holistic House/)
  assert.match(css, /\.canonical-shell \.canonical-document \.canonical-remedy-profile-photo \{\s*float: right;/)
  assert.match(css, /\.canonical-remedy-profile \.remedy-content-body \{[\s\S]*?font: 18\.5px\/1\.36/)
})


test('one combined card keeps instructions visible, and full source descriptions print safely', async () => {
  const [jsx, css, printHandler] = await Promise.all([
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/consultation-report.css', 'utf8'),
    readFile('components/report-appendix-print-expander.jsx', 'utf8'),
  ])
  const start = jsx.indexOf('return <section className="canonical-remedy canonical-remedy--unified" key={number}>')
  const end = jsx.indexOf('</section>\n        })}', start)
  assert.ok(start >= 0 && end > start)
  const card = jsx.slice(start, end)
  const summary = card.slice(card.indexOf('<summary'), card.indexOf('</summary>'))
  assert.match(card, /<details className="canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure"/)
  assert.match(summary, /RemedyReportThumbnail src=\{remedy\?\.primary_image\}/)
  assert.match(summary, /item\.displayName/)
  assert.match(summary, /administration/)
  assert.match(summary, /detailKeys\.map\(\(key\) => <span/)
  assert.match(summary, /item\[key\]/)
  assert.match(summary, /Описание/)
  assert.doesNotMatch(card, /<details[^>]*\sopen(?:\s|=|>)/, 'full description stays closed on screen')
  assert.match(card, /<div className="canonical-remedy-profile-content">/)
  assert.match(card, /<RemedyContent locale=\{locale\} remedy=\{remedy\}/)
  assert.match(card, /expandSupplementary fullSource/)
  assert.match(card, /remedy\.primary_image/)
  assert.match(card, /item\.remedyPath/)
  assert.doesNotMatch(jsx, /className="canonical-remedy-profiles"/)
  assert.match(jsx, /<ReportAppendixPrintExpander \/>/)
  assert.ok(jsx.indexOf('<ReportAppendixPrintExpander />') < jsx.indexOf('<DocumentAutoPrint enabled='))
  for (const marker of ['canonical-progress','canonical-report-analysis',
    'canonical-remedy-group','canonical-guidance','canonical-follow-up-appointment',
    'DocumentSignature']) assert.ok(jsx.includes(marker))
  const unified = css.slice(css.indexOf('Unified prescription + remedy library cards — 2026-10-19'))
  assert.match(unified, /details\.canonical-remedy-unified-disclosure > summary\.canonical-remedy-unified-summary/)
  assert.match(unified, /@media screen and \(max-width: 700px\)/)
  assert.match(unified, /@media print/)
  assert.match(css, /details\.canonical-remedy-profile-disclosure > summary:focus-visible/)
  assert.match(printHandler, /addEventListener\('beforeprint', expandForPrint\)/)
  assert.match(printHandler, /addEventListener\('afterprint', restoreAfterPrint\)/)
  assert.match(printHandler, /if \(!appendix\.open\)/)
  assert.match(printHandler, /appendix\.open = true/)
  assert.match(printHandler, /appendix\.open = false/)
  const pdfSource = buildPrescriptionPdf({
    ...example,
    items: [{ ...example.items[0], remedySlug: 'colchicum-autumnale',
      displayName: 'Colchicum autumnale' }],
  }, 'en', origin).toString('latin1')
  assert.match(pdfSource, /APPENDIX/)
  assert.match(pdfSource, /SYNTHETIC-ANALYSIS-VISIBILITY/)
  assert.doesNotMatch(pdfSource, /PRIVATE-PRACTITIONER-ONLY/)
})
