import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { OWNER_REPORT_TEXT_TEMPLATE, getOwnerReportTextTemplate } from '../lib/consultations/owner-report-template.js'
import { createConsultation, updateConsultation } from '../lib/consultations/service.js'
import { createConsultationDraftPreview } from '../lib/consultations/draft-preview.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'
import { getClientPrescription } from '../lib/prescriptions/service.js'
import { recommendationCopy } from '../lib/documents/recommendation.js'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'

test('Russian original and English practitioner draft both exist without loss', () => {
  const ru = getOwnerReportTextTemplate('ru')
  const en = getOwnerReportTextTemplate('en')
  assert.equal(ru, OWNER_REPORT_TEXT_TEMPLATE)
  assert.match(ru.analysis, /3\/10/)
  assert.match(ru.additionalNotes, /личный дневник наблюдений/)
  assert.match(en.analysis, /Before the session/)
  assert.match(en.analysis, /7\.3\/10/)
  assert.match(en.additionalNotes, /observation journal/)
  assert.doesNotMatch(en.analysis, /[А-Яа-яЁё]/)
  assert.notEqual(ru.analysis, en.analysis)
})

test('explicit report language overrides client preference, persists for recommendation and invoice', async () => {
  const store = createMemoryPrescriptionStore()
  const input = {
    newClient: { fullName: 'Synthetic Multilingual Client', preferredLocale: 'ru' },
    consultationDate: '2026-10-13', languagePreference: 'en',
    includeRecommendation: true, includeInvoice: true,
    service: 'Synthetic Appointment', amount: '50.00', currency: 'CAD',
    paymentStatus: 'unpaid',
    items: [{ remedySlug: 'arsenicum-album' }],
    analysis: 'Synthetic English measurement', additionalNotes: 'Synthetic English notes',
  }
  const pair = await createConsultation(input, { store, requestId: randomUUID() })
  assert.equal(pair.recommendation.languagePreference, 'en')
  assert.equal(pair.payment.languagePreference, 'en')
  const savedClient = await store.findClientById(pair.recommendation.clientId)
  assert.equal(savedClient.preferredLocale, 'ru')
  const english = getClientPrescription(pair.recommendation, 'en')
  assert.match(english.items[0].remedyPath, /^\/en\//)
  assert.equal(recommendationCopy('en').analysis, 'STATE ANALYSIS')
  assert.equal(recommendationCopy('ru').analysis, 'АНАЛИЗ СОСТОЯНИЯ')
  const pdf = buildPrescriptionPdf(english, 'en', 'https://example.test')
  assert.ok(pdf.toString('latin1').includes('PERSONAL REPORT'))
  const edited = await updateConsultation(pair.recommendation, pair.payment, {
    ...input, newClient: undefined, patientName: pair.recommendation.patientName,
    clientId: pair.recommendation.clientId, languagePreference: 'ru',
  }, { store })
  assert.equal(edited.recommendation.languagePreference, 'ru')
  assert.equal(edited.payment.languagePreference, 'ru')
})

test('unsaved PDF preview uses the selected language and leaves the report unsaved', async () => {
  const input = {
    clientMode: 'new', patientName: 'Synthetic Preview Client',
    consultationDate: '2026-10-13', languagePreference: 'ru',
    includeRecommendation: true, includeInvoice: false,
    items: [{ remedySlug: 'arsenicum-album' }],
    analysis: 'Проверка состояния', additionalNotes: 'Наблюдать изменения',
  }
  const doc = await createConsultationDraftPreview(input, { kind: 'recommendation', locale: 'ru' })
  assert.match(doc.items[0].remedyPath, /^\/ru\//)
  assert.equal(doc.analysis, 'Проверка состояния')
})

test('authoring paths share one visible selector independent of dashboard UI locale', async () => {
  const [form, selector, standalone, picker, route] = await Promise.all([
    readFile('components/consultation-form.jsx', 'utf8'),
    readFile('components/consultation-client-selector.jsx', 'utf8'),
    readFile('components/prescription-form.jsx', 'utf8'),
    readFile('components/report-language-picker.jsx', 'utf8'),
    readFile('app/admin/api/consultations/preview/route.js', 'utf8'),
  ])
  assert.match(picker, /type="radio" name="languagePreference"/)
  assert.match(picker, /English/)
  assert.match(picker, /Русский/)
  assert.match(form, /ReportLanguagePicker locale=\{reportLocale\}/)
  assert.match(form, /ConsultationDraftPreview locale=\{reportLocale\}/)
  assert.match(form, /getOwnerReportTextTemplate\(initialReportLocale\)/)
  assert.match(form, /current === previousTemplate\.analysis/)
  assert.match(standalone, /ReportLanguagePicker locale=\{reportLocale\}/)
  assert.doesNotMatch(selector, /name="languagePreference"/)
  assert.doesNotMatch(standalone, /value="bilingual"/)
  assert.match(route, /selectedLanguage = form\.get\('languagePreference'\)/)
})
