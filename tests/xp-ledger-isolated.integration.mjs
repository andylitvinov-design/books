import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import pg from 'pg'

// Never create synthetic roles or schemas in the real Supabase project.
const conn = process.env.HH_TEST_ADMIN_DATABASE_URL
const ready = process.env.CI === 'true' &&
  process.env.HH_APP_TEST_RUNTIME === 'isolated' &&
  process.env.HH_BILLING_TEST_APPLY_PROPOSALS === 'synthetic-only' &&
  !process.env.VERCEL && conn &&
  ['localhost','127.0.0.1'].includes(new URL(conn).hostname)

if (!ready) {
  test('XP real PostgreSQL tests run only against isolated PG17', {skip:true}, () => {})
} else {
  const migration = readFileSync(new URL(
    '../supabase/migrations/20261030233000_hh_xp_rewards_and_video_reservations.sql',
    import.meta.url), 'utf8')
  const a = '123e4567-e89b-42d3-a456-426614174000'
  const b = '123e4567-e89b-42d3-a456-426614174001'
  const op = '123e4567-e89b-42d3-a456-426614174010'
  const expired = '123e4567-e89b-42d3-a456-426614174011'
  async function connect() {
    const client = new pg.Client({connectionString:conn, statement_timeout:10000})
    await client.connect()
    return client
  }
  async function authenticate(db,id) {
    await db.query('SET LOCAL ROLE hh_app_backend')
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({sub:id})])
  }
  test('XP migration: FORCE RLS, immutable rewards and serialised account spending', async () => {
    const root = await connect()
    let one, two
    try {
      await root.query('BEGIN')
      await root.query([
        'create role anon nologin; create role authenticated nologin;',
        'create role service_role nologin; create role hh_app_backend nologin;',
        'create role hh_app_inbox nologin;',
        'create schema app; create schema app_private; create schema auth;',
        'grant usage on schema app,app_private,auth to hh_app_backend;',
        'create table app.accounts(id uuid primary key,status text not null,',
        'onboarding_state text not null,created_at timestamptz default now());',
        'grant select,update on app.accounts to hh_app_backend;',
        "create function auth.uid() returns uuid language sql stable as $$ select",
        "(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;",
        'create function app_private.account_active() returns boolean language sql stable',
        "as $$ select exists(select 1 from app.accounts where id=auth.uid() and status='active') $$;",
        'grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;',
      ].join('\n'))
      await root.query(
        "insert into app.accounts(id,status,onboarding_state) values ($1,'active','active'),($2,'active','active')",
        [a,b])
      await root.query(migration)
      await root.query('COMMIT')
      const policies=await root.query(
        "select relname,relrowsecurity,relforcerowsecurity from pg_class where relnamespace='app_private'::regnamespace and relname like 'xp_%' and relkind='r'")
      assert.equal(policies.rows.length,4)
      assert.ok(policies.rows.every(row=>row.relrowsecurity && row.relforcerowsecurity))

      await root.query('BEGIN')
      await authenticate(root,a)
      await root.query(
        "insert into app_private.xp_invites(account_id,code) values($1,'AABBCCDDEEFF0011')",[a])
      await root.query(
        "insert into app_private.xp_rewards(account_id,kind,reference_id,points) values($1,'assessment',$1,5)",[a])
      await root.query('COMMIT')
      await root.query('BEGIN')
      await authenticate(root,b)
      await root.query("select set_config('hh.xp_invite_lookup','1',true)")
      await root.query('insert into app_private.xp_referrals(invitee_id,inviter_id) values($1,$2)',[b,a])
      await root.query("select set_config('hh.xp_referral_reward','1',true)")
      await root.query(
        "insert into app_private.xp_rewards(account_id,kind,reference_id,points) values($1,'referral',$2,10)",[a,b])
      await root.query('SAVEPOINT duplicate')
      await assert.rejects(root.query(
        "insert into app_private.xp_rewards(account_id,kind,reference_id,points) values($1,'referral',$2,10)",[a,b]))
      await root.query('ROLLBACK TO SAVEPOINT duplicate')
      assert.equal((await root.query('select count(*) as n from app_private.xp_rewards')).rows[0].n,'0')
      await root.query('COMMIT')

      one=await connect()
      two=await connect()
      await one.query('BEGIN')
      await two.query('BEGIN')
      await authenticate(one,a)
      await authenticate(two,a)
      await one.query('select id from app.accounts where id=$1 for update',[a])
      const waiting=two.query('select id from app.accounts where id=$1 for update',[a])
      await one.query(
        "insert into app_private.xp_charges(account_id,operation_id,features,price_xp,promo_spent,cad_spent_minor) values($1,$2,array['hypno_video'],15,15,0)",
        [a,op])
      await one.query('COMMIT')
      await waiting
      const counts=await two.query(
        "select (select coalesce(sum(points),0) from app_private.xp_rewards where account_id=$1)-(select coalesce(sum(promo_spent),0) from app_private.xp_charges where account_id=$1 and (status='completed' or (status='held' and expires_at>now()))) as available",[a])
      assert.equal(Number(counts.rows[0].available),0,'second account holder sees committed spend')
      await two.query('COMMIT')

      await root.query('BEGIN')
      await authenticate(root,a)
      await root.query(
        "insert into app_private.xp_charges(account_id,operation_id,features,price_xp,promo_spent,cad_spent_minor,expires_at) values($1,$2,array['hypno_video'],1,0,10,now()-interval '1 minute')",
        [a,expired])
      const remaining=await root.query(
        "select coalesce(sum(cad_spent_minor),0) as n from app_private.xp_charges where account_id=$1 and (status='completed' or (status='held' and expires_at>now()))",[a])
      assert.equal(Number(remaining.rows[0].n),0,'expired hold never freezes CAD')
      await root.query(
        "update app_private.xp_charges set status='released',updated_at=now() where operation_id=$1",[expired])
      // PostgreSQL RLS hides released rows from UPDATE, so a forbidden
      // transition may return zero rows rather than throwing an exception.
      const refused = await root.query(
        "update app_private.xp_charges set status='completed',updated_at=now() where operation_id=$1 returning id",[expired])
      assert.equal(refused.rowCount, 0, 'released charge cannot be completed again')
      await root.query('COMMIT')
      await root.query('BEGIN')
      await authenticate(root,b)
      assert.equal((await root.query('select count(*) as n from app_private.xp_charges')).rows[0].n,'0')
      assert.equal((await root.query('select count(*) as n from app_private.xp_rewards')).rows[0].n,'0')
      await root.query('ROLLBACK')
    } finally {
      if(one){await one.query('ROLLBACK').catch(()=>{});await one.end().catch(()=>{})}
      if(two){await two.query('ROLLBACK').catch(()=>{});await two.end().catch(()=>{})}
      await root.query('ROLLBACK').catch(()=>{})
      await root.query('drop schema if exists app_private cascade').catch(()=>{})
      await root.query('drop schema if exists app cascade').catch(()=>{})
      await root.query('drop schema if exists auth cascade').catch(()=>{})
      await root.end()
    }
  })
}
