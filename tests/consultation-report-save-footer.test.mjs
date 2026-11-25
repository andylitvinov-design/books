import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('report editor only shows an invoice preview when invoice is selected', () => {
  const form = read('components/consultation-form.jsx')
  assert.match(form, /includeInvoice && <ConsultationDraftPreview locale=\{reportLocale\} includeRecommendation=\{false\}/)
  assert.doesNotMatch(form, /<ConsultationDraftPreview locale=\{reportLocale\} includeRecommendation=\{includeRecommendation\}/)
  assert.equal((form.match(/<ConsultationDraftPreview /g) || []).length, 1)
})

test('save is one associated submit action, portaled to the physical page bottom', () => {
  const form = read('components/consultation-form.jsx')
  const preview = read('components/consultation-draft-preview.jsx')
  const fresh = read('app/admin/consultations/new/page.js')
  const edit = read('app/admin/consultations/[id]/edit/page.js')
  assert.match(form, /createPortal\(saveFooter, saveFooterTarget\)/)
  assert.match(form, /type="submit" disabled=\{pending\} form="consultation-report-form"/)
  assert.match(form, /saveFooterTargetId \? document\.getElementById\(saveFooterTargetId\)/)
  assert.match(form, /id="consultation-report-form"/)
  assert.equal((form.match(/className="prescription-save consultation-primary-action"/g)||[]).length, 1)
  assert.match(preview, /form=\{formId\} disabled=\{disabled/)
  for (const page of [fresh, edit]) {
    assert.match(page, /saveFooterTargetId="consultation-report-save"/)
    assert.match(page, /id="consultation-report-save"/)
  }
  assert.ok(fresh.indexOf('id="consultation-report-save"') > fresh.indexOf('<NewReportMaterials'))
  assert.ok(edit.indexOf('id="consultation-report-save"') > edit.indexOf('<AdminDocumentPanels'))
  assert.match(form, /includeRecommendation && !validateConsultationRows\(items\)/)
  assert.match(form, /daoScoreInvalid/)
})
