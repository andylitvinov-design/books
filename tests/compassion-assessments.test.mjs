import { syntheticTraumaContext } from './helpers/trauma-context-fixtures.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { COMPASSION_DEFINITIONS as defs } from '../data/assessments/compassion-2026.js'
import { ASSESSMENT_DEFINITIONS, getAssessmentDefinition, validateAnswers } from '../lib/assessments/definitions.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { MONITORING_CATALOG } from '../data/assessments/catalog.js'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { interpretationForDimension, interpretationPlan } from '../lib/assessments/interpretation-registry.js'

// Independent fixtures transcribed from official sheets, pp. 2–3 (2026-10-12).
// Expected values/maps are not obtained from the implementation's scoring config.
const fixtures = [
  {key:'scs-sf',prefix:'scs_sf',count:12,id:'c2506513-5f3c-599f-a790-506411bc2c05',
    hash:'sha256:3275b6aaaa19c8f52a2f892ac94384626984d50f561f404fda9cbee3d912503f',
    reverse:[1,4,8,9,11,12],groups:[[1,2,3,4,5,6,7,8,9,10,11,12]],
    mixed:[1,2,3,4,5,1,2,3,4,5,1,2],expected:[3.25],uniformMin:[3],uniformMax:[3]},
  {key:'compassion-scale',prefix:'cs',count:16,id:'a5cb84ed-75bd-59e0-adba-64bfa1626cca',
    hash:'sha256:0b77d1eb4e39a6a91eb461447dbec57c4b879ecff2c20e80eec36dd2e04578bb',
    reverse:[3,7,11,15],groups:[[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],[2,6,10,14],[4,8,12,16],[1,5,9,13],[3,7,11,15]],
    mixed:[1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1],expected:[3,3,2.5,3.25,3.25],uniformMin:[2,1,1,1,5],uniformMax:[4,5,5,5,1]},
]
const answers=(f,values)=>Object.fromEntries(values.map((v,i)=>[`${f.prefix}.${String(i+1).padStart(2,'0')}`,v]))
const values=(d,a)=>scoreAssessment(d,a, syntheticTraumaContext(d)).dimensions.map(x=>x.value)
const numbers=ids=>ids.map(id=>Number(id.split('.').at(-1)))

for(const f of fixtures){
 const d=getAssessmentDefinition(f.key,'v1','en')
 test(`${f.key}: exact immutable identity, source item count/order, anchors and source key`,()=>{
  assert.equal(d.questions.length,f.count)
  assert.equal(d.id,f.id)
  assert.equal(d.contentHash,f.hash)
  const {contentHash,...body}=d
  assert.equal('sha256:'+createHash('sha256').update(canonicalJSON(body)).digest('hex'),contentHash)
  assert.ok(Object.isFrozen(d) && Object.isFrozen(d.questions[0]) && Object.isFrozen(d.scoring.dimensions))
  assert.deepEqual(d.questions.map(q=>q.id),Object.keys(answers(f,Array(f.count).fill(3))))
  assert.deepEqual(d.scoring.dimensions.map(s=>numbers(s.items)),f.groups)
  assert.deepEqual(numbers(d.scoring.dimensions[0].reverseItems),f.reverse)
  assert.deepEqual(d.responseAnchors,['Almost never','2','3','4','Almost always'])
  assert.deepEqual(d.answerScale,{min:1,max:5})
  assert.match(d.instructions,/Please read each statement carefully before answering/)
  assert.equal(d.instrumentLocale,'en')
  assert.throws(()=>getAssessmentDefinition(f.key,'v1','ru'),/UNKNOWN_INSTRUMENT/)
  assert.equal(ASSESSMENT_DEFINITIONS.filter(x=>x.key===f.key).length,1)
  assert.ok(d.source.permissionUrl.endsWith('#page=1') && d.source.scoringUrl.endsWith('#page=3'))
 })
 test(`${f.key}: independent keyed minima/maxima, uniform and mixed responses`,()=>{
  const high=Array.from({length:f.count},(_,i)=>f.reverse.includes(i+1)?1:5)
  const low=high.map(v=>6-v)
  assert.deepEqual(values(d,answers(f,high)),f.groups.map(()=>5))
  assert.deepEqual(values(d,answers(f,low)),f.groups.map(()=>1))
  assert.deepEqual(values(d,answers(f,Array(f.count).fill(1))),f.uniformMin)
  assert.deepEqual(values(d,answers(f,Array(f.count).fill(5))),f.uniformMax)
  assert.deepEqual(values(d,answers(f,f.mixed)),f.expected)
  // Every single keyed item moves each source-defined mean in the expected direction.
  for(let n=1;n<=f.count;n++){
   const a=Array(f.count).fill(3);a[n-1]=5
   const expected=f.groups.map(group=>Math.round((3+(group.includes(n)?(f.reverse.includes(n)?-2:2)/group.length:0))*100)/100)
   assert.deepEqual(values(d,answers(f,a)),expected,`item ${n}`)
  }
 })
 test(`${f.key}: missing and invalid answers never produce a score`,()=>{
  const complete=answers(f,Array(f.count).fill(3))
  for(const q of d.questions){
   const missing={...complete};delete missing[q.id]
   assert.throws(()=>scoreAssessment(d,missing, syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
   assert.throws(()=>scoreAssessment(d,{...complete,[q.id]:null}, syntheticTraumaContext(d)),/REQUIRED_ANSWER/)
   assert.equal(Object.keys(validateAnswers(d,missing,{requireComplete:false})).length,f.count-1)
   for(const bad of [0,6,-1,2.5,'3',NaN,Infinity])assert.throws(()=>scoreAssessment(d,{...complete,[q.id]:bad}, syntheticTraumaContext(d)),/INVALID_ANSWER/)
  }
  assert.throws(()=>scoreAssessment(d,{...complete,unexpected:3}, syntheticTraumaContext(d)))
 })
 test(`${f.key}: EN/RU reports and guides are complete, directional, continuous and source-linked`,()=>{
  for(const locale of ['en','ru'])for(const n of [1,3,5]){
   const result=scoreAssessment(d,answers(f,Array(f.count).fill(n)), syntheticTraumaContext(d))
   const report=buildAssessmentResultReport(result,locale),guide=getTestScaleGuide(d.key,locale)
   assert.equal(report.sections.length,f.groups.length)
   assert.equal(guide.scales.length,f.groups.length)
   assert.equal(guide.instrumentLanguage,'en')
   assert.ok(guide.scales.every(s=>s.axis===(f.key==='scs-sf'?'self_support':'relationships')))
   for(const section of report.sections){
    assert.equal(section.bandBasis,'descriptive')
    assert.equal(section.source,d.source.scoringUrl)
    assert.equal(section.band,locale==='ru'?'Среднее ответов (1–5)':'Response mean (1–5)')
    assert.ok(section.steps.length>=2 && section.steps.every(s=>s.length>25))
    assert.match(section.meaning,locale==='ru'?/не диагноз/:/not a diagnosis/)
    assert.match(section.meaning,locale==='ru'?/английский оригинал/:/English original/)
    assert.doesNotMatch(section.meaning,/lower part|middle part|upper part|clinical category/)
   }
   assert.ok(interpretationPlan(f.key,'v1'))
   assert.equal(interpretationPlan(f.key,'v2'),null)
   assert.notEqual(interpretationForDimension({...result,definitionVersion:'v2'},result.dimensions[0],locale).code,'continuous')
   if(f.key==='scs-sf')assert.match(report.sections[0].meaning,locale==='ru'?/ненадёжности/:/unreliable/)
   else {
    assert.match(report.sections.at(-1).meaning,locale==='ru'?/МЕНЬШЕ безразличия/:/LESS indifference/)
    assert.match(report.sections.at(-1).construct,locale==='ru'?/обратный балл/:/reverse-scored/)
   }
  }
 })
}

test('two distinct professional instruments are selectable once in both languages/audiences and correct filters',()=>{
 assert.equal(MONITORING_CATALOG.filter(c=>c.startable).length,150)
 for(const locale of ['en','ru'])for(const audience of ['guest','account']){
  const entries=buildExplorerEntries({locale,audience})
  for(const f of fixtures){
   const matches=entries.filter(e=>e.key===f.key)
   assert.equal(matches.length,1)
   assert.ok(matches[0].startable && matches[0].selectable && matches[0].definition)
   assert.ok(filterExplorerEntries(entries,{availability:'available',styles:['professional']}).some(e=>e.key===f.key))
   const c=MONITORING_CATALOG.find(c=>c.key===f.key)
   assert.equal(c.questionCount,f.count)
   assert.equal(c.rightsStatus,'cleared')
   assert.match(c.title.ru,/EN/)
  }
 }
})

test('registration payload exactly matches both immutable definitions and rejects identity/hash conflicts',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261012033100_hh_compassion_research_measures.sql',import.meta.url),'utf8')
 assert.deepEqual(JSON.parse(sql.split('$compassion$')[1]),defs)
 assert.match(sql,/on conflict \(id\) do nothing/)
 assert.match(sql,/id is distinct from \(d->>'id'\)::uuid/)
 assert.match(sql,/content_hash is distinct from d->>'contentHash'/)
 assert.match(sql,/definition is distinct from d/)
 assert.doesNotMatch(sql,/^\s*(update app\.|delete from|alter table|create policy|grant )/im)
 for(const d of defs){
  const guide=readFileSync(new URL('../docs/assessments/guides/'+d.key+'.md',import.meta.url),'utf8')
  assert.ok(guide.includes(d.id) && guide.includes(d.contentHash) && guide.includes(d.source.url))
 }
})

test('confidential EN/RU PDF model retains both tests, scale explanations and compatible history',async()=>{
 const {buildClientReport}=await import('../lib/profile/client-report.js')
 const results=defs.map((d,i)=>({...scoreAssessment(d,Object.fromEntries(d.questions.map(q=>[q.id,3])), syntheticTraumaContext(d)),id:'synthetic-'+i,measurementAt:'2026-10-12T02:00:00Z'}))
 results.push({...results[0],id:'synthetic-repeat',measurementAt:'2026-10-12T03:00:00Z'})
 for(const locale of ['en','ru']){
  const report=buildClientReport({results,locale,now:new Date('2026-10-12T04:00:00Z')})
  assert.equal(report.counts.tests,2)
  assert.equal(report.counts.attempts,3)
  const scs=report.tests.find(t=>t.key==='scs-sf'),cs=report.tests.find(t=>t.key==='compassion-scale')
  assert.equal(scs.attemptCount,2);assert.equal(scs.dimensions.length,1);assert.equal(cs.dimensions.length,5)
  for(const t of report.tests){
   assert.equal(t.language,'en')
   assert.ok(t.interpretation.sections.every(s=>s.source?.includes('self-compassion.org')))
   assert.match(JSON.stringify(t.interpretation),locale==='ru'?/английский оригинал/:/English original/)
  }
 }
})
