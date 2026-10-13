import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import pg from 'pg'
import { createBillingRepository } from '../lib/billing/repository.js'
import { runTierDatabaseTests } from './helpers/subscription-tiers-db.mjs'
import { prepareExtraDatabase, runExtraDatabaseTests } from './helpers/monetization-extra-db.mjs'

// Explicit opt-in integration suite. It is intentionally NOT a *.test.mjs file.
// Run in its own disposable PostgreSQL 17 CI service, never after app-db setup.
// The narrow auth double and isolation convention are taken from:
// https://github.com/andylitvinov-design/books/blob/f78d290212a523c00c615a065f2c3b5dfa532bb5/tests/helpers/app-db-setup.mjs
// Blob aac72e262c336fab5e1c02af84d096553debad8e. We do not import its setup()
// because billing needs neither assessment seeds nor unrelated later migrations.
// This tests real PostgreSQL privileges/RLS/transactions; Supabase Auth itself is
// still a synthetic local double and provider networking is never exercised.

function assertIsolated() {
  let url
  try { url = new URL(process.env.HH_TEST_ADMIN_DATABASE_URL || 'http://invalid') } catch { throw new Error('Isolated billing test database required') }
  if (process.env.CI !== 'true' || process.env.HH_APP_TEST_RUNTIME !== 'isolated' ||
    process.env.HH_BILLING_TEST_APPLY_PROPOSALS !== 'synthetic-only' || process.env.VERCEL ||
    process.env.NODE_ENV === 'production' || !process.execArgv.includes('--conditions=react-server') ||
    !['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.pathname !== '/hh_app_test' || url.search || url.hash ||
    decodeURIComponent(url.username) !== 'postgres' || decodeURIComponent(url.password) !== 'synthetic-ci-admin')
    throw new Error('Refusing billing SQL: explicit isolated CI flags and a fresh synthetic loopback database are required')
  const port = Number(url.port || 5432)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid isolated database port')
  // Pin actual transport to 127.0.0.1, ignoring PGHOST/SSL/query-string overrides.
  return { host: '127.0.0.1', port, database: 'hh_app_test', user: 'postgres', password: 'synthetic-ci-admin',
    ssl: false, application_name: 'hh-billing-isolated-ci', connectionTimeoutMillis: 1500,
    statement_timeout: 7000, query_timeout: 10000, idle_in_transaction_session_timeout: 10000 }
}
// Fail before creating any Client/Pool when invocation or destination is unsafe.
const connection = assertIsolated()
const { Client, Pool } = pg
const billingConfig = { provider: 'stripe', environment: 'sandbox' }
const appConfig = { test: true, origins: ['https://example.invalid'] }
const checkoutInput = extra => ({ operationId: randomUUID(), planId: 'start', locale: 'en',
  origin: 'https://example.invalid', priceId: 'price_synthetic_monthly', ...extra })
const errorCode = code => error => error?.code === code
const event = (customerId, eventId = `evt_${randomUUID().replaceAll('-', '')}`) =>
  ({ provider: 'stripe', environment: 'sandbox', customerId, eventId, eventType: 'invoice.paid' })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

async function adminClient() {
  // Revalidate immediately before every privileged connection.
  const db = new Client(assertIsolated())
  await db.connect()
  return db
}
async function freshFoundation(db) {
  const identity = (await db.query(`select current_database() as name,current_user as role,
    current_setting('server_version_num')::integer as version`)).rows[0]
  assert.equal(identity.name, 'hh_app_test'); assert.equal(identity.role, 'postgres')
  assert.ok(identity.version >= 170000 && identity.version < 180000, 'PostgreSQL 17 is required by this isolated fixture')
  const occupied = (await db.query(`select
    exists(select 1 from pg_namespace where nspname not in ('pg_catalog','information_schema','public','pg_toast')
      and nspname not like 'pg_temp_%' and nspname not like 'pg_toast_temp_%') as schemas,
    exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public') as relations,
    exists(select 1 from pg_roles where rolname<>'postgres' and rolname not like 'pg_%') as roles,
    exists(select 1 from pg_database where not datistemplate and datname not in ('postgres','hh_app_test')) as databases`)).rows[0]
  assert.deepEqual(occupied, { schemas: false, relations: false, roles: false, databases: false },
    'Refusing to modify a nonempty or shared PostgreSQL service; use a fresh dedicated CI job')
  // Exact narrow auth model used by the canonical app-db helper. No users or
  // sessions are read from any external service and no external credentials exist.
  await db.query(`create role anon nologin;create role authenticated nologin;
    create schema auth;create table auth.users(id uuid primary key,email text);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
    grant usage on schema auth to authenticated;grant execute on function auth.jwt(),auth.uid() to authenticated;`)
  await db.query(await readFile(new URL('../supabase/migrations/20261002164037_hh_app_r1_foundation.sql', import.meta.url), 'utf8'))
}
async function applyIsolatedProposal(db, file, guard) {
  assertIsolated()
  const source = await readFile(new URL(`../docs/billing/${file}`, import.meta.url), 'utf8')
  assert.match(source, /^-- UNAPPLIED/)
  assert.equal(source.split(guard).length, 2, 'The exact proposal review guard must occur once; fail on source drift')
  assert.ok(source.indexOf(guard) < source.indexOf('\nBEGIN;'), 'Review guard must precede the transaction')
  // The on-disk review-gated proposal is NEVER edited or copied into migrations.
  // Only this in-memory derivative may execute after the isolated checks above.
  const synthetic = source.replace(guard, '-- Exact review guard removed only for opted-in synthetic CI fixture.')
  await db.query(synthetic)
}
async function createOwner(db, { status = 'active', ready = true } = {}) {
  const id = randomUUID(), sessionId = randomUUID()
  await db.query('insert into auth.users(id,email) values($1,$2)', [id, `${id}@example.invalid`])
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)', [sessionId, id])
  await db.query('insert into app.accounts(id,status,onboarding_state) values($1,$2,$3)', [id, status, ready ? 'active' : 'new'])
  return { id, claims: { sub: id, session_id: sessionId, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 } }
}
async function rawAs(actor, role, fn, scope = null) {
  if (!['anon', 'authenticated', 'hh_app_backend', 'hh_billing_backend', 'hh_crm_backend', 'hh_course_push_worker'].includes(role)) throw new Error('Invalid isolated test role')
  const db = await adminClient()
  try {
    await db.query('BEGIN')
    await db.query(`SET LOCAL ROLE ${role}`)
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(actor?.claims || {})])
    if (scope) await db.query(`select set_config('hh.billing_owner',$1,true),
      set_config('hh.billing_provider',$2,true),set_config('hh.billing_environment',$3,true)`,
    [scope.ownerId, scope.provider || 'stripe', scope.environment || 'sandbox'])
    const result = await fn(db)
    await db.query('COMMIT')
    return result
  } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error }
  finally { await db.end() }
}
async function seedSubscription(repo, owner, overrides = {}) {
  const customerId = `cus_${owner.id.replaceAll('-', '')}`
  const snapshot = { provider: 'stripe', environment: 'sandbox', subscriptionId: `sub_${owner.id.replaceAll('-', '')}`,
    customerId, planId: 'start', status: 'active', paidThroughAt: '2099-01-01T00:00:00.000Z',
    currentPeriodEnd: '2099-01-01T00:00:00.000Z', cancelAtPeriodEnd: false, revokedAt: null, ...overrides }
  await repo.withOwner(owner, async store => { await store.saveCustomer({ customerId }); await store.saveSubscription(snapshot) })
  return snapshot
}
async function waitUntilBlocked(db, pid) {
  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    if ((await db.query('select cardinality(pg_blocking_pids($1))>0 as blocked', [pid])).rows[0].blocked) return
    await delay(20)
  }
  assert.fail('Expected the deletion connection to wait on the real account lock')
}

test('real isolated billing and CRM SQL grants, RLS, rollback and races', { timeout: 120000 }, async t => {
  let admin, pool
  try {
    admin = await adminClient()
    await freshFoundation(admin)
    await applyIsolatedProposal(admin, 'proposed-subscription-schema.sql',
      "DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED BILLING PROPOSAL: explicit approval required'; END $$;")
    await prepareExtraDatabase(admin, assertIsolated)
    await applyIsolatedProposal(admin, 'proposed-crm-billing-registry.sql',
      "DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED CRM BILLING REGISTRY PROPOSAL'; END $$;")
    await admin.query(`create role hh_billing_ci_login login noinherit nosuperuser nobypassrls password 'synthetic-billing-ci-only';
      grant hh_billing_backend to hh_billing_ci_login;`)
    pool = new Pool({ ...connection, user: 'hh_billing_ci_login', password: 'synthetic-billing-ci-only', max: 6 })
    const repo = createBillingRepository(appConfig, billingConfig, { pool })
    const owner = await createOwner(admin), stranger = await createOwner(admin)
    const first = await seedSubscription(repo, owner)
    await seedSubscription(repo, stranger)

    await t.test('actual billing role is restricted and cannot assume the app/health role', async () => {
      const roles = (await admin.query(`select rolname,rolsuper,rolbypassrls,rolinherit from pg_roles
        where rolname in ('hh_billing_backend','hh_billing_ci_login') order by rolname`)).rows
      assert.equal(roles.length, 2)
      for (const role of roles) { assert.equal(role.rolsuper, false); assert.equal(role.rolbypassrls, false); assert.equal(role.rolinherit, false) }
      const db = await pool.connect()
      try { await assert.rejects(db.query('set role hh_app_backend'), errorCode('42501')) } finally { db.release() }
      const protectedTables = ['app.accounts', 'app.assessment_runs', 'app.assessment_results', 'app.profile_snapshots', 'auth.sessions']
      for (const table of protectedTables) {
        const privileges = (await admin.query(`select has_table_privilege('hh_billing_backend',$1,'SELECT') as can_read`, [table])).rows[0]
        assert.equal(privileges.can_read, false, table)
        await assert.rejects(rawAs(owner, 'hh_billing_backend', db => db.query(`select * from ${table}`)), errorCode('42501'))
      }
    })

    await t.test('owner and environment scope are enforced by real FORCE RLS', async () => {
      const scoped = { ownerId: owner.id }
      const rows = (await rawAs(owner, 'hh_billing_backend', db => db.query('select owner_id,environment from billing_private.subscriptions'), scoped)).rows
      assert.deepEqual(rows, [{ owner_id: owner.id, environment: 'sandbox' }])
      assert.equal((await rawAs(owner, 'hh_billing_backend', db => db.query('select * from billing_private.subscriptions where owner_id=$1', [stranger.id]), scoped)).rowCount, 0)
      await assert.rejects(rawAs(owner, 'hh_billing_backend', db => db.query(
        'insert into billing_private.accounts(owner_id,provider,environment) values($1,$2,$3)', [stranger.id, 'other', 'sandbox']), scoped), errorCode('42501'))
      assert.equal((await rawAs(owner, 'hh_billing_backend', db => db.query('select * from billing_private.subscriptions'), { ownerId: owner.id, environment: 'live' })).rowCount, 0)
      assert.equal((await rawAs(owner, 'hh_billing_backend', db => db.query('select * from billing_private.subscriptions'))).rowCount, 0)
      await assert.rejects(rawAs(owner, 'hh_billing_backend', db => db.query(
        'insert into billing_private.accounts(owner_id,provider,environment) values($1,$2,$3)', [owner.id, 'other', 'sandbox'])), errorCode('42501'))
      const rls = (await admin.query(`select relrowsecurity,relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='billing_private' and c.relkind='r'`)).rows
      assert.ok(rls.length >= 7); assert.ok(rls.every(row => row.relrowsecurity && row.relforcerowsecurity))
    })

    await t.test('anonymous, browser-authenticated and app roles cannot read or write billing', async () => {
      for (const role of ['anon', 'authenticated', 'hh_app_backend']) {
        await assert.rejects(rawAs(owner, role, db => db.query('select * from billing_private.subscriptions')), errorCode('42501'))
        await assert.rejects(rawAs(owner, role, db => db.query('select billing_private.owner_ready($1)', [owner.id])), errorCode('42501'))
      }
      assert.equal((await repo.withOwner(owner, store => store.getSubscription())).subscriptionId, first.subscriptionId)
    })

    await t.test('active-account/session check rejects revoked sessions, blocked accounts and incomplete onboarding', async () => {
      const revoked = await createOwner(admin), blocked = await createOwner(admin, { status: 'blocked' }), unready = await createOwner(admin, { ready: false })
      await admin.query('delete from auth.sessions where id=$1', [revoked.claims.session_id])
      for (const actor of [revoked, blocked, unready]) await assert.rejects(repo.withOwner(actor, () => assert.fail('must not run')), /BILLING_ACCOUNT_REQUIRED/)
      await assert.rejects(repo.withOwner({ ...owner, claims: stranger.claims }, () => assert.fail('must not run')), /SIGN_IN_REQUIRED/)
    })

    await t.test('real transaction rollback and event dedup never process a failed reconciliation', async () => {
      const incoming = event(first.customerId)
      await assert.rejects(repo.withCustomer(incoming, async store => {
        await store.saveSubscription({ ...first, status: 'unpaid', paidThroughAt: null })
        throw new Error('synthetic-reconcile-failure')
      }), /synthetic-reconcile-failure/)
      assert.equal((await repo.withOwner(owner, store => store.getSubscription())).status, 'active')
      assert.equal((await admin.query('select * from billing_private.processed_events where event_id=$1', [incoming.eventId])).rowCount, 0)
      assert.deepEqual(await repo.withCustomer(incoming, async store => { await store.saveSubscription(first); return 'committed' }), { duplicate: false, result: 'committed' })
      assert.deepEqual(await repo.withCustomer(incoming, () => assert.fail('duplicate executed')), { duplicate: true, result: null })
      const unknown = event('cus_unmapped_synthetic')
      await assert.rejects(repo.withCustomer(unknown, () => assert.fail('metadata cannot assign an owner')), /BILLING_CUSTOMER_UNKNOWN/)
      assert.equal((await admin.query('select * from billing_private.processed_events where event_id=$1', [unknown.eventId])).rowCount, 0)
      const live = createBillingRepository(appConfig, { ...billingConfig, environment: 'live' }, { pool })
      await assert.rejects(live.withCustomer({ ...incoming, environment: 'live' }, () => assert.fail('sandbox mapping reached live')), /BILLING_CUSTOMER_UNKNOWN/)
    })

    await t.test('parallel checkout operations share one durable operation and uniqueness crosses providers', async () => {
      const customer = await createOwner(admin)
      const results = await Promise.all([repo.withOwner(customer, store => store.prepareCheckout(checkoutInput())),
        repo.withOwner(customer, store => store.prepareCheckout(checkoutInput({ locale: 'ru' })))])
      assert.equal(results[0].operationId, results[1].operationId)
      assert.equal((await admin.query('select * from billing_private.checkout_operations where owner_id=$1', [customer.id])).rowCount, 1)
      const otherProvider = createBillingRepository(appConfig, { provider: 'other', environment: 'sandbox' }, { pool })
      await assert.rejects(otherProvider.withOwner(customer, store => store.prepareCheckout(checkoutInput())), errorCode('23505'))
      assert.equal((await repo.withOwner(customer, store => store.getCheckout())).operationId, results[0].operationId)
    })

    await t.test('account deletion really waits for in-flight checkout and then rejects the obligation', async () => {
      const customer = await createOwner(admin), entered = deferred(), release = deferred()
      const billingWork = repo.withOwner(customer, async store => { entered.resolve(); await release.promise; return store.prepareCheckout(checkoutInput()) })
      await Promise.race([entered.promise, billingWork])
      const deleting = await adminClient()
      let deletionAttempt
      try {
        const pid = (await deleting.query('select pg_backend_pid() as pid')).rows[0].pid
        deletionAttempt = deleting.query("update app.accounts set status='deleting' where id=$1", [customer.id])
          .then(() => ({ error: null }), error => ({ error }))
        await waitUntilBlocked(admin, pid)
        release.resolve(); await billingWork
        const { error } = await deletionAttempt
        assert.equal(error?.code, 'P0001'); assert.equal(error?.message, 'BILLING_CANCEL_REQUIRED')
        assert.equal((await admin.query('select status from app.accounts where id=$1', [customer.id])).rows[0].status, 'active')
      } finally { release.resolve(); await billingWork.catch(() => {}); if (deletionAttempt) await deletionAttempt; await deleting.end() }
    })

    await t.test('completed deletion blocks new checkout; canceled ledger survives account removal', async () => {
      const customer = await createOwner(admin)
      const subscription = await seedSubscription(repo, customer, { cancelAtPeriodEnd: true })
      await admin.query("update app.accounts set status='deleting' where id=$1", [customer.id])
      await assert.rejects(repo.withOwner(customer, store => store.prepareCheckout(checkoutInput())), /BILLING_ACCOUNT_REQUIRED/)
      await admin.query('delete from app.accounts where id=$1', [customer.id])
      assert.equal((await admin.query('select customer_id from billing_private.customers where owner_id=$1', [customer.id])).rows[0].customer_id, subscription.customerId)
      await repo.withCustomer(event(subscription.customerId), store => store.saveSubscription({ ...subscription, status: 'canceled' }))
    })

    await t.test('CRM registry denies by default and runtime roles cannot self-approve or read raw billing', async () => {
      const reader = await createOwner(admin)
      await assert.rejects(rawAs(reader, 'hh_crm_backend', db => db.query('select * from billing_private.crm_subscription_summary()')), errorCode('42501'))
      for (const role of ['hh_crm_backend', 'hh_billing_backend', 'authenticated', 'hh_app_backend']) {
        await assert.rejects(rawAs(reader, role, db => db.query('insert into billing_private.crm_reader_owners(account_id) values($1)', [reader.id])), errorCode('42501'))
      }
      // Synthetic fixture-only explicit allowlist. No real user UUID is present.
      await admin.query('insert into billing_private.crm_reader_owners(account_id) values($1)', [reader.id])
      const rows = (await rawAs(reader, 'hh_crm_backend', db => db.query('select * from billing_private.crm_subscription_summary()'))).rows
      assert.ok(rows.length >= 2 && rows.length <= 100)
      assert.deepEqual(Object.keys(rows[0]), ['subscriber_id', 'provider', 'environment', 'status', 'paid_through_at', 'cancel_at_period_end', 'updated_at'])
      await assert.rejects(rawAs(stranger, 'hh_crm_backend', db => db.query('select * from billing_private.crm_subscription_summary()')), errorCode('42501'))
      await assert.rejects(rawAs(reader, 'hh_crm_backend', db => db.query('select * from billing_private.subscriptions')), errorCode('42501'))
      await assert.rejects(rawAs(reader, 'hh_crm_backend', db => db.query('select * from app.assessment_results')), errorCode('42501'))
      await admin.query('delete from auth.sessions where id=$1', [reader.claims.session_id])
      await assert.rejects(rawAs(reader, 'hh_crm_backend', db => db.query('select * from billing_private.crm_subscription_summary()')), errorCode('42501'))
    })
    await runExtraDatabaseTests(t, { admin, pool, appConfig, billingConfig, createOwner, seedSubscription, repo, rawAs, deferred, waitUntilBlocked })
    for (const migration of ['20261003011500_hh_app_guest_report_flows.sql','20261003031000_hh_app_guest_report_hardening.sql','20261006165000_hh_test_explorer_plans.sql','20261012180000_hh_my_course_r3_account_scales.sql']) {
      assertIsolated()
      await admin.query(await readFile(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'))
    }
    await applyIsolatedProposal(admin, 'proposed-premium-session-schema.sql',
      "DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED PREMIUM SESSION PROPOSAL: explicit approval required'; END $$;")
    await applyIsolatedProposal(admin, 'proposed-concurrent-course-schema.sql',
      "DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED CONCURRENT COURSE PROPOSAL: explicit approval required'; END $$;")
    await runTierDatabaseTests(t, { admin, pool, appConfig, billingConfig, createOwner, seedSubscription, repo, rawAs })
  } finally {
    if (pool) await pool.end()
    if (admin) await admin.end()
    // Intentionally no DROP/cleanup/blanket reset. CI destroys the disposable
    // service. A rerun against the same service refuses its nonempty state.
  }
})
