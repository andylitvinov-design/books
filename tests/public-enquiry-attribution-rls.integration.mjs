// Destructive schema setup is permitted only in a disposable loopback database.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import pg from 'pg'

const raw=process.env.HH_TEST_ADMIN_DATABASE_URL||''
let url
try{url=new URL(raw)}catch{}
const isolated=process.env.HH_APP_TEST_RUNTIME==='isolated'&&
 process.env.HH_ENQUIRY_ATTRIBUTION_RLS==='synthetic-only'&&!process.env.VERCEL&&
 ['127.0.0.1','localhost'].includes(url?.hostname)&&url?.pathname==='/hh_app_test'
const migration=readFileSync(new URL('../supabase/migrations/20261019152000_hh_public_service_enquiries_secure.sql',import.meta.url),'utf8')
const practitioner='246aa1a3-a371-5a83-9f4b-cd23ff027a76'
const id='10000000-0000-4000-8000-000000000011',op='20000000-0000-4000-8000-000000000011'
const args=[id,practitioner,'Synthetic service','/en/services','en','HH-A1B2C3D4E5F6',
 'x'.repeat(90),null,op,'a'.repeat(64),null]
const attribution={landingPath:'/en/services',previousPath:null,trafficSource:'direct'}

test('guest attribution is committed atomically under FORCE RLS', {skip:!isolated},async()=>{
 const db=new pg.Client({connectionString:raw});await db.connect()
 let closeDatabase
 const priorGate=process.env.HH_WEBSITE_MESSENGER_ONLY
 try{
  await db.query(`do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    if not exists(select 1 from pg_roles where rolname='hh_app_backend') then create role hh_app_backend nologin; end if;
    if not exists(select 1 from pg_roles where rolname='hh_app_inbox') then create role hh_app_inbox nologin; end if;
    end $$;
    create schema app; create schema app_private; create schema auth;
    grant usage on schema app,app_private,auth to hh_app_backend;
    create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid,active boolean,status text,public_profile jsonb);
    insert into app.practitioners values('${practitioner}',null,true,'approved','{"title":"Synthetic"}');
    grant select on app.practitioners to hh_app_backend;
    -- The isolated fixture models the existing production catalog as a public
    -- owner-scoped, read-only relation. No production schema is changed.
    create table app.service_offerings (
      id uuid primary key,
      practitioner_id uuid not null references app.practitioners(id),
      active boolean not null,
      status text not null,
      localized_copy jsonb not null
    );
    insert into app.service_offerings values
      ('fcef611f-e68b-5b30-b9f4-b0aa5614654d','${practitioner}',true,'published',
       '{"en":{"title":"Synthetic service"}}');
    alter table app.service_offerings enable row level security;
    alter table app.service_offerings force row level security;
    create policy published_catalog_read on app.service_offerings for select to hh_app_backend
      using (active and status='published');
    grant select on app.service_offerings to hh_app_backend;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create function app_private.account_active() returns boolean language sql stable as $$ select false $$;
    grant execute on function auth.uid(),app_private.account_active() to hh_app_backend;`)
  await db.query(migration)
  await db.query('alter table app.public_service_enquiries add column booking_sku text, add column attribution jsonb, add column service_offering_id uuid references app.service_offerings(id)')
  await db.query('begin')
  await db.query('set local role hh_app_backend')
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[op])
  const repository=await import('../lib/practitioners/public-service-enquiry.js')
  const {buildPublicEnquiryInsert}=repository
  const command=buildPublicEnquiryInsert(args,attribution,true)
  const inserted=await db.query(command.text,command.values)
  assert.equal(inserted.rowCount,1)
  assert.ok(inserted.rows[0].created_at)
  const forbidden=await db.query("update app.public_service_enquiries set attribution='{}'::jsonb where id=$1",[id])
  assert.equal(forbidden.rowCount,0,'guest operation must not acquire UPDATE rights')
  const row=await db.query('select attribution from app.public_service_enquiries where id=$1',[id])
  assert.deepEqual(row.rows[0].attribution,attribution)
  // Execute the real repository transaction as well as the SQL builder.
  // --conditions=react-server is required to load its server-only imports.
  ;({closeDatabase}=await import('../lib/app/database.js'))
  const config={databaseUrl:raw,test:true,encryptionKey:Buffer.alloc(32,11),encryptionKeyId:'synthetic'}
  const input={operationId:'20000000-0000-4000-8000-000000000014',serviceTitle:'Synthetic service',
   sourcePath:'/en/services',locale:'en',description:'Synthetic protected test enquiry'}
  // Verify default website submission fails BEFORE any DB mutation.
  // For existing RLS/attribution tests, opt into the historical isolated SQL
  // path only inside this disposable localhost fixture; never in production.
  process.env.HH_WEBSITE_MESSENGER_ONLY='true'
  await assert.rejects(repository.createPublicServiceEnquiry(config,input,attribution),
    err=>err.code==='MESSENGER_VERIFICATION_REQUIRED'&&err.status===428)
  process.env.HH_WEBSITE_MESSENGER_ONLY='false'
  const saved=await repository.createPublicServiceEnquiry(config,input,attribution)
  assert.equal(saved.saved,true)
  assert.equal(saved.attributionStatus,'saved')
  assert.equal(saved.serviceOfferingId,'fcef611f-e68b-5b30-b9f4-b0aa5614654d',
    'an unambiguous published title is linked only to its owner-scoped offering')
  // A client-supplied UUID must never assign an unpublished or foreign offering.
  const rejected={...input,operationId:'20000000-0000-4000-8000-000000000017',
   serviceOfferingId:'11111111-1111-4111-8111-111111111111'}
  await assert.rejects(repository.createPublicServiceEnquiry(config,rejected,attribution),
   err=>err.code==='SERVICE_OFFERING_NOT_VERIFIED')
  const {readPublicEnquiryNoticeMetadata}=await import('../lib/app/public-enquiry-telegram.js')
  const notice=await readPublicEnquiryNoticeMetadata(config,saved.id,input.operationId)
  assert.equal(notice.referenceCode,saved.referenceCode)
  assert.deepEqual(notice.attribution,attribution)
  assert.equal(await readPublicEnquiryNoticeMetadata(config,saved.id,'20000000-0000-4000-8000-000000000099'),undefined)
  const retry=await repository.createPublicServiceEnquiry(config,input,attribution)
  assert.equal(retry.id,saved.id)
  assert.equal(retry.attributionStatus,'saved')
  const concurrent={...input,operationId:'20000000-0000-4000-8000-000000000016'}
  const simultaneous=await Promise.all([
   repository.createPublicServiceEnquiry(config,concurrent,attribution),
   repository.createPublicServiceEnquiry(config,concurrent,attribution),
  ])
  assert.equal(simultaneous[0].id,simultaneous[1].id)
  await assert.rejects(repository.createPublicServiceEnquiry(config,
   {...concurrent,description:'A different protected test enquiry'},attribution),
   error=>error.code==='IDEMPOTENCY_CONFLICT')
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[input.operationId])
  assert.deepEqual((await db.query('select attribution from app.public_service_enquiries where id=$1',[saved.id])).rows[0].attribution,attribution)
  const noConsent={...input,operationId:'20000000-0000-4000-8000-000000000015'}
  const untracked=await repository.createPublicServiceEnquiry(config,noConsent,null)
  assert.equal(untracked.saved,true)
  assert.equal(untracked.attributionStatus,'not_provided')
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[noConsent.operationId])
  assert.equal((await db.query('select attribution from app.public_service_enquiries where id=$1',[untracked.id])).rows[0].attribution,null)
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",['20000000-0000-4000-8000-000000000099'])
  assert.equal((await db.query('select count(*)::int as n from app.public_service_enquiries')).rows[0].n,0)
  const secondId='10000000-0000-4000-8000-000000000012'
  const secondOp='20000000-0000-4000-8000-000000000012'
  const second=[...args];second[0]=secondId;second[5]='HH-A1B2C3D4E5F7';second[8]=secondOp
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[secondOp])
  const withoutConsent=buildPublicEnquiryInsert(second,null,false)
  assert.equal((await db.query(withoutConsent.text,withoutConsent.values)).rowCount,1)
  assert.equal((await db.query('select attribution from app.public_service_enquiries where id=$1',[secondId])).rows[0].attribution,null)
  // Online rollout: a database without the optional column must still save
  // the enquiry, without pretending that attribution was written.
  await db.query('reset role')
  await db.query('alter table app.public_service_enquiries drop column attribution')
  await db.query('set local role hh_app_backend')
  const third=[...args];third[0]='10000000-0000-4000-8000-000000000013';third[5]='HH-A1B2C3D4E5F8';third[8]='20000000-0000-4000-8000-000000000013'
  await db.query("select set_config('hh.public_enquiry_operation',$1,true)",[third[8]])
  const olderSchema=buildPublicEnquiryInsert(third,attribution,false)
  assert.equal((await db.query(olderSchema.text,olderSchema.values)).rowCount,1)
 }finally{
  if(priorGate===undefined)delete process.env.HH_WEBSITE_MESSENGER_ONLY
  else process.env.HH_WEBSITE_MESSENGER_ONLY=priorGate
  await closeDatabase?.();await db.query('rollback').catch(()=>{});await db.end()
 }
})
