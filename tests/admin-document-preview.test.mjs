import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { documentPreviewEditHref } from '../lib/consultations/document-preview-navigation.js'

function assertScopedReportAction(source, component) {
  const tags = source.match(new RegExp('<' + component + '\\b[^>]*\\/>', 'g')) ?? []
  assert.equal(tags.length, 1, component + ' must be unique')
  for (const prop of ['clientId', 'recordId', 'locale']) {
    const expression = prop === 'clientId' ? 'record.clientId' : prop === 'recordId' ? 'record.id' : 'locale'
    const bindings = [...tags[0].matchAll(new RegExp('\\b' + prop + '=\\{([^}]+)\\}', 'g'))]
    assert.equal(bindings.length, 1, component + ' requires one ' + prop)
    assert.equal(bindings[0][1], expression, component + ' requires the exact ' + prop)
  }
}

test('report action props stay exact and unique regardless of JSX prop order', () => {
  for (const component of ['ConsultationDocumentActions', 'SessionLinkIssuer']) {
    const tag = '<' + component + ' locale={locale} recordId={record.id} clientId={record.clientId} />'
    assertScopedReportAction(tag, component)
    for (const prop of ['clientId', 'recordId', 'locale']) {
      assert.throws(() => assertScopedReportAction(tag.replace(new RegExp(' ' + prop + '=\\{[^}]+\\}'), ''), component))
      assert.throws(() => assertScopedReportAction(tag.replace(new RegExp(prop + '=\\{[^}]+\\}'), prop + '={other.id}'), component))
    }
    assert.throws(() => assertScopedReportAction(tag + tag, component))
    assert.throws(() => assertScopedReportAction(tag.replace(' />', ' recordId={other.id} />'), component))
    assert.throws(() => assertScopedReportAction(tag.replace(component, 'UnrelatedAction'), component))
  }
})

test('existing client reports edit the same document in the new consultation studio', () => {
  const record = { id: 'client-report-1', kind: 'recommendation', clientId: 'client-1' }
  assert.equal(documentPreviewEditHref(record), '/admin/consultations/client-report-1/edit')
  assert.equal(documentPreviewEditHref({ id: 'linked-report', kind: 'recommendation' }, 'linked-report'), '/admin/consultations/linked-report/edit')
})

test('standalone legacy recommendations and payment documents keep their existing edit routes', () => {
  assert.equal(documentPreviewEditHref({ id: 'old-report' }), '/admin/prescriptions/old-report#edit-recommendation')
  assert.equal(documentPreviewEditHref({ id: 'invoice-1', kind: 'payment', clientId: 'client-1' }, 'linked-report'), '/admin/payments/invoice-1#edit-payment')
})

test('saved document preview shows edit first, keeps every existing action and prints only the report', async () => {
  const [page, css, adminActions, consultationActions, sessionIssuer] = await Promise.all([
    readFile('app/admin/documents/[id]/page.js', 'utf8'),
    readFile('app/admin/documents/[id]/document-preview.module.css', 'utf8'),
    readFile('components/admin-document-panels.jsx', 'utf8'),
    readFile('components/consultation-document-actions.jsx', 'utf8'),
    readFile('components/session-link-issuer.jsx', 'utf8'),
  ])
  assert.match(page, /requireAdminRequest\(\)/)
  assert.match(page, /const editHref = documentPreviewEditHref\(record, consultationId\)/)
  assert.match(page, /<Link href=\{editHref\} className=\{styles\.editButton\}>/)
  assert.match(page, /<AdminDocumentActions record=\{record\} locale=\{locale\}/)
  assertScopedReportAction(page, 'ConsultationDocumentActions')
  assert.match(page, /autoPrint=\{query\.print === '1'\}/)
  assert.match(adminActions, /Download PDF/)
  assertScopedReportAction(adminActions, 'SessionLinkIssuer')
  assert.match(sessionIssuer, /Copy full consultation page link/)
  assert.match(sessionIssuer, /'\/client\/session\/'\+data\.selector/)
  assert.doesNotMatch(sessionIssuer, /getOwnerClientLink|\/prescriptions\//)
  assert.match(consultationActions, /href=\{urls\.print\}/)
  assert.match(css, /\.editButton\s*\{[^}]+background:\s*#783047/s)
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media print[\s\S]*\.header, \.actionPanel, \.previewCaption \{ display: none !important; \}/)
})
