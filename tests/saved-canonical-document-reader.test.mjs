import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { legacyDocumentProjection } from '../lib/app/legacy-document.js'
import { savedResourcePath } from '../lib/app/client-handoff.js'
import { reportPdfFilename } from '../lib/documents/report-filename.js'

const id = '30000000-0000-4000-8000-000000000001'

test('Google Cabinet opens the real full report, never the lossy SavedRecommendationDocument snapshot', async () => {
  const [workspace, exactViewer, recommendation, receipt, stylesheet, route] = await Promise.all([
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('components/app/saved-canonical-document.jsx', 'utf8'),
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/payment-document.jsx', 'utf8'),
    readFile('components/app/saved-document-reader.css', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
  ])
  assert.doesNotMatch(workspace, /function SavedRecommendationDocument\(/)
  assert.doesNotMatch(workspace, /function SavedPaymentDocument\(/)
  assert.match(workspace, /<SavedCanonicalDocument document=\{value\.document\} kind=\{value\.kind\}/)
  assert.match(workspace, /data-canonical-saved-document/)
  assert.match(workspace, /data-canonical-saved-report/)
  assert.match(workspace, /hh-app--document-reader/)
  assert.match(workspace, /!documentReader && <header/)
  assert.match(workspace, /!documentReader && page !== 'runs'/)
  assert.match(workspace, /\/api\/app\/documents\//)
  assert.match(exactViewer, /import \{ PrescriptionDocument \}/)
  assert.match(exactViewer, /import \{ PaymentDocument \}/)
  assert.match(exactViewer, /<PrescriptionDocument document=\{document\} locale=\{locale\} embedded/)
  assert.match(exactViewer, /<PaymentDocument document=\{document\} locale=\{locale\} embedded/)
  assert.match(recommendation, /embedded = false/)
  assert.match(recommendation, /canonical-report-analysis/)
  assert.match(recommendation, /canonical-report-notes/)
  assert.match(recommendation, /canonical-progress/)
  assert.match(recommendation, /canonical-remedy-profiles/)
  assert.match(recommendation, /fullSource/)
  assert.match(recommendation, /includeDistanceHomeopathy/)
  assert.match(receipt, /embedded = false/)
  assert.match(stylesheet, /@media \(max-width: 600px\)/)
  assert.match(stylesheet, /@media print/)
  assert.match(route, /path\[0\] === 'documents' && path\.length === 3 && path\[2\] === 'pdf'/)
  assert.match(route, /readSavedDocument\(config, store, actor, path\[1\], locale\)/)
  assert.match(route, /Content-Disposition/)
  assert.match(route, /\.\.\.PRIVATE_HEADERS/)
})

test('saved source projection contains the exact report sections but no practitioner-only data', () => {
  const record = {
    id, clientId: '30000000-0000-4000-8000-000000000002', kind: 'prescription',
    status: 'active', dateIssued: '2026-10-13', patientName: 'Synthetic Client',
    recommendationType: 'homeopathy', analysis: 'SYNTHETIC_ANALYSIS_SECTION',
    additionalNotes: 'SYNTHETIC_NEXT_STEPS', includeDistanceHomeopathy: true,
    generalInstructions: 'SYNTHETIC_GENERAL_GUIDANCE',
    internalNotes: 'PRIVATE_PRACTITIONER_ONLY', followUp: '2026-10-15',
    items: [{ displayNameOverride: 'Synthetic selection', itemType: 'homeopathy' }],
  }
  const source = legacyDocumentProjection(record, 'ru')
  assert.equal(source.analysis, record.analysis)
  assert.equal(source.additionalNotes, record.additionalNotes)
  assert.equal(source.includeDistanceHomeopathy, true)
  assert.equal(source.generalInstructions, record.generalInstructions)
  assert.equal(source.followUp, record.followUp)
  assert.equal(source.items[0].displayName, 'Synthetic selection')
  assert.equal('internalNotes' in source, false)
  assert.equal('clientId' in source, false)
  assert.equal(savedResourcePath('ru', 'legacy_document', id), '/ru/app/documents/' + id)
  assert.doesNotMatch(reportPdfFilename(source), /Synthetic Client|30000000/)
})

test('PDF endpoint is gated by verified account and content hash, not the legacy link', async () => {
  const [route, readFlow] = await Promise.all([
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/legacy-document-flow.js', 'utf8'),
  ])
  const gate = route.indexOf('const actor = await auth.verified()')
  const pdf = route.indexOf("path[2] === 'pdf'")
  assert.ok(gate >= 0 && pdf > gate)
  assert.match(readFlow, /s\.account_id=\$2|account_id=\$2/)
  assert.match(readFlow, /record\.clientId !== ref\.legacy_client_id/)
  assert.match(readFlow, /legacyDocumentSourceHash\(record\) !== ref\.source_hash/)
  assert.match(readFlow, /DOCUMENT_UNAVAILABLE/)
  assert.doesNotMatch(route.slice(pdf, pdf + 1600), /authorizePrescription\(/)
})
