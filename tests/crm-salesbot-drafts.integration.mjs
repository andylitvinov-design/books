import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createCrmSalesbotStore } from '../lib/crm/salesbot-store.js'
import { SALESBOT_TEMPLATES } from '../lib/crm/salesbot-flow.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const clone = value => JSON.parse(JSON.stringify(value))
const OWNER = 'a4230000-0000-4000-8000-000000000001'
const OTHER = 'b4230000-0000-4000-8000-000000000002'
const config = { encryptionKey: Buffer.alloc(32, 117), encryptionKeyId: 'test' }
function dbFixture() {
  const items = new Map()
  const rows = value => ({ rows: value })
  const now = () => new Date().toISOString()
  const brief = row => row && ({
    id: row.id, flow_key: row.flow_key, status: row.status,
    revision: row.revision, version: row.version,
    created_at: row.created_at, updated_at: row.updated_at,
  })
  return {
    items,
    async query(raw, args) {
      const sql = raw.replace(/\s+/g, ' ').trim().toLowerCase()
      if (sql.startsWith('select count(*)')) {
        return rows([{ count: [...items.values()].filter(row => row.owner_id === args[0]).length }])
      }
      if (sql.startsWith('select id,flow_key,draft_ciphertext,status,revision')) {
        return rows([...items.values()].filter(row => row.owner_id === args[0])
          .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, args[1]))
      }
      if (sql.startsWith('insert into app.crm_salesbot_flows')) {
        const [id, owner_id, flow_key, draft_ciphertext] = args
        if ([...items.values()].some(row => row.owner_id === owner_id && row.flow_key === flow_key)) {
          const error = new Error('duplicate')
          error.code = '23505'
          throw error
        }
        const created_at = now()
        const row = { id, owner_id, flow_key, draft_ciphertext,
          published_ciphertext: null, status: 'draft', revision: 0, version: 0,
          created_at, updated_at: created_at }
        items.set(id, row)
        return rows([brief(row)])
      }
      if (sql.includes('from app.crm_salesbot_flows where id=$1 and owner_id=$2 for update')) {
        const row = items.get(args[0])
        if (!row || row.owner_id !== args[1]) return rows([])
        if (sql.startsWith('select id,flow_key')) return rows([{
          id: row.id, flow_key: row.flow_key, revision: row.revision,
        }])
        if (sql.startsWith('select draft_ciphertext')) return rows([{
          draft_ciphertext: row.draft_ciphertext, revision: row.revision, version: row.version,
        }])
        if (sql.startsWith('select status')) return rows([{
          status: row.status, revision: row.revision,
        }])
      }
      if (sql.startsWith('update app.crm_salesbot_flows')) {
        const row = items.get(args[0])
        if (!row || row.owner_id !== args[1]) return rows([])
        if (sql.includes('set draft_ciphertext')) {
          row.draft_ciphertext = args[2]
          if (row.status === 'approved_preview') row.status = 'paused'
        } else if (sql.includes('set published_ciphertext')) {
          row.published_ciphertext = args[2]
          row.status = 'approved_preview'
          row.version += 1
        } else if (sql.includes("set status='paused'")) {
          row.status = 'paused'
        } else throw new Error('UNKNOWN_FAKE_QUERY ' + sql)
        row.revision += 1
        row.updated_at = now()
        return rows([brief(row)])
      }
      throw new Error('UNKNOWN_FAKE_QUERY ' + sql)
    },
  }
}

test('save, list, load and encrypted private drafts use one CRM owner namespace', async () => {
  const db = dbFixture()
  const a = createCrmSalesbotStore(db, { id: OWNER }, config)
  const b = createCrmSalesbotStore(db, { id: OTHER }, config)
  const base = clone(SALESBOT_TEMPLATES[0])
  assert.deepEqual(await a.listSalesbotFlows(), [])
  const first = await a.saveSalesbotFlow({ flow: base })
  assert.equal(first.saved, true)
  assert.equal(first.status, 'draft')
  assert.equal(first.revision, 0)
  assert.equal((await a.listSalesbotFlows())[0].flow.id, base.id)
  assert.equal((await b.listSalesbotFlows()).length, 0)
  assert.ok(!JSON.stringify([...db.items.values()]).includes(base.nodes[1].text.en))
  await assert.rejects(b.saveSalesbotFlow({
    id: first.id, flow: base, expectedRevision: 0,
  }), { code: 'NOT_FOUND' })
  base.nodes[1].text.en = 'Welcome to an updated experience.'
  const second = await a.saveSalesbotFlow({ id: first.id, flow: base, expectedRevision: 0 })
  assert.equal(second.revision, 1)
  assert.equal((await a.listSalesbotFlows())[0].flow.nodes[1].text.en,
    'Welcome to an updated experience.')
  await assert.rejects(a.saveSalesbotFlow({ id: first.id, flow: base, expectedRevision: 0 }),
    { code: 'REVISION_CONFLICT' })
  await assert.rejects(a.saveSalesbotFlow({ flow: base }),
    { code: 'SALESBOT_FLOW_ALREADY_EXISTS' })
})

test('preview approval snapshots do not dispatch; saving revisions pauses until reapproved', async () => {
  const db = dbFixture()
  const store = createCrmSalesbotStore(db, { id: OWNER }, config)
  const flow = clone(SALESBOT_TEMPLATES[1])
  const initial = await store.saveSalesbotFlow({ flow })
  const ready = await store.approveSalesbotPreview({ id: initial.id, expectedRevision: 0 })
  assert.equal(ready.status, 'approved_preview')
  assert.equal(ready.version, 1)
  assert.equal(ready.revision, 1)
  const original = db.items.get(initial.id).published_ciphertext
  assert.ok(original && !original.includes(flow.nodes[1].text.en))
  const edit = clone(flow); edit.nodes[1].text.ru = 'Выберите свой следующий шаг.'
  const changed = await store.saveSalesbotFlow({ id: initial.id, flow: edit, expectedRevision: 1 })
  assert.equal(changed.status, 'paused')
  assert.equal(changed.version, 1)
  assert.equal(db.items.get(initial.id).published_ciphertext, original)
  const approved = await store.approveSalesbotPreview({ id: initial.id, expectedRevision: 2 })
  assert.equal(approved.status, 'approved_preview')
  assert.equal(approved.version, 2)
  const paused = await store.pauseSalesbotPreview({ id: initial.id, expectedRevision: 3 })
  assert.equal(paused.status, 'paused')
  assert.equal(paused.version, 2)
  await assert.rejects(store.pauseSalesbotPreview({ id: initial.id, expectedRevision: 4 }),
    { code: 'SALESBOT_NOT_APPROVED' })
  assert.equal((await store.listSalesbotFlows()).length, 1)
})

test('malformed input and owner/revision spoofing reject without mutating rows', async () => {
  const db = dbFixture()
  const store = createCrmSalesbotStore(db, { id: OWNER }, config)
  const flow = clone(SALESBOT_TEMPLATES[2])
  const initial = await store.saveSalesbotFlow({ flow })
  for (const payload of [
    { id: initial.id, flow, expectedRevision: -1 },
    { id: initial.id, flow, expectedRevision: 1.5 },
    { id: 'invalid', flow, expectedRevision: 0 },
    { id: initial.id, flow, expectedRevision: 0, owner_id: OTHER },
    { flow, expectedRevision: 0 },
  ]) await assert.rejects(store.saveSalesbotFlow(payload))
  const renamed = clone(flow); renamed.id = 'an-unapproved-switch'
  await assert.rejects(store.saveSalesbotFlow({
    id: initial.id, flow: renamed, expectedRevision: 0,
  }), { code: 'SALESBOT_FLOW_KEY_IMMUTABLE' })
  await assert.rejects(store.approveSalesbotPreview({
    id: initial.id, expectedRevision: 0, flow,
  }), { code: 'INVALID_SALESBOT_COMMAND' })
  assert.equal((await store.listSalesbotFlows())[0].revision, 0)
})

test('owner route, CRM role and migration enforce privacy; no providers or customer writes', () => {
  const route = read('app/api/app/crm/salesbot/drafts/route.js')
  const wrapper = read('lib/crm/repository.js')
  const sql = read('supabase/migrations/20261025192412_hh_crm_salesbot_owner_drafts_20261025.sql')
  const manager = read('components/app/crm-salesbot.jsx')
  const controls = read('components/app/crm-salesbot-drafts.jsx')
  assert.match(route, /createRequestAuth/)
  assert.match(route, /auth\.verified\(\)/)
  assert.match(route, /practitionerEmailAllowed\(actor\)/)
  assert.match(route, /requireSameOrigin/)
  assert.match(route, /x-hh-account-id/)
  assert.match(route, /createCrmRepository/)
  assert.match(wrapper, /SET LOCAL ROLE hh_crm_backend/)
  assert.match(wrapper, /createCrmSalesbotStore/)
  assert.match(sql, /force row level security/)
  assert.match(sql, /to hh_crm_backend/)
  assert.match(sql, /app_private.account_active\(\)/)
  assert.match(sql, /revoke all on table app.crm_salesbot_flows from public, anon, authenticated/)
  assert.match(sql, /references app.accounts\(id\) on delete cascade/)
  assert.match(controls, /mode !== 'owner_drafts'/)
  assert.match(controls, /sendsEnabled !== false/)
  assert.match(manager, /CrmSalesbotDraftControls/)
  for (const source of [route, controls, read('lib/crm/salesbot-store.js')]) {
    assert.doesNotMatch(source, /sendOneMessengerMessage|sendCrmSms|sendCrmMessage|createPublicServiceEnquiry|service_role|localStorage/)
  }
})
