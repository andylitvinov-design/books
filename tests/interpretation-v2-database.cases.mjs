/** Runs after all historical v1 checks on the SAME fresh isolated PostgreSQL17 service.
 * No connection constructor, transport override, schema change or production destination. */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile, access } from 'node:fs/promises'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { storedInterpretationForDimension } from '../lib/assessments/interpretation-storage.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel, INTERPRETATION_RULES_VERSION } from '../lib/assessments/interpretation-registry.js'
import { STORED_INTERPRETATION_VERSION, storedResultInterpretation } from '../lib/assessments/interpretation-resolution.js'
import { validInterpretationRecord, loadInterpretationRecord, interpretationRecordApprovalKey } from '../lib/assessments/interpretation-record-integrity.js'
import { withResultInterpretations, RESULT_INTERPRETATION_LIMITS } from '../lib/app/result-interpretations.js'
import { compactLexicalInsert } from '../scripts/compact-interpretation-v2-sql.mjs'
import { validateInterpretationRelease, INTERPRETATION_V2_SEED_PATH } from './helpers/interpretation-db-isolation.mjs'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
const digest=bytes=>'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')
const code=expected=>error=>error?.code===expected
const semantic=model=>Object.fromEntries(Object.entries(model).filter(([key])=>!['registrySource','interpretationVersion','interpretationSourceCommit'].includes(key)))
const identity=row=>({definitionId:row.assessment_version_id,contentHash:row.definition_content_hash,interpretationVersion:row.interpretation_version,reportLocale:row.report_locale})
export async function validateNativeV2Release(root, approvedDigests) {
 const release=JSON.parse(await readFile(new URL('data/assessments/interpretation-registry-release-v2.json',root),'utf8'))
 assert.equal(release.interpretationVersion,'2026-10-17.v2')
 assert.equal(release.rulesEngineVersion,'2026-10-17.v12')
 assert.equal(release.sourceCommit,'040b45e9a641f2c55b953e4cc6627f57f64f2caa')
 assert.equal(release.encoding,'canonical-json-sentence-fragments.v1')
 const seedExists=await access(new URL(INTERPRETATION_V2_SEED_PATH,root)).then(()=>true,()=>false)
 const gate=validateInterpretationRelease(release,approvedDigests,{seedExists})
 assert.equal(gate.pending,false);assert.equal(Object.keys(approvedDigests).length,1380)
 return {...release,approvedDigests:gate.approvedDigests}
}
export async function verifyNativeV2({t,db,root,transaction,v2Release,sourceSnapshot,sourceBefore,recordColumns}) {
 const proof={status:'running',engine:'native PostgreSQL17',sourceCommit:v2Release.sourceCommit,interpretationVersion:v2Release.interpretationVersion,rulesVersion:'2026-10-17.v12',recordCount:460,totalHistoricalAndCurrentRecords:920,checks:[]}
 const check=async(name,fn)=>{await t.test('V2: '+name,async()=>{await fn();proof.checks.push(name)})}
 const legacySnapshot=async()=> (await db.query("SELECT md5(jsonb_agg(to_jsonb(v) ORDER BY assessment_version_id, interpretation_version, report_locale)::text) AS hash FROM app.assessment_interpretation_versions v WHERE interpretation_version='2026-10-17.v1'")).rows[0].hash
 const legacyBefore=await legacySnapshot()
 let stored=[]
 await check('exact SHA-pinned INSERT-only v2 seed extends460 to920 without changing historical bytes',async()=>{
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),460)
  const seed=await readFile(new URL(INTERPRETATION_V2_SEED_PATH,root),'utf8');assert.equal(digest(seed),v2Release.seedSha256)
  assert.ok(Buffer.byteLength(seed)<=12*1024*1024)
  await db.query(seed)
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),920)
  assert.equal(await legacySnapshot(),legacyBefore)
  proof.seedSha256=digest(seed)
 })
 await check('exact230×2 v2 coverage, canonical bytes, v12 provenance and approved digests',async()=>{
  stored=(await db.query(`SELECT ${recordColumns.join(',')} FROM app.assessment_interpretation_versions WHERE interpretation_version=$1 ORDER BY assessment_version_id,report_locale`,[v2Release.interpretationVersion])).rows
  assert.equal(stored.length,460);assert.equal(stored.filter(r=>r.payload.catalogActive).length,440)
  const keys=[]
  for(const row of stored){
   const id=identity(row),key=interpretationRecordApprovalKey(id);keys.push(key)
   assert.equal(validInterpretationRecord(row,id),true);assert.equal(row.payload_canonical,canonicalJSON(row.payload))
   assert.equal(row.payload_sha256,v2Release.approvedDigests[key]);assert.equal(row.source_commit,v2Release.sourceCommit)
   assert.equal(row.rules_engine_version,'2026-10-17.v12')
  }
  assert.equal(new Set(keys).size,460);assert.deepEqual(keys.sort(),Object.keys(v2Release.approvedDigests).sort())
 })
 await check('historical v2 loader and explicit renderer cover33100 points; stale prose cannot reach current v3',()=>transaction(async()=>{
  let checks=0
  for(const row of stored){
   const definition=ASSESSMENT_DEFINITIONS.find(d=>d.id===row.assessment_version_id)
   const baseline=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min])),syntheticTraumaContext(definition))
   const payload=await loadInterpretationRecord(db,identity(row));assert.deepEqual(payload,row.payload)
   for(const spec of payload.dimensions)for(const value of spec.allowedValues){
    const dimension={...baseline.dimensions.find(d=>d.key===spec.signature.key),value}
    const result={...baseline,dimensions:baseline.dimensions.map(d=>d.key===dimension.key?dimension:d)}
    const enriched={...result,interpretationRecords:{[row.report_locale]:payload}}
    const model=storedInterpretationForDimension(payload,result,dimension,row.report_locale,v2Release.interpretationVersion)
    assert.ok(model,'Historical v2 receipt remains readable by explicit version')
    assert.equal(storedResultInterpretation(enriched,dimension,row.report_locale),null)
    assert.deepEqual(interpretationBandModel(enriched,dimension,row.report_locale),interpretationBandModel(result,dimension,row.report_locale))
    checks++
   }
   const stale={...baseline,interpretationRecords:{[row.report_locale]:{...payload,rulesEngineVersion:'2026-10-17.v11'}}}
   assert.equal(storedResultInterpretation(stale,stale.dimensions[0],row.report_locale),null)
  }
  assert.equal(checks,33100);proof.historicalFiniteDomainReadChecks=checks;proof.databaseParityForRuntimeVersion=false
 },'hh_app_backend'))
 await check('current v3 result projection never substitutes historical v2 rows',()=>transaction(async()=>{
  for(const definition of ASSESSMENT_DEFINITIONS){
   const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min])),syntheticTraumaContext(definition))
   const [enriched]=await withResultInterpretations(db,[result]);assert.deepEqual(enriched.interpretationRecords,{})
   for(const dimension of enriched.dimensions)for(const locale of ['en','ru'])assert.equal(storedResultInterpretation(enriched,dimension,locale),null)
  }
 },'hh_app_backend'))
 const rehash=row=>{row.payload_canonical=canonicalJSON(row.payload);row.payload_sha256=digest(row.payload_canonical);return row}
 const candidate=()=>{const row=structuredClone(stored[0]);row.interpretation_version='native-v2-negative.v1';row.payload.interpretationVersion=row.interpretation_version;return rehash(row)}
 await check('v2 transport conflicts are atomic and bad provenance/hash/variants fail in native SQL',async()=>{
  await assert.rejects(transaction(()=>db.query(compactLexicalInsert([stored[0]]))),code('23505'))
  const fresh=candidate();await assert.rejects(transaction(()=>db.query(compactLexicalInsert([fresh,stored[0]]))),code('23505'))
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions WHERE interpretation_version=$1',[fresh.interpretation_version])).rows[0].count),0)
  for(const mutate of [r=>{r.provenance.scoringVersion='incorrect';r.payload.provenance=r.provenance},r=>{r.payload.dimensions[0].variants=[null]},r=>{r.payload.dimensions[0].allowedValues=[99999]}]){
   const row=candidate();mutate(row);rehash(row);await assert.rejects(transaction(()=>db.query(compactLexicalInsert([row]))),code('23514'))
  }
  const row=candidate();const sql=compactLexicalInsert([row]);const bad=sql.replace(row.payload_sha256,'sha256:'+'0'.repeat(64));assert.notEqual(bad,sql)
  await assert.rejects(transaction(()=>db.query(bad)),code('23514'))
 })
 await check('v2 preserves backend-only read access, administrative immutability and optional-read isolation',async()=>{
  for(const role of ['anon','authenticated','interpretation_rogue_default'])await assert.rejects(transaction(()=>db.query("SELECT payload FROM app.assessment_interpretation_versions WHERE interpretation_version='2026-10-17.v2'"),role),code('42501'))
  await assert.rejects(transaction(()=>db.query(compactLexicalInsert([candidate()])),'hh_app_backend'),code('42501'))
  for(const sql of ["UPDATE app.assessment_interpretation_versions SET created_at=created_at WHERE interpretation_version='2026-10-17.v2'","DELETE FROM app.assessment_interpretation_versions WHERE interpretation_version='2026-10-17.v2'",'TRUNCATE app.assessment_interpretation_versions'])await assert.rejects(transaction(()=>db.query(sql)),code('55000'))
  await transaction(async()=>{await db.query('ALTER TABLE app.assessment_interpretation_versions RENAME TO interpretation_registry_temporarily_absent');await db.query('SET LOCAL ROLE hh_app_backend');const definition=ASSESSMENT_DEFINITIONS[0];const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min])),syntheticTraumaContext(definition));const [enriched]=await withResultInterpretations(db,[result]);assert.deepEqual(enriched.interpretationRecords,{});assert.equal((await db.query('SELECT 1 AS alive')).rows[0].alive,1)})
 })
 await check('all920 rows and old460 receipts remain exact; technical definitions/security and empty client fixtures are unchanged',async()=>{
  assert.equal(await legacySnapshot(),legacyBefore);assert.deepEqual(await sourceSnapshot(db),sourceBefore)
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),920)
  const mismatch=(await db.query("SELECT count(*) AS count FROM app.assessment_interpretation_versions WHERE payload_canonical::jsonb IS DISTINCT FROM payload OR payload_sha256 IS DISTINCT FROM 'sha256:'||encode(sha256(convert_to(payload_canonical,'UTF8')),'hex')")).rows[0].count;assert.equal(Number(mismatch),0)
  for(const table of ['assessment_runs','assessment_results','profile_snapshots','accounts'])assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.'+table)).rows[0].count),0)
 })
 assert.equal(proof.checks.length,7,'Every v2 stage must complete');proof.status='passed';return proof
}
