import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assertTelegramIsolationEnvironment as guard,assertTelegramIsolationServer as server} from './helpers/telegram-service-isolation-guard.mjs'
const env={CI:'true',NODE_ENV:'test',HH_APP_TEST_RUNTIME:'isolated',HH_TELEGRAM_POLICY_FIXTURE:'synthetic-only',
 HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test',
 HH_APP_DATABASE_URL:'postgres://hh_app_ci_login:synthetic-ci-only@127.0.0.1:5432/hh_app_test'}
test('requires exact disposable loopback hh_app_test endpoints and four explicit runtime markers',()=>{
 assert.ok(guard(env).appUrl.includes('127.0.0.1'))
 for(const key of Object.keys(env)){const bad={...env};delete bad[key];assert.throws(()=>guard(bad),undefined,key)}
 for(const key of ['HH_APP_DATABASE_URL','HH_TEST_ADMIN_DATABASE_URL'])for(const value of [
 env[key].replace('127.0.0.1','localhost'),env[key].replace('127.0.0.1','db.example.invalid'),
 env[key].replace('hh_app_test','postgres'),env[key]+'?host=db.example.invalid',env[key]+'#ignored',
 env[key].replace('5432','5433'),env[key].replace('synthetic-ci','other'),
 ])assert.throws(()=>guard({...env,[key]:value}))
})
test('rejects production/provider/implicit-libpq environment inputs',()=>{
 for(const key of ['VERCEL','VERCEL_ENV','SUPABASE_URL','HH_APP_SUPABASE_URL','HH_CRM_MSG_TELEGRAM_TOKEN',
 'HH_CRM_TG_DIAGNOSTIC_ENABLED','PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGPASSFILE','PGSERVICE','PGOPTIONS','DATABASE_URL'])
  assert.throws(()=>guard({...env,[key]:'synthetic-forbidden'}),undefined,key)
})
test('connected server must be empty PG17 loopback test DB, never another server/schema',()=>{
 const row={database:'hh_app_test',address:'127.0.0.1',port:5432,version:'170005',login:'postgres',superuser:true,occupied:false};server(row);server({...row,address:'172.18.0.2'})
 for(const patch of [{database:'postgres'},{address:'192.0.2.1'},{address:'127.0.0.1/32'},{address:'172.18.0.2/32'},{port:5433},{version:'160005'},{version:'180001'},
 {login:'other'},{superuser:false},{occupied:true}])assert.throws(()=>server({...row,...patch}))
})
test('PG acceptance guard precedes pg import; exact legacy, website and Telegram policies are all retained',()=>{
 const script=readFileSync(new URL('./telegram-service-policy.integration.mjs',import.meta.url),'utf8')
 assert.ok(script.indexOf('assertTelegramIsolationEnvironment()')<script.indexOf("await import('pg')"))
 const fixture=readFileSync(new URL('./helpers/telegram-service-policy-fixture.mjs',import.meta.url),'utf8')
 for(const version of ['20261019152000','20261020165000','20261026221222','20261026223912'])assert.ok(fixture.includes(version))
 assert.doesNotMatch(fixture.replace(/^\/\/.*$/gm,''),/proposed-crm-schema|drop policy|disable row level security|no force row level security/i)
 assert.match(script,/permissive/);assert.match(script,/crm_contact_public_enquiry_insert/)
 assert.match(fixture,/from pg_class c join pg_namespace n/)
 assert.match(fixture,/nspname not in \('public','information_schema'\)/)
 assert.match(fixture,/rolname <> 'postgres'/)
 assert.match(fixture,/host\(inet_server_addr\(\)\) as address/)
 assert.doesNotMatch(fixture,/inet_server_addr\(\)::text/)
})

test('server rejection exposes only bounded failed-predicate names, never raw server values',()=>{
 const row={database:'hh_app_test',address:'127.0.0.1',port:5432,version:'170011',login:'postgres',superuser:true,occupied:false}
 for(const [key,patch] of Object.entries({database:{database:'unapproved-db'},address:{address:'unapproved-host'},
  port:{port:5433},version:{version:'180001'},login:{login:'unapproved-login'},superuser:{superuser:false},empty:{occupied:true}})){
  assert.throws(()=>server({...row,...patch}),{message:'EMPTY_EPHEMERAL_PG17_REQUIRED:'+key})
 }
 assert.throws(()=>server({...row,database:'private-db',address:'private-host',login:'private-login',occupied:true}),
  {message:'EMPTY_EPHEMERAL_PG17_REQUIRED:database,address,login,empty'})
})

test('CI blocks provider egress and limits any admitted socket to guarded loopback PostgreSQL',()=>{
 const source=readFileSync(new URL('./helpers/telegram-service-network-guard.mjs',import.meta.url),'utf8')
 assert.match(source,/assertTelegramIsolationEnvironment\(\)/)
 assert.match(source,/options\.host!=='127\.0\.0\.1'/)
 assert.match(source,/Number\(options\.port\)!==5432/)
 assert.match(source,/globalThis\.fetch=denied/)
 const workflow=readFileSync(new URL('../.github/workflows/hh-app-r1.yml',import.meta.url),'utf8')
 const job=workflow.slice(workflow.indexOf('  telegram-service-policy-model:'))
 assert.equal(job.split('--import ./tests/helpers/telegram-service-network-guard.mjs').length-1,2)
 for(const suite of ['service-telegram-offering.test.mjs','telegram-multi-master-service.test.mjs','service-enquiry-combined-contract.test.mjs','marketplace-site-service-enquiry.test.mjs'])
  assert.ok(job.includes(suite),suite+' must run beside the injected runtime contracts')
})

test('all callback and promise DNS entry points and Resolver constructors fail closed without queries',async()=>{
 const {default:dns}=await import('node:dns')
 const {default:dnsPromises}=await import('node:dns/promises')
 await import('./helpers/telegram-service-network-guard.mjs')
 const denied=dns.lookup
 for(const module of [dns,dnsPromises]){
  for(const [name,fn] of Object.entries(module))if(typeof fn==='function'&&name!=='Resolver')
   assert.equal(fn,denied,'DNS API remains native: '+name)
  assert.throws(()=>new module.Resolver(),/SYNTHETIC_ACCEPTANCE_EGRESS_DENIED/)
  // No hostname or IP is supplied: a missing patch cannot perform a lookup.
  for(const method of ['lookup','lookupService','resolveTxt','resolveSrv','reverse'])
   assert.throws(()=>module[method](),/SYNTHETIC_ACCEPTANCE_EGRESS_DENIED/)
 }
})
