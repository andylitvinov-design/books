import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { canAutoContinueSave, savedResourcePath } from '../lib/app/client-handoff.js'

const report = { sourceKind: 'delivered_report', status: 'pending', expired: false }
const document = { sourceKind: 'legacy_document', status: 'pending', expired: false }
const guestResult = { sourceKind: 'guest_result', status: 'pending', expired: false }
const id = '30000000-0000-4000-8000-000000000001'

test('automatic handoff requires an explicit unexpired and browser-bound item selection', () => {
  for (const intent of [report, document, guestResult]) {
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent }), true)
    assert.equal(canAutoContinueSave({ automatic: false, authStatus: '', intent }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: 'cancelled', intent }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: 'failed', intent }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, expired: true } }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, status: 'withdrawn' } }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, status: 'committed', resourceId: id } }), true)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, status: 'committed' } }), false)
  }
  assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: guestResult }), true)
  assert.equal(canAutoContinueSave({ automatic: false, authStatus: '', intent: guestResult }), false)
  assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: null }), false)
})

test('saved items navigate to their authenticated, exact-ID account viewer', () => {
  assert.equal(savedResourcePath('en', 'delivered_report', id), '/en/app/reports/' + id)
  assert.equal(savedResourcePath('ru', 'legacy_document', id), '/ru/app/document-view/' + id)
  assert.equal(savedResourcePath('en', 'guest_result', id), '/en/app/results/' + id)
  assert.throws(() => savedResourcePath('en', 'delivered_report', '../history'))
  assert.throws(() => savedResourcePath('en', 'other', id))
})

test('private handoff uses one consent click, scoped cookies, blurred gate, and Google continuation', async () => {
  const [gate, gateStyles, shared, prescription, legacySave, workspace, route, reportApi] = await Promise.all([
    readFile('components/app/report-invitation-gate.jsx', 'utf8'),
    readFile('components/app/report-invitation-gate.module.css', 'utf8'),
    readFile('components/app/shared-report-view.jsx', 'utf8'),
    readFile('app/[locale]/prescriptions/[selector]/page.js', 'utf8'),
    readFile('components/app/save-private-document-control.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/save-intents.js', 'utf8'),
  ])

  assert.match(gate, /role="dialog"/)
  assert.match(gate, /aria-modal="true"/)
  assert.match(gate, /inert=\{!viewing\}/)
  assert.match(gate, /setViewing\(true\)/)
  assert.match(gateStyles, /blur\(3\.5px\)/)
  assert.match(shared, /<ReportInvitationGate/)
  assert.match(prescription, /<ReportInvitationGate/)
  assert.match(shared, /report-viewer\/exchange/)
  assert.match(legacySave, /sourceKind: 'legacy_document'/)
  assert.match(legacySave, /auto=1/)
  assert.match(shared, /auto=1/)
  assert.match(route, /app\/continue\?intent=.*&auto=1/)
  assert.match(workspace, /canAutoContinueSave/)
  assert.match(workspace, /savedResourcePath/)
  assert.match(workspace, /confirmed: true/)
  assert.match(reportApi, /saveIntentBrowserProof/)
  assert.match(reportApi, /httpOnly: true/)
  assert.doesNotMatch(shared, /sessionStorage|localStorage/)
})


test('without-saving action opens the authorized inline PDF, not the HTML reader', async () => {
  const [gate, page, route, styles, pdfGenerator] = await Promise.all([
    readFile('components/app/report-invitation-gate.jsx', 'utf8'),
    readFile('app/[locale]/prescriptions/[selector]/page.js', 'utf8'),
    readFile('app/api/prescriptions/[selector]/pdf/route.js', 'utf8'),
    readFile('components/app/report-invitation-gate.module.css', 'utf8'),
    readFile('lib/prescriptions/pdf.js', 'utf8'),
  ])
  // Gate is rendered only after the saved report is session-authorized.
  assert.match(page, /authorizePrescriptionRequest\(selector\)/)
  assert.match(page, /viewPdfHref=\{/)
  assert.match(page, /\/api\/prescriptions\/\$\{selector\}\/pdf\?locale=\$\{locale\}&preview=1/)
  assert.match(gate, /viewPdfHref \? \(/)
  assert.match(gate, /href=\{viewPdfHref\}/)
  assert.match(gate, /\{isReport \? c\.viewReport : c\.viewDocument\}/)
  assert.match(styles, /\.viewButton:is\(a\)/)
  assert.match(route, /authorizePrescriptionRequest\(selector\)/)
  assert.match(route, /getClientPrescription\(record, locale\)/)
  assert.match(route, /inlinePreview \? 'inline' : 'attachment'/)
  assert.match(route, /Content-Type': 'application\/pdf'/)
  assert.match(route, /Cache-Control': 'private, no-store, max-age=0'/)
  assert.match(route, /X-Robots-Tag': 'noindex, nofollow, noarchive'/)
  assert.doesNotMatch(route, /findByPublicId|internalNotes|\.access\.secret/)
  assert.match(pdfGenerator, /drawReportHeroArtwork/)
  assert.doesNotMatch(pdfGenerator, /fill\(coastX,bottom\+2,178,18/,
    'hard-edged tinted sea rectangle is removed from premium cover')
})
