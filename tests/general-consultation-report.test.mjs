import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import { createPrescription, getClientPrescription, inferRecommendationType, updatePrescription } from '../lib/prescriptions/service.js'
import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { createConsultationDraftPreview } from '../lib/consultations/draft-preview.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { buildPrescriptionPdf, buildPrescriptionMobilePdf } from '../lib/prescriptions/pdf.js'
import { recommendationCopy, recommendationGuidance, reportFollowUpDetails } from '../lib/documents/recommendation.js'
import { clientReportHeading } from '../lib/documents/report-heading.js'
import { getOwnerReportTextTemplate } from '../lib/consultations/owner-report-template.js'
import { resultDocumentText } from '../lib/consultations/result-copy.js'
import { documentPreviewEditHref } from '../lib/consultations/document-preview-navigation.js'

const general = {
  patientName: 'Synthetic Client',
  practitionerName: 'Synthetic Practitioner',
  dateIssued: '2026-11-17',
  languagePreference: 'en',
  recommendationType: 'general',
  items: [],
  analysis: 'Synthetic session analysis and observations',
  recommendationsText: 'Synthetic individual guidance without medication',
  additionalNotes: 'Synthetic follow-up observations',
  followUpDate: '2026-11-24',
  progressBefore: 3.5,
  progressAfter: 6,
  includeDistanceHomeopathy: false,
  internalNotes: 'PRIVATE-PRACTITIONER-NOTES-NOT-FOR-CLIENT',
  status: 'active',
}

test('general report supports no remedies, keeps client narrative and does not leak private notes', () => {
  const saved = createPrescription(general)
  assert.equal(saved.recommendationType, 'general')
  assert.deepEqual(saved.items, [])
  assert.equal(inferRecommendationType([], 'general'), 'general')
  const client = getClientPrescription(saved, 'en')
  assert.deepEqual(client.items, [])
  assert.equal(client.analysis, general.analysis)
  assert.equal(client.recommendationsText, general.recommendationsText)
  assert.equal(client.additionalNotes, general.additionalNotes)
  assert.equal(client.progressBefore, 3.5)
  assert.equal(client.progressAfter, 6)
  assert.doesNotMatch(JSON.stringify(client), /PRIVATE-PRACTITIONER-NOTES/)
  assert.equal(recommendationGuidance(client, 'en'), undefined)

  const updated = updatePrescription(saved, { ...general, analysis: 'Updated synthetic analysis' })
  assert.equal(updated.recommendationType, 'general')
  assert.deepEqual(updated.items, [])
  assert.equal(getClientPrescription(updated, 'en').analysis, 'Updated synthetic analysis')
})

test('server enforces an explicit medication-free type and protects legacy remedy reports', () => {
  assert.throws(() => createPrescription({ ...general, items: [{ remedySlug: 'arsenicum-album' }] }), /General report cannot contain remedy items/)
  assert.throws(() => createPrescription({ ...general, recommendationType: 'homeopathy', items: [] }), /At least one remedy item/)
  assert.throws(() => createPrescription({ ...general, analysis: '', recommendationsText: '', additionalNotes: '', generalInstructions: '' }), /needs an analysis or recommendation/)
  const guarded = createPrescription({ ...general, includeDistanceHomeopathy: true })
  assert.equal(guarded.includeDistanceHomeopathy, false)

  const homeo = createPrescription({ ...general, recommendationType: 'homeopathy', items: [{ remedySlug: 'arsenicum-album' }] })
  assert.equal(homeo.recommendationType, 'homeopathy')
  assert.equal(homeo.items.length, 1)
  const bach = createPrescription({ ...general, recommendationType: 'bach', items: [{ itemType: 'bach', displayNameOverride: 'Mimulus' }] })
  assert.equal(bach.recommendationType, 'bach')
})

test('neutral RU/EN templates, follow-up and report labels contain no dosing advice', () => {
  for (const locale of ['ru', 'en']) {
    const template = getOwnerReportTextTemplate(locale, 'general')
    assert.ok(template.analysis.length > 60)
    assert.ok(template.additionalNotes.length > 30)
    assert.doesNotMatch(template.analysis + template.additionalNotes, /препарат|лекарств|гомеопати|remed(y|ies)|homeopath|granule/i)
    assert.equal(recommendationCopy(locale, 'general').title, locale === 'ru' ? 'ОТЧЁТ ПО КОНСУЛЬТАЦИИ' : 'CONSULTATION REPORT')
    const followUp = reportFollowUpDetails('2026-11-24', locale, 'general')
    assert.ok(followUp?.description)
    assert.doesNotMatch(followUp.description, /назначен|препарат|remed|prescription/i)
  }
  assert.equal(clientReportHeading('en', 'general'), 'Consultation report')
  assert.equal(clientReportHeading('ru', 'general'), 'Отчёт по консультации')
  assert.match(getOwnerReportTextTemplate('ru').analysis, /препарат/)
  const label = resultDocumentText({ kind: 'recommendation', recommendationType: 'general', count: 0 }, 'ru')
  assert.equal(label.title, 'ОТЧЁТ ПО КОНСУЛЬТАЦИИ')
  assert.doesNotMatch(label.description, /0 препаратов/)
})

test('both signed and mobile PDFs contain the consultation narrative but no remedy sections', () => {
  const client = getClientPrescription(createPrescription(general), 'en')
  for (const build of [buildPrescriptionPdf, buildPrescriptionMobilePdf]) {
    const pdf = build(client, 'en', 'https://example.test')
    const text = pdf.toString('latin1')
    assert.ok(text.startsWith('%PDF-1.7'))
    assert.match(text, /Consultation report/)
    assert.match(text, /Synthetic session analysis/)
    assert.match(text, /Synthetic individual guidance/)
    assert.doesNotMatch(text, /PRIVATE-PRACTITIONER-NOTES/)
    assert.doesNotMatch(text, /HOMEOPATHIC PRESCRIPTIONS|SELECTED REMEDIES|HOW TO TAKE|Course: 2 weeks/)
  }
})

test('consultation creation, update and unsaved PDF projection all accept empty items', async () => {
  const store = createMemoryPrescriptionStore()
  const created = await createConsultation({
    newClient: { fullName: 'Synthetic General Client', preferredLocale: 'en' },
    consultationDate: general.dateIssued, includeRecommendation: true, includeInvoice: false,
    recommendationType: 'general', items: [],
    analysis: general.analysis, recommendationsText: general.recommendationsText,
  }, { store, requestId: randomUUID() })
  assert.equal(created.payment, undefined)
  assert.deepEqual(created.recommendation.items, [])
  const stored = await store.findById(created.recommendation.id)
  assert.equal(stored.recommendationType, 'general')
  const edited = await updateConsultation(stored, undefined, {
    patientName: stored.patientName, consultationDate: general.dateIssued,
    includeRecommendation: true, includeInvoice: false, recommendationType: 'general',
    items: [], analysis: 'Edited session analysis',
  }, { store })
  assert.equal(edited.recommendation.recommendationType, 'general')
  assert.equal(edited.recommendation.analysis, 'Edited session analysis')
  assert.deepEqual(edited.recommendation.items, [])

  const preview = await createConsultationDraftPreview({
    clientMode: 'existing', clientId: stored.clientId,
    consultationDate: general.dateIssued, languagePreference: 'en',
    includeRecommendation: true, includeInvoice: false,
    recommendationType: 'general', items: [],
    analysis: 'Unsaved synthetic preview narrative',
  }, { store, kind: 'recommendation', locale: 'en' })
  assert.equal(preview.recommendationType, 'general')
  assert.deepEqual(preview.items, [])
})

test('two distinct protected report routes, editors and client history links stay separate', async () => {
  const [archive, classicRedirect, classicNew, generalNew, classicEdit, generalEdit, editor,
    action, previewRoute, reader, session, directory, practitioner, practice] = await Promise.all([
    readFile('app/admin/reports/page.js', 'utf8'),
    readFile('app/admin/reports/new/page.js', 'utf8'),
    readFile('app/admin/consultations/new/page.js', 'utf8'),
    readFile('app/admin/reports/general/new/page.js', 'utf8'),
    readFile('app/admin/consultations/[id]/edit/page.js', 'utf8'),
    readFile('app/admin/reports/general/[id]/edit/page.js', 'utf8'),
    readFile('components/consultation-form.jsx', 'utf8'),
    readFile('app/admin/consultations/actions.js', 'utf8'),
    readFile('app/admin/api/consultations/preview/route.js', 'utf8'),
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/client-session-page.jsx', 'utf8'),
    readFile('lib/consultations/report-directory.js', 'utf8'),
    readFile('lib/app/practitioner-access.js', 'utf8'),
    readFile('components/app/practice-workspace.jsx', 'utf8'),
  ])
  assert.match(archive, /href="\/admin\/reports\/new"/)
  assert.match(archive, /href="\/admin\/reports\/general\/new"/)
  assert.doesNotMatch(archive, /new\?type=general/)
  assert.match(classicRedirect, /\/admin\/consultations\/new/)
  assert.doesNotMatch(classicRedirect, /type=general/)
  assert.match(classicNew, /remedies=\{getConsultationRemedyOptions\(\)\}/)
  assert.doesNotMatch(classicNew, /initialReportKind/)
  assert.match(generalNew, /initialReportKind="general"/)
  assert.match(generalNew, /createGeneralConsultationAction/)
  assert.match(generalNew, /remedies=\{\[\]\}/)
  assert.match(generalEdit, /updateGeneralConsultationAction/)
  assert.match(generalEdit, /consultation\.recommendationType !== 'general'/)
  assert.match(classicEdit, /consultation\.recommendationType === 'general'/)
  assert.match(editor, /name="recommendationType" value=\{reportType\}/)
  assert.match(editor, /reportKind === 'general' \? \[\] : serializeConsultationRows\(items\)/)
  assert.match(editor, /reportKind !== 'general' && <>/)
  assert.doesNotMatch(editor, /changeReportKind|setReportKind|consultation-report-format/)
  assert.match(action, /'recommendationType'/)
  assert.match(action, /Report type cannot be converted/)
  assert.match(action, /createGeneralConsultationAction/)
  assert.match(previewRoute, /'recommendationType'/)
  assert.match(reader, /document\.recommendationType === 'general' \? \[\]/)
  assert.match(session, /isGeneralReport/)
  assert.match(directory, /reportType: doc\.recommendationType === 'general'/)
  assert.match(practitioner, /reportGeneral: '\/admin\/reports\/general\/new'/)
  assert.match(practice, /openOwner\('reportGeneral'\)/)
  assert.match(practice, /openOwner\('report'\)/)

  const id = '550e8400-e29b-41d4-a716-446655440000'
  assert.equal(documentPreviewEditHref({ id, recommendationType: 'general', clientId: id }), '/admin/reports/general/' + id + '/edit')
  assert.equal(documentPreviewEditHref({ id, reportType: 'general', clientId: id }), '/admin/reports/general/' + id + '/edit')
  assert.equal(documentPreviewEditHref({ id, recommendationType: 'homeopathy', clientId: id }), '/admin/consultations/' + id + '/edit')
  assert.equal(documentPreviewEditHref({ id, kind: 'payment', clientId: id }), '/admin/payments/' + id + '#edit-payment')
})
