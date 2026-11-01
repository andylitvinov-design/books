import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {randomUUID} from 'node:crypto'
import pg from 'pg'

const raw=process.env.HH_TEST_ADMIN_DATABASE_URL||''
let url
try{url=new URL(raw)}catch{}
const isolated=process.env.HH_APP_TEST_RUNTIME==='isolated'&&
 process.env.HH_CONTACT_AUDIT_RLS==='synthetic-only'&&!process.env.VERCEL&&
 ['127.0.0.1','localhost'].includes(url?.hostname)&&url?.pathname==='/hh_operator_test'
const migration=readFileSync(new URL('../supabase/migrations/20261101041500_hh_public_enquiry_contact_disclosure_audit.sql',import.meta.url),'utf8')
const enquiryMigration=readFileSync(new URL('../supabase/migrations/20261019152000_hh_public_service_enquiries_secure.sql',import.meta.url),'utf8')
const foundation=readFileSync(new URL('../supabase/migrations/20261002164037_hh_app_r1_foundation.sql',import.meta.url),'utf8')
const securityHelpers=foundation.slice(foundation.indexOf('create function app_private.session_active()'),foundation.indexOf('create function app_private.consume_rate('))
const owner='11111111-1111-4111-8111-111111111111'
const other='22222222-2222-4222-8222-222222222222'
const practitioner='33333333-3333-4333-8333-333333333333'
const otherPractitioner='33333333-3333-4333-8333-333333333334'
const enquiry='44444444-4444-4444-8444-444444444444'
const otherEnquiry='44444444-4444-4444-8444-444444444445'
const audit='55555555-5555-4555-8555-555555555555'
const session='77777777-7777-4777-8777-777777777777'
const otherSession='88888888-8888-4888-8888-888888888888'

test('contact disclosure audit enforces owner and rejects another account', {skip:!isolated},async()=>{
 const db=new pg.Client({connectionString:raw});await db.connect()
 try{
  await db.query(`do $$ begin
   if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
   if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
   if not exists(select 1 from pg_roles where rolname='hh_app_backend') then create role hh_app_backend nologin; end if;
   if not exists(select 1 from pg_roles where rolname='hh_app_inbox') then create role hh_app_inbox nologin; end if;
   if not exists(select 1 from pg_roles where rolname='hh_crm_backend') then create role hh_crm_backend nologin; end if;
   end $$;
   create schema app; create schema app_private; create schema auth;
   grant usage on schema app,app_private,auth to hh_app_backend;
   create table app.accounts(id uuid primary key,status text not null);
   create table auth.sessions(id uuid primary key,user_id uuid not null);
   create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid,active boolean,status text,public_profile jsonb);
   insert into app.accounts values('${owner}','active'),('${other}','active');
   insert into auth.sessions values('${session}','${owner}'),('${otherSession}','${other}');
   insert into app.practitioners values('${practitioner}','${owner}',true,'approved','{"title":"Synthetic"}'),('${otherPractitioner}','${other}',true,'approved','{"title":"Synthetic"}');
   grant select on app.practitioners to hh_app_backend;
   create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
   grant execute on function auth.uid(),auth.jwt() to hh_app_backend;`)
  await db.query(securityHelpers)
  await db.query(enquiryMigration)
  const {seal,openSealed}=await import('../lib/app/crypto.js')
  const {requireUUID,AppError}=await import('../lib/assessments/contracts.js')
  const {transaction,closeDatabase}=await import('../lib/app/database.js')
  const {publicEnquiryReplyContact}=await import('../lib/practitioners/public-enquiry-reply-links.mjs')
  const config={databaseUrl:raw,test:true,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic'}
  const ciphertext=seal({submittedByVisitor:true,replyConsent:'website_reply_only_v1',email:'guest@example.test',phone:''},
   {accountId:practitioner,recordId:enquiry,field:'public_lead.contact'},config)
  await db.query(`insert into app.public_service_enquiries(id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash)
   values($1,$2,'Synthetic','/en/services','en','HH-123456789ABC',$3,$4,$5,$6)`,
   [enquiry,practitioner,'x'.repeat(90),ciphertext,'66666666-6666-4666-8666-666666666666','a'.repeat(64)])
  const otherCiphertext=seal({submittedByVisitor:true,replyConsent:'website_reply_only_v1',email:'other@example.test',phone:''},
   {accountId:otherPractitioner,recordId:otherEnquiry,field:'public_lead.contact'},config)
  await db.query(`insert into app.public_service_enquiries(id,recipient_practitioner_id,service_title,source_path,locale,reference_code,description_ciphertext,contact_ciphertext,operation_id,operation_hash)
   values($1,$2,'Synthetic','/en/services','en','HH-123456789ABD',$3,$4,$5,$6)`,
   [otherEnquiry,otherPractitioner,'x'.repeat(90),otherCiphertext,'66666666-6666-4666-8666-666666666667','a'.repeat(64)])
  await db.query(migration)
  const source=readFileSync(new URL('../lib/practitioners/public-enquiry-operator-contact.js',import.meta.url),'utf8')
   .replace(/^import .*$/gm,'').replace(/export /g,'')+'; revealPublicEnquiryContact'
  const reveal=runInNewContext(source,{transaction,openSealed,requireUUID,AppError,publicEnquiryReplyContact,
   practitionerEmailAllowed:actor=>actor?.operator===true,PRACTITIONER_ID:practitioner,
   randomUUID})
  const actor=(id,operator,active=true)=>({id,operator,claims:{sub:id,
   session_id:id===owner?session:otherSession,exp:Math.floor(Date.now()/1000)+(active?3600:-60)}})
  assert.equal((await reveal(config,actor(owner,true),enquiry)).email,'guest@example.test')
  for(const denied of [actor(owner,false),actor(other,true),actor(other,false)])
   await assert.rejects(reveal(config,denied,enquiry),e=>e.code==='NOT_FOUND')
  for(const denied of [actor(owner,true,false),
   {...actor(owner,true),claims:{...actor(owner,true).claims,session_id:'99999999-9999-4999-8999-999999999999'}}])
   await assert.rejects(reveal(config,denied,enquiry),e=>e.code==='SIGN_IN_REQUIRED')
  await assert.rejects(reveal(config,actor(owner,true),otherEnquiry),e=>e.code==='NOT_FOUND')
  await assert.rejects(reveal(config,actor(other,true),otherEnquiry),e=>e.code==='NOT_FOUND')
  await db.query("update app.accounts set status='disabled' where id=$1",[owner])
  await assert.rejects(reveal(config,actor(owner,true),enquiry),e=>e.code==='NOT_FOUND')
  await db.query("update app.accounts set status='active' where id=$1",[owner])
  const noConsent=seal({submittedByVisitor:true,replyConsent:'product_updates',email:'guest@example.test'},
   {accountId:practitioner,recordId:enquiry,field:'public_lead.contact'},config)
  await db.query('update app.public_service_enquiries set contact_ciphertext=$1 where id=$2',[noConsent,enquiry])
  await assert.rejects(reveal(config,actor(owner,true),enquiry),e=>e.code==='NOT_FOUND')
  await db.query('update app.public_service_enquiries set contact_ciphertext=$1 where id=$2',[ciphertext,enquiry])
  assert.equal(Number((await db.query('select count(*) as n from app.public_enquiry_contact_disclosures')).rows[0].n),1)
  await db.query('revoke insert on app.public_enquiry_contact_disclosures from hh_app_backend')
  await assert.rejects(reveal(config,actor(owner,true),enquiry),e=>e.code==='42501')
  assert.equal(Number((await db.query('select count(*) as n from app.public_enquiry_contact_disclosures')).rows[0].n),1)
  await db.query('grant insert on app.public_enquiry_contact_disclosures to hh_app_backend')
  await closeDatabase()
  await db.query('begin')
  await db.query('set local role hh_app_backend')
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(actor(owner,true).claims)])
  assert.equal((await db.query('insert into app.public_enquiry_contact_disclosures(id,enquiry_id,operator_id) values($1,$2,$3)',[audit,enquiry,owner])).rowCount,1)
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(actor(other,true).claims)])
  await db.query('savepoint denied')
  await assert.rejects(db.query('insert into app.public_enquiry_contact_disclosures(id,enquiry_id,operator_id) values($1,$2,$3)',[other,enquiry,other]),e=>e.code==='42501')
  await db.query('rollback to savepoint denied')
  await assert.rejects(db.query('select * from app.public_enquiry_contact_disclosures'),e=>e.code==='42501')
 }finally{await db.query('rollback').catch(()=>{});await db.end()}
})
