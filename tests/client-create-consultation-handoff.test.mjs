import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(path, 'utf8')

test('new client goes to recommendations after persistence', async () => {
  const action = await read('app/admin/clients/actions.js')
  const start = action.indexOf('export async function createClientAction')
  const end = action.indexOf('export async function editClientAction')
  const create = action.slice(start, end)
  assert.ok(create.includes('await store.saveClient(client)'))
  assert.ok(create.indexOf('redirect(') > create.indexOf('await store.saveClient(client)'))
  assert.ok(create.includes('/admin/consultations/new?clientId='))
  assert.ok(create.includes('encodeURIComponent(client.id)'))
  assert.ok(create.includes('&created=1'))
  assert.ok(!create.includes('/admin/clients/'))
})

test('new client form explains the next step in both languages', async () => {
  const page = await read('app/admin/clients/page.js')
  assert.ok(page.includes('Create client & write recommendations'))
  assert.ok(page.includes('Создать клиента и перейти к назначениям'))
  assert.ok(page.includes('action={createClientAction}'))
})

test('consultation page preselects client and links the separate report editor', async () => {
  const [page, selector] = await Promise.all([
    read('app/admin/consultations/new/page.js'),
    read('components/consultation-client-selector.jsx'),
  ])
  assert.ok(page.includes("typeof params?.clientId === 'string'"))
  assert.ok(page.includes("params?.created === '1'"))
  assert.ok(page.includes('options.find(client => client.id === selectedClientId)'))
  assert.ok(page.includes('selectedClientId={selectedClientId}'))
  assert.ok(page.includes('/assessments/new?kind=research_result'))
  assert.ok(page.includes('role="status"'))
  assert.ok(selector.includes('clients.find((client) => client.id === selectedClientId)'))
  assert.ok(selector.includes('name="clientId" value={selected?.id ??'))
  assert.ok(page.includes('requestId={randomUUID()}'))
})

test('handoff is admin-only and preserves mobile studio', async () => {
  const [page, css, action] = await Promise.all([
    read('app/admin/consultations/new/page.js'),
    read('components/consultation-studio.css'),
    read('app/admin/consultations/actions.js'),
  ])
  assert.ok(page.includes("if (!await requireAdminRequest()) redirect('/admin/login')"))
  assert.ok(page.includes('consultation-studio-shell'))
  assert.ok(css.includes('.consultation-client-created-banner'))
  assert.ok(css.includes('@media (max-width: 600px)'))
  assert.ok(action.includes('createConsultation'))
})
