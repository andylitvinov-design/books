import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('client detail prioritizes consultation and cabinet actions while separating dangerous access changes', async () => {
  const page = await readFile('app/admin/clients/[id]/page.js', 'utf8')

  assert.match(page, /client-detail-summary/)
  assert.match(page, /New consultation/)
  assert.match(page, /Client cabinet/)
  assert.match(page, /CabinetLinkActions/)
  assert.match(page, /client-detail-danger-zone/)
  assert.match(page, /Rotate cabinet link/)
  assert.match(page, /Revoke cabinet access/)
  assert.match(page, /Last consultation/)
  assert.match(page, /Последняя консультация/)
  assert.match(page, /Кабинет клиента/)
  assert.match(page, /ClientAccessDangerActions/)

  const accessActions = await readFile('components/client-access-danger-actions.jsx', 'utf8')
  assert.match(accessActions, /window\.confirm/)
  assert.match(accessActions, /copy\.revokeConfirm/)
})

test('new consultation keeps client selection and one post-document cabinet action discoverable', async () => {
  const [page, result] = await Promise.all([
    readFile('app/admin/consultations/new/page.js', 'utf8'),
    readFile('components/consultation-result.jsx', 'utf8'),
  ])

  assert.match(page, /selectedClientId/)
  assert.match(page, /preferredLocale/)
  assert.match(result, /Client cabinet/)
  assert.match(result, /CabinetLinkActions/)
})
