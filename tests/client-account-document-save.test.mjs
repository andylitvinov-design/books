import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createPaymentDocument } from '../lib/documents/payment.js'
import {
  legacyDocumentMeta,
  legacyDocumentProjection,
  legacyDocumentSourceHash,
} from '../lib/app/legacy-document.js'

const CLIENT = '30000000-0000-4000-8000-000000000001'

test('receipt projection is safe and has a stable source hash for explicit saves', () => {
  const payment = {
    ...createPaymentDocument(
      {
        patientName: 'Synthetic Client',
        dateOfService: '2026-10-05',
        dateIssued: '2026-10-05',
        amount: '125.50',
        service: 'Consultation',
        paymentStatus: 'received',
        status: 'active',
      },
      '2026-10-05T18:00:00.000Z',
    ),
    clientId: CLIENT,
  }
  const projection = legacyDocumentProjection(payment, 'en')
  const meta = legacyDocumentMeta(payment)
  const hash = legacyDocumentSourceHash(payment)
  assert.equal(meta.kind, 'receipt')
  assert.equal(meta.legacyClientId, CLIENT)
  assert.equal(projection.patientName, 'Synthetic Client')
  assert.match(hash, /^sha256:[a-f0-9]{64}$/)
  assert.equal('clientId' in projection, false)
  assert.equal('access' in projection, false)
  assert.notEqual(legacyDocumentSourceHash({ ...payment, amount: 12600 }), hash)
})

test('Google save bridge is item-scoped and persists a private Client to Account binding', async () => {
  const [migration, binding, saveIntents, reportFlow, documentFlow, api, page, workspace, admin] =
    await Promise.all([
      readFile('supabase/migrations/20261005190500_hh_client_account_document_save.sql', 'utf8'),
      readFile('lib/app/client-account-binding.js', 'utf8'),
      readFile('lib/app/save-intents.js', 'utf8'),
      readFile('lib/app/report-flow.js', 'utf8'),
      readFile('lib/app/legacy-document-flow.js', 'utf8'),
      readFile('app/api/app/[...path]/route.js', 'utf8'),
      readFile('app/[locale]/prescriptions/[selector]/page.js', 'utf8'),
      readFile('components/app/app-workspace.jsx', 'utf8'),
      readFile('app/admin/clients/[id]/page.js', 'utf8'),
    ])

  assert.match(migration, /app_private\.client_account_bindings/)
  assert.match(migration, /create table if not exists app\.saved_documents/)
  assert.match(migration, /source_kind in\('guest_result','delivered_report','legacy_document'\)/)
  assert.match(migration, /legacy_client_id uuid primary key/)
  assert.match(migration, /account_id uuid references app\.accounts\(id\) on delete set null/)
  assert.doesNotMatch(migration, /unique\s*\(account_id\).*client_account_bindings/i)

  assert.match(binding, /CLIENT_ACCOUNT_ALREADY_LINKED/)
  assert.match(binding, /on conflict\(legacy_client_id\) do update/)
  assert.match(reportFlow, /bindLegacyClientToAccount/)
  assert.match(reportFlow, /sourceKind: 'delivered_report'/)

  assert.match(saveIntents, /createLegacyDocumentSaveIntent/)
  assert.match(saveIntents, /row\.source_kind === 'legacy_document'/)
  assert.match(saveIntents, /source_legacy_client_id/)
  assert.match(saveIntents, /source_hash/)
  assert.match(documentFlow, /bindLegacyClientToAccount/)
  assert.match(documentFlow, /app\.saved_documents/)
  assert.match(documentFlow, /DOCUMENT_UNAVAILABLE/)

  assert.match(api, /sourceKind === 'legacy_document'/)
  assert.match(api, /authorizePrescription/)
  assert.match(api, /commitLegacyDocumentSaveIntent/)
  assert.match(api, /readSavedDocument/)
  assert.match(page, /SavePrivateDocumentControl/)
  assert.match(workspace, /app\/documents/)
  assert.match(workspace, /CLIENT_ACCOUNT_ALREADY_LINKED/)
  assert.match(admin, /googleBinding\.linked/)
})

test('private save UI explicitly uses Google and does not promise the whole legacy archive', async () => {
  const [control, reportControl, sharedReport] = await Promise.all([
    readFile('components/app/save-private-document-control.jsx', 'utf8'),
    readFile('components/report-delivery-controls.jsx', 'utf8'),
    readFile('components/app/shared-report-view.jsx', 'utf8'),
  ])
  assert.match(control, /Save to my Cabinet with Google/)
  assert.match(control, /sourceKind: 'legacy_document'/)
  assert.match(control, /only this document will be saved/)
  assert.doesNotMatch(control, /localStorage|sessionStorage/)
  assert.match(reportControl, /links the client profile to the chosen Google Account/)
  assert.match(reportControl, /other legacy documents are not opened automatically/)
  assert.match(sharedReport, /client profile with Andy will be linked/)
})
