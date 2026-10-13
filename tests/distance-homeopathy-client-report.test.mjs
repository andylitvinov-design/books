import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getRemedy } from '../data/remedies.js'
import { distanceHomeopathyCopy } from '../data/distance-homeopathy-content.js'
import { distanceHomeopathyAppendixBlocks, remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'
import { createPrescription, getClientPrescription } from '../lib/prescriptions/service.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

const origin = 'https://holistichouse.vercel.app'
const makeReport = (includeDistanceHomeopathy) => getClientPrescription(createPrescription({
  patientName: 'Demo Reader',
  dateIssued: '2026-10-13',
  practitionerName: 'Andrii Litvinov',
  practitionerRole: 'Practitioner',
  practitionerBackground: 'Holistic House',
  practitionerContact: 'test@example.invalid',
  languagePreference: 'ru',
  includeDistanceHomeopathy,
  status: 'active',
  items: [{ itemType: 'homeopathy', remedySlug: 'colchicum-autumnale', potency: '30' }],
}), 'ru')

test('remote homeopathy checkbox persists and is visible on client report', () => {
  assert.equal(makeReport(true).includeDistanceHomeopathy, true)
  assert.equal(makeReport(false).includeDistanceHomeopathy, false)
  assert.equal(makeReport(true).items[0].remedySlug, 'colchicum-autumnale')
})

test('appendix uses every section of the source article, not an abbreviated replacement', () => {
  for (const locale of ['ru', 'en']) {
    const original = distanceHomeopathyCopy[locale]
    const blocks = distanceHomeopathyAppendixBlocks(locale).map(({ text }) => text)
    for (const text of [
      original.lead, original.safetyText, original.baseIntro, original.optionOneText,
      original.optionTwoText, original.photoLead, original.observeText, original.advancedLead,
      original.finishText, ...original.photoSteps, ...original.selfItems.map(item => item.text),
      ...original.sessionItems.map(item => item.text),
    ]) {
      assert.ok(blocks.some(block => block.includes(text)), 'missing original paragraph: ' + text.slice(0, 60))
    }
  }
})

test('remedy descriptions come from approved author content and original image', () => {
  const remedy = getRemedy('ru', 'colchicum-autumnale')
  assert.ok(remedy.description.length > 600)
  assert.match(remedy.primary_image, /^\/media\/remedies\/colchicum-autumnale\/.+\.jpg$/i)
  assert.ok(remedyDescriptionBlocks(remedy.description).some(block => block.kind === 'subheading'))
  assert.equal(makeReport(true).items[0].remedyPath, '/ru/homeopathy/remedies/colchicum-autumnale')
})

test('generated PDF contains an original remedy photo and optional complete article', () => {
  const basic = buildPrescriptionPdf(makeReport(false), 'ru', origin)
  const withGuide = buildPrescriptionPdf(makeReport(true), 'ru', origin)
  for (const pdf of [basic, withGuide]) {
    assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.7')
    const source = pdf.toString('latin1')
    assert.match(source, /\/RemedyPhoto1\s+\d+\s+0\s+R/)
    assert.match(source, /\/Filter \/DCTDecode/)
    assert.match(source, /\/Annots \[/)
  }
  assert.ok(withGuide.length > basic.length + 1000, 'optional article must add real text and pages')
  assert.ok((withGuide.toString('latin1').match(/\/Type \/Page \/Parent/g) ?? []).length >
    (basic.toString('latin1').match(/\/Type \/Page \/Parent/g) ?? []).length)
})

test('service page, editor, preview and HTML report all reference the one optional guide', () => {
  const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  assert.match(source('app/[locale]/services/alchemy-of-soul/page.tsx'), /DistanceHomeopathyGuide locale=/)
  assert.match(source('components/consultation-form.jsx'), /name="includeDistanceHomeopathy"/)
  assert.match(source('app/admin/consultations/actions.js'), /data\.includeDistanceHomeopathy =/)
  assert.match(source('app/admin/api/consultations/preview/route.js'), /input\.includeDistanceHomeopathy =/)
  assert.match(source('components/prescription-document.jsx'), /document\.includeDistanceHomeopathy && <DistanceHomeopathyGuide/)
  assert.match(source('components/prescription-document.jsx'), /<RemedyContent .*expandSupplementary/)
})
