import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretationDatabaseOptions, validateInterpretationRelease, INTERPRETATION_SEED_PATH } from './helpers/interpretation-db-isolation.mjs'
const env = { CI:'true', NODE_ENV:'test', HH_APP_TEST_RUNTIME:'isolated', HH_INTERPRETATION_DB_TEST:'synthetic-only', HH_TEST_ADMIN_DATABASE_URL:'postgres://postgres:synthetic-ci-admin@127.0.0.1:5432/hh_app_test' }
const argv=['--conditions=react-server']
const pending={status:'pending',sourceCommit:null,interpretationVersion:'2026-10-17.v1',seedPath:null,recordCount:0}
const hash='sha256:'+'a'.repeat(64)
function approved() {
 const digests={}
 for(let i=0;i<230;i++)for(const locale of ['en','ru'])digests[JSON.stringify([`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,hash,'2026-10-17.v1',locale])]=hash
 return {release:{status:'approved',sourceCommit:'b'.repeat(40),interpretationVersion:'2026-10-17.v1',seedPath:INTERPRETATION_SEED_PATH,recordCount:460,seedSha256:hash},digests}
}
test('native database guard pins transport and ignores PGHOST/PGSSLMODE overrides',()=>{
 const options=interpretationDatabaseOptions({...env,PGHOST:'remote.invalid',PGSSLMODE:'require'},argv)
 assert.equal(options.host,'127.0.0.1');assert.equal(options.ssl,false);assert.equal(options.database,'hh_app_test')
})
test('native database guard rejects every unsafe destination or invocation before connection',()=>{
 for(const [key,value] of [['CI','false'],['HH_APP_TEST_RUNTIME','production'],['HH_INTERPRETATION_DB_TEST','yes'],['VERCEL','1'],['NODE_ENV','production'],['HH_TEST_ADMIN_DATABASE_URL','postgres://postgres:synthetic-ci-admin@remote.invalid/hh_app_test'],['HH_TEST_ADMIN_DATABASE_URL','postgres://postgres:synthetic-ci-admin@127.0.0.1/production'],['HH_TEST_ADMIN_DATABASE_URL','postgres://postgres:other@127.0.0.1/hh_app_test'],['HH_TEST_ADMIN_DATABASE_URL','postgres://postgres:synthetic-ci-admin@127.0.0.1/hh_app_test?host=remote.invalid'],['HH_TEST_ADMIN_DATABASE_URL','postgres://postgres:synthetic-ci-admin@127.0.0.1/hh_app_test#fragment'],['HH_TEST_ADMIN_DATABASE_URL','http://postgres:synthetic-ci-admin@127.0.0.1/hh_app_test']]) assert.throws(()=>interpretationDatabaseOptions({...env,[key]:value},argv),key)
 assert.throws(()=>interpretationDatabaseOptions(env,[]))
})
test('only empty preparatory C1 receives an explicit no-database-proof skip',()=>{
 const result=validateInterpretationRelease(pending,{});assert.equal(result.pending,true);assert.match(result.reason,/has NOT run/)
 assert.throws(()=>validateInterpretationRelease(pending,{}, {seedExists:true}))
 assert.throws(()=>validateInterpretationRelease(pending,{'unexpected':hash}))
 assert.throws(()=>validateInterpretationRelease({...pending,recordCount:460},{}))
})
test('C2 requires exact 230×2 identities, approved seed and hash, not merely a positive count',()=>{
 const {release,digests}=approved();assert.equal(validateInterpretationRelease(release,digests,{seedExists:true}).pending,false)
 for(const changed of [{status:'unknown'},{recordCount:459},{sourceCommit:null},{seedPath:'../../production.sql'},{seedSha256:'bad'}])assert.throws(()=>validateInterpretationRelease({...release,...changed},digests,{seedExists:true}))
 assert.throws(()=>validateInterpretationRelease(release,digests,{seedExists:false}))
 const missing={...digests};delete missing[Object.keys(missing)[0]];assert.throws(()=>validateInterpretationRelease(release,missing,{seedExists:true}))
 const invalid={...digests};invalid[Object.keys(invalid)[0]]='bad';assert.throws(()=>validateInterpretationRelease(release,invalid,{seedExists:true}))
})
