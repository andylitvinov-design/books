import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('admin pages enforce the configured admin gate before exposing a record', async () => {
  const [newPage, editPage, actions] = await Promise.all([
    readFile('app/admin/prescriptions/new/page.js', 'utf8'),
    readFile('app/admin/prescriptions/[id]/page.js', 'utf8'),
    readFile('app/admin/prescriptions/actions.js', 'utf8'),
  ])

  assert.match(newPage, /requireAdminRequest/)
  assert.match(editPage, /requireAdminRequest/)
  assert.match(actions, /requireAdminRequest/)
  assert.doesNotMatch(newPage, /internalNotes/)
})

test('admin form submits canonical remedy slugs and supports the status lifecycle', async () => {
  const form = await readFile('components/prescription-form.jsx', 'utf8')

  assert.match(form, /remedySlug/)
  assert.match(form, /Save draft/)
  assert.match(form, /Activate private link/)
  assert.match(form, /Revoke link/)
  assert.match(form, /Unlinked item/)
  assert.match(form, /Copy client link/)
  assert.match(form, /Download PDF/)
  assert.match(form, /Print client copy/)
})
