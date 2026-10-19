import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { extractReportProgress, parseReportProgressScore, resolveReportProgress } from '../lib/documents/report-progress.js'
import { createPrescription, getClientPrescription, updatePrescription } from '../lib/prescriptions/service.js'
import { buildPrescriptionPdf, buildPrescriptionMobilePdf } from '../lib/prescriptions/pdf.js'

const base = {
  patientName: 'Synthetic Client',
  dateIssued: '2026-10-18',
  languagePreference: 'en',
  recommendationType: 'bach',
  practitionerName: 'Synthetic Practitioner',
  status: 'active',
  items: [{ itemType: 'bach', displayNameOverride: 'Mimulus' }],
  analysis: 'Before: felt tense 2/10\nAfter session: felt calm 3/10',
}

test('report progress input accepts 0–10 with one decimal, rejects unsafe ratings', () => {
  for (const [input, expected] of [['0', 0], [0, 0], ['10', 10], [10, 10], ['6.5', 6.5], ['6,5', 6.5], ['', null], [null, null], [undefined, null]]) {
    assert.equal(parseReportProgressScore(input), expected)
  }
  for (const input of ['-1', '10.1', '11', '3.25', 'NaN', 'Infinity', '12px', '']) {
    if (input === '') continue
    assert.throws(() => parseReportProgressScore(input), /INVALID_REPORT_PROGRESS_SCORE/)
  }
})

test('structured Before/After values win over old narrative matching and survive editing', () => {
  const stored = createPrescription({ ...base, progressBefore: '0', progressAfter: '8.5' })
  assert.deepEqual(resolveReportProgress(stored), { before: 0, after: 8.5 })
  const client = getClientPrescription(stored, 'en')
  assert.deepEqual(resolveReportProgress(client), { before: 0, after: 8.5 })
  assert.equal(client.progressBefore, 0)
  assert.equal(client.progressAfter, 8.5)
  const changed = updatePrescription(stored, { ...base, progressBefore: '4.5', progressAfter: '10' })
  assert.deepEqual(resolveReportProgress(changed), { before: 4.5, after: 10 })
  const reSaved = updatePrescription(changed, { ...base, progressBefore: undefined, progressAfter: undefined })
  assert.deepEqual(resolveReportProgress(reSaved), { before: 4.5, after: 10 })
})

test('legacy reports keep old diagrams; clearing new score fields hides charts without fabricating a result', () => {
  const oldReport = createPrescription(base)
  assert.deepEqual(extractReportProgress(base.analysis), { before: 2, after: 3 })
  assert.deepEqual(resolveReportProgress(getClientPrescription(oldReport, 'en')), { before: 2, after: 3 })
  const cleared = updatePrescription(oldReport, { ...base, progressBefore: '', progressAfter: '' })
  assert.equal(cleared.progressBefore, null)
  assert.equal(cleared.progressAfter, null)
  assert.equal(resolveReportProgress(cleared), null)
  const partial = createPrescription({ ...base, progressBefore: 2, progressAfter: '' })
  assert.equal(resolveReportProgress(partial), null)
})

test('saved numeric values render two rings in A4 and mobile PDFs, without depending on analysis text', () => {
  const saved = getClientPrescription(createPrescription({
    ...base, analysis: 'No numerical score is written here.',
    progressBefore: '3', progressAfter: '7',
  }), 'en')
  const a4 = buildPrescriptionPdf(saved, 'en', 'https://example.invalid').toString('latin1')
  const mobile = buildPrescriptionMobilePdf(saved, 'en', 'https://example.invalid').toString('latin1')
  assert.match(a4, /SELF-RATED PROGRESS/)
  assert.match(a4, /\(3\/10\)/)
  assert.match(a4, /\(7\/10\)/)
  assert.match(mobile, /Self-rated progress/)
  assert.match(mobile, /\(3\/10\)/)
  assert.match(mobile, /\(7\/10\)/)
  assert.match(mobile, / RG 4\.2 w 1 J /, 'mobile PDF must have genuine score-dependent vector circles')
})

test('report editor, preview and HTML client document use explicit Before/After fields', () => {
  const editor = readFileSync('components/consultation-form.jsx', 'utf8')
  const actions = readFileSync('app/admin/consultations/actions.js', 'utf8')
  const preview = readFileSync('app/admin/api/consultations/preview/route.js', 'utf8')
  const html = readFileSync('components/prescription-document.jsx', 'utf8')
  assert.match(editor, /name="progressBefore"/)
  assert.match(editor, /name="progressAfter"/)
  assert.match(editor, /extractReportProgress\(consultation\.analysis\)/)
  assert.match(actions, /'progressBefore', 'progressAfter'/)
  assert.match(preview, /'progressBefore', 'progressAfter'/)
  assert.match(html, /resolveReportProgress\(document\)/)
  assert.match(html, /canonical-progress-dial/)
})
