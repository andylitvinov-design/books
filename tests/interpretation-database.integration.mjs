/** Native PostgreSQL 17 integration. Explicit isolated CI only; never a production URL.
 * C1 has an explicit preparatory skip. C2 requires real schema, approved seed, readback,
 * RLS/immutability and the normal server loader using its committed digest allowlist.
 */
import test from 'node:test'
import { validateNativeV3Release, verifyNativeV3 } from './interpretation-v3-database.cases.mjs'
import { validateNativeV2Release, verifyNativeV2 } from './interpretation-v2-database.cases.mjs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import pg from 'pg'
import {compactInterpretationInsert} from '../scripts/compact-interpretation-sql.mjs'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel, INTERPRETATION_RULES_VERSION } from '../lib/assessments/interpretation-registry.js'
import { APPROVED_INTERPRETATION_DIGESTS } from '../lib/assessments/interpretation-approved-digests.js'
import { loadInterpretationRecord, validInterpretationRecord, interpretationRecordApprovalKey } from '../lib/assessments/interpretation-record-integrity.js'
import { withResultInterpretations } from '../lib/app/result-interpretations.js'
import { storedResultInterpretation, STORED_INTERPRETATION_VERSION } from '../lib/assessments/interpretation-resolution.js'
import { storedInterpretationForDimension } from '../lib/assessments/interpretation-storage.js'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import { historicalInterpretationCoverage } from './helpers/historical-interpretation-coverage.mjs'
import { interpretationDatabaseOptions, validateInterpretationRelease, assertFreshInterpretationDatabase, INTERPRETATION_SEED_PATH } from './helpers/interpretation-db-isolation.mjs'

// Fail before constructing any Client/Pool when invocation/transport is unsafe.
interpretationDatabaseOptions()
const root=new URL('../',import.meta.url)
const release=JSON.parse(await readFile(new URL('data/assessments/interpretation-registry-release.json',root),'utf8'))
const seedURL=new URL(INTERPRETATION_SEED_PATH,root)
const seedExists=await access(seedURL).then(()=>true,()=>false)
const gate=validateInterpretationRelease(release,APPROVED_INTERPRETATION_DIGESTS,{seedExists})
// Immutable 2026-10-17 releases cover 230 original source versions. Later
// registered tests are valid source definitions but do not have old signed
// registry receipts; their current interpretations must use verified code.
const historicalCoverage=gate.pending ? null : historicalInterpretationCoverage(
  ASSESSMENT_DEFINITIONS,gate.approvedDigests,release.interpretationVersion)
const {historical:historicalDefinitions=[],newer:newDefinitions=[],approvedRowCount=0}=
  historicalCoverage||{}
const v2Release = gate.pending ? null : await validateNativeV2Release(root, APPROVED_INTERPRETATION_DIGESTS)
const v3Release = gate.pending ? null : await validateNativeV3Release(root, APPROVED_INTERPRETATION_DIGESTS)
const digest=bytes=>'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')
const errorCode=code=>error=>error?.code===code
const recordColumns=['assessment_version_id','interpretation_version','report_locale','definition_content_hash','provenance','source_commit','rules_engine_version','payload_sha256','payload_canonical','payload']
const insertSQL=`INSERT INTO app.assessment_interpretation_versions (${recordColumns.join(',')}) VALUES (${recordColumns.map((_,i)=>'$'+(i+1)).join(',')})`
const recordValues=row=>recordColumns.map(key=>['provenance','payload'].includes(key)?JSON.stringify(row[key]):row[key])
async function sourceSnapshot(db){return (await db.query(`SELECT jsonb_build_object(
  'rows',(SELECT md5(jsonb_agg(to_jsonb(v) ORDER BY id)::text) FROM app.assessment_versions v),
  'acl',c.relacl::text,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,
  'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',a.atttypid,'null',a.attnotnull) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT jsonb_agg(pg_get_constraintdef(x.oid) ORDER BY x.conname) FROM pg_constraint x WHERE x.conrelid=c.oid)) AS snapshot
  FROM pg_class c WHERE c.oid='app.assessment_versions'::regclass`)).rows[0].snapshot}
async function foundation(db){
 await assertFreshInterpretationDatabase(db)
 await db.query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
   CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
   CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE);
   CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(auth.jwt()->>'sub','')::uuid $$;
   GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.jwt(),auth.uid() TO authenticated;`)
 await db.query(await readFile(new URL('supabase/migrations/20261002164037_hh_app_r1_foundation.sql',root),'utf8'))
 assert.equal(approvedRowCount,release.recordCount,'Historical source receipts match pinned release')
 assert.equal(historicalDefinitions.length*2,release.recordCount)
 assert.equal(ASSESSMENT_DEFINITIONS.length,historicalDefinitions.length+newDefinitions.length)
 for(const definition of ASSESSMENT_DEFINITIONS){
  const {contentHash,...content}=definition
  assert.equal(digest(canonicalJSON(content)),contentHash,'Technical source definition hash must be exact')
  await db.query(`INSERT INTO app.assessment_versions(id,definition_key,definition_version,instrument_locale,translation_version,
    definition,questions,answer_schema,scoring_key,scoring_version,result_schema,timeframe,source_metadata,content_hash)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[definition.id,definition.key,definition.version,
    definition.instrumentLocale,definition.translationVersion,definition,JSON.stringify(definition.questions),
    {type:'integer',minimum:definition.answerScale?.min??0,maximum:definition.answerScale?.max??10},definition.scoringKey,
    definition.scoringVersion,{version:definition.resultVersion},definition.timeframe,definition.source,contentHash])
 }
 // Poison only this disposable service's defaults to verify new-object ACL cleanup.
 await db.query(`CREATE ROLE interpretation_rogue_default NOLOGIN NOBYPASSRLS;
   GRANT USAGE ON SCHEMA app TO interpretation_rogue_default;
   ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL ON TABLES TO anon,authenticated,interpretation_rogue_default;
   ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,interpretation_rogue_default;`)
}

// A pending descriptor must never be represented as successful native DB proof.
test('C1 preparatory state has no approved seed and no native database proof',{skip:!gate.pending},()=>{
 assert.equal(gate.pending,true)
 console.log(gate.reason)
})
test('C2 approved registry: native PostgreSQL schema, seed, readback, RLS and server loader',{
 timeout:240000,skip:gate.pending?gate.reason:false
},async t=>{
 let db
 const proof={status:'running',engine:'native PostgreSQL 17',sourceCommit:release.sourceCommit,interpretationVersion:release.interpretationVersion,recordCount:release.recordCount,seedSha256:release.seedSha256,runtimeInterpretationVersion:STORED_INTERPRETATION_VERSION,runtimeRulesVersion:INTERPRETATION_RULES_VERSION,runtimeRegistryMode:'verified-code-fallback',databaseParityForRuntimeVersion:false,checks:[]}
 async function check(name,fn){await t.test(name,async()=>{await fn();proof.checks.push(name)})}
 async function transaction(fn,role){
  await db.query('BEGIN')
  try{if(role){assert.ok(['anon','authenticated','hh_app_backend','interpretation_rogue_default'].includes(role));await db.query('SET LOCAL ROLE '+role)}return await fn()}
  finally{await db.query('ROLLBACK')}
 }
 try{
  const schema=await readFile(new URL('supabase/migrations/20261017013000_hh_assessment_interpretation_registry.sql',root),'utf8')
  const seed=await readFile(seedURL,'utf8')
  assert.equal(digest(seed),release.seedSha256,'Actual approved SQL bytes must match C2 release descriptor')
  assert.doesNotMatch(seed,/DRAFT_INTERPRETATION_SEED_PGLITE_ONLY|DRAFT \/ PGLITE TEST ONLY/,'Native C2 cannot execute a draft seed')
  proof.schemaSha256=digest(schema)
  db=new pg.Client(interpretationDatabaseOptions())
  await db.connect()
  await foundation(db)
  proof.serverVersion=(await db.query('SELECT version() AS version')).rows[0].version
  const sourceBefore=await sourceSnapshot(db)
  await check('Actual repository migration executes in PostgreSQL 17',()=>db.query(schema))
  await check('Actual SHA-pinned approved 460-row seed executes as one transaction',()=>db.query(seed))
  const stored=(await db.query(`SELECT ${recordColumns.join(',')} FROM app.assessment_interpretation_versions ORDER BY assessment_version_id,report_locale`)).rows
  await check('Exact 230×2 source, locale, canonical-byte and approved-digest coverage',async()=>{
   assert.equal(stored.length,460);assert.equal(stored.filter(row=>row.payload.catalogActive===true).length,440);assert.equal(stored.filter(row=>row.payload.catalogActive===false).length,20)
   const actual=new Set()
   for(const row of stored){
    const identity={definitionId:row.assessment_version_id,contentHash:row.definition_content_hash,interpretationVersion:row.interpretation_version,reportLocale:row.report_locale}
    const key=interpretationRecordApprovalKey(identity);assert.ok(!actual.has(key));actual.add(key)
    assert.equal(row.source_commit,release.sourceCommit);assert.equal(row.interpretation_version,release.interpretationVersion)
    assert.equal(row.payload_sha256,APPROVED_INTERPRETATION_DIGESTS[key]);assert.equal(validInterpretationRecord(row,identity),true)
    assert.equal(row.payload_canonical,canonicalJSON(row.payload))
   }
   for(const definition of historicalDefinitions)for(const locale of ['en','ru'])assert.ok(actual.has(interpretationRecordApprovalKey({definitionId:definition.id,contentHash:definition.contentHash,interpretationVersion:release.interpretationVersion,reportLocale:locale})))
   assert.deepEqual([...actual].sort(),Object.keys(gate.approvedDigests).sort())
  })
  await check('All eight English-questionnaire IPIP rows contain reviewed Russian report prose without categorical bands',async()=>{
   const expectedKeys=['ipip-locus-of-control-internality-10','ipip-locus-of-control-powerful-others-10','ipip-locus-of-control-chance-10','ipip-positive-expressivity-9','ipip-negative-expressivity-10','ipip-cognitive-failures-10','ipip-optimism-10','ipip-attending-to-emotions-10']
   const translated=stored.filter(row=>row.report_locale==='ru' && /^ipip-(locus-of-control-|positive-expressivity|negative-expressivity|cognitive-failures|optimism|attending-to-emotions)/.test(row.provenance.definitionKey))
   assert.equal(translated.length,8,'C2 must include all eight reviewed IPIP Russian-report rows; no fixture skip')
   assert.deepEqual(translated.map(row=>row.provenance.definitionKey).sort(),expectedKeys.sort())
   for(const row of translated){
    assert.equal(row.provenance.instrumentLocale,'en')
    for(const dimension of row.payload.dimensions)for(const variant of dimension.variants){
     assert.doesNotMatch(variant.template.meaning,/Higher sums indicate/)
     assert.match(variant.template.meaning,/английском оригинале/)
     assert.match(variant.template.meaning,/не является валидированной/)
     assert.equal(variant.template.continuous,true)
     assert.deepEqual(variant.template.bands,[])
    }
   }
  })
  await check('Actual readback SQL reports exact coverage and zero integrity mismatches',async()=>{
   const result=await db.query(await readFile(new URL('docs/assessments/interpretation-registry-readback.sql',root),'utf8'))
   for(const [key,value]of Object.entries({published_definitions:ASSESSMENT_DEFINITIONS.length,registry_rows:release.recordCount,referenced_definitions:historicalDefinitions.length,en_report_rows:historicalDefinitions.length,ru_report_rows:historicalDefinitions.length,active_rows:440,historical_rows:20,payload_byte_mismatches:0,payload_hash_mismatches:0,missing_expected_keys:newDefinitions.length*2,unexpected_keys:0}))assert.equal(Number(result[0].rows[0][key]),value,key)
   assert.equal(Number(result[1].rows[0].provenance_mismatches),0)
  })
  await check('Normal server loader reads every approved identity under hh_app_backend',()=>transaction(async()=>{
   for(const row of stored){const payload=await loadInterpretationRecord(db,{definitionId:row.assessment_version_id,contentHash:row.definition_content_hash,interpretationVersion:release.interpretationVersion,reportLocale:row.report_locale});assert.deepEqual(payload,row.payload)}
   const row=stored[0];assert.equal(await loadInterpretationRecord(db,{definitionId:row.assessment_version_id,contentHash:'sha256:'+'0'.repeat(64),interpretationVersion:release.interpretationVersion,reportLocale:row.report_locale}),null)
  },'hh_app_backend'))
  await check('Historical v1 receipts render explicitly; current v3 rejects stale prose and uses verified code for all 230 synthetic results',()=>transaction(async()=>{
   assert.notEqual(STORED_INTERPRETATION_VERSION,release.interpretationVersion,'This seed proves historical v1 integrity, not native v2 parity')
   for(const definition of historicalDefinitions){
    const answers=Object.fromEntries(definition.questions.map(question=>[question.id,question.min??definition.answerScale.min]))
    const result=scoreAssessment(definition,answers,syntheticTraumaContext(definition))
    const [enriched]=await withResultInterpretations(db,[result])
    assert.deepEqual(enriched.interpretationRecords,{},definition.key+' has no approved v3 records')
    for(const locale of ['en','ru']){
     const row=stored.find(item=>item.assessment_version_id===definition.id&&item.report_locale===locale)
     assert.ok(row)
     for(const dimension of enriched.dimensions){
      assert.ok(storedInterpretationForDimension(row.payload,enriched,dimension,locale,release.interpretationVersion),'Historical receipt remains readable by explicit version')
      assert.equal(storedResultInterpretation(enriched,dimension,locale),null)
      for(const payload of [row.payload,{...row.payload,interpretationVersion:STORED_INTERPRETATION_VERSION}]){
       const stale={...enriched,interpretationRecords:{[locale]:payload}}
       assert.equal(storedResultInterpretation(stale,dimension,locale),null,'Neither old version nor relabeled old rules may reach current reports')
       assert.deepEqual(interpretationBandModel(stale,dimension,locale),interpretationBandModel(result,result.dimensions.find(part=>part.key===dimension.key),locale))
      }
      const current=interpretationBandModel(enriched,dimension,locale)
      assert.equal(current.registrySource,'code')
      assert.equal(current.interpretationVersion,INTERPRETATION_RULES_VERSION)
     }
    }
   }
   for(const definition of newDefinitions){
    const answers=Object.fromEntries(definition.questions.map(question=>[
      question.id,question.min??definition.answerScale?.min??0,
    ]))
    const result=scoreAssessment(definition,answers,syntheticTraumaContext(definition))
    const [enriched]=await withResultInterpretations(db,[result])
    assert.deepEqual(enriched.interpretationRecords,{},
      'New source forms cannot inherit a dated historical registry payload')
    for(const locale of ['en','ru'])for(const dimension of result.dimensions){
      const model=interpretationBandModel(enriched,dimension,locale)
      assert.equal(model.registrySource,'code')
      assert.equal(model.interpretationVersion,INTERPRETATION_RULES_VERSION)
    }
   }
  },'hh_app_backend'))
  await check('Actual optional-read failure is savepoint-contained and preserves the surrounding transaction',()=>transaction(async()=>{
   await db.query('ALTER TABLE app.assessment_interpretation_versions RENAME TO interpretation_registry_temporarily_absent')
   await db.query('SET LOCAL ROLE hh_app_backend')
   const definition=ASSESSMENT_DEFINITIONS[0];const answers=Object.fromEntries(definition.questions.map(question=>[question.id,question.min??definition.answerScale.min]))
   const result=scoreAssessment(definition,answers,syntheticTraumaContext(definition));const [enriched]=await withResultInterpretations(db,[result])
   assert.deepEqual(enriched.interpretationRecords,{});assert.equal((await db.query('SELECT 1 AS alive')).rows[0].alive,1)
  }))
  await check('RLS is forced and only backend SELECT is granted',async()=>{
   assert.deepEqual((await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='app.assessment_interpretation_versions'::regclass")).rows[0],{relrowsecurity:true,relforcerowsecurity:true})
   for(const role of ['anon','authenticated','interpretation_rogue_default'])await assert.rejects(transaction(()=>db.query('SELECT * FROM app.assessment_interpretation_versions'),role),errorCode('42501'))
   const policy=(await db.query("SELECT polcmd,pg_get_expr(polqual,polrelid) AS predicate FROM pg_policy WHERE polrelid='app.assessment_interpretation_versions'::regclass")).rows
   assert.deepEqual(policy,[{polcmd:'r',predicate:'true'}])
   assert.equal((await db.query("SELECT has_table_privilege('hh_app_backend','app.assessment_interpretation_versions','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS allowed")).rows[0].allowed,false)
   const functions=(await db.query("SELECT prosecdef FROM pg_proc WHERE oid IN ('app.assessment_interpretation_validate_insert()'::regprocedure,'app.assessment_interpretation_reject_mutation()'::regprocedure)")).rows
   assert.equal(functions.length,2);assert.ok(functions.every(fn=>fn.prosecdef===false))
   assert.equal(Number((await db.query("SELECT count(*) AS count FROM pg_trigger WHERE tgrelid='app.assessment_interpretation_versions'::regclass AND NOT tgisinternal AND tgenabled='O'")).rows[0].count),2)
   for(const name of ['app.assessment_interpretation_validate_insert()','app.assessment_interpretation_reject_mutation()'])assert.equal((await db.query("SELECT has_function_privilege('hh_app_backend',$1,'EXECUTE') AS allowed",[name])).rows[0].allowed,false)
  })
  const candidate=()=>{const row=structuredClone(stored[0]);row.interpretation_version='native-negative.v1';row.payload.interpretationVersion=row.interpretation_version;return row}
  const rehash=row=>{row.payload_canonical=canonicalJSON(row.payload);row.payload_sha256=digest(row.payload_canonical);return row}
  await check('Conflicts, mismatched provenance, forged hashes and malformed variants fail in native SQL',async()=>{
   await assert.rejects(transaction(()=>db.query(insertSQL,recordValues(stored[0]))),errorCode('23505'))
   // Exercise the real compact transport's statement-level atomicity as well.
   const fresh=rehash(candidate())
   const mixed=compactInterpretationInsert([fresh,stored[0]]).sql
   await assert.rejects(transaction(()=>db.query(mixed)),errorCode('23505'))
   assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions WHERE interpretation_version=$1',[fresh.interpretation_version])).rows[0].count),0)
   for(const mutate of [row=>{row.provenance.scoringVersion='incorrect';row.payload.provenance=row.provenance},row=>{row.payload.dimensions[0].variants=[null]},row=>{row.payload.dimensions[0].variants=[]},row=>{row.payload.dimensions[0].allowedValues=[99999]}]){
    const row=candidate();mutate(row);rehash(row);await assert.rejects(transaction(()=>db.query(insertSQL,recordValues(row))),errorCode('23514'))
   }
   const row=rehash(candidate());row.payload_sha256='sha256:'+'0'.repeat(64);await assert.rejects(transaction(()=>db.query(insertSQL,recordValues(row))),errorCode('23514'))
  })
  await check('UPDATE, DELETE and TRUNCATE are rejected even for native administrative SQL',async()=>{
   for(const statement of ['UPDATE app.assessment_interpretation_versions SET created_at=created_at','DELETE FROM app.assessment_interpretation_versions','TRUNCATE app.assessment_interpretation_versions'])await assert.rejects(transaction(()=>db.query(statement)),errorCode('55000'))
   await assert.rejects(transaction(()=>db.query(insertSQL,recordValues(rehash(candidate()))),'hh_app_backend'),errorCode('42501'))
  })
  await check('Source metadata/constraints/ACL/RLS remain unchanged and exactly 460 interpretation rows remain',async()=>{
   assert.deepEqual(await sourceSnapshot(db),sourceBefore)
   assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),460)
   for(const table of ['assessment_runs','assessment_results','profile_snapshots','accounts'])assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.'+table)).rows[0].count),0)
  })
  // node:test subtest failures are reflected in the parent test result. Never claim
  // success just because individual t.test promises completed.
  assert.equal(proof.checks.length,12,'Every historical v1 stage must complete before v2 SQL')
  proof.v2 = await verifyNativeV2({ t, db, root, transaction, v2Release, sourceSnapshot, sourceBefore, recordColumns })
  proof.v3 = await verifyNativeV3({ t, db, root, transaction, v3Release, sourceSnapshot, sourceBefore, recordColumns })
  proof.runtimeRegistryMode = 'approved-v3-database'
  proof.databaseParityForRuntimeVersion = proof.v3.status === 'passed'
  proof.status=proof.checks.length===12 && proof.v2.status==='passed' && proof.v3.status==='passed'?'passed':'failed'
  assert.equal(proof.status,'passed','Every native verification stage must complete')
 }catch(error){proof.status='failed';proof.error=error.message;throw error}
 finally{
  if(db)await db.end()
  await mkdir(new URL('artifacts/',root),{recursive:true})
  await writeFile(new URL('artifacts/interpretation-db-proof.json',root),JSON.stringify(proof,null,2)+'\n')
 }
})
