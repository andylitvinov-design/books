import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolveSavedReportLocale } from '../lib/documents/report-locale.js'

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('a saved Russian client report does not become English through an /en share URL', () => {
  assert.equal(resolveSavedReportLocale({ languagePreference: 'ru' }, 'en'), 'ru')
  assert.equal(resolveSavedReportLocale({ languagePreference: 'en' }, 'ru'), 'en')
  assert.equal(resolveSavedReportLocale({ languagePreference: 'bilingual' }, 'ru'), 'ru')
  assert.equal(resolveSavedReportLocale(null, 'en'), 'en')
})

test('shared HTML, private PDF, sharing links and admin previews use the saved report language', () => {
  const page = source('app/[locale]/client/session/[shareSelector]/page.js')
  const pdf = source('app/api/client-session-viewer/[selector]/pdf/route.js')
  const editor = source('components/admin-session-studio.jsx')
  const owner = source('app/admin/clients/[id]/sessions/[sessionId]/page.js')
  assert.match(page, /resolveSavedReportLocale\(record, locale\)/)
  assert.match(page, /locale=\{reportLocale\} embedded/)
  assert.match(page, /ClientSessionPage locale=\{reportLocale\}/)
  assert.match(pdf, /resolveSavedReportLocale\(record, requestedLocale\)/)
  assert.match(pdf, /buildPrescriptionPdf\(projection,reportLocale,/)
  assert.match(editor, /resolveSavedReportLocale\(.*reportDocumentId/)
  assert.match(editor, /\/client\/session\/.*result.selector/)
  assert.match(owner, /languagePreference:doc.languagePreference/)
})

test('editing a saved report never changes language as a side-effect of saving other fields', () => {
  const form = source('components/consultation-form.jsx')
  const action = source('app/admin/consultations/actions.js')
  assert.match(form, /name="languageChangeConfirmed"/)
  assert.match(action, /formData.get\('languageChangeConfirmed'\) !== 'yes'/)
  assert.match(action, /recommendation.languagePreference/)
  assert.match(form, /ReportLanguagePicker locale=\{reportLocale\}/)
})
