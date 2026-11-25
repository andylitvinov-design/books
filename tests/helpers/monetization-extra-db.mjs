// Imported only by billing-database.integration after its isolated-CI guard.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createBillingRepository } from '../../lib/billing/repository.js'
import { commerceStore } from '../../lib/commerce/repository.js'
import { createNotificationRepository } from '../../lib/notifications/repository.js'

export async function prepareExtraDatabase(db, assertIsolated) {
  assertIsolated()
  for (const name of ['20261011184000_hh_my_course_r1.sql', '20261011203000_hh_growth_daily_r2.sql'])
    await db.query(await readFile(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8'))
  const proposals = [
    ['crm/proposed-crm-schema.sql', "do $$ begin raise exception 'UNAPPLIED CRM PROPOSAL: explicit schema/security approval required'; end $$;", false],
    ['billing/proposed-service-commerce-schema.sql', "DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED SERVICE COMMERCE PROPOSAL: explicit approval required'; END $$;", false],
    ['pwa/course-notifications-schema.proposed.sql', null, true],
    ['pwa/course-notification-dispatch.proposed.sql', "DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED NOTIFICATION DISPATCH PROPOSAL: explicit approval required'; END $$;", true],
  ]
  for (const [file, guard, rollback] of proposals) {
    assertIsolated()
    let sql = await readFile(new URL('../../docs/' + file, import.meta.url), 'utf8')
    assert.match(sql, /^-- (?:UNAPPLIED|PROPOSAL)/)
    if (guard) { assert.equal(sql.split(guard).length, 2); sql = sql.replace(guard, '-- Exact review guard removed only in disposable synthetic CI.') }
    if (rollback) { assert.match(sql, /\nrollback;\s*$/); sql = sql.replace(/\nrollback;\s*$/, '\ncommit;\n') }
    // The source proposal is never rewritten, persisted as a migration or run elsewhere.
    await db.query(sql)
  }
}

export async function runExtraDatabaseTests(t, { admin, pool, appConfig, billingConfig, createOwner, seedSubscription, repo, rawAs, deferred, waitUntilBlocked }) {
  const errorCode = code => error => error?.code === code
  const encryptedConfig = { ...appConfig, encryptionKey: Buffer.alloc(32, 7), encryptionKeyId: 'synthetic-ci-only' }
  const runTransaction = (_config, actor, operation) => rawAs(actor, 'hh_app_backend', async db => {
    assert.equal((await db.query('select app_private.session_active() as valid')).rows[0].valid, true)
    return operation(db)
  })
  const enrollment = createNotificationRepository(encryptedConfig, { runTransaction, environment: 'sandbox' })
  const worker = operation => rawAs(null, 'hh_course_push_worker', operation)
  const snapshot = id => worker(async db => (await db.query("select app_private.course_push_snapshot($1,'sandbox',false) as value", [id])).rows[0].value)
  const day = async () => (await admin.query("select to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD') as day")).rows[0].day
  const claim = async (id, claimId = randomUUID()) => worker(async db => (await db.query("select app_private.course_push_claim($1,'sandbox',$2,$3) as value", [id, await day(), claimId])).rows[0].value)
  async function eligibleDevice() {
    const actor = await createOwner(admin)
    await seedSubscription(repo, actor, { cancelAtPeriodEnd: true })
    const course = (await admin.query('insert into app_private.growth_courses(account_id,consented_at) values($1,now()) returning id', [actor.id])).rows[0].id
    await admin.query("insert into app_private.growth_cycles(account_id,course_id,primary_domain,start_local_date,time_zone) values($1,$2,'calm_regulation',current_date,'UTC')", [actor.id, course])
    const subscription = { endpoint: 'https://web.push.apple.com/synthetic-' + randomUUID(), keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url'), auth: Buffer.alloc(16, 1).toString('base64url') } }
    const { deviceId } = await enrollment.subscribe(actor, subscription, 'course-push-v1')
    await admin.query("update app_private.course_notification_preferences set timezone='UTC',daily_at=to_char(clock_timestamp() at time zone 'UTC','HH24:MI'),quiet_hours_enabled=false where account_id=$1", [actor.id])
    return { actor, deviceId, subscription, hash: createHash('sha256').update(subscription.endpoint).digest('hex') }
  }

  await t.test('CRM contacts, immutable consent and own preferences have real owner/session RLS', async () => {
    const owner = await createOwner(admin), stranger = await createOwner(admin), contact = randomUUID(), consent = randomUUID()
    await rawAs(owner, 'hh_crm_backend', db => db.query("insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle) values($1,$2,'synthetic-sealed','synthetic-hash','en','lead')", [contact, owner.id]))
    assert.equal((await rawAs(stranger, 'hh_crm_backend', db => db.query('select * from app.crm_contacts'))).rowCount, 0)
    await assert.rejects(rawAs(stranger, 'hh_crm_backend', db => db.query("insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle) values($1,$2,'x','y','en','lead')", [randomUUID(), owner.id])), errorCode('42501'))
    await rawAs(owner, 'hh_crm_backend', db => db.query("insert into app.crm_consent_ledger(id,owner_id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind,payload_hash) values($1,$2,$3,'email','product_updates','withdrawn',now(),'synthetic','v1','owner_recorded','hash')", [consent, owner.id, contact]))
    for (const statement of ['update app.crm_consent_ledger set decision=\'granted\'', 'delete from app.crm_consent_ledger', 'update app.crm_contacts set email_verified=true'])
      await assert.rejects(rawAs(owner, 'hh_crm_backend', db => db.query(statement)), errorCode('42501'))
    await rawAs(owner, 'hh_crm_backend', db => db.query("insert into app.crm_self_preferences(account_id,channel,accepted,text_version) values($1,'email',false,'crm-marketing-v1')", [owner.id]))
    assert.equal((await rawAs(stranger, 'hh_crm_backend', db => db.query('select * from app.crm_self_preferences'))).rowCount, 0)
    for (const role of ['anon', 'authenticated', 'hh_billing_backend'])
      await assert.rejects(rawAs(owner, role, db => db.query('select * from app.crm_contacts')), errorCode('42501'))
    await admin.query('delete from auth.sessions where id=$1', [owner.claims.session_id])
    assert.equal((await rawAs(owner, 'hh_crm_backend', db => db.query('select * from app.crm_contacts'))).rowCount, 0)
  })

  await t.test('service order persistence enforces owner/environment scope and frozen expiry recovery', async () => {
    const actor = await createOwner(admin), stranger = await createOwner(admin)
    const commerce = createBillingRepository(appConfig, billingConfig, { pool, extendStore: commerceStore })
    const customerId = 'cus_' + actor.id.replaceAll('-', '')
    await commerce.withOwner(actor, store => store.saveCustomer({ customerId }))
    const order = await commerce.withOwner(actor, store => store.prepareServiceOrder({ operationId: randomUUID(), locale: 'en', items: [{ serviceId: 'express-consultation-30', quantity: 1 }], currency: 'EUR', totalMinor: 5000 }, customerId, 'https://example.invalid', { 'express-consultation-30': 'price_synthetic' }))
    assert.equal((await commerce.withOwner(stranger, store => store.getServiceOrder(order.id))), null)
    assert.equal((await rawAs(actor, 'hh_billing_backend', db => db.query('select * from billing_private.service_orders'), { ownerId: actor.id, environment: 'live' })).rowCount, 0)
    assert.equal(await commerce.withOwner(actor, store => store.expireUncreatedServiceOrder(order.id)), null)
    await assert.rejects(admin.query("update app.accounts set status='deleting' where id=$1", [actor.id]), errorCode('P0001'))
    await admin.query("update billing_private.service_orders set expires_at=now()-interval '6 minutes' where id=$1", [order.id])
    assert.equal((await commerce.withOwner(actor, store => store.expireUncreatedServiceOrder(order.id))).status, 'expired')
    await admin.query("update app.accounts set status='deleting' where id=$1", [actor.id])
  })

  await t.test('settled cart barrier persists across operations and repeat links cannot cross owners', async () => {
    const actor = await createOwner(admin), stranger = await createOwner(admin)
    const commerce = createBillingRepository(appConfig, billingConfig, { pool, extendStore: commerceStore })
    const customerId = 'cus_' + actor.id.replaceAll('-', '')
    await commerce.withOwner(actor, store => store.saveCustomer({ customerId }))
    const cart = { operationId: randomUUID(), locale: 'en', items: [{ serviceId: 'express-consultation-30', quantity: 1 }], currency: 'EUR', totalMinor: 5000 }
    const previous = await commerce.withOwner(actor, async store => {
      const order = await store.prepareServiceOrder(cart, customerId, 'https://example.invalid', { 'express-consultation-30': 'price_synthetic' })
      return store.saveServicePayment(order.id, { providerCheckoutId: 'cs_test_repeatfixture', paymentIntentId: 'pi_repeatfixture', status: 'paid', refundStatus: 'none', refundedMinor: 0 })
    })
    for (let i = 0; i < 3; i++) assert.equal((await commerce.withOwner(actor, store => store.getLatestSettledServiceOrder({ ...cart, operationId: randomUUID() }))).id, previous.id)
    assert.equal(await commerce.withOwner(stranger, store => store.getLatestSettledServiceOrder(cart)), null)
    const repeat = await commerce.withOwner(actor, store => store.prepareServiceOrder({ ...cart, operationId: randomUUID(), repeatOrderId: previous.id }, customerId, 'https://example.invalid', { 'express-consultation-30': 'price_synthetic' }))
    assert.equal(repeat.repeatOrderId, previous.id)
    const otherCustomer = 'cus_' + stranger.id.replaceAll('-', '')
    await commerce.withOwner(stranger, store => store.saveCustomer({ customerId: otherCustomer }))
    await assert.rejects(commerce.withOwner(stranger, store => store.prepareServiceOrder({ ...cart, operationId: randomUUID(), repeatOrderId: previous.id }, otherCustomer, 'https://example.invalid', { 'express-consultation-30': 'price_synthetic' })), errorCode('23503'))
  })

  await t.test('push worker cannot read health, raw endpoints or ledger tables; helpers are private', async () => {
    const role = (await admin.query("select rolsuper,rolbypassrls,rolinherit from pg_roles where rolname='hh_course_push_worker'")).rows[0]
    assert.deepEqual(role, { rolsuper: false, rolbypassrls: false, rolinherit: false })
    for (const table of ['app.assessment_results', 'app.accounts', 'app_private.growth_checkins', 'app_private.course_push_devices', 'app_private.course_push_deliveries', 'billing_private.subscriptions'])
      await assert.rejects(worker(db => db.query('select * from ' + table)), errorCode('42501'))
    for (const role of ['anon', 'authenticated', 'hh_app_backend', 'hh_billing_backend', 'hh_crm_backend'])
      await assert.rejects(rawAs(null, role, db => db.query("select * from app_private.course_push_candidates('sandbox',50)")), errorCode('42501'))
    assert.equal((await admin.query("select pg_has_role('hh_course_push_worker','hh_app_backend','MEMBER') as value")).rows[0].value, false)
  })

  await t.test('push enrollment is owner/session scoped and never leaks encrypted endpoints to another owner', async () => {
    const f = await eligibleDevice(), stranger = await createOwner(admin)
    assert.equal((await enrollment.read(f.actor)).deviceCount, 1)
    assert.equal((await enrollment.read(stranger)).deviceCount, 0)
    assert.equal((await rawAs(stranger, 'hh_app_backend', db => db.query('select * from app_private.course_push_devices where id=$1', [f.deviceId]))).rowCount, 0)
    assert.equal((await rawAs(stranger, 'hh_app_backend', db => db.query('update app_private.course_push_devices set account_id=$1 where id=$2', [stranger.id, f.deviceId]))).rowCount, 0)
    await admin.query('delete from auth.sessions where id=$1', [f.actor.claims.session_id])
    assert.equal((await rawAs(f.actor, 'hh_app_backend', db => db.query('select * from app_private.course_push_devices'))).rowCount, 0)
  })

  await t.test('push eligibility honors paid-through expiry, canceled paid access, environment, course pause and opt-out', async () => {
    const f = await eligibleDevice()
    assert.equal((await snapshot(f.deviceId)).entitlementActive, true)
    assert.equal((await worker(async db => (await db.query("select app_private.course_push_snapshot($1,'live',false) as value", [f.deviceId])).rows[0].value)), null)
    await admin.query("update billing_private.subscriptions set paid_through_at=now()-interval '1 second' where owner_id=$1", [f.actor.id])
    assert.equal((await snapshot(f.deviceId)).entitlementActive, false); assert.equal(await claim(f.deviceId), null)
    await admin.query("update billing_private.subscriptions set paid_through_at=now()+interval '1 day' where owner_id=$1", [f.actor.id])
    await admin.query("update app_private.growth_courses set status='paused' where account_id=$1", [f.actor.id])
    assert.equal((await snapshot(f.deviceId)).courseActive, false); assert.equal(await claim(f.deviceId), null)
    await admin.query("update app_private.growth_courses set status='active' where account_id=$1", [f.actor.id])
    await enrollment.updatePreferences(f.actor, { enabled: false })
    assert.equal(await claim(f.deviceId), null)
  })

  await t.test('concurrent push claims permit one sender and a committed opt-out prevents later claims', async () => {
    const f = await eligibleDevice()
    const claims = await Promise.all([claim(f.deviceId), claim(f.deviceId)])
    assert.equal(claims.filter(Boolean).length, 1)
    assert.equal((await admin.query('select count(*)::integer as n from app_private.course_push_deliveries where device_id=$1', [f.deviceId])).rows[0].n, 1)
    await enrollment.unsubscribe(f.actor, { scope: 'all' })
    assert.equal(await snapshot(f.deviceId), null); assert.equal(await claim(f.deviceId), null)
    assert.equal((await admin.query('select count(*)::integer as n from app_private.course_push_deliveries where device_id=$1', [f.deviceId])).rows[0].n, 0)
  })

  await t.test('unsubscribe DELETE cascade serializes with claim creation and committed deletion wins', async () => {
    const f = await eligibleDevice(), entered = deferred(), release = deferred(), started = deferred()
    let claimAttempt
    const removing = rawAs(f.actor, 'hh_app_backend', async db => {
      await db.query('select id from app.accounts where id=$1 for update', [f.actor.id])
      await db.query('delete from app_private.course_push_devices where id=$1', [f.deviceId])
      entered.resolve(); await release.promise
    })
    try {
      await entered.promise
      claimAttempt = worker(async db => {
        started.resolve((await db.query('select pg_backend_pid() as pid')).rows[0].pid)
        return (await db.query("select app_private.course_push_claim($1,'sandbox',$2,$3) as value", [f.deviceId, await day(), randomUUID()])).rows[0].value
      })
      const pid = await started.promise; await waitUntilBlocked(admin, pid)
      release.resolve(); await removing; assert.equal(await claimAttempt, null)
    } finally { release.resolve(); await removing; if (claimAttempt) await claimAttempt }
  })

  await t.test('first enrollment remains invisible to sender until its transaction commits', async () => {
    const actor = await createOwner(admin), ready = deferred(), release = deferred(), deviceId = randomUUID()
    const creating = rawAs(actor, 'hh_app_backend', async db => {
      await db.query('select id from app.accounts where id=$1 for update', [actor.id])
      await db.query("insert into app_private.course_notification_preferences(account_id,environment) values($1,'sandbox')", [actor.id])
      await db.query("insert into app_private.course_push_devices(id,account_id,environment,endpoint_hash,subscription_ciphertext,consent_version,consented_at) values($1,$2,'sandbox',$3,'synthetic-sealed','course-push-v1',now())", [deviceId, actor.id, createHash('sha256').update(deviceId).digest('hex')])
      ready.resolve(); await release.promise
    })
    try { await ready.promise; assert.equal(await snapshot(deviceId), null); assert.equal(await claim(deviceId), null) }
    finally { release.resolve(); await creating }
    assert.ok(await snapshot(deviceId)); assert.equal(await claim(deviceId), null)
  })
}
