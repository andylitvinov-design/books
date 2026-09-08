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

test('owner PIN login retains the legacy access code and creates a 30-day secure session', async () => {
  const [admin, loginPage, logout] = await Promise.all([
    readFile('lib/prescriptions/admin.js', 'utf8'),
    readFile('app/admin/login/page.js', 'utf8'),
    readFile('app/admin/logout/actions.js', 'utf8'),
  ])

  assert.match(loginPage, /PIN \/ Access code/)
  assert.match(admin, /PRESCRIPTIONS_ADMIN_PIN/)
  assert.match(admin, /PRESCRIPTIONS_ADMIN_TOKEN/)
  assert.match(admin, /httpOnly:\s*true/)
  assert.match(admin, /secure:\s*true/)
  assert.match(admin, /sameSite:\s*'strict'/)
  assert.match(admin, /path:\s*'\/admin'/)
  assert.match(admin, /maxAge:\s*60 \* 60 \* 24 \* 30/)
  assert.match(logout, /clearAdminSession/)
  assert.match(logout, /redirect\('\/admin\/login'\)/)
})

test('admin form supports the one-minute canonical remedy workflow without technical fields', async () => {
  const form = await readFile('components/prescription-form.jsx', 'utf8')

  assert.match(form, /remedySlug/)
  assert.match(form, /Client name/)
  assert.match(form, /Date/)
  assert.match(form, /Add remedy/)
  for (const field of ['potency', 'dosage', 'frequency', 'duration', 'notes']) assert.match(form, new RegExp(field))
  assert.match(form, /General instructions/)
  for (const forbidden of ['Patient DOB', 'Language preference', 'Professional background', 'Internal notes', 'Unlinked item', 'Save draft', 'Archive']) {
    assert.doesNotMatch(form, new RegExp(forbidden))
  }
})

test('an active saved prescription presents only the six owner delivery actions', async () => {
  const [editPage, actions] = await Promise.all([
    readFile('app/admin/prescriptions/[id]/page.js', 'utf8'),
    readFile('components/prescription-owner-actions.jsx', 'utf8'),
  ])

  assert.match(editPage, /PrescriptionOwnerActions/)
  for (const action of ['Copy client link', 'Open client page', 'Download PDF', 'Print', 'Edit', 'Revoke link']) {
    assert.match(actions, new RegExp(action))
  }
  assert.doesNotMatch(actions, /<span>\{clientPath\}<\/span>/)
  assert.doesNotMatch(actions, /draft|archive|internalNotes/i)
})

test('saving edits never reactivates a revoked client link', async () => {
  const actions = await readFile('app/admin/prescriptions/actions.js', 'utf8')

  assert.match(actions, /status:\s*existing\?\.status \?\? 'active'/)
  assert.doesNotMatch(actions, /status:\s*'active', items/)
})
