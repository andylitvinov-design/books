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

test('v1 and v2 gates validate exact independent 460-entry subsets without accepting malformed extra entries', () => {
 const { release, digests } = approved()
 const v2Entries = Object.fromEntries(Object.entries(digests).map(([key,value])=>{const id=JSON.parse(key);id[2]='2026-10-17.v2';return[JSON.stringify(id),value]}))
 const combined = {...digests,...v2Entries}
 const v2 = {...release,interpretationVersion:'2026-10-17.v2',seedPath:'supabase/seeds/assessment-interpretations-2026-10-17.v2.sql'}
 assert.deepEqual(validateInterpretationRelease(release,combined,{seedExists:true}).approvedDigests,digests)
 assert.deepEqual(validateInterpretationRelease(v2,combined,{seedExists:true}).approvedDigests,v2Entries)
 const missing={...combined};delete missing[Object.keys(v2Entries)[0]]
 assert.throws(()=>validateInterpretationRelease(v2,missing,{seedExists:true}))
 for(const extra of [{'not-json':hash},{'["fake"]':hash},{[JSON.stringify(['00000000-0000-4000-8000-000000000000',hash,'future.v3','en'])]:hash}])assert.throws(()=>validateInterpretationRelease(release,{...combined,...extra},{seedExists:true}))
 assert.throws(()=>validateInterpretationRelease(pending,combined))
 assert.throws(()=>validateInterpretationRelease({...v2,seedPath:INTERPRETATION_SEED_PATH},combined,{seedExists:true}))
 assert.throws(()=>validateInterpretationRelease({...v2,interpretationVersion:'future.v3'},combined,{seedExists:true}))
})


test('v3 release isolates its 460 exact identities while preserving both historical maps', () => {
 const {release, digests}=approved();const versions=['2026-10-17.v1','2026-10-17.v2','2026-10-17.v3'];
 const maps=versions.map(version=>Object.fromEntries(Object.entries(digests).map(([key,value])=>{const id=JSON.parse(key);id[2]=version;return[JSON.stringify(id),value]})))
 const combined=Object.assign({},...maps);assert.equal(Object.keys(combined).length,1380)
 for(let index=0;index<3;index++){
  const version=versions[index];const descriptor={...release,interpretationVersion:version,seedPath:'supabase/seeds/assessment-interpretations-'+version+'.sql'}
  assert.deepEqual(validateInterpretationRelease(descriptor,combined,{seedExists:true}).approvedDigests,maps[index]);
  const missing={...combined};delete missing[Object.keys(maps[index])[0]];assert.throws(()=>validateInterpretationRelease(descriptor,missing,{seedExists:true}));
 }
 assert.throws(()=>validateInterpretationRelease({...release,interpretationVersion:versions[2]},combined,{seedExists:true}),'v3 must not reuse v1 seed path')
})
