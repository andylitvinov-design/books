import { gunzipSync } from 'node:zlib'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {ASSESSMENT_DEFINITIONS} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import {buildAssessmentResultReport} from '../lib/assessments/result-report.js'
import {STORED_INTERPRETATION_VERSION} from '../lib/assessments/stored-interpretation.js'
import {buildAuthoredAssessmentResultReport} from '../lib/assessments/result-report-authoring.js'
import {preparedFiveBlockReport} from '../scripts/prepare-five-block-content.mjs'
import {monitoringCatalogItem} from '../data/assessments/catalog.js'
import {withInterpretationFixture} from './helpers/interpretation-fixture.mjs'
const records=JSON.parse(gunzipSync(readFileSync(new URL('../data/assessment-interpretations/'+STORED_INTERPRETATION_VERSION+'.json.gz',import.meta.url))).toString('utf8')).records

test('prepared content covers every registered instrument locale and both report languages with stable hashes',()=>{
 assert.equal(records.length,ASSESSMENT_DEFINITIONS.length*2)
 const keys=new Set()
 for(const row of records){
  assert.equal(row.payloadHash,'sha256:'+createHash('sha256').update(canonicalJSON(row.payload)).digest('hex'))
  assert.ok(!keys.has(row.definitionId+'/'+row.uiLocale));keys.add(row.definitionId+'/'+row.uiLocale)
  const d=ASSESSMENT_DEFINITIONS.find(d=>d.id===row.definitionId);assert.ok(d)
  assert.equal(row.payload.identity.contentHash,d.contentHash)
 }
 for(const d of ASSESSMENT_DEFINITIONS)for(const locale of ['en','ru']) {
  const result=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale.min])))
  assert.equal(buildAssessmentResultReport(result,locale).status,'unavailable')
  const report=buildAssessmentResultReport(withInterpretationFixture(result),locale)
  assert.equal(report.status,'available',d.key+'/'+locale);assert.equal(report.origin,'database')
  assert.equal(report.sections.length,result.dimensions.length)
 }
})

test('runtime has no authoring/source fallback and all repository transactions share one result-content boundary',()=>{
 const runtime=readFileSync(new URL('../lib/assessments/result-report.js',import.meta.url),'utf8')
 assert.doesNotMatch(runtime,/from ['"].*(result-report-authoring|result-explanations|interpretation-registry|bach-guidance)/)
 const database=readFileSync(new URL('../lib/app/database.js',import.meta.url),'utf8')
 assert.match(database,/attachDatabaseInterpretations\(client, await fn\(client\)\)/)
 const schema=readFileSync(new URL('../scripts/sql/assessment-interpretations-schema.sql',import.meta.url),'utf8')
 assert.match(schema,/force row level security/i)
 assert.match(schema,/grant select on app.assessment_interpretation_versions to hh_app_backend;/)
 assert.doesNotMatch(schema,/grant[^;]+to (anon|authenticated|hh_app_inbox)/i)
 assert.doesNotMatch(schema,/security definer/i)
})

test('server boundary and seed use real prepared content with fail-closed malformed/missing records',()=>{
 const output=execFileSync(process.execPath,['--conditions=react-server',new URL('./helpers/interpretation-db-boundary.mjs',import.meta.url).pathname],{encoding:'utf8'})
 assert.match(output,/excerpt isolation and immutable seed checks passed/)
})


test('PDF model exposes missing DB content and uses only prepared practical steps',async()=>{
 const {buildClientReport}=await import('../lib/profile/client-report.js')
 const d=ASSESSMENT_DEFINITIONS.find(row=>row.key==='cbi-personal')
 const result={...scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,2]))),id:'synthetic-cbi',measurementAt:'2026-10-12T00:00:00Z'}
 const missing=buildClientReport({results:[result]})
 assert.equal(missing.tests[0].interpretation.status,'unavailable')
 assert.match(missing.tests[0].conclusion,/Interpretation unavailable/)
 const ready=buildClientReport({results:[withInterpretationFixture(result)]})
 assert.ok(ready.recommendations.includes(ready.tests[0].interpretation.sections[0].compact.recommendation))
 const renderer=readFileSync(new URL('../lib/profile/client-report-pdf.js',import.meta.url),'utf8')
 assert.match(renderer,/test.interpretation\?\.status === 'unavailable'/)
 assert.match(renderer,/note\(test.interpretation.title,test.interpretation.note\)/)
})


test('history and next-test guidance use prepared steps only when the latest exact report is available',async()=>{
 const {practicalReflection}=await import('../lib/assessments/personal-guidance.js')
 const d=ASSESSMENT_DEFINITIONS.find(row=>row.key==='cbi-personal')
 const result={...scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,2]))),id:'synthetic-latest',measurementAt:'2026-10-12T00:00:00Z'}
 assert.equal(practicalReflection([result]),'')
 const ready=withInterpretationFixture(result)
 assert.equal(practicalReflection([ready]),buildAssessmentResultReport(ready).sections[0].compact.recommendation)
})


test('stored typology rules preserve the reviewed hypotheses, ties, alternatives and evidence limits',async()=>{
 const {PERSONALITY_TYPE_DEFINITIONS}=await import('../data/assessments/personality-types-original-2026.js')
 const {personalityTypeHypothesis}=await import('../lib/assessments/personality-type-interpretation.js')
 let state=173
 const next=()=>{state=(state*16807)%2147483647;return state/2147483647}
 for(const d of PERSONALITY_TYPE_DEFINITIONS){
  const sample=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale.min])))
  for(let i=0;i<160;i++)for(const locale of ['en','ru']){
   const result={...sample,dimensions:sample.dimensions.map(x=>({...x,value:i===0?x.min:i===1?x.max:x.min+Math.floor(next()*(x.max-x.min+1))}))}
   const report=buildAssessmentResultReport(withInterpretationFixture(result),locale)
   assert.equal(report.status,'available',d.key)
   assert.deepEqual(report.personalityType,personalityTypeHypothesis(result,locale),d.key+'/'+locale+'/'+i)
   assert.ok(report.methodology)
   assert.ok(report.sections.every(s=>s.explanation&&s.steps.length>=2))
  }
 }
})


test('required typology payload cannot silently omit or corrupt its stored rules',async()=>{
 const {resolveStoredInterpretation}=await import('../lib/assessments/stored-interpretation.js')
 for(const key of ['hh-socionics-32','hh-disc-style-20']) {
  const d=ASSESSMENT_DEFINITIONS.find(row=>row.key===key), result=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,q.min??d.answerScale.min])))
  const row=records.find(row=>row.definitionId===d.id&&row.uiLocale==='en')
  for(const mutate of [p=>{delete p.requiresType;delete p.typeRules},p=>{p.requiresType=false;p.typeRules=null},p=>{p.typeRules.nearDifference=9},p=>{p.typeRules.warning=''},p=>{p.typeRules.prefix='wrong'},p=>{if(p.typeRules.kind==='socionics')p.typeRules.pairs=[];else p.typeRules.labels={}}]){
   const payload=structuredClone(row.payload);mutate(payload)
   assert.equal(resolveStoredInterpretation(result,payload,'en',row.payloadHash).status,'unavailable',key)
  }
 }
})

test('offline release SQL is exact, insert-only, hash-checked and has no client writes',async()=>{
 const {interpretationSeedSql}=await import('../scripts/prepare-assessment-interpretation-sql.mjs')
 const sql=interpretationSeedSql(records.slice(0,2))
 assert.match(sql,/^begin;/);assert.match(sql,/commit;\n$/)
 assert.match(sql,/encode\(sha256\(convert_to/)
 assert.match(sql,/registered.definition is distinct from d/)
 assert.match(sql,/IMMUTABLE_INTERPRETATION_CONFLICT/)
 assert.doesNotMatch(sql,/\b(update|delete from|insert into app\.(results|answers|accounts|assessment_versions))\b/i)
 assert.throws(()=>interpretationSeedSql([records[0],records[0]]),/DUPLICATE/)
 const altered=structuredClone(records[0]);altered.payload.report.title='Changed'
 assert.throws(()=>interpretationSeedSql([altered]),/INVALID_INTERPRETATION_RECORD/)
})


test('Bach prepared reports expose exact verified range bounds for course adapters',()=>{
 for(const d of ASSESSMENT_DEFINITIONS.filter(row=>row.key==='hh-bach-flower-profile'))for(const value of [0,1]){
  const answers=Object.fromEntries(d.questions.map(q=>[q.id,value?(q.max??d.answerScale.max):(q.min??d.answerScale.min)]))
  const result=scoreAssessment(d,answers)
  for(const locale of ['en','ru']){
   const report=buildAssessmentResultReport(withInterpretationFixture(result),locale)
   assert.equal(report.status,'available')
   for(const section of report.sections){
    const dimension=result.dimensions.find(row=>row.key===section.key)
    assert.equal(section.min,dimension.min)
    assert.equal(section.max,dimension.max)
    assert.equal(section.value,dimension.value)
   }
  }
 }
})


test('MHC-SF About purpose preserves initials and the complete reviewed explanation in preparation and runtime',()=>{
 const d=ASSESSMENT_DEFINITIONS.find(row=>row.key==='mhc-sf')
 const result=scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,0])))
 for(const locale of ['en','ru']) {
  const expected=monitoringCatalogItem('mhc-sf').description[locale]
  const authored=buildAuthoredAssessmentResultReport(result,locale)
  assert.equal(authored.purpose,expected)
  assert.equal(preparedFiveBlockReport(d,authored,locale).about.purpose,expected)
  assert.equal(buildAssessmentResultReport(withInterpretationFixture(result),locale).presentation.about.purpose,expected)
  assert.match(expected,locale==='en'?/Corey L\. M\. Keyes.*14-item.*Past-month emotional, social and psychological wellbeing/:/Кори Л\. М\. Киза.*14 английских.*Эмоциональное, социальное и психологическое благополучие/)
 }
})

test('new immutable content version preserves every v2 payload field except the two reviewed MHC purposes',()=>{
 const bytes=readFileSync(new URL('../data/assessment-interpretations/2026-10-12.v2.json.gz',import.meta.url))
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'2eb5622ba136dcb33f9110b3dbe87c2b7df4d89634b83aad4e95563ab9975796')
 const previous=JSON.parse(gunzipSync(bytes)).records
 assert.equal(STORED_INTERPRETATION_VERSION,'2026-10-13.v1')
 assert.equal(previous.length,records.length)
 let purposes=0
 for(let i=0;i<records.length;i++) {
  const row=records[i],old=previous[i],expected=structuredClone(old.payload)
  assert.equal(row.definitionId,old.definitionId)
  assert.equal(row.uiLocale,old.uiLocale)
  assert.equal(row.interpretationVersion,STORED_INTERPRETATION_VERSION)
  expected.interpretationVersion=STORED_INTERPRETATION_VERSION
  if(expected.identity.definitionKey==='mhc-sf') {
   assert.notEqual(expected.report.presentation.about.purpose,expected.report.purpose)
   expected.report.presentation.about.purpose=expected.report.purpose
   purposes++
  }
  assert.deepEqual(row.payload,expected,row.definitionId+'/'+row.uiLocale)
  assert.equal(row.payloadHash,'sha256:'+createHash('sha256').update(canonicalJSON(row.payload)).digest('hex'))
 }
 assert.equal(purposes,2)
})
