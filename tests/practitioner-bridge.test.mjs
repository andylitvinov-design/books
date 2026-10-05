import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('verified app practitioner bridge never exposes admin credentials or public navigation', async () => {
  const [access, route, admin, workspace, navigation] = await Promise.all([
    readFile('lib/app/practitioner-access.js', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/prescriptions/admin.js', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('lib/site-navigation-model.js', 'utf8'),
  ])

  assert.match(access, /PRACTITIONER_EMAIL_HASH/)
  assert.doesNotMatch(access, /andy\.litvinov@gmail\.com/i)
  assert.match(access, /timingSafeEqual/)
  assert.match(access, /clients: '\/admin\/clients'/)
  assert.match(access, /consultation: '\/admin\/consultations\/new'/)
  assert.match(access, /recommendation: '\/admin\/prescriptions\/new'/)
  assert.match(access, /payment: '\/admin\/payments\/new'/)

  assert.match(route, /joined === 'practitioner\/open'/)
  assert.match(route, /repo\.isPractitioner\(actor\)/)
  assert.match(route, /issueTrustedAdminSession/)
  assert.match(route, /throw new AppError\('NOT_FOUND', 404\)/)

  assert.match(admin, /issueTrustedAdminSession/)
  assert.match(admin, /PRESCRIPTIONS_ADMIN_TOKEN \|\| environment\.PRESCRIPTIONS_ADMIN_PIN/)
  assert.match(admin, /path: '\/admin'/)
  assert.doesNotMatch(workspace, /PRESCRIPTIONS_ADMIN_(?:PIN|TOKEN)/)

  assert.match(workspace, /data\.practitioner && <PractitionerTools/)
  assert.match(workspace, /Clients & documents/)
  assert.match(workspace, /New consultation/)
  assert.match(workspace, /New recommendation/)
  assert.match(workspace, /Receipt \/ invoice/)
  assert.doesNotMatch(navigation, /\/admin/)
})

test('bootstrap exposes only a boolean practitioner capability', async () => {
  const repository = await readFile('lib/app/repository.js', 'utf8')
  assert.match(repository, /const practitioner = await practitionerOwned\(db, actor\)/)
  assert.match(repository, /practitioner,\n\s+results/)
  assert.match(repository, /async isPractitioner\(actor\)/)
  assert.match(repository, /trusted_auth_user_id=\$1/)
  assert.match(repository, /practitionerEmailAllowed\(actor\)/)
  assert.doesNotMatch(repository, /PRESCRIPTIONS_ADMIN_(?:PIN|TOKEN)/)
})
