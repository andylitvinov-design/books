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
  const [form, issuer, route] = await Promise.all([
    readFile('components/prescription-form.jsx', 'utf8'),
    readFile('components/prescription-link-issuer.jsx', 'utf8'),
    readFile('app/api/admin/prescriptions/[id]/access/route.js', 'utf8'),
  ])

  assert.match(form, /remedySlug/)
  assert.match(form, /Save draft/)
  assert.match(form, /Activate private link/)
  assert.match(form, /Revoke link/)
  assert.match(form, /Archive/)
  assert.match(form, /Unlinked item/)
  assert.match(form, /PrescriptionLinkIssuer/)
  assert.doesNotMatch(form, /clientPath|publicId/)

  assert.match(issuer, /navigator\.clipboard\.writeText/)
  assert.match(issuer, /url\.hash = secret/)
  assert.match(issuer, /Issue private link/)
  assert.match(issuer, /Rotate private link/)
  assert.doesNotMatch(issuer, /localStorage|sessionStorage|indexedDB|setSecret/)

  assert.match(route, /requireAdminRequest/)
  assert.match(route, /isSameOriginRequest/)
  assert.match(route, /issuePrescriptionAccess/)
  assert.match(route, /Cache-Control.*private, no-store/)
  assert.match(route, /NextResponse\.json\(\{ selector, secret \}/)
  assert.doesNotMatch(route, /internalNotes/)
})

test('saving an edited prescription supplies the previous record for index cleanup', async () => {
  const actions = await readFile('app/admin/prescriptions/actions.js', 'utf8')
  assert.match(actions, /store\.save\(record, existing\)/)
})
