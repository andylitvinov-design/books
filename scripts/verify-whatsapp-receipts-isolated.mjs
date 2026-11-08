// ONLY the existing disposable GitHub PG17 service, never a configured app database.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,realpathSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const FIXTURE='postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test';
export function isolatedReceiptTestConfig(env){
 if(env.CI!=='true'||env.GITHUB_ACTIONS!=='true'||env.NODE_ENV!=='test'||env.HH_APP_TEST_RUNTIME!=='isolated'||env.HH_TEST_ADMIN_DATABASE_URL!==FIXTURE)
  throw new Error('ISOLATED_GITHUB_PG17_FIXTURE_REQUIRED');
 return {connectionString:FIXTURE,ssl:false,connectionTimeoutMillis:5000,statement_timeout:10000};
}
export function receiptCleanupSql(source){
 const at=source.indexOf('from app_private.crm_wa_diagnostic_receipts');
 const begin=source.lastIndexOf('`with doomed as (',at),end=source.indexOf('`',at);
 if(at<0||begin<0||end<0)throw new Error('RECEIPT_CLEANUP_SOURCE_MISSING');
 return source.slice(begin+1,end);
}
async function main(){
 const config=isolatedReceiptTestConfig(process.env); // MUST precede pg import or any connection.
 const dir=path.join(ROOT,'supabase/migrations');
 const files=readdirSync(dir).filter(name=>/^\d{14}_hh_crm_whatsapp_diagnostic_receipts\.sql$/.test(name));
 assert.equal(files.length,1,'exactly one CLI-generated receipt migration is required');
 const file=realpathSync(path.join(dir,files[0]));
 assert.equal(path.dirname(file),realpathSync(dir),'migration must remain inside repository');
 const migration=readFileSync(file,'utf8');
 const cleanup=receiptCleanupSql(readFileSync(path.join(ROOT,'lib/app/maintenance.js'),'utf8'));
 const {default:pg}=await import('pg');
 const admin=new pg.Client(config),a=new pg.Client(config),b=new pg.Client(config);
 let created=false,adminConnected=false,aConnected=false,bConnected=false,schemaCreated=false;
 const roles=['anon','authenticated','service_role','hh_app_backend','hh_crm_backend','hh_app_inbox'];
 const rolesCreated=[];
 const q=async(client,sql,args)=>client.query(sql,args);
 const hash=n=>String(n).padStart(64,'0');
 const claim='insert into app_private.crm_wa_diagnostic_receipts(business_hash,user_hash,message_hash) values($1,$2,$3) on conflict(business_hash,user_hash,message_hash) do nothing returning message_hash';
 try{
  await admin.connect();adminConnected=true;
  const identity=(await q(admin,"select current_database() as db,current_user as role,current_setting('server_version_num')::int as version")).rows[0];
  assert.equal(identity.db,'hh_app_test');assert.equal(identity.role,'postgres');assert.ok(identity.version>=170000&&identity.version<180000);
  assert.equal((await q(admin,"select to_regclass('app_private.crm_wa_diagnostic_receipts') as existing")).rows[0].existing,null,'never touch pre-existing receipt data');
  assert.equal((await q(admin,"select to_regnamespace('app_private') as existing")).rows[0].existing,null,'runner requires pristine fixture schema');
  assert.equal((await q(admin,'select rolname from pg_roles where rolname=any($1::text[])',[roles])).rowCount,0,'runner requires pristine fixture roles');
  // Fixture roles only; the migration itself never creates a role.
  await q(admin,'create schema app_private');schemaCreated=true;
  for(const role of roles){
   await q(admin,`create role ${role} nologin nosuperuser nobypassrls`);rolesCreated.push(role);
  }
  const unsafe=await q(admin,"select rolname from pg_roles where rolname in ('hh_app_backend','hh_app_inbox') and (rolsuper or rolbypassrls)");assert.equal(unsafe.rowCount,0);
  await q(admin,'grant usage on schema app_private to hh_app_backend,hh_app_inbox,anon,authenticated,service_role,hh_crm_backend');
  await q(admin,migration);created=true;
  const security=(await q(admin,"select relrowsecurity,relforcerowsecurity from pg_class where oid='app_private.crm_wa_diagnostic_receipts'::regclass")).rows[0];assert.equal(security.relrowsecurity,true);assert.equal(security.relforcerowsecurity,true);
  await a.connect();aConnected=true;await b.connect();bConnected=true;
  // Duplicate claims serialize on the unique key. Distinct IDs remain accepted.
  await q(a,'begin');await q(a,'set local role hh_app_inbox');assert.equal((await q(a,claim,[hash(1),hash(2),hash(3)])).rowCount,1);
  await q(b,'begin');await q(b,'set local role hh_app_inbox');let settled=false;
  const duplicate=q(b,claim,[hash(1),hash(2),hash(3)]).then(
   result=>{settled=true;return {result}},error=>{settled=true;return {error}});
  await new Promise(r=>setTimeout(r,50));
  if(settled){const early=await duplicate;if(early.error)throw early.error}
  assert.equal(settled,false,'uncommitted duplicate waits');
  await q(a,'commit');const outcome=await duplicate;if(outcome.error)throw outcome.error;
  assert.equal(outcome.result.rowCount,0);await q(b,'commit');
  await q(a,'begin');await q(a,'set local role hh_app_inbox');assert.equal((await q(a,claim,[hash(1),hash(2),hash(4)])).rowCount,1);await q(a,'rollback');
  await q(b,'begin');await q(b,'set local role hh_app_inbox');assert.equal((await q(b,claim,[hash(1),hash(2),hash(4)])).rowCount,1);assert.equal((await q(b,claim,[hash(1),hash(5),hash(3)])).rowCount,1);await q(b,'commit');
  // Denied operations are isolated with savepoints; never broaden grants to make tests pass.
  async function denied(role,sql,args,code='42501'){
   await q(a,'begin');await q(a,`set local role ${role}`);
   try{await assert.rejects(q(a,sql,args),e=>e.code===code)}finally{await q(a,'rollback')}
  }
  for(const role of ['anon','authenticated','service_role','hh_crm_backend'])await denied(role,'select message_hash from app_private.crm_wa_diagnostic_receipts');
  await denied('hh_app_inbox','delete from app_private.crm_wa_diagnostic_receipts');
  await denied('hh_app_inbox','update app_private.crm_wa_diagnostic_receipts set message_hash=$1',[hash(8)]);
  await denied('hh_app_inbox','insert into app_private.crm_wa_diagnostic_receipts(business_hash,user_hash,message_hash,received_at) values($1,$2,$3,now())',[hash(1),hash(2),hash(9)]);
  await denied('hh_app_inbox',claim,['malformed',hash(2),hash(9)],'23514');
  await denied('hh_app_backend',claim,[hash(1),hash(2),hash(9)]);
  await denied('hh_app_backend','update app_private.crm_wa_diagnostic_receipts set message_hash=$1',[hash(8)]);
  // Existing backend can see/delete only expired receipts. Verify actual cleanup SQL.
  await q(admin,"insert into app_private.crm_wa_diagnostic_receipts values($1,$2,$3,now()-interval '25 hours'),($1,$2,$4,now()-interval '25 hours'),($1,$2,$5,now()-interval '23 hours 59 minutes')",[hash(9),hash(9),hash(1),hash(2),hash(3)]);
  await q(a,'begin');await q(a,'set local role hh_app_backend');assert.equal((await q(a,'select * from app_private.crm_wa_diagnostic_receipts')).rowCount,2);assert.equal((await q(a,cleanup,[1])).rowCount,1);await q(a,'commit');
  assert.equal((await q(admin,'select * from app_private.crm_wa_diagnostic_receipts where business_hash=$1 and message_hash=$2',[hash(9),hash(3)])).rowCount,1,'fresh retention boundary preserved');
  assert.equal((await q(admin,'select * from app_private.crm_wa_diagnostic_receipts where business_hash=$1',[hash(1)])).rowCount,3,'unexpired replay receipts preserved');
  console.log('WhatsApp receipt PG17 isolated claims, rollback, concurrency, RLS and bounded retention: PASS');
 }finally{
  if(aConnected)await a.query('rollback').catch(()=>{});
  if(bConnected)await b.query('rollback').catch(()=>{});
  await a.end().catch(()=>{});await b.end().catch(()=>{});
  try{
   if(adminConnected)await admin.query('rollback').catch(()=>{});
   if(created)await admin.query('drop table app_private.crm_wa_diagnostic_receipts');
   if(schemaCreated)await admin.query('drop schema app_private');
   for(const role of rolesCreated.reverse())await admin.query(`drop role ${role}`);
  }finally{await admin.end().catch(()=>{})}
 }
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
