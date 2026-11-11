import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isolatedReceiptTestConfig,receiptCleanupSql} from '../scripts/verify-whatsapp-receipts-isolated.mjs';
const valid={CI:'true',GITHUB_ACTIONS:'true',NODE_ENV:'test',HH_APP_TEST_RUNTIME:'isolated',HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test'};
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('DB runner only admits the exact disposable GitHub fixture and never substitutes live settings',()=>{
 assert.equal(isolatedReceiptTestConfig(valid).ssl,false);
 for(const [key,value] of Object.entries(valid))assert.throws(()=>isolatedReceiptTestConfig({...valid,[key]:undefined}));
 for(const url of ['postgres://postgres:synthetic-ci-admin@localhost:5432/hh_app_test','postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/postgres','postgres://postgres:synthetic-ci-admin@production.supabase.co:5432/hh_app_test',valid.HH_TEST_ADMIN_DATABASE_URL+'?options=x'])assert.throws(()=>isolatedReceiptTestConfig({...valid,HH_TEST_ADMIN_DATABASE_URL:url}));
 assert.throws(()=>isolatedReceiptTestConfig({HH_APP_DATABASE_URL:valid.HH_TEST_ADMIN_DATABASE_URL}));
});
test('retention SQL is bounded to expired hash receipts only, with no fresh receipt deletion',()=>{
 const sql=receiptCleanupSql(read('../lib/app/maintenance.js'));
 assert.match(sql,/received_at < now\(\)-interval '24 hours'/);assert.match(sql,/limit \$1/);assert.match(sql,/r.business_hash=d.business_hash and r.user_hash=d.user_hash/);assert.match(sql,/r.message_hash=d.message_hash/);assert.doesNotMatch(sql,/crm_contacts|crm_msg_items|diagnostic_sessions/);
});
test('housekeeping skips absent optional table but executes exact bounded cleanup once when installed',async()=>{
 const source=read('../lib/app/maintenance.js').replace(/^import .*\n/gm,'').replace(/^export /gm,'');
 for(const installed of [false,true]){
  const calls=[];
  const db={query:async(sql,args)=>{calls.push({sql,args});if(sql.includes('to_regclass'))return {rows:[{receipts:installed?'app_private.crm_wa_diagnostic_receipts':null}]};if(sql.startsWith('insert into app_private.housekeeping_runs'))return {rows:[{id:'fictional'}]};if(sql.startsWith('update app_private.housekeeping_runs'))return {rows:[{id:'fictional',guest_sessions_deleted:0,viewer_sessions_deleted:0,intents_deleted:0}]};return {rows:[]}}};
  const context=vm.createContext({AppError:Error,transaction:async(_config,_actor,work)=>work(db),fetch:()=>{throw Error('REAL_NETWORK_DENIED')}} ,{codeGeneration:{strings:false,wasm:false}});
  vm.runInContext(source,context,{timeout:1000});await context.runAppHousekeeping({}, {batchSize:17});
  const purges=calls.filter(x=>x.sql.includes('delete from app_private.crm_wa_diagnostic_receipts'));
  assert.equal(purges.length,installed?1:0);if(installed)assert.equal(purges[0].args[0],17);
 }
});
test('early fixture rejection never queues rollback on a disconnected pg client',async()=>{
 const runner=read('../scripts/verify-whatsapp-receipts-isolated.mjs');
 const begin=runner.indexOf('async function main(){'),end=runner.indexOf('\nif(process.argv[1]',begin);
 const main=runner.slice(begin,end).replace("const {default:pg}=await import('pg');",'const pg=mockPg;');
 assert.ok(main.includes('const pg=mockPg;'));
 for(const failAt of ['identity','existing','migration','cleanup','duplicate']){
  let disconnectedQueries=0;const instances=[],ddl=[];
  class Client{
   constructor(){this.connected=false;this.index=instances.length;instances.push(this)}
   async connect(){this.connected=true}
   async end(){this.connected=false}
   async query(sql){
    if(!this.connected){disconnectedQueries++;throw Error('DISCONNECTED_QUERY')}
    if(/^(?:create|drop) (?:schema|role)/.test(sql))ddl.push(sql);
    if(failAt==='cleanup'&&sql==='drop schema app_private')throw Error('FICTIONAL_CLEANUP_FAILURE');
    if(sql.includes('current_database()'))return {rows:[{db:failAt==='identity'?'wrong_database':'hh_app_test',role:'postgres',version:170000}]};
    if(sql.includes('to_regclass'))return {rows:[{existing:failAt==='existing'?'pre_existing_table':null}]};
    if(sql.includes('to_regnamespace'))return {rows:[{existing:null}]};
    if(sql.includes('where rolname=any'))return {rowCount:0,rows:[]};
    if(sql.includes('rolsuper or rolbypassrls'))return {rowCount:0,rows:[]};
    if(sql==='FICTIONAL_MIGRATION'&&failAt!=='duplicate')throw Error('MIGRATION_FAILURE');
    if(sql.includes('select relrowsecurity'))return {rows:[{relrowsecurity:true,relforcerowsecurity:true}]};
    if(sql.startsWith('insert into app_private.crm_wa_diagnostic_receipts')){if(this.index===2)throw Error('FICTIONAL_DUPLICATE_QUERY_FAILURE');return {rowCount:1,rows:[]}};
    return {rowCount:0,rows:[]};
   }
  }
  const context=vm.createContext({assert,process:{env:valid},isolatedReceiptTestConfig,receiptCleanupSql,ROOT:'/fixture',path:{join:(...parts)=>parts.join('/'),dirname:file=>file.slice(0,file.lastIndexOf('/'))},readdirSync:()=>['20000101000000_hh_crm_whatsapp_diagnostic_receipts.sql'],realpathSync:value=>value,readFileSync:file=>file.endsWith('.sql')?'FICTIONAL_MIGRATION':read('../lib/app/maintenance.js'),mockPg:{Client},setTimeout,console:{log:()=>{throw Error('UNEXPECTED_SUCCESS')}}},{codeGeneration:{strings:false,wasm:false}});
  vm.runInContext(main,context,{timeout:1000});await assert.rejects(context.main());
  assert.equal(disconnectedQueries,0);assert.equal(instances[0].connected,false);assert.equal(instances[1].connected,false);assert.equal(instances[2].connected,false);
  if(failAt==='migration'||failAt==='cleanup'||failAt==='duplicate'){assert.ok(ddl.includes('drop schema app_private'));assert.equal(ddl.filter(x=>x.startsWith('create role ')).length,6);assert.equal(ddl.filter(x=>x.startsWith('drop role ')).length,failAt==='cleanup'?0:6)}else assert.equal(ddl.length,0);
 }
});
