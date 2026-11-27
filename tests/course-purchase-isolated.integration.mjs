import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import pg from 'pg'
let url
try{url=new URL(process.env.HH_TEST_ADMIN_DATABASE_URL||'http://invalid')}catch{}
const isolated=process.env.CI==='true'&&process.env.HH_APP_TEST_RUNTIME==='isolated'&&
 process.env.HH_BILLING_TEST_APPLY_PROPOSALS==='synthetic-only'&&!process.env.VERCEL&&process.env.NODE_ENV!=='production'&&url?.protocol==='postgres:'&&
 ['localhost','127.0.0.1'].includes(url.hostname)&&url.pathname==='/hh_app_test'&&url.username==='postgres'&&url.password==='synthetic-ci-admin'&&!url.search&&!url.hash
const migration=readFileSync(new URL('../supabase/migrations/20261126235950_hh_course_purchase_orders.sql',import.meta.url),'utf8')
test('course purchase migration has one transaction and three unique tables',()=>{
 assert.equal((migration.match(/^begin;$/gmi)||[]).length,1)
 assert.equal((migration.match(/^commit;$/gmi)||[]).length,1)
 assert.equal((migration.match(/^create table app_private\.course_purchase_/gm)||[]).length,3)
 assert.equal((migration.match(/force row level security;/g)||[]).length,3)
 assert.match(migration,/verified_receipt_digest text check\(verified_receipt_digest ~ '\^\[a-f0-9\]\{64\}\$'\)/)
})
test('course purchase PG17 RLS, verified receipt uniqueness and deletion', {skip:!isolated},async()=>{
 const db=new pg.Client({host:'127.0.0.1',port:Number(url.port||5432),database:'hh_app_test',user:'postgres',password:'synthetic-ci-admin',ssl:false,connectionTimeoutMillis:3000,statement_timeout:8000})
 const buyer='123e4567-e89b-42d3-a456-426614174100',other='123e4567-e89b-42d3-a456-426614174101',owner='123e4567-e89b-42d3-a456-426614174102',contact='123e4567-e89b-42d3-a456-426614174103',order='123e4567-e89b-42d3-a456-426614174104',order2='123e4567-e89b-42d3-a456-426614174105'
 const hash='a'.repeat(64),digest='b'.repeat(64)
 await db.connect()
 try{
  await db.query('BEGIN')
  const version=Number((await db.query("select current_setting('server_version_num') as v")).rows[0].v)
  assert.ok(version>=170000&&version<180000)
  await db.query("create role anon nologin; create role authenticated nologin; create role hh_app_backend nologin; create role hh_app_inbox nologin; create role hh_crm_backend nologin; create schema app; create schema app_private; create schema auth; grant usage on schema app,app_private,auth to hh_app_backend,hh_crm_backend; create table app.accounts(id uuid primary key,status text not null); create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid,active boolean,public_profile jsonb,status text); create table app.crm_contacts(id uuid primary key,owner_id uuid not null,contact_ciphertext text,email_hash text,phone_hash text,locale text,lifecycle text,source text,email_verified boolean default false,suppressed boolean default false,revision integer default 0,unique(id,owner_id),unique(owner_id,email_hash)); grant select on app.accounts,app.practitioners to hh_app_backend,hh_crm_backend;")
  await db.query("create function auth.uid() returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$; create function app_private.account_active() returns boolean language sql stable as $$select exists(select 1 from app.accounts where id=auth.uid() and status='active')$$;")
  await db.query("insert into app.accounts values($1,'active'),($2,'active'),($3,'active')",[buyer,other,owner])
  await db.query("insert into app.practitioners values('246aa1a3-a371-5a83-9f4b-cd23ff027a76',$1,true,'{\"ok\":true}','approved')",[owner])
  await db.query("insert into app.crm_contacts(id,owner_id,email_hash,locale,lifecycle,source) values($1,$2,$3,'en','lead','academy')",[contact,owner,hash])
  await db.query(migration.replace(/^begin;$/mi,'').replace(/^commit;$/mi,''))
  const role=async(id,moderator=false)=>{
   await db.query('RESET ROLE');await db.query('SET LOCAL ROLE hh_app_backend')
   await db.query("select set_config('request.jwt.claims',$1,true),set_config('hh.moderator',$2,true),set_config('hh.course_checkout_hash',$3,true)",[JSON.stringify({sub:id}),moderator?'1':'0',hash])
  }
  const make=async(id,account,cartHash)=>db.query("insert into app_private.course_purchase_orders(id,account_id,owner_id,contact_id,cart_hash,items,currency,total_minor,locale,notice_version) values($1,$2,$3,$4,$5,'[{\"id\":\"synthetic\",\"amountMinor\":1990}]','EUR',1990,'en','course-checkout-v1')",[id,account,owner,contact,cartHash])
  await role(buyer);await make(order,buyer,hash);await make(order2,buyer,'c'.repeat(64))
  assert.equal((await db.query("select count(id)::int n from app_private.course_purchase_orders")).rows[0].n,2)
  await db.query("insert into app_private.course_purchase_receipts(order_id,account_id,reference_digest,reference_ciphertext) values($1,$2,$3,'synthetic')",[order,buyer,digest])
  assert.equal((await db.query("select status from app_private.course_purchase_orders where id=$1",[order])).rows[0].status,'awaiting_payment')
  assert.equal((await db.query("update app_private.course_purchase_orders set status='paid',verified_receipt_digest=$2,reviewed_at=now(),revision=1 where id=$1",[order,digest])).rowCount,0)
  await role(other)
  assert.equal((await db.query("select count(id)::int n from app_private.course_purchase_orders")).rows[0].n,0)
  assert.equal((await db.query("select count(order_id)::int n from app_private.course_purchase_receipts")).rows[0].n,0)
  await db.query('SAVEPOINT bad_receipt')
  await assert.rejects(db.query("insert into app_private.course_purchase_receipts(order_id,account_id,reference_digest,reference_ciphertext) values($1,$2,$3,'foreign')",[order2,other,digest]))
  await db.query('ROLLBACK TO SAVEPOINT bad_receipt')
  await role(owner,true)
  await db.query("insert into app_private.course_purchase_verified_references(reference_digest,order_id,owner_id,kind) values($1,$2,$3,'paid')",[digest,order,owner])
  assert.equal((await db.query("update app_private.course_purchase_orders set status='paid',verified_receipt_digest=$2,reviewed_at=now(),revision=1 where id=$1",[order,digest])).rowCount,1)
  await db.query('SAVEPOINT duplicate_transfer')
  await assert.rejects(db.query("insert into app_private.course_purchase_verified_references(reference_digest,order_id,owner_id,kind) values($1,$2,$3,'paid')",[digest,order2,owner]),{code:'23505'})
  await db.query('ROLLBACK TO SAVEPOINT duplicate_transfer')
  await db.query('RESET ROLE')
  await db.query('delete from app.crm_contacts where id=$1',[contact])
  assert.equal((await db.query('select contact_id from app_private.course_purchase_orders where id=$1',[order])).rows[0].contact_id,null)
  await db.query('delete from app.accounts where id=$1',[buyer])
  assert.equal((await db.query('select count(*)::int n from app_private.course_purchase_orders')).rows[0].n,0)
  assert.equal((await db.query('select order_id from app_private.course_purchase_verified_references where reference_digest=$1',[digest])).rows[0].order_id,null)
  await db.query('SAVEPOINT anonymous_read');await db.query('SET LOCAL ROLE anon')
  await assert.rejects(db.query('select id from app_private.course_purchase_orders'),{code:'42501'})
  await db.query('ROLLBACK TO SAVEPOINT anonymous_read')
 }finally{await db.query('ROLLBACK').catch(()=>{});await db.end()}
})
