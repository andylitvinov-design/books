import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createClient, updateClient, normalizeSharedMaterial } from '../lib/clients/service.js'
import { createMemoryPrescriptionStore } from '../lib/prescriptions/store.js'

test('client materials accept only valid named public HTTPS URLs', () => {
  const material = normalizeSharedMaterial({ title: '  Introduction to Reiki ', url: 'https://example.com/course/one' })
  assert.equal(material.title, 'Introduction to Reiki')
  assert.equal(material.url, 'https://example.com/course/one')
  assert.match(material.id, /^[a-f0-9-]{36}$/)
  for (const url of [
    'javascript:alert(1)', 'data:text/html,hello', 'http://example.com',
    'https://localhost/private', 'https://127.0.0.1/', 'https://192.168.0.1/',
    'https://user:password@example.com/', 'not a URL',
  ]) assert.throws(() => normalizeSharedMaterial({ title: 'Unsafe', url }), undefined, url)
  assert.throws(() => normalizeSharedMaterial({ title: '', url: 'https://example.com' }))
  assert.throws(() => normalizeSharedMaterial({ title: 'Valid', url: 'https://example.com', id: 'not-an-id' }))
})

test('client-specific resource links persist in encrypted-client store model without crossing clients', async () => {
  const store = createMemoryPrescriptionStore()
  const a = createClient({ fullName: 'Client A' })
  const b = createClient({ fullName: 'Client B' })
  await store.saveClient(a)
  await store.saveClient(b)
  const next = updateClient(a, { sharedMaterials: [
    normalizeSharedMaterial({ title: 'Guide', url: 'https://holistichouse.vercel.app/en/academy/reiki' }),
  ] })
  assert.equal(await store.saveClientIfUnchanged(a, next), true)
  assert.equal((await store.findClientById(a.id)).sharedMaterials.length, 1)
  assert.deepEqual((await store.findClientById(b.id)).sharedMaterials, [])
  const removed = updateClient(next, { sharedMaterials: [] })
  assert.equal(await store.saveClientIfUnchanged(next, removed), true)
  assert.deepEqual((await store.findClientById(a.id)).sharedMaterials, [])
})

test('only verified owner gets privileged master tools, not any registered network practitioner', async () => {
  const [repo, route, practice, workspace] = await Promise.all([
    readFile('lib/app/repository.js', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('components/app/practice-workspace.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
  ])
  assert.match(repo, /async function practitionerOwned\(db, actor\) \{[\s\S]*?return practitionerEmailAllowed\(actor\)/)
  assert.match(route, /!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(practice, /ownerTools &&/)
  assert.match(workspace, /ownerTools=\{data\.practitioner \? <OwnerTools/)
  assert.match(workspace, /hh-master-header-link/)
})

test('private document save from cabinet requires exact authorized client + document and explicit Google confirmation', async () => {
  const [route, privatePage, control, intent, accountBinding] = await Promise.all([
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('app/[locale]/client/[selector]/documents/[id]/page.js', 'utf8'),
    readFile('components/app/save-private-document-control.jsx', 'utf8'),
    readFile('lib/app/legacy-document-flow.js', 'utf8'),
    readFile('lib/app/client-account-binding.js', 'utf8'),
  ])
  assert.match(route, /authorizeCabinetRequest\(body\.selector, body\.sourceId\)/)
  assert.match(route, /requireUUID\(body\.sourceId\)/)
  assert.match(privatePage, /SavePrivateDocumentControl selector=\{selector\} documentId=\{id\}/)
  assert.match(control, /\.\.\.\(documentId \? \{ sourceId: documentId \} : \{\}\)/)
  assert.match(route, /body\.confirmed !== true/)
  assert.match(intent, /sourceDocumentId|source_document_id/)
  assert.match(accountBinding, /where account_id=\$1/)
})

test('new consultation starts with blank dosing, unpaid invoice and explicit amount/service', async () => {
  const [editor, form] = await Promise.all([
    readFile('lib/consultations/editor.js', 'utf8'),
    readFile('components/consultation-form.jsx', 'utf8'),
  ])
  assert.match(editor, /const blank = \(withDoseDefaults = false\)/)
  assert.match(form, /useState\(payment\?\.paymentStatus \?\? 'unpaid'\)/)
  assert.match(form, /defaultValue=\{payment \? \(payment\.amount \/ 100\)\.toFixed\(2\) : ''\}/)
  assert.match(form, /defaultValue=\{payment\?\.service \?\? ''\}/)
})
