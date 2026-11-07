/**
 * Live-source migration, isolated two-owner PostgreSQL RLS acceptance.
 * Runs only after the EXISTING App R1 DB suite, in its disposable CI service.
 * Never run on Supabase, Vercel, production, remote hosts or user accounts.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {getAppConfig} from '../lib/app/config.js';
import {closeDatabase} from '../lib/app/database.js';
import {actor,rawAs} from '../tests/helpers/app-db-setup.mjs';
import {
 readMyAgentMemory,consentToAgentMemory,configureOwnAgentMemoryUse,
 saveOwnAgentMemory,deleteOwnAgentMemory,eraseAllOwnAgentMemory,
} from '../lib/holistic-support/agent-memory-store.js';

const adminUrl=process.env.HH_TEST_ADMIN_DATABASE_URL||'';
const appUrl=process.env.HH_APP_DATABASE_URL||'';
let isolated=false;
try {
 const a=new URL(adminUrl),b=new URL(appUrl);
 isolated=process.env.CI==='true' && process.env.HH_APP_TEST_RUNTIME==='isolated' &&
  !process.env.VERCEL && !process.env.VERCEL_ENV &&
  ['127.0.0.1','localhost'].includes(a.hostname) &&
  ['127.0.0.1','localhost'].includes(b.hostname) &&
  a.pathname==='/hh_app_test' && b.pathname==='/hh_app_test' &&
  b.username==='hh_app_ci_login';
} catch {}
if(!isolated)throw Error('ISOLATED_APP_POSTGRES_REQUIRED');
const TEST_A='7a000001-0000-4000-8000-000000000001';
const TEST_B='7a000002-0000-4000-8000-000000000002';
const SESSION_A='7b000001-0000-4000-8000-000000000001';
const SESSION_B='7b000002-0000-4000-8000-000000000002';
const db=new pg.Client({connectionString:adminUrl});
await db.connect();
try {
 const exists=await db.query('select id from auth.users where id=any($1::uuid[])',[[TEST_A,TEST_B]]);
 if(exists.rowCount!==0)throw Error('ISOLATED_MEMORY_TEST_IDENTITIES_NOT_FRESH');
 // The earlier App R1 suite intentionally revokes/blocks its own owners.
 // Create two NEW synthetic sessions and accounts so these security tests
 // never rely on a state mutated by unrelated earlier integration tests.
 await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',
   [TEST_A,'agent-memory-a@example.invalid',TEST_B,'agent-memory-b@example.invalid']);
 await db.query('insert into auth.sessions(id,user_id) values($1,$2),($3,$4)',
   [SESSION_A,TEST_A,SESSION_B,TEST_B]);
 await db.query("insert into app.accounts(id,status,onboarding_state) values($1,'active','active'),($2,'active','active')",[TEST_A,TEST_B]);
 const schema=await db.query("select to_regclass('app_private.agent_memory_item') as item, to_regclass('app_private.agent_memory_consent') as consent");
 if(schema.rows[0].item||schema.rows[0].consent)throw Error('TEST_SCHEMA_NOT_FRESH');
 // This reference role exists in production; add it only to disposable CI.
 await db.query('create role hh_crm_backend nologin');
 const sql=await readFile(new URL('../supabase/migrations/20261029193000_hh_agent_memory_opt_in_v1.sql',import.meta.url),'utf8');
 if(!sql.includes('force row level security')||!sql.includes('hh_app_backend'))throw Error('UNREVIEWED_MEMORY_MIGRATION');
 await db.query(sql);
 const force=await db.query("select relname,relrowsecurity,relforcerowsecurity from pg_class where oid in ('app_private.agent_memory_item'::regclass,'app_private.agent_memory_consent'::regclass)");
 assert.equal(force.rowCount,2);
 assert.ok(force.rows.every(x=>x.relrowsecurity&&x.relforcerowsecurity));
 for(const role of ['anon','authenticated','hh_app_inbox','hh_crm_backend']){
  const access=await db.query("select has_table_privilege($1,'app_private.agent_memory_item','SELECT') as read",[role]);
  assert.equal(access.rows[0].read,false,'unauthorized '+role);
 }
}finally{await db.end();}

const config=getAppConfig(),first=actor(TEST_A,SESSION_A),second=actor(TEST_B,SESSION_B);
try{
 assert.equal((await readMyAgentMemory(config,first)).consent,false);
 await assert.rejects(()=>saveOwnAgentMemory(config,first,'preferred_name','Alice'),/MEMORY_CONSENT_REQUIRED/);
 await consentToAgentMemory(config,first,true);
 await saveOwnAgentMemory(config,first,'preferred_name','Alice');
 await saveOwnAgentMemory(config,first,'response_length','short');
 await configureOwnAgentMemoryUse(config,first,true);
 const own=await readMyAgentMemory(config,first);
 assert.equal(own.consent,true);
 assert.equal(own.useInDialogue,true);
 assert.deepEqual(own.items.map(x=>x.kind).sort(),['preferred_name','response_length']);
 const ciphertext=await rawAs(first,'hh_app_backend',c=>c.query('select value_ciphertext from app_private.agent_memory_item where account_id=$1',[TEST_A]));
 assert.equal(ciphertext.rowCount,2);
 assert.ok(ciphertext.rows.every(x=>!x.value_ciphertext.includes('Alice')));
 const other=await readMyAgentMemory(config,second);
 assert.equal(other.consent,false);
 assert.deepEqual(other.items,[]);
 for(const table of ['agent_memory_item','agent_memory_consent']){
  const seen=await rawAs(second,'hh_app_backend',c=>c.query('select * from app_private.'+table));
  assert.equal(seen.rowCount,0,'B cannot read '+table);
 }
 const update=await rawAs(second,'hh_app_backend',c=>c.query("update app_private.agent_memory_item set value_ciphertext='UNAUTHORIZED' where account_id=$1",[TEST_A]));
 assert.equal(update.rowCount,0);
 await assert.rejects(()=>rawAs(second,'hh_app_backend',c=>c.query("insert into app_private.agent_memory_item(account_id,kind,value_ciphertext) values($1,'avoid_format','UNAUTHORIZED')",[TEST_A])),/row-level security/i);
 await assert.rejects(()=>rawAs(first,'authenticated',c=>c.query('select * from app_private.agent_memory_item')),/permission denied/i);
 await assert.rejects(()=>readMyAgentMemory(config,actor(TEST_A,randomUUID())),/SIGN_IN_REQUIRED/);
 await deleteOwnAgentMemory(config,first,'response_length');
 assert.deepEqual((await readMyAgentMemory(config,first)).items.map(x=>x.kind),['preferred_name']);
 await consentToAgentMemory(config,first,false);
 const revoked=await readMyAgentMemory(config,first);
 assert.equal(revoked.consent,false);
 assert.equal(revoked.useInDialogue,false);
 assert.deepEqual(revoked.items,[]);
 await assert.rejects(()=>saveOwnAgentMemory(config,first,'preferred_name','Again'),/MEMORY_CONSENT_REQUIRED/);
 await eraseAllOwnAgentMemory(config,first);
 const verify=new pg.Client({connectionString:adminUrl});
 await verify.connect();
 try{
  for(const table of ['agent_memory_consent','agent_memory_item']){
   const r=await verify.query('select count(*)::int n from app_private.'+table);
   assert.equal(r.rows[0].n,0,'purge '+table);
  }
 }finally{await verify.end();}
 console.log('HH_AGENT_MEMORY_POSTGRES_TWO_OWNER_PASS');
}finally{await closeDatabase();}
