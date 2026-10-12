import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')

test('new-client action remains the first prominent CRM step and still routes to recommendations', async () => {
  const [list, action] = await Promise.all([
    read('app/admin/clients/page.js'),
    read('app/admin/clients/actions.js'),
  ])
  assert.ok(list.includes("import './client-workspace.css'"))
  assert.ok(list.includes('className="master-client-create"'))
  assert.ok(list.indexOf('className="master-client-create"') < list.indexOf('className="master-clients-top"'))
  assert.ok(list.includes('action={createClientAction}'))
  assert.ok(list.includes('Create client & write recommendations'))
  assert.ok(list.includes('Создать клиента и перейти к назначениям'))
  assert.ok(action.includes('await store.saveClient(client)'))
  assert.ok(action.includes('/admin/consultations/new?clientId='))
})

test('practitioner client record prioritizes consultation and report over private-client access', async () => {
  const page = await read('app/admin/clients/[id]/page.js')
  assert.ok(page.includes("import '../client-workspace.css'"))
  assert.ok(page.includes('requireAdminRequest()'))
  assert.ok(page.includes('className="client-detail-work-card"'))
  assert.ok(page.includes('/admin/consultations/new?clientId='))
  assert.ok(page.includes('/assessments/new?kind=research_result'))
  assert.ok(page.includes("client.status === 'active'"))
  assert.ok(page.indexOf('className="client-detail-work-card"') < page.indexOf('className="client-detail-history"'))
  assert.ok(page.indexOf('className="client-detail-history"') < page.indexOf('className="client-detail-private-access"'))
  assert.ok(page.includes('className="client-detail-security"'))
  assert.ok(page.includes('<CabinetLinkActions clientId={id}'))
  assert.ok(page.includes('<OwnerAssessments records={assessments}'))
  assert.ok(page.includes('addClientMaterialAction.bind(null, id)'))
  assert.ok(page.includes('editClientAction.bind(null, id)'))
  assert.ok(page.includes('rotateClientAction.bind(null, id)'))
})

test('consultation handoff keeps the selected client and secure document action', async () => {
  const [page, form, selector] = await Promise.all([
    read('app/admin/consultations/new/page.js'),
    read('components/consultation-form.jsx'),
    read('components/consultation-client-selector.jsx'),
  ])
  assert.ok(page.includes('createdClient &&'))
  assert.ok(page.includes('role="status"'))
  assert.ok(page.includes('createdClient.fullName.slice(0, 1)'))
  assert.ok(page.includes('selectedClientId={selectedClientId}'))
  assert.ok(page.includes('action={createConsultationAction}'))
  assert.ok(page.includes('requestId={randomUUID()}'))
  assert.ok(selector.includes('name="clientId" value={selected?.id ??'))
  assert.ok(form.includes('serializeConsultationRows(items)'))
  assert.ok(form.includes('potency:'))
  assert.ok(form.includes("timesPerDay: ''"))
})

test('practitioner CSS follows blue-mint/coral house design with readable iPhone controls', async () => {
  const [crm, studio, academy] = await Promise.all([
    read('app/admin/clients/client-workspace.css'),
    read('components/consultation-studio.css'),
    read('components/academy-course-capture.module.css'),
  ])
  for (const token of ['#e9f7fe', '#ddf5f2', '#dcf6ea', '#e66d50']) {
    assert.ok(crm.includes(token), token)
    assert.ok(studio.includes(token), token)
    assert.ok(academy.includes(token), token)
  }
  for (const selector of [
    '.master-clients-shell .master-client-create',
    '.client-detail-shell .client-detail-work-card',
    '.client-detail-shell .client-detail-private-access',
    '@media (max-width: 600px)',
    ':focus-visible',
    'env(safe-area-inset-bottom)',
  ]) assert.ok(crm.includes(selector), selector)
  assert.ok(studio.includes('.consultation-studio-progress'))
  assert.ok(studio.includes('.consultation-studio-submit .consultation-primary-action'))
  assert.ok(studio.includes('@media (max-width: 600px)'))
  assert.ok(studio.includes('prefers-reduced-motion'))
  assert.ok(crm.includes('font-size: 16px'))
  assert.ok(crm.includes('min-height: 48px'))
  assert.ok(studio.includes('min-height: 54px'))
})


test('synthetic browser journey expects the direct recommendation handoff and secondary cabinet disclosure', async () => {
  const script = await read('scripts/verify-app-r1.mjs')
  assert.ok(script.includes('admin/consultations'))
  assert.ok(script.includes('new\\?clientId='))
  assert.ok(script.includes('created=1$'))
  assert.ok(script.includes('consultation-client-selected-row'))
  assert.ok(script.includes('client-detail-private-access > summary'))
  assert.ok(script.includes('practitioner-new-consultation-handoff-mobile.png'))
  assert.ok(script.includes('practitioner-client-workspace-mobile.png'))
  assert.ok(!script.includes("toHaveURL(/\\/admin\\/clients\\/[a-f0-9-]{36}$/"))
})
