import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { legacyDocumentProjection } from '../lib/app/legacy-document.js'
import { savedResourcePath } from '../lib/app/client-handoff.js'
import { reportPdfFilename } from '../lib/documents/report-filename.js'

const id = '30000000-0000-4000-8000-000000000001'

test('Google Cabinet opens the full canonical report via an account-verified server page', async () => {
  const [appPage, viewer, workspace, recommendation, receipt, css, profile, management] = await Promise.all([
    readFile('app/[locale]/app/[[...path]]/page.jsx', 'utf8'),
    readFile('app/[locale]/app/document-view/[id]/page.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/payment-document.jsx', 'utf8'),
    readFile('components/app/saved-document-reader.css', 'utf8'),
    readFile('components/app/profile-domains.jsx', 'utf8'),
    readFile('components/app/saved-document-management.jsx', 'utf8'),
  ])
  assert.match(appPage, /path\[0\] === 'documents'/)
  assert.match(appPage, /\/app\/document-view\//)
  assert.doesNotMatch(workspace, /function SavedRecommendationDocument\(/)
  assert.doesNotMatch(workspace, /function SavedPaymentDocument\(/)
  assert.doesNotMatch(workspace, /function SavedDocumentPage\(/)
  assert.match(viewer, /await createRequestAuth\(\{ cookies: cookieJar \}, config\)\.verified\(\)/)
  assert.match(viewer, /readSavedDocument\(config, store, actor, id, locale\)/)
  assert.match(viewer, /<PrescriptionDocument document=\{saved\.document\} locale=\{locale\} embedded/)
  assert.match(viewer, /<PaymentDocument document=\{saved\.document\} locale=\{locale\} embedded/)
  assert.match(viewer, /data-canonical-saved-document/)
  assert.match(viewer, /robots: \{ index: false, follow: false \}/)
  assert.match(viewer, /referrer: 'no-referrer'/)
  assert.match(viewer, /SavedDocumentManagement/)
  assert.match(management, /appFetch\('documents\//)
  assert.match(profile, /\/app\/document-view\//)
  assert.match(recommendation, /embedded = false/)
  assert.match(recommendation, /canonical-report-analysis/)
  assert.match(recommendation, /canonical-report-notes/)
  assert.match(recommendation, /canonical-progress/)
  assert.match(recommendation, /canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure/)
  assert.match(recommendation, /canonical-remedy-profile-content/)
  assert.match(recommendation, /<RemedyContent locale=\{locale\} remedy=\{remedy\}/)
  assert.match(recommendation, /fullSource/)
  assert.match(recommendation, /includeDistanceHomeopathy/)
  assert.match(receipt, /embedded = false/)
  assert.match(css, /@media \(max-width: 600px\)/)
  assert.match(css, /@media print/)
})

test('saved source projection contains complete report sections but no practitioner-only data', () => {
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
  assert.equal(savedResourcePath('ru', 'legacy_document', id), '/ru/app/document-view/' + id)
  assert.doesNotMatch(reportPdfFilename(source), /Synthetic Client|30000000/)
})

test('PDF endpoint is gated by verified account and content hash, not the legacy bearer link', async () => {
  const [route, readFlow] = await Promise.all([
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/legacy-document-flow.js', 'utf8'),
  ])
  const gate = route.indexOf('const actor = await auth.verified()')
  const pdf = route.indexOf("path[2] === 'pdf'")
  assert.ok(gate >= 0 && pdf > gate)
  assert.match(route, /readSavedDocument\(config, store, actor, path\[1\], locale\)/)
  assert.match(route, /Content-Disposition/)
  assert.match(route, /\.\.\.PRIVATE_HEADERS/)
  assert.match(readFlow, /account_id=\$2/)
  assert.match(readFlow, /record\.clientId !== ref\.legacy_client_id/)
  assert.match(readFlow, /legacyDocumentSourceHash\(record\) !== ref\.source_hash/)
  assert.match(readFlow, /DOCUMENT_UNAVAILABLE/)
  assert.doesNotMatch(route.slice(pdf, pdf + 1700), /authorizePrescription\(/)
})

