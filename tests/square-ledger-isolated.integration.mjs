import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import pg from 'pg'

const conn = process.env.HH_TEST_ADMIN_DATABASE_URL
const good = process.env.CI === 'true' &&
  process.env.HH_APP_TEST_RUNTIME === 'isolated' &&
  process.env.HH_BILLING_TEST_APPLY_PROPOSALS === 'synthetic-only' &&
  !process.env.VERCEL && conn &&
  ['localhost','127.0.0.1'].includes(new URL(conn).hostname)
if (!good) {
  test('Square migration executes only against synthetic isolated PG17 in CI', { skip: true }, () => {})
} else {
  const migration = readFileSync(new URL('../supabase/migrations/20261024185000_hh_square_cart_one_time.sql',import.meta.url),'utf8')
  const a = '123e4567-e89b-42d3-a456-426614174000'
  const b = '123e4567-e89b-42d3-a456-426614174001'
  const c = '123e4567-e89b-42d3-a456-426614174002'
  test('Square ledger on real PG17: RLS, ownership, immutable amounts, verified-only paid, concurrent open', async () => {
    const client = new pg.Client({ connectionString: conn })
    await client.connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        create role anon nologin; create role authenticated nologin;
        create role hh_app_backend nologin; create role hh_app_inbox nologin;
        create schema app; create schema app_private; create schema auth;
        grant usage on schema app,app_private,auth to hh_app_backend;
        create table app.accounts(id uuid primary key,status text not null,onboarding_state text not null);
        insert into app.accounts values
          ('${a}','active','active'),
          ('${b}','active','active');
        grant select on app.accounts to hh_app_backend;
        create function auth.uid() returns uuid language sql stable
          as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
      `)
      await client.query(`
        create function app_private.account_active() returns boolean language sql stable
        as $$ select exists (select 1 from app.accounts where id=auth.uid() and status='active') $$;
        grant execute on function auth.uid(), app_private.account_active() to hh_app_backend;
      `)
      await client.query(migration)
      const rls=(await client.query("select relrowsecurity,relforcerowsecurity from pg_class where oid='app_private.square_service_orders'::regclass")).rows[0]
      assert.equal(rls.relrowsecurity,true)
      assert.equal(rls.relforcerowsecurity,true)
      await client.query('SET LOCAL ROLE hh_app_backend')
      await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:a})])
      const values=[a,a,'express-consultation-30','ru']
      const order=await client.query(`
        insert into app_private.square_service_orders
          (id,account_id,operation_id,items,cart_key,locale,eur_minor,cad_minor,environment)
        values ($1,$2,'123e4567-e89b-42d3-a456-426614174010',array[$3],$3,$4,5000,7500,'production') returning id`,values)
      assert.equal(order.rowCount,1)
      assert.equal((await client.query('select count(*) from app_private.square_service_orders')).rows[0].count,'1')
      await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:b})])
      assert.equal((await client.query('select count(*) from app_private.square_service_orders')).rows[0].count,'0')
      await client.query('SAVEPOINT foreign_write')
      await assert.rejects(client.query(`
        insert into app_private.square_service_orders
          (id,account_id,operation_id,items,cart_key,locale,eur_minor,cad_minor,environment)
        values ('${c}','${a}','123e4567-e89b-42d3-a456-426614174011',
                array['express-consultation-30'],'express-consultation-30','ru',5000,7500,'production')`))
      await client.query('ROLLBACK TO SAVEPOINT foreign_write')
      await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:a})])
      await client.query('SAVEPOINT forged_paid')
      await assert.rejects(client.query(`
        update app_private.square_service_orders set status='paid',
          square_link_id='ABCDLINK001',square_order_id='ABCDORDER001',
          checkout_url='https://square.link/u/ABCDExyz9',
          square_payment_id='ABCDPAYMENT001',paid_at=now(),revision=revision+1 where id=$1`,[a]))
      await client.query('ROLLBACK TO SAVEPOINT forged_paid')
      await client.query(`
        update app_private.square_service_orders set
          square_link_id='ABCDLINK001',square_order_id='ABCDORDER001',
          checkout_url='https://square.link/u/ABCDExyz9',
          status='checkout_ready',revision=revision+1 where id=$1`,[a])
      await client.query("select set_config('hh.square_signature_verified','true',true)")
      await client.query("select set_config('hh.square_payment_verified','true',true)")
      await client.query(`
        update app_private.square_service_orders set status='paid',
        square_payment_id='ABCDPAYMENT001',paid_at=now(),revision=revision+1 where id=$1`,[a])
      assert.equal((await client.query('select status from app_private.square_service_orders where id=$1',[a])).rows[0].status,'paid')
      await client.query('SAVEPOINT regressed')
      await assert.rejects(client.query("update app_private.square_service_orders set status='checkout_ready',revision=revision+1 where id=$1",[a]))
      await client.query('ROLLBACK TO SAVEPOINT regressed')
      await client.query('RESET ROLE')
      await client.query('SET LOCAL ROLE anon')
      await assert.rejects(client.query("select * from app_private.square_service_orders"))
      await client.query('RESET ROLE')
    } finally {
      await client.query('ROLLBACK').catch(()=>{})
      await client.end()
    }
  })
}
