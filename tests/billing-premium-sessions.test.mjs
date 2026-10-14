import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { premiumSessionStore } from '../lib/billing/premium-sessions.js'

const NOW = Date.parse('2026-10-13T12:00:00Z'), END = '2026-11-13T12:00:00.000Z'
const OP = '4b93bfbb-1ec2-4cc4-b7d0-4bd0a9265fcd'
const sub = { subscriptionId: 'sub_fixture', environment: 'sandbox', planId: 'premium', paidThroughAt: END, revokedAt: null }
function fixture() {
  const rows = [], queries = []
  const db = { async query(sql, args) {
    queries.push({ sql, args }); const [owner, provider, environment, subscription, period, operation] = args
    const scoped = rows.filter(row => row.owner === owner && row.provider === provider && row.environment === environment)
    if (sql.includes("set status='expired'")) {
      for (const row of scoped) if (Date.parse(row.period_end) <= NOW && row.status === 'available') row.status = 'expired'
      return { rows: [] }
    }
    if (sql.includes('select period_end,status,held_from_status,hold_details')) return {rows:scoped.filter(row=>row.subscription===subscription&&Date.parse(row.period_end)>NOW&&['available','requested','revoked'].includes(row.status))}
    if (sql.includes('set status=$6,held_from_status=$7')) {
      const row=scoped.find(row=>row.subscription===subscription&&row.period_end===period)
      if(row){row.status=args[5];row.held_from_status=args[6];row.hold_details=JSON.parse(args[7])}
      return {rows:[]}
    }
    if (sql.includes('insert into')) {
      if (!scoped.some(row => row.subscription === subscription && row.period_end === period))
        rows.push({ owner, provider, environment, subscription, period_end: period, status: 'available' })
      return { rows: [] }
    }
    if (sql.includes('operation_id=$4')) return { rows: scoped.filter(row => row.operation === subscription) }
    const row = scoped.find(row => row.subscription === subscription && row.period_end === period)
    if (sql.includes("set status='requested'")) {
      if (!row || row.status !== 'available' || Date.parse(row.period_end) <= NOW) return { rows: [] }
      row.status = 'requested'; row.operation = operation; row.requested_at ||= new Date(NOW).toISOString()
    }
    return { rows: row ? [row] : [] }
  } }
  return { rows, queries, store: premiumSessionStore(db, 'owner', 'stripe', 'sandbox'),
    stranger: premiumSessionStore(db, 'stranger', 'stripe', 'sandbox'), live: premiumSessionStore(db, 'owner', 'stripe', 'live') }
}
test('premium reconciliation mints one period credit regardless of duplicate events', async () => {
  const f = fixture()
  await f.store.syncSessionCredit(sub, NOW); await f.store.syncSessionCredit(sub, NOW)
  assert.equal(f.rows.length, 1)
  const inserts = f.queries.filter(query => query.sql.includes('insert into billing_private.premium_session_credits'))
  assert.equal(inserts.length, 2)
  for (const { sql, args } of inserts) {
    assert.match(sql, /\(owner_id,provider,environment,subscription_id,period_end\)\s+values\(\$1,\$2,\$3,\$4,\$5\) on conflict do nothing/)
    assert.deepEqual(args, ['owner', 'stripe', 'sandbox', sub.subscriptionId, END])
  }
  assert.deepEqual(await f.store.getSessionCredit(sub, NOW), { periodEnd: END, minutes: 60, count: 1, status: 'available', scheduling: 'separate_confirmation_required' })
  assert.equal(await f.stranger.getSessionCredit(sub, NOW), null)
  assert.equal(await f.live.getSessionCredit(sub, NOW), null)
})
test('only paid Premium earns a credit; no free/start/advanced/unpaid/expired grants', async () => {
  for (const invalid of [null, { ...sub, planId: 'start' }, { ...sub, planId: 'advanced' },
    { ...sub, planId: 'free' }, { ...sub, paidThroughAt: null }, { ...sub, environment: 'live' },
    { ...sub, paidThroughAt: new Date(NOW).toISOString() }]) {
    const f = fixture(); await f.store.syncSessionCredit(invalid, NOW); assert.equal(f.rows.length, 0)
  }
})
test('one explicit period-bound request is idempotent and never books a time', async () => {
  const f = fixture(); await f.store.syncSessionCredit(sub, NOW)
  const request = { operationId: OP, periodEnd: END }
  const first = await f.store.requestSessionCredit(sub, request, NOW)
  assert.equal(first.status, 'requested'); assert.equal(first.scheduling, 'separate_confirmation_required')
  assert.deepEqual(await f.store.requestSessionCredit(sub, request, NOW), first)
  await assert.rejects(f.store.requestSessionCredit(sub, { ...request, operationId: 'ad2eecab-3a73-42f3-a4a0-15f70fdc5f5e' }, NOW), /ALREADY_REQUESTED/)
  assert.equal(f.rows.length, 1); assert.ok(f.queries.every(q => !/appointment|calendar|booking|service_orders/.test(q.sql)))
})
test('period changes, foreign ownership, downgrade and refund cannot consume an available credit', async () => {
  const f = fixture(); await f.store.syncSessionCredit(sub, NOW)
  const request = { operationId: OP, periodEnd: END }
  await assert.rejects(f.store.requestSessionCredit(sub, { ...request, periodEnd: '2026-12-13T12:00:00.000Z' }, NOW), /PERIOD_CHANGED/)
  await assert.rejects(f.stranger.requestSessionCredit(sub, request, NOW), /ALREADY_REQUESTED/)
  await assert.rejects(f.store.requestSessionCredit({ ...sub, planId: 'start' }, request, NOW), /UNAVAILABLE/)
  await f.store.syncSessionCredit({ ...sub, revokedAt: new Date(NOW).toISOString() }, NOW)
  assert.equal(f.rows[0].status, 'revoked')
  await assert.rejects(f.store.requestSessionCredit(sub, request, NOW), /ALREADY_REQUESTED/)
})
test('next paid month earns one new credit while prior request history remains', async () => {
  const f = fixture(); await f.store.syncSessionCredit(sub, NOW)
  await f.store.requestSessionCredit(sub, { operationId: OP, periodEnd: END }, NOW)
  const next = { ...sub, paidThroughAt: '2026-12-13T12:00:00.000Z' }
  await f.store.syncSessionCredit(next, NOW)
  assert.equal(f.rows.length, 2); assert.equal(f.rows[0].status, 'requested'); assert.equal(f.rows[1].status, 'available')
  await assert.rejects(f.store.requestSessionCredit(next, { operationId: OP, periodEnd: next.paidThroughAt }, NOW), /OPERATION_CONFLICT/)
})
test('proposal is guarded, scoped, no runtime fulfillment write and no automatic booking', async () => {
  const sql = await readFile(new URL('../docs/billing/proposed-premium-session-schema.sql', import.meta.url), 'utf8')
  assert.match(sql, /^-- UNAPPLIED PROPOSAL\. Outside the migration runner\. No execution authorized\./)
  assert.match(sql, /RAISE EXCEPTION 'UNAPPLIED PREMIUM SESSION PROPOSAL/)
  assert.match(sql, /FORCE ROW LEVEL SECURITY/); assert.match(sql, /UNIQUE\(owner_id,provider,environment,operation_id\)/)
  assert.match(sql, /PRIMARY KEY\(owner_id,provider,environment,subscription_id,period_end\)/)
  assert.match(sql, /GRANT UPDATE\(status,operation_id,requested_at,updated_at,held_from_status,hold_details\)/)
  assert.doesNotMatch(sql, /GRANT UPDATE\([^)]*fulfilled_at/)
  const grants = [...sql.matchAll(/GRANT\s+([^;]+?)\s+ON billing_private\.premium_session_credits TO hh_billing_backend;/g)]
  assert.deepEqual(grants.map(match => match[1]), [
    'SELECT',
    'INSERT(owner_id,provider,environment,subscription_id,period_end)',
    'UPDATE(status,operation_id,requested_at,updated_at,held_from_status,hold_details)',
  ])
  assert.match(sql, /REVOKE INSERT ON billing_private\.premium_session_credits FROM hh_billing_backend;\s+GRANT INSERT\(owner_id,provider,environment,subscription_id,period_end\)/)
  assert.match(sql, /minutes smallint NOT NULL DEFAULT 60 CHECK\(minutes=60\)/)
  assert.match(sql, /status text NOT NULL DEFAULT 'available'/)
  assert.match(sql, /hold_details jsonb NOT NULL DEFAULT '\[\]'::jsonb/)
})

const dispute={reason:'dispute',chargeId:'ch_fixture',invoiceId:'in_fixture',disputeId:'dp_fixture',disputeStatus:'under_review',periodEnd:END}
const held={...sub,paidThroughAt:null,revokedAt:new Date(NOW).toISOString()}
const won={...dispute,disputeStatus:'won'}
test('resolved same-period dispute restores available credit only with exact authoritative proof',async()=>{
 const f=fixture();await f.store.syncSessionCredit(sub,NOW)
 await f.store.syncSessionCredit(held,NOW,{holds:[dispute]})
 assert.equal(f.rows[0].status,'revoked');assert.equal(f.rows[0].held_from_status,'available')
 await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[{...won,disputeId:'dp_other'}]})
 assert.equal(f.rows[0].status,'revoked')
 await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[won]})
 assert.equal(f.rows[0].status,'available');assert.equal(f.rows[0].hold_details[0].resolution,'won')
 assert.equal(f.rows.length,1)
})
test('recovered requested credit retains operation and timestamp, never becomes a second available session',async()=>{
 const f=fixture();await f.store.syncSessionCredit(sub,NOW)
 await f.store.requestSessionCredit(sub,{operationId:OP,periodEnd:END},NOW)
 const requested=f.rows[0].requested_at
 await f.store.syncSessionCredit(held,NOW,{holds:[dispute]})
 await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[won]})
 assert.equal(f.rows[0].status,'requested');assert.equal(f.rows[0].operation,OP);assert.equal(f.rows[0].requested_at,requested)
 assert.equal((await f.store.requestSessionCredit(sub,{operationId:OP,periodEnd:END},NOW)).status,'requested')
 await assert.rejects(f.store.requestSessionCredit(sub,{operationId:'ad2eecab-3a73-42f3-a4a0-15f70fdc5f5e',periodEnd:END},NOW),/ALREADY_REQUESTED/)
})
test('refund, unresolved, unknown and legacy holds cannot be cleared by a won dispute',async()=>{
 for(const extra of [{...dispute,reason:'refund',disputeId:undefined},{...dispute,disputeId:'dp_other'}, {...dispute,reason:'unverified_dispute',disputeId:undefined}]){
  const f=fixture();await f.store.syncSessionCredit(sub,NOW)
  await f.store.syncSessionCredit(held,NOW,{holds:[dispute,extra]})
  await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[won]})
  assert.equal(f.rows[0].status,'revoked')
 }
 const f=fixture();await f.store.syncSessionCredit(sub,NOW);f.rows[0].status='revoked'
 await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[won]});assert.equal(f.rows[0].status,'revoked')
})
test('renewal, expired, fulfilled and wrong-period evidence cannot revive old credit',async()=>{
 for(const status of ['expired','fulfilled']){
  const f=fixture();await f.store.syncSessionCredit(sub,NOW);f.rows[0].status=status
  await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[won]});assert.equal(f.rows[0].status,status)
 }
 const f=fixture();await f.store.syncSessionCredit(sub,NOW);await f.store.syncSessionCredit(held,NOW,{holds:[dispute]})
 await f.store.syncSessionCredit({...sub,paidThroughAt:'2026-12-13T12:00:00.000Z'},NOW,{resolvedDisputes:[won]})
 assert.equal(f.rows[0].status,'revoked');assert.equal(f.rows.length,2)
})
test('a later hold preserves a request made after earlier available-credit recovery',async()=>{
 const f=fixture();await f.store.syncSessionCredit(sub,NOW);await f.store.syncSessionCredit(held,NOW,{holds:[dispute]})
 await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[won]});await f.store.requestSessionCredit(sub,{operationId:OP,periodEnd:END},NOW)
 const other={...dispute,disputeId:'dp_other'}
 await f.store.syncSessionCredit(held,NOW,{holds:[other]});await f.store.syncSessionCredit(sub,NOW,{resolvedDisputes:[{...other,disputeStatus:'warning_closed'}]})
 assert.equal(f.rows[0].status,'requested');assert.equal(f.rows[0].operation,OP)
})
