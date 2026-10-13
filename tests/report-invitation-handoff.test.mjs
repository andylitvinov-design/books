import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { canAutoContinueSave, savedResourcePath } from '../lib/app/client-handoff.js'

const report = { sourceKind: 'delivered_report', status: 'pending', expired: false }
const document = { sourceKind: 'legacy_document', status: 'pending', expired: false }
const id = '30000000-0000-4000-8000-000000000001'

test('automatic handoff is limited to explicit, unexpired private document invitations', () => {
  for (const intent of [report, document]) {
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent }), true)
    assert.equal(canAutoContinueSave({ automatic: false, authStatus: '', intent }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: 'cancelled', intent }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: 'failed', intent }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, expired: true } }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, status: 'withdrawn' } }), false)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, status: 'committed', resourceId: id } }), true)
    assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { ...intent, status: 'committed' } }), false)
  }
  assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: { sourceKind: 'guest_result', status: 'pending' } }), false)
  assert.equal(canAutoContinueSave({ automatic: true, authStatus: '', intent: null }), false)
})

test('saved items navigate to their authenticated, exact-ID account viewer', () => {
  assert.equal(savedResourcePath('en', 'delivered_report', id), '/en/app/reports/' + id)
  assert.equal(savedResourcePath('ru', 'legacy_document', id), '/ru/app/documents/' + id)
  assert.equal(savedResourcePath('en', 'guest_result', id), '/en/app/results/' + id)
  assert.throws(() => savedResourcePath('en', 'delivered_report', '../history'))
  assert.throws(() => savedResourcePath('en', 'other', id))
})

test('private handoff uses one consent click, scoped cookies, blurred gate, and Google continuation', async () => {
  const [gate, gateStyles, shared, prescription, legacySave, workspace, route, reportApi, grantTest] = await Promise.all([
    readFile('components/app/report-invitation-gate.jsx', 'utf8'),
    readFile('components/app/report-invitation-gate.module.css', 'utf8'),
    readFile('components/app/shared-report-view.jsx', 'utf8'),
    readFile('app/[locale]/prescriptions/[selector]/page.js', 'utf8'),
    readFile('components/app/save-private-document-control.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/save-intents.js', 'utf8'),
    readFile('tests/report-claim-flow.test.mjs', 'utf8'),
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
  assert.match(grantTest, /report-viewer\/exchange/)
  assert.doesNotMatch(shared, /sessionStorage|localStorage/)
})
