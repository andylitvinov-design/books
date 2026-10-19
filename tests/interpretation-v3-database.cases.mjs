/** Runs after all historical v1 and v2 checks on the SAME fresh isolated PostgreSQL17 service.
 * No connection constructor, transport override, schema change or production destination. */
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile, access } from 'node:fs/promises'
import { ASSESSMENT_DEFINITIONS } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { interpretationBandModel, INTERPRETATION_RULES_VERSION } from '../lib/assessments/interpretation-registry.js'
import { STORED_INTERPRETATION_VERSION, storedResultInterpretation } from '../lib/assessments/interpretation-resolution.js'
import { validInterpretationRecord, loadInterpretationRecord, interpretationRecordApprovalKey } from '../lib/assessments/interpretation-record-integrity.js'
import { withResultInterpretations, RESULT_INTERPRETATION_LIMITS } from '../lib/app/result-interpretations.js'
import { compactLexicalInsert } from '../scripts/compact-interpretation-v2-sql.mjs'
import { validateInterpretationRelease, INTERPRETATION_V3_SEED_PATH } from './helpers/interpretation-db-isolation.mjs'
import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import { historicalInterpretationCoverage } from './helpers/historical-interpretation-coverage.mjs'
const digest=bytes=>'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')
const code=expected=>error=>error?.code===expected
const semantic=model=>Object.fromEntries(Object.entries(model).filter(([key])=>!['registrySource','interpretationVersion','interpretationSourceCommit'].includes(key)))
const identity=row=>({definitionId:row.assessment_version_id,contentHash:row.definition_content_hash,interpretationVersion:row.interpretation_version,reportLocale:row.report_locale})
export async function validateNativeV3Release(root, approvedDigests) {
 const release=JSON.parse(await readFile(new URL('data/assessments/interpretation-registry-release-v3.json',root),'utf8'))
 assert.equal(release.interpretationVersion,STORED_INTERPRETATION_VERSION)
 assert.equal(release.rulesEngineVersion,INTERPRETATION_RULES_VERSION)
 assert.equal(release.sourceCommit,'484a9a1c9d4b8f68639930ef6e6b19348889ffa8')
 assert.equal(release.encoding,'canonical-json-sentence-fragments.v1')
 const seedExists=await access(new URL(INTERPRETATION_V3_SEED_PATH,root)).then(()=>true,()=>false)
 const gate=validateInterpretationRelease(release,approvedDigests,{seedExists})
 assert.equal(gate.pending,false);assert.equal(Object.keys(approvedDigests).length,1380)
 return {...release,approvedDigests:gate.approvedDigests}
}
export async function verifyNativeV3({t,db,root,transaction,v3Release,sourceSnapshot,sourceBefore,recordColumns}) {
 // Current library may contain additional immutable source forms that did not
 // exist when these approved 2026-10-17 v3 receipts were sealed. Do not
 // synthesize historical database interpretations for those newer definitions.
 const {historical:historicalDefinitions,newer:newDefinitions,approvedRowCount}=
   historicalInterpretationCoverage(ASSESSMENT_DEFINITIONS,v3Release.approvedDigests,v3Release.interpretationVersion)
 assert.equal(approvedRowCount,v3Release.recordCount)
 const proof={status:'running',engine:'native PostgreSQL17',sourceCommit:v3Release.sourceCommit,interpretationVersion:v3Release.interpretationVersion,rulesVersion:INTERPRETATION_RULES_VERSION,recordCount:460,totalHistoricalAndCurrentRecords:1380,checks:[]}
 const check=async(name,fn)=>{await t.test('V3: '+name,async()=>{await fn();proof.checks.push(name)})}
 const legacySnapshot=async()=> (await db.query("SELECT md5(jsonb_agg(to_jsonb(v) ORDER BY assessment_version_id, interpretation_version, report_locale)::text) AS hash FROM app.assessment_interpretation_versions v WHERE interpretation_version<>'2026-10-17.v3'")).rows[0].hash
 const legacyBefore=await legacySnapshot()
 let stored=[]
 await check('exact SHA-pinned INSERT-only v3 seed extends920 to1380 without changing historical bytes',async()=>{
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),920)
  const seed=await readFile(new URL(INTERPRETATION_V3_SEED_PATH,root),'utf8');assert.equal(digest(seed),v3Release.seedSha256)
  assert.ok(Buffer.byteLength(seed)<=12*1024*1024)
  await db.query(seed)
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),1380)
  assert.equal(await legacySnapshot(),legacyBefore)
  proof.seedSha256=digest(seed)
 })
 await check('exact230×2 v3 coverage, canonical bytes, v13 provenance and approved digests',async()=>{
  stored=(await db.query(`SELECT ${recordColumns.join(',')} FROM app.assessment_interpretation_versions WHERE interpretation_version=$1 ORDER BY assessment_version_id,report_locale`,[v3Release.interpretationVersion])).rows
  assert.equal(stored.length,460);assert.equal(stored.filter(r=>r.payload.catalogActive).length,440)
  const keys=[]
  for(const row of stored){
   const id=identity(row),key=interpretationRecordApprovalKey(id);keys.push(key)
   assert.equal(validInterpretationRecord(row,id),true);assert.equal(row.payload_canonical,canonicalJSON(row.payload))
   assert.equal(row.payload_sha256,v3Release.approvedDigests[key]);assert.equal(row.source_commit,v3Release.sourceCommit)
   assert.equal(row.rules_engine_version,INTERPRETATION_RULES_VERSION)
  }
  assert.equal(new Set(keys).size,460);assert.deepEqual(keys.sort(),Object.keys(v3Release.approvedDigests).sort())
 })
 await check('normal backend loader and stored renderer match current code at all33100 score/locale points',()=>transaction(async()=>{
  let checks=0
  for(const row of stored){
   const definition=ASSESSMENT_DEFINITIONS.find(d=>d.id===row.assessment_version_id)
   const baseline=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min])),syntheticTraumaContext(definition))
   const payload=await loadInterpretationRecord(db,identity(row));assert.deepEqual(payload,row.payload)
   for(const spec of payload.dimensions)for(const value of spec.allowedValues){
    const dimension={...baseline.dimensions.find(d=>d.key===spec.signature.key),value}
    const result={...baseline,dimensions:baseline.dimensions.map(d=>d.key===dimension.key?dimension:d)}
    const enriched={...result,interpretationRecords:{[row.report_locale]:payload}}
    const model=interpretationBandModel(enriched,dimension,row.report_locale)
    assert.equal(model.registrySource,'database');assert.equal(model.interpretationVersion,STORED_INTERPRETATION_VERSION)
    assert.deepEqual(semantic(model),semantic(interpretationBandModel(result,dimension,row.report_locale)))
    checks++
   }
   const stale={...baseline,interpretationRecords:{[row.report_locale]:{...payload,rulesEngineVersion:'2026-10-17.v11'}}}
   assert.equal(storedResultInterpretation(stale,stale.dimensions[0],row.report_locale),null)
  }
  assert.equal(checks,33100);proof.finiteDomainParityChecks=checks
 },'hh_app_backend'))
 await check('real response projection preserves both locales and32-read/512KiB caps for synthetic results and history',()=>transaction(async()=>{
  const low=[];let maxBytes=0
  for(const definition of historicalDefinitions)for(const endpoint of ['min','max']){
   const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q[endpoint]??definition.answerScale[endpoint]])),syntheticTraumaContext(definition))
   if(endpoint==='min')low.push(result)
   const [enriched]=await withResultInterpretations(db,[result]);assert.deepEqual(Object.keys(enriched.interpretationRecords).sort(),['en','ru'])
   const bytes=Object.values(enriched.interpretationRecords).reduce((sum,p)=>sum+Buffer.byteLength(JSON.stringify(p)),0)
   assert.ok(bytes<=RESULT_INTERPRETATION_LIMITS.responseBytes);maxBytes=Math.max(maxBytes,bytes)
   for(const locale of ['en','ru'])for(const dimension of enriched.dimensions){assert.equal(interpretationBandModel(enriched,dimension,locale).registrySource,'database')}
  }
  // Newer registered tests have valid code-level explanations but **no**
  // approved historical v3 database receipt. This is an intentional fallback,
  // not a failed source hash or an invitation to backfill a signed release.
  for(const definition of newDefinitions){
   const answers=Object.fromEntries(definition.questions.map(question=>[
     question.id,question.min??definition.answerScale?.min??0,
   ]))
   const result=scoreAssessment(definition,answers,syntheticTraumaContext(definition))
   const [enriched]=await withResultInterpretations(db,[result])
   assert.deepEqual(enriched.interpretationRecords,{})
   for(const locale of ['en','ru'])for(const dimension of enriched.dimensions){
    assert.equal(interpretationBandModel(enriched,dimension,locale).registrySource,'code')
   }
  }
  let reads=0;const tracked={query(sql,params){if(sql.startsWith('SELECT assessment_version_id,'))reads++;return db.query(sql,params)}}
  const history=await withResultInterpretations(tracked,low);assert.equal(history.length,historicalDefinitions.length)
  let bytes=0,locales=0;for(let i=0;i<history.length;i++){const {interpretationRecords,...original}=history[i];assert.deepEqual(original,low[i]);for(const payload of Object.values(interpretationRecords)){bytes+=Buffer.byteLength(JSON.stringify(payload));locales++}}
  assert.ok(reads<=32);assert.ok(bytes<=512*1024);assert.ok(locales>0)
  proof.projection={syntheticResults:historicalDefinitions.length*2,codeFallbackDefinitions:newDefinitions.length,maxPairBytes:maxBytes,historyReads:reads,historyBytes:bytes}
 },'hh_app_backend'))
 const rehash=row=>{row.payload_canonical=canonicalJSON(row.payload);row.payload_sha256=digest(row.payload_canonical);return row}
 const candidate=()=>{const row=structuredClone(stored[0]);row.interpretation_version='native-v3-negative.v1';row.payload.interpretationVersion=row.interpretation_version;return rehash(row)}
 await check('v3 transport conflicts are atomic and bad provenance/hash/variants fail in native SQL',async()=>{
  await assert.rejects(transaction(()=>db.query(compactLexicalInsert([stored[0]]))),code('23505'))
  const fresh=candidate();await assert.rejects(transaction(()=>db.query(compactLexicalInsert([fresh,stored[0]]))),code('23505'))
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions WHERE interpretation_version=$1',[fresh.interpretation_version])).rows[0].count),0)
  for(const mutate of [r=>{r.provenance.scoringVersion='incorrect';r.payload.provenance=r.provenance},r=>{r.payload.dimensions[0].variants=[null]},r=>{r.payload.dimensions[0].allowedValues=[99999]}]){
   const row=candidate();mutate(row);rehash(row);await assert.rejects(transaction(()=>db.query(compactLexicalInsert([row]))),code('23514'))
  }
  const row=candidate();const sql=compactLexicalInsert([row]);const bad=sql.replace(row.payload_sha256,'sha256:'+'0'.repeat(64));assert.notEqual(bad,sql)
  await assert.rejects(transaction(()=>db.query(bad)),code('23514'))
 })
 await check('v3 preserves backend-only read access, administrative immutability and optional-read isolation',async()=>{
  for(const role of ['anon','authenticated','interpretation_rogue_default'])await assert.rejects(transaction(()=>db.query("SELECT payload FROM app.assessment_interpretation_versions WHERE interpretation_version='2026-10-17.v3'"),role),code('42501'))
  await assert.rejects(transaction(()=>db.query(compactLexicalInsert([candidate()])),'hh_app_backend'),code('42501'))
  for(const sql of ["UPDATE app.assessment_interpretation_versions SET created_at=created_at WHERE interpretation_version='2026-10-17.v3'","DELETE FROM app.assessment_interpretation_versions WHERE interpretation_version='2026-10-17.v3'",'TRUNCATE app.assessment_interpretation_versions'])await assert.rejects(transaction(()=>db.query(sql)),code('55000'))
  await transaction(async()=>{await db.query('ALTER TABLE app.assessment_interpretation_versions RENAME TO interpretation_registry_temporarily_absent');await db.query('SET LOCAL ROLE hh_app_backend');const definition=ASSESSMENT_DEFINITIONS[0];const result=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min])),syntheticTraumaContext(definition));const [enriched]=await withResultInterpretations(db,[result]);assert.deepEqual(enriched.interpretationRecords,{});assert.equal((await db.query('SELECT 1 AS alive')).rows[0].alive,1)})
 })
 await check('all1380 rows and old920 receipts remain exact; technical definitions/security and empty client fixtures are unchanged',async()=>{
  assert.equal(await legacySnapshot(),legacyBefore);assert.deepEqual(await sourceSnapshot(db),sourceBefore)
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.assessment_interpretation_versions')).rows[0].count),1380)
  const mismatch=(await db.query("SELECT count(*) AS count FROM app.assessment_interpretation_versions WHERE payload_canonical::jsonb IS DISTINCT FROM payload OR payload_sha256 IS DISTINCT FROM 'sha256:'||encode(sha256(convert_to(payload_canonical,'UTF8')),'hex')")).rows[0].count;assert.equal(Number(mismatch),0)
  for(const table of ['assessment_runs','assessment_results','profile_snapshots','accounts'])assert.equal(Number((await db.query('SELECT count(*) AS count FROM app.'+table)).rows[0].count),0)
 })
 assert.equal(proof.checks.length,7,'Every v3 stage must complete');proof.status='passed';return proof
}
